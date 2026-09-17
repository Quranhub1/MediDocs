import React, { useMemo, useRef, useState } from 'react';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';
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

const UserAvatar = ({ photoURL, initials, uploading, onChange }) => {
  const inputRef = useRef(null);
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="group relative block w-20 h-20 rounded-2xl overflow-hidden shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-70" aria-label="Change profile photo">
        {photoURL ? <img src={photoURL} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl font-extrabold">{initials}</div>}
        <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[11px] font-semibold text-center py-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">{uploading ? 'Uploading…' : 'Change photo'}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onChange} disabled={uploading} />
    </div>
  );
};

const UserProfile = ({ onViewChange, onLogout, onRenew }) => {
  const { currentUser, userProfile, isAdmin, refreshUserProfile } = useAuth();
  const { streak, badges } = useStudy();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(userProfile?.name || currentUser?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || currentUser?.phoneNumber || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
  const photoURL = userProfile?.photoURL || currentUser?.photoURL || '';

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Profile photos must be 5 MB or smaller.' });
      return;
    }

    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    const uploadPresetFingerprint = Array.from(uploadPreset || '').reduce((sum, char, index) => sum + ((index + 1) * char.charCodeAt(0)), 0);
    const reportCloudinaryDebug = (details = {}) => {
      fetch('/api/debug/cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: details.stage || 'unknown',
          cloudNameConfigured: Boolean(cloudName),
          uploadPresetConfigured: Boolean(uploadPreset),
          uploadPresetLength: uploadPreset?.length || 0,
          uploadPresetFingerprint,
          fileType: file.type,
          fileSize: file.size,
          httpStatus: details.httpStatus || 0,
          errorCode: details.errorCode || '',
          errorMessage: details.errorMessage || '',
          browser: navigator.userAgent
        })
      }).catch(() => {});
    };

    if (!cloudName || !uploadPreset) {
      reportCloudinaryDebug({ stage: 'client_configuration_missing', errorMessage: 'Cloudinary client configuration missing' });
      setMessage({ type: 'error', text: 'Profile photo storage is not configured yet.' });
      return;
    }

    setUploadingPhoto(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', `medidocs/profile-images/${currentUser.uid}`);

      console.info('[CLOUDINARY DEBUG] Starting profile photo upload', {
        cloudNameConfigured: Boolean(cloudName),
        uploadPresetConfigured: Boolean(uploadPreset),
        uploadPresetLength: uploadPreset.length,
        uploadPresetFingerprint,
        fileType: file.type,
        fileSize: file.size
      });

      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = {};
      }
      if (!response.ok || !data.secure_url) {
        const errorMessage = data.error?.message || `Cloudinary upload failed with HTTP ${response.status}.`;
        const errorCode = data.error?.code || '';
        reportCloudinaryDebug({
          stage: 'cloudinary_response_error',
          httpStatus: response.status,
          errorCode,
          errorMessage,
          rawResponsePreview: String(responseText || '').slice(0, 500)
        });
        throw new Error(errorMessage);
      }

      console.info('[CLOUDINARY DEBUG] Cloudinary upload succeeded');
      await updateProfile(currentUser, { photoURL: data.secure_url });
      await updateDoc(doc(db, 'users', currentUser.uid), {
        photoURL: data.secure_url,
        photoUpdatedAt: new Date()
      });
      await refreshUserProfile();
      setMessage({ type: 'success', text: 'Profile photo updated successfully.' });
    } catch (error) {
      reportCloudinaryDebug({
        stage: 'client_upload_exception',
        errorMessage: error?.message || 'Unknown profile photo upload error'
      });
      setMessage({ type: 'error', text: error.message || 'Unable to upload your profile photo.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

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
              <UserAvatar photoURL={photoURL} initials={initials} uploading={uploadingPhoto} onChange={handlePhotoChange} />
              <div className="min-w-0"><h2 className="text-xl font-bold text-gray-900 dark:text-dark-text truncate">{name || 'MediDocs User'}</h2><p className="text-sm text-gray-500 dark:text-dark-muted truncate">{currentUser.email}</p><p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tap your avatar to upload a photo</p></div>
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
              <div className="rounded-xl bg-gray-50 dark:bg-dark-bg p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Study time</p><p className="text-xl font-extrabold text-gray-900 dark:text-dark-text mt-1">{formatMinutes(streak.totalStudyTime)}</p></div>
              <div className="rounded-xl bg-gray-50 dark:bg-dark-bg p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Badges earned</p><p className="text-xl font-extrabold text-gray-900 dark:text-dark-text mt-1">{badges.length}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3"><div className="rounded-xl border border-gray-100 dark:border-dark-border p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Courses completed</p><p className="text-lg font-bold text-gray-900 dark:text-dark-text mt-1">{completedCourses}</p></div><div className="rounded-xl border border-gray-100 dark:border-dark-border p-4"><p className="text-xs text-gray-500 dark:text-dark-muted">Units completed</p><p className="text-lg font-bold text-gray-900 dark:text-dark-text mt-1">{completedUnits}</p></div></div>
            <p className="text-xs text-gray-500 dark:text-dark-muted mt-4">Last study activity: {formatDate(streak.lastStudyDate)}</p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Security</h2><p className="text-sm text-gray-500 dark:text-dark-muted mt-1">Your password is never displayed here. Humans have invented enough ways to leak secrets.</p></div><span className="text-2xl" aria-hidden="true">🔐</span></div>
            <ProfileRow label="Password"><span className="text-gray-500 dark:text-dark-muted">••••••••</span></ProfileRow>
            <button onClick={sendPasswordReset} disabled={passwordLoading} className="touch-target mt-5 px-5 py-3 rounded-xl bg-gray-900 dark:bg-gray-700 text-white font-semibold disabled:opacity-60">{passwordLoading ? 'Sending…' : 'Send password reset email'}</button>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-dark-border p-5 sm:p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">Subscription</h2><div className="mt-4"><ProfileRow label="Plan" value={plan} /><ProfileRow label="Status" value={status} />{!effectiveAdmin && <ProfileRow label="Expiry" value={formatDate(expiry)} />}</div>{!effectiveAdmin && <button onClick={onRenew} className="touch-target mt-5 w-full px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold">Renew subscription</button>}</div>
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-lg p-5 sm:p-6 text-white"><p className="text-sm font-semibold text-emerald-100">Keep learning</p><h2 className="text-2xl font-extrabold mt-1">Your next milestone is waiting.</h2><button onClick={() => onViewChange?.('dashboard')} className="touch-target mt-5 px-5 py-3 rounded-xl bg-white text-emerald-700 font-semibold">Back to dashboard</button></div>
          <button onClick={onLogout} className="touch-target w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text font-semibold">Log out</button>
        </aside>
      </div>
    </section>
  );
};

export default UserProfile;
