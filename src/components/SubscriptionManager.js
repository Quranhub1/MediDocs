import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SUBSCRIPTION_PLANS } from '../services/FirestoreService';
import { useAuth } from '../context/AuthContext';

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'No expiry set';
};

const remaining = (value, now) => {
  const date = toDate(value);
  if (!date) return { expired: true, text: 'No active subscription' };
  const diff = date.getTime() - now;
  if (diff <= 0) return { expired: true, text: 'Expired' };
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { expired: false, text: `${days}d ${hours}h ${minutes}m ${seconds}s` };
};

const SubscriptionManager = () => {
  const { currentUser, banUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState('expired');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [editUser, setEditUser] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [notice, setNotice] = useState('');

  const isAdmin = currentUser?.email?.toLowerCase() === 'kaigwaakram123@gmail.com' || currentUser?.phone === '256749846848';

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [userSnap, paymentSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'payments'))
      ]);
      setUsers(userSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setPayments(paymentSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      setNotice(`Could not load subscription data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(load, 20000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(refresh);
    };
  }, [load]);

  const stats = useMemo(() => {
    const active = users.filter((u) => {
      const expiry = toDate(u.subscriptionExpiry);
      return expiry && expiry.getTime() > now && u.subscriptionApproved && !u.banned;
    }).length;
    const expired = users.filter((u) => {
      const expiry = toDate(u.subscriptionExpiry);
      return expiry && expiry.getTime() <= now && u.subscriptionApproved;
    }).length;
    const pending = payments.filter((p) => p.status === 'pending_review').length;
    const banned = users.filter((u) => u.banned).length;
    return { active, expired, pending, banned };
  }, [users, payments, now]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (term && !`${u.name || ''} ${u.email || ''} ${u.phone || ''}`.toLowerCase().includes(term)) return false;
      const expiry = toDate(u.subscriptionExpiry);
      if (tab === 'expired') return !!expiry && expiry.getTime() <= now && !!u.subscriptionApproved;
      if (tab === 'active') return !!expiry && expiry.getTime() > now && !!u.subscriptionApproved;
      if (tab === 'banned') return !!u.banned;
      return true;
    });
  }, [users, tab, search, now]);

  const setBusyFor = (id, value) => setBusy((state) => ({ ...state, [id]: value }));

  const renew = async (userItem, planKey) => {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) return;
    setBusyFor(userItem.id, true);
    try {
      const oldExpiry = toDate(userItem.subscriptionExpiry);
      const base = oldExpiry && oldExpiry.getTime() > Date.now() ? oldExpiry : new Date();
      const expiry = new Date(base);
      expiry.setDate(expiry.getDate() + plan.duration);
      await updateDoc(doc(db, 'users', userItem.id), {
        subscriptionApproved: true,
        subscriptionStatus: 'active',
        subscriptionPlan: planKey,
        subscriptionExpiry: expiry,
        updatedAt: serverTimestamp()
      });
      setNotice(`${plan.label} renewal applied to ${userItem.email || userItem.name || 'user'}.`);
      await load();
    } catch (error) {
      setNotice(`Renewal failed: ${error.message}`);
    } finally {
      setBusyFor(userItem.id, false);
    }
  };

  const updateExpiry = async () => {
    if (!editUser || !editDate) return;
    setBusyFor(editUser.id, true);
    try {
      const expiry = new Date(`${editDate}T23:59:59`);
      await updateDoc(doc(db, 'users', editUser.id), {
        subscriptionApproved: true,
        subscriptionStatus: 'active',
        subscriptionExpiry: expiry,
        updatedAt: serverTimestamp()
      });
      setNotice('Subscription expiry updated successfully.');
      setEditUser(null);
      await load();
    } catch (error) {
      setNotice(`Update failed: ${error.message}`);
    } finally {
      setBusyFor(editUser.id, false);
    }
  };

  const toggleBan = async (userItem) => {
    setBusyFor(userItem.id, true);
    try {
      const result = await banUser(userItem.id, !!userItem.banned);
      if (!result?.success) throw new Error(result?.error || 'Unable to update ban status');
      setNotice(userItem.banned ? 'User unbanned.' : 'User banned.');
      await load();
    } catch (error) {
      setNotice(`Ban action failed: ${error.message}`);
    } finally {
      setBusyFor(userItem.id, false);
    }
  };

  const approvePayment = async (payment) => {
    const matched = users.find((u) => (u.email || '').toLowerCase() === (payment.email || '').toLowerCase());
    if (!matched) {
      setNotice('Payment received, but no matching user account was found. Update the payment email or user account first.');
      return;
    }
    const planKey = payment.plan && SUBSCRIPTION_PLANS[payment.plan] ? payment.plan : 'monthly';
    const plan = SUBSCRIPTION_PLANS[planKey];
    setBusyFor(payment.id, true);
    try {
      const oldExpiry = toDate(matched.subscriptionExpiry);
      const base = oldExpiry && oldExpiry.getTime() > Date.now() ? oldExpiry : new Date();
      const expiry = new Date(base);
      expiry.setDate(expiry.getDate() + plan.duration);
      await updateDoc(doc(db, 'users', matched.id), {
        subscriptionApproved: true,
        subscriptionStatus: 'active',
        subscriptionPlan: planKey,
        subscriptionExpiry: expiry,
        lastPaymentReference: payment.reference || payment.id,
        lastPaymentAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedUserId: matched.id
      });
      setNotice(`Payment approved. ${matched.email || matched.name} is active until ${expiry.toLocaleDateString()}.`);
      await load();
    } catch (error) {
      setNotice(`Payment approval failed: ${error.message}`);
    } finally {
      setBusyFor(payment.id, false);
    }
  };

  const rejectPayment = async (payment) => {
    setBusyFor(payment.id, true);
    try {
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'declined',
        reviewedAt: serverTimestamp()
      });
      setNotice('Payment marked as declined.');
      await load();
    } catch (error) {
      setNotice(`Payment rejection failed: ${error.message}`);
    } finally {
      setBusyFor(payment.id, false);
    }
  };

  if (!isAdmin) return null;

  const pendingPayments = payments.filter((p) => p.status === 'pending_review');

  return (
    <section className="relative overflow-hidden rounded-3xl mx-3 md:mx-6 my-6 p-4 md:p-7 bg-slate-950 text-white shadow-2xl border border-emerald-500/20">
      <style>{`
        @keyframes mdFloat { 0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-14px,0)} }
        @keyframes mdGlow { 0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.55;transform:scale(1.12)} }
        @keyframes mdPulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.35)}50%{box-shadow:0 0 0 12px rgba(16,185,129,0)} }
        .md-float{animation:mdFloat 6s ease-in-out infinite}.md-glow{animation:mdGlow 5s ease-in-out infinite}.md-pulse{animation:mdPulse 2.4s infinite}
        @media(prefers-reduced-motion:reduce){.md-float,.md-glow,.md-pulse{animation:none!important}}
      `}</style>
      <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl md-glow" />
      <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl md-glow" />

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-xs font-bold mb-2 md-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE SUBSCRIPTIONS
            </div>
            <h2 className="text-2xl md:text-3xl font-black">Subscription Control Center</h2>
            <p className="text-slate-400 text-sm mt-1">Renew, update, ban, unban and approve payments without hunting through the dashboard.</p>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-semibold transition">↻ Refresh</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[['Active', stats.active, 'emerald'], ['Expired', stats.expired, 'rose'], ['Pending payments', stats.pending, 'amber'], ['Banned', stats.banned, 'slate']].map(([label, value, tone]) => (
            <div key={label} className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm md-float">
              <p className="text-xs text-slate-400">{label}</p><p className={`text-2xl font-black mt-1 text-${tone}-300`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <div className="flex flex-wrap gap-2">
            {['expired','active','banned','all'].map((item) => (
              <button key={item} onClick={() => setTab(item)} className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition ${tab === item ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{item}</button>
            ))}
            <button onClick={() => setTab('payments')} className={`px-3 py-2 rounded-xl text-xs font-bold transition ${tab === 'payments' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>Payments {stats.pending ? `(${stats.pending})` : ''}</button>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone..." className="md:ml-auto w-full md:w-80 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        {notice && <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

        {tab === 'payments' ? (
          <div className="space-y-3">
            {pendingPayments.length === 0 && <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center text-slate-400">No payments waiting for review.</div>}
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="rounded-2xl bg-white/5 border border-amber-400/20 p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1"><p className="font-bold">{payment.email || 'Unknown user'}</p><p className="text-xs text-slate-400 mt-1">{payment.planLabel || payment.plan || 'Monthly'} · UGX {Number(payment.amount || 0).toLocaleString()} · Ref: {payment.reference || payment.id}</p></div>
                <div className="flex gap-2"><button disabled={!!busy[payment.id]} onClick={() => approvePayment(payment)} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-bold disabled:opacity-50">Approve & Activate</button><button disabled={!!busy[payment.id]} onClick={() => rejectPayment(payment)} className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 text-sm font-bold disabled:opacity-50">Decline</button></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {loading && <div className="rounded-2xl bg-white/5 p-8 text-center text-slate-400">Loading live subscription data…</div>}
            {!loading && filteredUsers.length === 0 && <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center text-slate-400">No users match this view.</div>}
            {filteredUsers.map((item) => {
              const timer = remaining(item.subscriptionExpiry, now);
              return (
                <article key={item.id} className={`rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${timer.expired ? 'border-rose-500/25 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                  <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold truncate">{item.name || item.email || 'Unnamed user'}</h3><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${item.banned ? 'bg-slate-700 text-slate-300' : timer.expired ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{item.banned ? 'Banned' : timer.expired ? 'Expired' : 'Active'}</span></div>
                      <p className="text-xs text-slate-400 mt-1 truncate">{item.email || 'No email'} {item.phone ? `· ${item.phone}` : ''}</p>
                      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs"><span className={timer.expired ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>{timer.text}</span><span className="text-slate-400">Expiry: {formatDate(item.subscriptionExpiry)}</span><span className="text-slate-400">Plan: {item.subscriptionPlan || 'none'}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button disabled={!!busy[item.id]} onClick={() => renew(item, 'weekly')} className="px-3 py-2 rounded-xl bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 text-xs font-bold disabled:opacity-50">Renew 7d</button>
                      <button disabled={!!busy[item.id]} onClick={() => renew(item, 'monthly')} className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 text-xs font-bold disabled:opacity-50">Renew 30d</button>
                      <button disabled={!!busy[item.id]} onClick={() => renew(item, 'yearly')} className="px-3 py-2 rounded-xl bg-violet-500/15 text-violet-200 hover:bg-violet-500/25 text-xs font-bold disabled:opacity-50">Renew 1y</button>
                      <button disabled={!!busy[item.id]} onClick={() => { setEditUser(item); const date = toDate(item.subscriptionExpiry); setEditDate(date ? date.toISOString().slice(0,10) : ''); }} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold disabled:opacity-50">Update</button>
                      <button disabled={!!busy[item.id]} onClick={() => toggleBan(item)} className={`px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 ${item.banned ? 'bg-emerald-500/15 text-emerald-200' : 'bg-rose-500/15 text-rose-200'}`}>{item.banned ? 'Unban' : 'Ban'}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-slate-500 mt-5">Live timers update every second. Subscription and payment data refresh automatically every 20 seconds.</p>
      </div>

      {editUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-white">Update subscription</h3>
            <p className="text-sm text-slate-400 mt-1">{editUser.email || editUser.name}</p>
            <label className="block text-xs font-bold text-slate-300 mt-5 mb-2">New expiry date</label>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
            <div className="flex gap-2 mt-5"><button onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white font-bold">Cancel</button><button onClick={updateExpiry} disabled={!editDate || !!busy[editUser.id]} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold disabled:opacity-50">Save update</button></div>
          </div>
        </div>
      )}
    </section>
  );
};

export default SubscriptionManager;
