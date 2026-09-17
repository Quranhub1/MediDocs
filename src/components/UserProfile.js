import React, { useMemo, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useStudy } from '../context/StudyContext';

const formatDate = (value) => {
  if (!value) return 'Not recorded';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatMinutes = (minutes = 0) => {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const mins = Math.round(total % 60);
  if (!hours) return `${mins} min`;
  return `${hours}h ${mins}m`;
};

const ProfileRow = ({ label, value, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-4 border-b border-gray-100 dark:border-dark-border last:border-0">
    <span className="text-sm font-medium text-gray-500 dark:text-dark-muted">{label}</span>
    <div className="text-sm font-semibold text-gray-900 dark:text-dark-text sm:text-right break-all">{children || value || 'Not provided'}</div>
  </div>
);

const ProgressBar = ({ value = 0 }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(safeValue)} aria-valuemin="0" aria-valuemax="100" aria-label="Course progress"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700" style={{ width: `${safeValue}%` }} /></div>;
};

const UserProfile = ({ onViewChange, onLogout }) => {
  const { currentUser, userProfile, isAdmin, refreshUserProfile } = useAuth();
  const { streak, badges } = useStudy();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || currentUser?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || currentUser?.phoneNumber || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const effectiveAdmin = isAdmin || userProfile?.role === 'admin';
  const plan = effectiveAdmin ? 'lifetime' : (userProfile?.subscriptionPlan || userProfile?.subscription || 'free');
  const status = effectiveAdmin ? 'active' : (userProfile?.subscriptionStatus || (userProfile?.subscriptionApproved ? 'active' : 'inactive'));
  const expiry = effectiveAdmin ? null : userProfile?.subscriptionExpiry;
  const progress = Math.max(0, Math.min(100, Number(userProfile?.courseProgress ?? userProfile?.progress ?? 0) || 0));
  const completedCourses = Number(userProfile?.completedCourses ?? userProfile?.coursesCompleted ?? 0) || 0;
  const completedUnits = Number(userProfile?.completedUnits ?? userProfile?.unitsCompleted ?? 0) || 0;
  const initials = useMemo(() => (name || currentUser?.email || 'U').trim().charAt(0).toUpperCase(), [name, currentUser?.email]);

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    setSaving(true); setMessage(null);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { name: name.trim(), phone: phone.trim() });
      await refreshUserProfile();
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to update your profile.' });
    } finally { setSaving(false); }
  };

  const sendPasswordReset = async () => {
    if (!currentUser?.email) return;
    setPasswordLoading(true); setMessage(null);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setMessage({ type: 'success', text: 'Password reset instructions have been sent to your registered email.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Unable to send password reset instructions.' });
    } finally { setPasswordLoading(false); }
  };

  if (!currentUser) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10" aria-labelledby="profile-title">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">My account</p>
          {effectiveAdmin && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">★ Administrator</span>}
        </div>
        <h1 id="profile-title" className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-dark-text mt-1">Profile & Settings</h1>
        <p className="text-gray-600 dark:text-dark-muted mt-2">Manage your account, learning progress, subscription and security in one place.</p>
      </div>

      {message && <div role="status" className={`mb-6 rounded-xl p-4 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>{message.text}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-5 sm:p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl font-extrabold shadow-lg" aria-hidden="true">{initials}</div>
              <div className="min-w-0"><h2 className="text-xl font-bold text-gray-900 dark:text-dark-text truncate">{name || 'MediDocs User'}</h2><p className="text-sm text-gray-500 dark:text-dark-muted truncate">{currentUser.email}</p></div>
            </div>

            {editing ? (
              <form onSubmit={saveProfile} className="space-y-4">
                <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-dark-text">Username / full name</span><input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full touch-target rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" /></label>
                <label className="block"><span className="text-sm font-semibold text-gray-700 dark:text-dark-text">Phone number</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-1 w-full touch-target rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" /></label>
                <div className="flex flex-wrap gap-3"><button disabled={saving} className="touch-target px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button><button type="button" onClick={() => setEditing(false)} className="touch-target px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-dark-text font-semibold">Cancel</button></div>
              </form>
            ) : (
              <div><ProfileRow label="Username" value={name} /><ProfileRow label="Registered email" value={currentUser.email} /><ProfileRow label="Phone number" value={phone} /><ProfileRow label="Account created" value={formatDate(userProfile?.createdAt)} /><ProfileRow label="Account role" value={effectiveAdmin ? 'Administrator' : 'Student'} />{effectiveAdmin && <ProfileRow label="Access level"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-emerald-800 dark:text-emerald-300">Permanent access</span></ProfileRow>}<button onClick={() => setEditing(true)} className="touch-target mt-5 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Edit profile</button></div>
            )}
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-5 sm:p-6" aria-labelledby="learning-status-title">
            <div className="flex items-start justify-between gap-3 mb-5"><div><h2 id="learning-status-title" className="text-xl font-bold text-gray-900 dark:text-dark-text">Learning progress & status</h2><p className="text-sm text-gray-500 dark:text-dark-muted mt-1">Your personal study tracker lives here, keeping the dashboard focused on learning.</p></div><span className="text-2xl" aria-hidden="true">📈</span></div>
            <div className="mb-5"><div className="flex items-center justify-between gap-3 mb-2"><span className="text-sm font-semibold text-gray-700 dark:text-dark-text">Course progress</span><strong className="text-sm text-emerald-700 dark:text-emerald-400">{Math.round(progress)}%</strong></div><ProgressBar value={progress} /></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-gray-50 dark:bg-dark-bg p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Current streak</p><p className="text-xl font-extrabold text-gray-900 dark:text-dark-text mt-1">{streak.current} days</p></div>
              <div className="rounded-xl bg-gray-50 dark:bg-dark-bg p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Longest streak</p><p className="text-xl font-extrabold text-gray-900 dark:text-dark-text mt-1">{streak.longest} days</p></div>
              <div className="rounded-xl bg-gray-50 dark:bg-dark-bg p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Study time</p><p className="text-xl font-extrabold text-gray-900 dark:text-dark-text mt-1">{formatMinutes(userProfile?.totalStudyTime)}</p></div>
              <div className="rounded-xl bg-gray-50 dark:bg-dark-bg p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Badges earned</p><p className="text-xl font-extrabold text-gray-900 dark:text-dark-text mt-1">{badges.length}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3"><div className="rounded-xl border border-gray-100 dark:border-dark-border p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Courses completed</p><p className="text-lg font-bold text-gray-900 dark:text-dark-text mt-1">{completedCourses}</p></div><div className="rounded-xl border border-gray-100 dark:border-dark-border p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Units completed</p><p className="text-lg font-bold text-gray-900 dark:text-dark-text mt-1">{completedUnits}</p></div></div>
            <p className="text-xs text-gray-500 dark:text-dark-muted mt-4">Last study activity: {formatDate(streak.lastStudyDate)}</p>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Security</h2><p className="text-sm text-gray-500 dark:text-dark-muted mt-1">Your password is never displayed here. Humans have invented enough ways to leak secrets.</p></div><span className="text-2xl" aria-hidden="true">🔐</span></div>
            <ProfileRow label="Password" value="••••••••••••" /><ProfileRow label="Email verification" value={currentUser.emailVerified ? 'Verified' : 'Not verified'} />
            <button onClick={sendPasswordReset} disabled={passwordLoading} className="touch-target mt-4 px-5 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-60">{passwordLoading ? 'Sending…' : 'Change password by email'}</button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between gap-3"><p className="text-emerald-100 text-sm font-semibold">Account status</p>{effectiveAdmin && <span className="text-xs font-bold bg-white/15 rounded-full px-2.5 py-1">ADMIN</span>}</div>
            <h2 className="text-2xl font-extrabold mt-1 capitalize">{String(plan).replace(/[-_]/g, ' ')}</h2>
            <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-emerald-100">Subscription</span><strong className="capitalize">{String(status).replace(/[-_]/g, ' ')}</strong></div><div className="flex justify-between gap-3"><span className="text-emerald-100">Expires</span><strong>{expiry ? formatDate(expiry) : (effectiveAdmin ? 'Never' : 'No expiry')}</strong></div></div>
            {effectiveAdmin && <div className="mt-4 rounded-xl bg-white/10 border border-white/15 p-3 text-sm"><strong>Lifetime administrator access</strong><p className="text-emerald-100 mt-1">This access is restored from the server after every sign-in and hard refresh.</p></div>}
            <button onClick={() => onViewChange(effectiveAdmin ? 'admin' : 'home')} className="touch-target w-full mt-5 px-4 py-3 rounded-xl bg-white text-emerald-700 font-bold hover:bg-emerald-50">{effectiveAdmin ? 'Open Admin Control Center' : 'View subscription'}</button>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-5">
            <h2 className="font-bold text-gray-900 dark:text-dark-text mb-3">Account shortcuts</h2>
            <div className="space-y-2"><button onClick={() => onViewChange('courses')} className="touch-target w-full text-left px-4 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 text-gray-700 dark:text-dark-text font-medium">📚 My learning</button><button onClick={() => onViewChange(effectiveAdmin ? 'admin' : 'home')} className="touch-target w-full text-left px-4 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 text-gray-700 dark:text-dark-text font-medium">💳 {effectiveAdmin ? 'Admin control center' : 'Subscription & payments'}</button><button onClick={() => onViewChange('contact')} className="touch-target w-full text-left px-4 py-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 text-gray-700 dark:text-dark-text font-medium">💬 Contact support</button></div>
          </div>

          <button onClick={onLogout} className="touch-target w-full px-5 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-bold border border-red-100 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/30">Log out of MediDocs</button>
        </aside>
      </div>
    </section>
  );
};

export default UserProfile;