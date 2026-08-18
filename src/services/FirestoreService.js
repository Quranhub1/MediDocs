// Proration calculation for plan changes
export const calculateProration = async (userId, currentPlan, newPlan, currentExpiryDate) => {
  try {
    const userDocRef = docRef(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    const currentExpiry = currentExpiryDate || (userData.subscriptionExpiry ? 
      (userData.subscriptionExpiry.toDate ? userData.subscriptionExpiry.toDate() : new Date(userData.subscriptionExpiry)) : 
      new Date());
    
    const now = new Date();
    
    // If not subscribed or expired, no proration needed
    if (!userData.subscriptionApproved || 
        userData.subscriptionStatus !== 'active' || 
        currentExpiry <= now) {
      return { success: true, prorationAmount: 0, message: 'No active subscription to prorate' };
    }
    
    // Get plan details
    const currentPlanDetails = SUBSCRIPTION_PLANS[currentPlan];
    const newPlanDetails = SUBSCRIPTION_PLANS[newPlan];
    
    if (!currentPlanDetails || !newPlanDetails) {
      return { success: false, error: 'Invalid plan specified' };
    }
    
    // Calculate time remaining in current subscription
    const timeRemainingMs = currentExpiry.getTime() - now.getTime();
    const timeRemainingDays = Math.max(0, timeRemainingMs / (1000 * 60 * 60 * 24));
    
    // Calculate daily rate for current plan
    const currentDailyRate = currentPlanDetails.amount / currentPlanDetails.duration;
    
    // Calculate value of remaining time
    const remainingValue = timeRemainingDays * currentDailyRate;
    
    // Calculate what the remaining time would be worth in new plan
    const newDailyRate = newPlanDetails.amount / newPlanDetails.duration;
    const equivalentNewPlanDays = remainingValue / newDailyRate;
    
    // Calculate new expiry date based on equivalent time in new plan
    const newExpiryDate = new Date(now.getTime() + (equivalentNewPlanDays * 1000 * 60 * 60 * 24));
    
    // Calculate any additional amount owed or refund due
    // If new plan is more expensive per day, user owes difference
    // If new plan is less expensive per day, user gets credit
    const dailyRateDifference = newDailyRate - currentDailyRate;
    const prorationAmount = dailyRateDifference * timeRemainingDays;
    
    return {
      success: true,
      prorationAmount: Math.round(prorationAmount * 100) / 100, // Round to 2 decimal places
      newExpiryDate: newExpiryDate.toISOString(),
      timeRemainingDays: Math.round(timeRemainingDays * 100) / 100,
      currentDailyRate: Math.round(currentDailyRate * 100) / 100,
      newDailyRate: Math.round(newDailyRate * 100) / 100,
      message: prorationAmount > 0 
        ? `You owe UGX ${prorationAmount.toFixed(0)} for upgrading to a more expensive plan`
        : prorationAmount < 0
        ? `You'll receive a credit of UGX ${Math.abs(prorationAmount).toFixed(0)} for downgrading to a less expensive plan`
        : 'No proration amount - plans have equivalent daily rates'
    };
  } catch (error) {
    console.error('Error calculating proration:', error);
    return { success: false, error: error.message };
  }
};

// Record subscription analytics event
export const recordSubscriptionEvent = async (userId, eventType, eventData = {}) => {
  try {
    const eventsRef = collection(db, 'subscription_events');
    await addDoc(eventsRef, {
      userId,
      eventType,
      timestamp: serverTimestamp(),
      ...eventData
    });
    return { success: true };
  } catch (error) {
    console.error('Error recording subscription event:', error);
    return { success: false, error: error.message };
  }
};

// Record document view for usage analytics
export const recordDocumentView = async (userId, documentId, courseId, semesterId, unitId) => {
  try {
    const viewsRef = collection(db, 'document_views');
    await addDoc(viewsRef, {
      userId,
      documentId,
      courseId,
      semesterId,
      unitId,
      viewedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error recording document view:', error);
    return { success: false, error: error.message };
  }
};

// Get user's subscription usage analytics
export const getUserSubscriptionAnalytics = async (userId, days = 30) => {
  try {
    const viewsRef = collection(db, 'document_views');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const q = query(
      viewsRef,
      where('userId', '==', userId),
      where('viewedAt', '>=', startDate)
    );
    
    const snapshot = await getDocs(q);
    const views = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      viewedAt: doc.data().viewedAt ? 
        (doc.data().viewedAt.toDate ? doc.data().viewedAt.toDate() : new Date(doc.data().viewedAt)) : 
        new Date()
    }));
    
    // Group by course/semester/unit
    const usageByCourse = {};
    views.forEach(view => {
      const key = `${view.courseId || 'unknown'}-${view.semesterId || 'unknown'}-${view.unitId || 'unknown'}`;
      if (!usageByCourse[key]) {
        usageByCourse[key] = {
          courseId: view.courseId,
          semesterId: view.semesterId,
          unitId: view.unitId,
          count: 0,
          lastViewed: view.viewedAt
        };
      }
      usageByCourse[key].count++;
      if (view.viewedAt > usageByCourse[key].lastViewed) {
        usageByCourse[key].lastViewed = view.viewedAt;
      }
    });
    
    return {
      success: true,
      totalViews: views.length,
      viewsPerDay: Math.round((views.length / days) * 100) / 100,
      usageByCourse: Object.values(usageByCourse),
      periodDays: days
    };
  } catch (error) {
    console.error('Error getting user subscription analytics:', error);
    return { success: false, error: error.message };
  }
};

// Record referral
export const recordReferral = async (referrerId, refereeId, referralType = 'signup') => {
  try {
    const referralsRef = collection(db, 'referrals');
    await addDoc(referralsRef, {
      referrerId,
      refereeId,
      referralType,
      timestamp: serverTimestamp(),
      completed: false
    });
    return { success: true };
  } catch (error) {
    console.error('Error recording referral:', error);
    return { success: false, error: error.message };
  }
};

// Complete referral (when referee subscribes)
export const completeReferral = async (referralId, rewardAmount = 5000) => {
  try {
    const referralRef = docRef(db, 'referrals', referralId);
    const referralDoc = await getDoc(referralRef);
    
    if (!referralDoc.exists()) {
      return { success: false, error: 'Referral not found' };
    }
    
    const referralData = referralDoc.data();
    
    // Update referral as completed
    await updateDoc(referralRef, {
      completed: true,
      completedAt: serverTimestamp(),
      rewardAmount: rewardAmount
    });
    
    // Award credit to referrer (could be stored as a balance or applied to next invoice)
    // For now, we'll just record the event
    await recordSubscriptionEvent(referralData.referrerId, 'referral_reward', {
      referralId: referralId,
      refereeId: referralData.refereeId,
      rewardAmount: rewardAmount,
      rewardType: 'credit'
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error completing referral:', error);
    return { success: false, error: error.message };
  }
};

// Create gift subscription
export const createGiftSubscription = async (giftData) => {
  try {
    const { senderId, recipientEmail, plan, message } = giftData;
    
    // Find recipient by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', recipientEmail));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'No user found with that email' };
    }
    
    const recipientDoc = snapshot.docs[0];
    const recipientId = recipientDoc.id;
    const recipientData = recipientDoc.data();
    
    // Create gift record
    const giftsRef = collection(db, 'gift_subscriptions');
    const giftDocRef = await addDoc(giftsRef, {
      senderId,
      recipientId: recipientId,
      plan: plan,
      message: message || '',
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    // Notify recipient
    try {
      const response = await fetch('/api/notify/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `You've received a MediDocs gift subscription!`,
          message: `You have been gifted a ${SUBSCRIPTION_PLANS[plan]?.label || plan} subscription to MediDocs!\n\n${message || ''}\n\nTo accept this gift, please log into your account and visit the subscription page.`,
          eventType: 'Gift Subscription',
          userEmail: recipientEmail,
          userName: recipientData.name || 'there'
        })
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('Gift subscription email notification failed:', data.error || response.statusText);
      }
    } catch (emailError) {
      console.error('Failed to send gift subscription notification email:', emailError);
    }
    
    return { success: true, giftId: giftDocRef.id };
  } catch (error) {
    console.error('Error creating gift subscription:', error);
    return { success: false, error: error.message };
  }
};

// Accept gift subscription
export const acceptGiftSubscription = async (giftId, userId) => {
  try {
    const giftRef = docRef(db, 'gift_subscriptions', giftId);
    const giftDoc = await getDoc(giftRef);
    
    if (!giftDoc.exists()) {
      return { success: false, error: 'Gift not found' };
    }
    
    const giftData = giftDoc.data();
    
    if (giftData.recipientId !== userId) {
      return { success: false, error: 'This gift is not for you' };
    }
    
    if (giftData.status !== 'pending') {
      return { success: false, error: 'This gift has already been processed' };
    }
    
    // Calculate expiry date based on plan
    const planDetails = SUBSCRIPTION_PLANS[giftData.plan];
    if (!planDetails) {
      return { success: false, error: 'Invalid plan in gift' };
    }
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + planDetails.duration);
    
    // Update user's subscription
    const userDocRef = docRef(db, 'users', userId);
    await updateDoc(userDocRef, {
      subscriptionApproved: true,
      subscriptionStatus: 'active',
      subscriptionPlan: giftData.plan,
      subscriptionExpiry: expiryDate.toISOString(),
      giftSubscriptionId: giftId
    });
    
    // Update gift status
    await updateDoc(giftRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp()
    });
    
    // Record event
    await recordSubscriptionEvent(userId, 'gift_subscription_accepted', {
      giftId: giftId,
      senderId: giftData.senderId,
      plan: giftData.plan
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error accepting gift subscription:', error);
    return { success: false, error: error.message };
  }
};

// Record payment failure
export const recordPaymentFailure = async (userId, paymentData, failureReason) => {
  try {
    const failuresRef = collection(db, 'payment_failures');
    await addDoc(failuresRef, {
      userId,
      paymentData: {
        ...paymentData,
        // Don't store sensitive payment info
        amount: paymentData.amount,
        plan: paymentData.plan,
        reference: paymentData.reference
      },
      failureReason: failureReason,
      attemptedAt: serverTimestamp()
    });
    
    // Update user status if needed (e.g., after multiple failures)
    const failureCountDoc = await getDoc(docRef(db, 'payment_failure_counts', userId));
    let failureCount = 1;
    
    if (failureCountDoc.exists()) {
      failureCount = failureCountDoc.data().count + 1;
    }
    
    await setDoc(docRef(db, 'payment_failure_counts', userId), {
      count: failureCount,
      lastFailure: serverTimestamp()
    });
    
    // If 3 consecutive failures, suspend subscription
    if (failureCount >= 3) {
      const userDocRef = docRef(db, 'users', userId);
      await updateDoc(userDocRef, {
        subscriptionStatus: 'past_due',
        subscriptionApproved: false
      });
      
      // Notify user
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [userData.email],
              subject: 'Important: Your MediDocs subscription payment is past due',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Subscription Payment Past Due</h2>
                  <p>Hi ${userData.name || 'user'},</p>
                  <p>We've noticed that your recent payment attempts have failed. To avoid interruption of service, please update your payment method.</p>
                  <p>Your subscription will be suspended if payment is not received within 7 days.</p>
                  <a href="https://yourdomain.com/subscription" 
                     style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Update Payment Method
                  </a>
                </div>
              `
            })
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment failure notification email:', emailError);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error recording payment failure:', error);
    return { success: false, error: error.message };
  }
};

// Check if user is in grace period
export const checkGracePeriod = async (userId) => {
  try {
    const userDocRef = docRef(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    
    // Check if subscription is expired but within grace period (e.g., 3 days)
    if (userData.subscriptionExpiry) {
      const expiryDate = userData.subscriptionExpiry.toDate ? 
        userData.subscriptionExpiry.toDate() : 
        new Date(userData.subscriptionExpiry);
      
      const now = new Date();
      const gracePeriodDays = 3; // 3 day grace period
      const gracePeriodEnd = new Date(expiryDate.getTime() + (gracePeriodDays * 1000 * 60 * 60 * 24));
      
      const isExpired = expiryDate <= now;
      const isInGracePeriod = !isExpired && now <= gracePeriodEnd;
      
      return {
        success: true,
        isExpired: isExpired,
        isInGracePeriod: isInGracePeriod,
        gracePeriodEnds: gracePeriodEnd.toISOString(),
        daysUntilGracePeriodEnds: Math.max(0, Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        canAccess: isInGracePeriod || !isExpired // Can access if not expired or in grace period
      };
    }
    
    return {
      success: true,
      isExpired: true,
      isInGracePeriod: false,
      canAccess: false
    };
  } catch (error) {
    console.error('Error checking grace period:', error);
    return { success: false, error: error.message };
  }
};

// Extend subscription due to grace period or payment delay
export const extendSubscriptionGracePeriod = async (userId, extensionDays = 3) => {
  try {
    const userDocRef = docRef(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    
    let newExpiryDate;
    if (userData.subscriptionExpiry) {
      const currentExpiry = userData.subscriptionExpiry.toDate ? 
        userData.subscriptionExpiry.toDate() : 
        new Date(userData.subscriptionExpiry);
      
      newExpiryDate = new Date(currentExpiry.getTime() + (extensionDays * 1000 * 60 * 60 * 24));
    } else {
      // If no expiry date, set from now
      newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + extensionDays);
    }
    
    // Update subscription
    await updateDoc(userDocRef, {
      subscriptionExpiry: newExpiryDate.toISOString(),
      subscriptionStatus: 'active', // Keep active during grace period
      gracePeriodExtended: true,
      gracePeriodExtendedAt: serverTimestamp(),
      gracePeriodExtensionDays: extensionDays
    });
    
    return { 
      success: true, 
      newExpiryDate: newExpiryDate.toISOString(),
      message: `Subscription extended by ${extensionDays} days due to grace period`
    };
  } catch (error) {
    console.error('Error extending subscription grace period:', error);
    return { success: false, error: error.message };
  }
};