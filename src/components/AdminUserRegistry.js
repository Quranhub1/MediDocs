import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatSignupDate = (value) => {
  const date = toDate(value);
  if (!date) return 'Date not recorded';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const AdminUserRegistry = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isAdmin = currentUser?.email?.toLowerCase() === 'kaigwaakram123@gmail.com' || currentUser?.phone === '256749846848';

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      rows.sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
      setUsers(rows);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Could not load registered users:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsers();
    const refresh = window.setInterval(loadUsers, 30000);
    return () => window.clearInterval(refresh);
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => `${user.name || ''} ${user.email || ''} ${user.phone || ''}`.toLowerCase().includes(term));
  }, [users, search]);

  if (!isAdmin) return null;

  return (
    <section className="mx-3 md:mx-6 my-6 rounded-3xl overflow-hidden bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-xl">
      <div className="p-5 md:p-7 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-emerald-300 uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> User registry
            </div>
            <h2 className="text-2xl md:text-3xl font-black mt-1">Registered Users</h2>
            <p className="text-slate-400 text-sm mt-1">See who joined MediDocs and exactly when their account was created.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-center">
              <p className="text-xs text-slate-400">Total users</p>
              <p className="text-xl font-black">{users.length}</p>
            </div>
            <button onClick={loadUsers} className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-bold transition">↻ Refresh</button>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-7">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email or phone..."
            aria-label="Search registered users"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {lastUpdated && <span className="self-center text-xs text-gray-500 dark:text-dark-muted">Updated {lastUpdated.toLocaleTimeString()}</span>}
        </div>

        {loading ? (
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-10 text-center text-gray-500 dark:text-dark-muted animate-pulse">Loading registered users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-10 text-center text-gray-500 dark:text-dark-muted">No registered users found.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-dark-border">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase tracking-wider text-gray-500 dark:text-dark-muted">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Sign-up date</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                {filteredUsers.map((user) => {
                  const expiry = toDate(user.subscriptionExpiry);
                  const active = Boolean(expiry && expiry.getTime() > Date.now() && user.subscriptionApproved && !user.banned);
                  return (
                    <tr key={user.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-900 dark:text-dark-text">{user.name || 'Unnamed user'}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">{user.email || 'No email'}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-dark-text">{user.phone || 'Not provided'}</td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-gray-800 dark:text-dark-text">{formatSignupDate(user.createdAt)}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-muted mt-1">Account creation</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-dark-text">{user.subscriptionPlan || user.subscription || 'Free'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${user.banned ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {user.banned ? 'Banned' : active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminUserRegistry;
