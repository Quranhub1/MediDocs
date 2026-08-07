import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { fetchAllDocuments } from '../services/FirestoreService';

const AIStudyAssistant = ({ show, onClose, user, userProfile }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [speaking, setSpeaking] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const openAIApiKey = process.env.REACT_APP_OPENAI_API_KEY;

  const loadChatHistory = useCallback(async () => {
    if (!show || !user) return;
    try {
      const q = query(collection(db, 'chats', user.uid, 'messages'), orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      if (history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{
          id: 1,
          text: "Hello! I'm MediDocs AI, your personal medical study assistant. I can help you with:\n\n- Finding documents and resources\n- Recommending study materials\n- Guiding you to specific pages\n- Summarizing content\n- Answering medical questions\n\nWhat would you like to learn today?",
          isUser: false,
          createdAt: serverTimestamp()
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages([{
        id: 1,
        text: "Hello! I'm MediDocs AI, your personal medical study assistant. I can help you with:\n\n- Finding documents and resources\n- Recommending study materials\n- Guiding you to specific pages\n- Summarizing content\n- Answering medical questions\n\nWhat would you like to learn today?",
        isUser: false,
        createdAt: serverTimestamp()
      }]);
    }
  }, [show, user]);

  useEffect(() => {
    if (show) {
      loadChatHistory();
      inputRef.current?.focus();
    }
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [show, loadChatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (show && documents.length === 0) {
      fetchAllDocuments(20, false).then(result => {
        if (result.success) {
          setDocuments(result.data || []);
        }
      });
    }
  }, [show, documents.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const findRelevantDocuments = (query) => {
    const q = query.toLowerCase();
    const keywords = q.split(' ').filter(w => w.length > 3);
    return documents.filter(doc => {
      const text = `${doc.title} ${doc.description} ${doc.courseId} ${doc.unitName || ''}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    }).slice(0, 3);
  };

  const buildSystemPrompt = (currentQuery) => {
    const relevantDocs = findRelevantDocuments(currentQuery || '');
    let contextInfo = '';
    if (relevantDocs.length > 0) {
      contextInfo = `\n\nHere are some relevant documents from our database:\n${relevantDocs.map(d => `- ${d.title} (${d.courseId?.toUpperCase()} - ${d.semesterId?.toUpperCase()}${d.unitName ? ' - ' + d.unitName : ''}): ${d.description || 'No description'}`).join('\n')}`;
    }
    return `You are MediDocs AI, a knowledgeable and friendly medical study assistant for students in Uganda. You have access to a database of medical study documents. When a student asks about a topic, recommend the most relevant documents and guide them to where they can find the resource in our platform. If they ask for a page or section, tell them which course > semester > unit > document to navigate to.${contextInfo}\n\nProvide accurate, educational, and easy-to-understand explanations. Use examples relevant to the Ugandan healthcare context when possible. Keep responses concise but informative.`;
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_]/g, ''));
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    setSpeaking(text);
    utterance.onend = () => setSpeaking(null);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      text: input,
      isUser: true,
      createdAt: serverTimestamp()
    };

    setMessages(prev => [...prev, { ...userMessage, id: Date.now() }]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      let botResponse;

      if (openAIApiKey) {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { 
                role: 'system', 
                content: buildSystemPrompt(input)
              },
              ...messages.filter(m => m.text).slice(-10).map(m => ({
                role: m.isUser ? 'user' : 'assistant',
                content: m.text
              })),
              { role: 'user', content: input }
            ],
            apiKey: openAIApiKey
          })
        });
        
        const data = await response.json();
        botResponse = data.success ? data.response : getFallbackResponse(input);
      } else {
        botResponse = getFallbackResponse(input);
      }

      const botMessage = {
        text: botResponse,
        isUser: false,
        createdAt: serverTimestamp(),
        hasAudio: true
      };

      setMessages(prev => [...prev, { ...botMessage, id: Date.now() + 1 }]);

      if (user) {
        try {
          await addDoc(collection(db, 'chats', user.uid, 'messages'), userMessage);
          await addDoc(collection(db, 'chats', user.uid, 'messages'), botMessage);
        } catch (e) {
          // Chat save skipped
        }
      }

    } catch (error) {
      console.error('AI chat error:', error);
      const fallbackResponse = getFallbackResponse(input);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: fallbackResponse,
        isUser: false,
        createdAt: serverTimestamp(),
        hasAudio: true
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const getFallbackResponse = (question) => {
    const q = question.toLowerCase();
    const relevantDocs = findRelevantDocuments(question);
    
    let docRecommendation = '';
    if (relevantDocs.length > 0) {
      docRecommendation = `\n\nRecommended documents for you:\n${relevantDocs.map(d => `- **${d.title}** (${d.courseId?.toUpperCase()} - ${d.unitName || d.semesterId?.toUpperCase()})`).join('\n')}`;
    }

    if (q.includes('anatomy') || q.includes('skeletal') || q.includes('bone') || q.includes('skull')) {
      return `📚 Human Anatomy Overview\n\n**Skeletal System:**\n- 206 bones in adult human body\n- Divided into axial (80) and appendicular (126) skeletons\n- Functions: support, protection, movement, mineral storage, blood cell formation\n\n**Major Bones:**\n- Skull: 22 bones (cranial + facial)\n- Spine: 33 vertebrae (7 cervical, 12 thoracic, 5 lumbar, 5 sacral, 4 coccygeal)\n- Ribs: 12 pairs (7 true, 3 false, 2 floating)\n\nWould you like me to explain any specific system in detail?${docRecommendation}`;
    }

    if (q.includes('physiology') || q.includes('function') || q.includes('heart') || q.includes('blood pressure')) {
      return `🫀 Cardiovascular Physiology\n\n**Heart Function:**\n- Beats ~100,000 times/day, pumping 5L blood/minute\n- Cardiac cycle: systole (contraction) + diastole (relaxation)\n- Normal BP: 120/80 mmHg\n\n**Key Concepts:**\n- Cardiac output = HR × Stroke volume\n- Sinoatrial (SA) node: natural pacemaker\n- Baroreceptors regulate BP via sympathetic/parasympathetic systems\n\nNeed more details on any topic?${docRecommendation}`;
    }

    if (q.includes('pharmacology') || q.includes('drug') || q.includes('medication') || q.includes('antibiotic')) {
      return `💊 Pharmacology Basics\n\n**Drug Classifications:**\n- Analgesics: Pain relief (Paracetamol, Ibuprofen)\n- Antibiotics: Infection treatment (Amoxicillin, Ciprofloxacin)\n- Antihypertensives: Blood pressure control (Amlodipine, Enalapril)\n- Antidiabetics: Blood sugar control (Metformin, Insulin)\n\n**Important Principles:**\n- Dose-response relationship\n- Half-life and dosing intervals\n- Drug interactions\n\nWant information on a specific drug or condition?${docRecommendation}`;
    }

    if (q.includes('nursing') || q.includes('patient care') || q.includes('vital signs') || q.includes('injection')) {
      return `🏥 Nursing Fundamentals\n\n**Vital Signs Normal Ranges:**\n- Temperature: 36.1-37.2°C\n- Pulse: 60-100 bpm\n- BP: 120/80 mmHg\n- Respiratory Rate: 12-20/min\n- SpO2: 95-100%\n\n**Core Skills:**\n- Patient assessment\n- Medication administration (oral, IM, IV)\n- Wound care & dressing\n- Catheterization\n- IV cannulation\n\nWhat nursing topic would you like to explore?${docRecommendation}`;
    }

    if (q.includes('exam') || q.includes('past paper') || q.includes('revision') || q.includes('study tips')) {
      return `📝 Exam Preparation Tips\n\n**For Ugandan Medical Exams:**\n\n1. **Past Papers:** Get old question papers from your institution\n2. **Time Management:** Practice answering within time limits\n3. **Marking Schemes:** Understand how answers are graded\n4. **High-Yield Topics:** Focus on common conditions\n5. **Group Study:** Discuss with classmates\n\n**Common Topics:**\n- Anatomy basics\n- Physiology processes\n- Pharmacology fundamentals\n- Patient assessment\n- Infection control\n\nWould you like me to help with a specific topic?${docRecommendation}`;
    }

    if (q.includes('summarize') || q.includes('summary')) {
      return `I can help summarize documents. Please tell me which document you'd like me to summarize, or share the content you want summarized. I'll provide a concise overview highlighting the key points and main concepts for a medical student.`;
    }

    if (q.includes('page') || q.includes('where') || q.includes('find') || q.includes('locate')) {
      return `To find resources in our platform, follow these steps:\n\n1. Go to **Courses** from the main menu\n2. Select your **Course** (e.g., Bachelor of Clinical Medicine)\n3. Choose the **Semester**\n4. Select the **Unit/Course Unit**\n5. Browse the **Documents** list\n\nUse the search bar at the top to quickly find specific topics. Premium documents require a subscription.\n\nWhich resource are you looking for? I can help guide you there.${docRecommendation}`;
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('good morning')) {
      return "Hello! I'm MediDocs AI, your medical study assistant. How can I help you today? I can help you find documents, summarize content, or answer medical questions.";
    }

    return `That's a great question about medical studies!${docRecommendation}\n\nI can help you with:\n- 📖 Anatomy - Body structures and systems\n- 🔬 Physiology - How body systems work\n- 💊 Pharmacology - Drug classifications and uses\n- 🏥 Clinical Skills - Patient care techniques\n- 📝 Exam Prep - Study tips and past papers\n\nPlease try rephrasing your question or ask about one of these topics!`;
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-teal-900/90 to-cyan-900/90" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-2 overflow-hidden flex flex-col" style={{ height: '85vh', maxHeight: '700px' }}>
        
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">MediDocs AI</h3>
              <p className="text-emerald-100 text-xs">Your Medical Study Assistant</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Online
            </span>
            <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 flex gap-2 overflow-x-auto shrink-0">
          {['Anatomy', 'Physiology', 'Pharmacology', 'Exam Prep', 'Find Resource'].map((topic) => (
            <button
              key={topic}
              onClick={() => setInput(topic === 'Find Resource' ? 'Where can I find resources on ...' : topic)}
              className="text-xs px-3 py-1.5 bg-white rounded-full text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white transition-colors whitespace-nowrap"
            >
              {topic}
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.map((message, index) => (
            <div 
              key={message.id || index} 
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              style={{ animation: 'fadeIn 0.3s ease-out' }}
            >
              {!message.isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 mr-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${message.isUser ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-br-md' : 'bg-white text-gray-800 shadow-lg rounded-bl-md border border-gray-100'}`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                {message.isUser === false && (
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-gray-400">MediDocs AI</p>
                    {message.hasAudio && (
                      <button
                        onClick={() => speaking === message.text ? stopSpeaking() : speakText(message.text)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                        title={speaking === message.text ? 'Stop speaking' : 'Listen'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                        </svg>
                        {speaking === message.text ? 'Stop' : 'Listen'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {message.isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 ml-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 mr-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-lg border border-gray-100">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          {!openAIApiKey && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Using built-in medical knowledge. Add Groq key for advanced AI.
            </div>
          )}
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything about medical studies..."
              className="flex-1 px-5 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AIStudyAssistant;
