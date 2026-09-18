import React, { useEffect, useState } from 'react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, setDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';

const StudyGroups = ({ onClose, user }) => {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'studyGroups'), limit(50)));
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(g => Array.isArray(g.memberIds) && g.memberIds.includes(user.uid)));
    } catch (e) { console.error('[GROUPS] load failed', e); }
    setLoading(false);
  };

  const loadMessages = async (group) => {
    try {
      const snap = await getDocs(query(collection(db, 'studyGroups', group.id, 'messages'), orderBy('createdAt', 'desc'), limit(50)));
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse());
    } catch (e) { console.error('[GROUPS] messages failed', e); }
  };

  useEffect(() => { loadGroups(); }, [user]);
  useEffect(() => { if (selected) loadMessages(selected); }, [selected]);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    try {
      const ref = await addDoc(collection(db, 'studyGroups'), { name: name.trim(), ownerId: user.uid, memberIds: [user.uid], createdAt: serverTimestamp() });
      setName('');
      const group = { id: ref.id, name: name.trim(), ownerId: user.uid, memberIds: [user.uid] };
      setGroups(prev => [group, ...prev]);
      setSelected(group);
    } catch (e) { console.error('[GROUPS] create failed', e); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selected || !user) return;
    try {
      await addDoc(collection(db, 'studyGroups', selected.id, 'messages'), { text: message.trim(), userId: user.uid, userName: user.displayName || user.email || 'Student', createdAt: serverTimestamp() });
      setMessage('');
      loadMessages(selected);
    } catch (e) { console.error('[GROUPS] send failed', e); }
  };

  if (!user) return null;
  return <div className="fixed inset-0 z-[80] bg-black/50 p-3 sm:p-6 flex items-center justify-center">
    <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
      <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
        <div><h2 className="text-xl font-bold dark:text-white">Study Groups</h2><p className="text-xs text-gray-500">Private spaces for classmates to discuss and share study goals.</p></div>
        <button onClick={onClose} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 dark:text-white">Close</button>
      </div>
      <div className="grid md:grid-cols-[280px_1fr] min-h-[560px]">
        <aside className="p-4 border-r dark:border-slate-700 overflow-y-auto">
          <form onSubmit={createGroup} className="flex gap-2 mb-4">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="New group" className="min-w-0 flex-1 rounded-lg border p-2 dark:bg-slate-800 dark:text-white" />
            <button className="px-3 rounded-lg bg-emerald-600 text-white">+</button>
          </form>
          {loading ? <p className="text-sm text-gray-500">Loading groups...</p> : groups.map(g=><button key={g.id} onClick={()=>setSelected(g)} className={'w-full text-left p-3 rounded-lg mb-2 '+(selected?.id===g.id?'bg-emerald-100 dark:bg-emerald-950/40':'bg-gray-50 dark:bg-slate-800')}><span className="font-semibold dark:text-white">{g.name}</span><span className="block text-xs text-gray-500">{g.memberIds?.length || 1} member{(g.memberIds?.length || 1)===1?'':'s'}</span></button>)}
        </aside>
        <main className="flex flex-col min-h-0">
          {!selected ? <div className="m-auto text-center p-8"><p className="font-semibold dark:text-white">Create or select a study group</p><p className="text-sm text-gray-500 mt-2">Only group members can read or post.</p></div> :
          <>
            <div className="p-4 border-b dark:border-slate-700"><h3 className="font-bold dark:text-white">{selected.name}</h3></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[380px]">{messages.map(m=><div key={m.id} className={'max-w-[85%] rounded-xl p-3 '+(m.userId===user.uid?'ml-auto bg-emerald-100 dark:bg-emerald-950/40':'bg-gray-100 dark:bg-slate-800')}><p className="text-xs font-semibold dark:text-white">{m.userName}</p><p className="text-sm mt-1 dark:text-slate-200">{m.text}</p></div>)}</div>
            <form onSubmit={sendMessage} className="p-4 border-t dark:border-slate-700 flex gap-2"><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Share a study note or question..." className="flex-1 rounded-xl border p-3 dark:bg-slate-800 dark:text-white" /><button className="px-5 rounded-xl bg-emerald-600 text-white font-semibold">Send</button></form>
          </>}
        </main>
      </div>
    </div>
  </div>;
};

export default StudyGroups;
