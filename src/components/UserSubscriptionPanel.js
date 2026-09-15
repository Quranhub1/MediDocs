import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { SUBSCRIPTION_PLANS } from '../services/FirestoreService';

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const UserSubscriptionPanel = ({ user, userProfile, onRenew }) => {
  const [now, setNow] = useState(Date.now());
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadPayments = async () => {
      if (!user?.uid) return;
      setLoadingPayments(true);
      try {
        const snapshot = await getDocs(query(collection(db, 'payments'), where('userId', '==', user.uid)));
        if (active) {
          const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          rows.sort((a, b) => {
            const aDate = toDate(a.createdAt)?.getTime() || 0;
            const bDate = toDate(b.createdAt)?.getTime() || 0;
            return bDate - aDate;
          });
          setPayments(rows.slice(0, 5));
        }
      } catch (error) {
        console.warn('Could not load payment history:', error);
      } finally {
        if (active) setLoadingPayments(false);
      }
    };
    loadPayments();
    const refresh = window.setInterval(loadPayments, 30000);
    return () => { active = false; window.clearInterval(refresh); };
  }, [user?.uid]);

  const expiry = useMemo(() => toDate(userProfile?.subscriptionExpiry), [userProfile?.subscriptionExpiry]);
  const remaining = expiry ? expiry.getTime() - now : 0;
  const activeSubscription = Boolean(
    expiry && remaining > 0 && userProfile?.subscriptionApproved && !userProfile?.banned
  );
  const daysLeft = Math.max(0, Math.ceil(remaining / 86400000));
  const pendingPayment = payments.find((payment) => payment.status === 'pending_review');
  const planKey = userProfile?.subscriptionPlan || userProfile?.subscription || 'monthly';
  const plan = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.monthly;

  if (!user) return null;

  const status = userProfile?.banned
    ? { label: 'Account restricted', tone: 'rose', message: 'Your account is currently restricted. Contact support for help.' }
    : activeSubscription
      ? { label: daysLeft <= 3 ? 'Expiring soon' : 'Active', tone: daysLeft <= 3 ? 'amber' : 'emerald', message: `${plan.label} access is active until ${expiry.toLocaleDateString()}.` }
      : { label: 'Subscription expired', tone: 'rose', message: 'Premium access has expired. Renew to continue using premium study resources.' };

  const toneClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
  };

  return (
    <section className="mx-4 md:mx-6 my-6 rounded-3xl overflow-hidden border border-emerald-200/60 dark:border-emerald-500/20 bg-white dark:bg-dark-card shadow-xl">
      <div className="relative p-5 md:p-7 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white overflow-hidden">
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10 blur-2xl animate-pulse" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100 font-bold">Membership</p>
            <h2 className="text-2xl md:text-3xl font-black mt-1">Your MediDocs Subscription</h2>
            <p className="text-emerald-50 text-sm mt-2 max-w-2xl">Keep your medical study resources available without interruptions.</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs text-emerald-100">Current plan</p>
            <p className="text-xl font-black">{activeSubscription ? plan.label : 'Inactive'}</p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-7">
        <div className={`rounded-2xl border p-4 ${toneClasses[status.tone]}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${status.tone === 'emerald' ? 'bg-emerald-500' : status.tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`} />
                <p className="font-black">{status.label}</p>
              </div>
              <p className="text-sm mt-1 opacity-80">{status.message}</p>
              {activeSubscription && <p className="text-xs mt-2 font-mono font-bold">{daysLeft} day{daysLeft === 1 ? '' : 's'} remaining · {expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
            {!userProfile?.banned && (
              <button
                onClick={() => onRenew?.(activeSubscription ? planKey : null)}
                className="shrink-0 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                {activeSubscription ? 'Renew / Upgrade' : 'Renew Subscription'}
              </button>
            )}
          </div>
        </div>

        {pendingPayment && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20 p-4">
            <p className="font-bold text-amber-800 dark:text-amber-200">Payment awaiting verification</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Reference: <span className="font-mono font-bold">{pendingPayment.reference || pendingPayment.id}</span>. Your subscription will activate after admin verification.</p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, item]) => (
            <button key={key} onClick={() => onRenew?.(key)} className="text-left rounded-2xl border border-gray-200 dark:border-dark-border p-4 hover:border-emerald-400 hover:-translate-y-0.5 transition-all bg-gray-50/70 dark:bg-gray-800/40">
              <p className="font-black text-gray-900 dark:text-dark-text">{item.label}</p>
              <p className="text-sm text-gray-500 dark:text-dark-muted mt-1">UGX {item.amount.toLocaleString()} · {item.duration} days</p>
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-gray-200 dark:border-dark-border pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-gray-900 dark:text-dark-text">Recent payment history</h3>
            {loadingPayments && <span className="text-xs text-gray-500">Updating…</span>}
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-dark-muted">No payment records yet.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3">
                  <div><p className="text-sm font-bold text-gray-800 dark:text-dark-text">{payment.planLabel || payment.plan || 'Subscription'}</p><p className="text-xs text-gray-500 dark:text-dark-muted">{payment.reference || payment.id}</p></div>
                  <div className="text-left sm:text-right"><p className="text-sm font-bold">UGX {Number(payment.amount || 0).toLocaleString()}</p><p className="text-xs capitalize text-gray-500 dark:text-dark-muted">{String(payment.status || 'unknown').replace('_', ' ')}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default UserSubscriptionPanel;
