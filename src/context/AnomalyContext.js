import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, getDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const AnomalyContext = createContext();

export const useAnomaly = () => {
  const context = useContext(AnomalyContext);
  if (!context) {
    throw new Error('useAnomaly must be used within an AnomalyProvider');
  }
  return context;
};

export const AnomalyProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [userRoles, setUserRoles] = useState([]);

  useEffect(() => {
    if (user) {
      loadUserRoles();
    }
  }, [user]);

  const loadUserRoles = async () => {
    try {
      const q = query(collection(db, 'userRoles'), orderBy('assignedAt', 'desc'));
      const snapshot = await getDocs(q);
      setUserRoles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error loading user roles:', error);
    }
  };

  const checkLoginAnomaly = async (email, ip, userAgent) => {
    try {
      const userRef = doc(db, 'users', email);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const lastLogin = userData.lastLogin?.toDate?.() || new Date(userData.lastLogin);
        const now = new Date();
        const timeDiff = now - lastLogin;
        const isNewDevice = userData.lastUserAgent !== userAgent;
        const isNewLocation = userData.lastIP !== ip;

        if (timeDiff < 60000 && isNewDevice) {
          await logAnomaly({
            type: 'rapid_login_new_device',
            severity: 'high',
            email,
            ip,
            userAgent,
            description: 'Multiple logins from different devices in a short time'
          });
        }

        if (isNewDevice || isNewLocation) {
          await sendAnomalyAlert({
            to: 'kaigwaakram123@gmail.com',
            subject: 'Login Anomaly Detected - MediDocs',
            message: `A login was detected from a new device or location for user: ${email}`,
            eventType: 'Login Anomaly',
            userEmail: email,
            userName: userData.name || 'Unknown'
          });
        }

        await updateDoc(userRef, {
          lastLogin: serverTimestamp(),
          lastIP: ip,
          lastUserAgent: userAgent,
          loginCount: (userData.loginCount || 0) + 1
        });
      }
    } catch (error) {
      console.error('Error checking anomaly:', error);
    }
  };

  const logAnomaly = async (anomalyData) => {
    try {
      const anomalyRef = await setDoc(doc(collection(db, 'anomalies')), {
        ...anomalyData,
        timestamp: serverTimestamp()
      });
      setAlerts(prev => [{ id: anomalyRef.id, ...anomalyData }, ...prev]);
      return anomalyRef;
    } catch (error) {
      console.error('Error logging anomaly:', error);
    }
  };

  const sendAnomalyAlert = async (emailData) => {
    try {
      await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });
    } catch (error) {
      console.error('Error sending anomaly alert:', error);
    }
  };

  const logAudit = async (action, details) => {
    if (!user) return;
    try {
      const auditRef = await setDoc(doc(collection(db, 'auditLog')), {
        userId: user.uid,
        userEmail: user.email,
        action,
        details,
        timestamp: serverTimestamp()
      });
      setAuditLogs(prev => [{ id: auditRef.id, action, details, timestamp: new Date() }, ...prev]);
    } catch (error) {
      console.error('Error logging audit:', error);
    }
  };

  const loadAuditLogs = async (limitCount = 50) => {
    try {
      const q = query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      setAuditLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const assignRole = async (userId, role, assignedBy) => {
    try {
      const roleData = {
        userId,
        role,
        assignedBy,
        assignedAt: serverTimestamp()
      };
      const docRef = await setDoc(doc(collection(db, 'userRoles')), roleData);
      setUserRoles(prev => [...prev, { id: docRef.id, ...roleData }]);
      addToast(`Role "${role}" assigned successfully`, 'success');
      return docRef;
    } catch (error) {
      console.error('Error assigning role:', error);
      addToast('Failed to assign role', 'error');
    }
  };

  const removeRole = async (roleId) => {
    try {
      await deleteDoc(doc(db, 'userRoles', roleId));
      setUserRoles(prev => prev.filter(r => r.id !== roleId));
      addToast('Role removed', 'success');
    } catch (error) {
      console.error('Error removing role:', error);
    }
  };

  const value = {
    alerts,
    auditLogs,
    userRoles,
    checkLoginAnomaly,
    logAnomaly,
    sendAnomalyAlert,
    logAudit,
    loadAuditLogs,
    assignRole,
    removeRole
  };

  return (
    <AnomalyContext.Provider value={value}>
      {children}
    </AnomalyContext.Provider>
  );
};

export default AnomalyContext;
