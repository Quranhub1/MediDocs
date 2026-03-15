import React, { useState, useEffect } from 'react';

const AIChatModal = ({ show, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setMessages([
        {
          id: 1,
          text: "Hello! I'm your AI study assistant. How can I help you with your medical studies today?",
          isUser: false
        }
      ]);
    }
  }, [show]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const botResponse = await simulateAIResponse(input);
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: botResponse,
        isUser: false
      }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "I'm sorry, I encountered an error. Please try again.",
        isUser: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateAIResponse = async (question) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('anatomy') || lowerQuestion.includes('body')) {
      return "Anatomy is the study of the structure of living things. In human anatomy, we study the various systems like skeletal, muscular, nervous, circulatory, respiratory, digestive, urinary, and reproductive systems.";
    } else if (lowerQuestion.includes('physiology') || lowerQuestion.includes('function')) {
      return "Physiology is the study of how living organisms function. It examines the mechanical, physical, and biochemical processes that keep organisms alive.";
    } else if (lowerQuestion.includes('clt') || lowerQuestion.includes('laboratory')) {
      return "CLT (Certificate in Laboratory Technology) covers laboratory safety, equipment use, specimen collection, basic hematology, clinical chemistry, microbiology, histopathology, and quality control.";
    } else if (lowerQuestion.includes('nursing') || lowerQuestion.includes('patient care')) {
      return "Nursing fundamentals include patient assessment, vital signs, medication administration, wound care, infection control, patient communication, and ethical considerations.";
    } else if (lowerQuestion.includes('past paper') || lowerQuestion.includes('exam')) {
      return "For effective exam preparation with past papers: 1) Time yourself to simulate exam conditions, 2) Review marking schemes, 3) Identify recurring topics, 4) Focus on weak areas.";
    } else {
      return "That's an interesting question about medical studies. I recommend consulting your textbooks, lecture notes, or speaking with your instructors for detailed information.";
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">AI Study Assistant</h3>
              <p className="text-emerald-100 text-xs">Available 24/7</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  message.isUser 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' 
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-2.5 shadow-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500"></div>
                  <span className="text-gray-500 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Input */}
        <div className="p-4 bg-white border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me about your studies..."
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatModal;