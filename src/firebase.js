// Firebase configuration for Zenith Assets
// Using LOCAL STORAGE ONLY (Firebase disabled due to permission issues)

// Helper function to get user document from localStorage
export const getUser = async (phone) => {
  try {
    const userData = localStorage.getItem('user_' + phone);
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

// Create or update user in localStorage
export const createUser = async (userData) => {
  try {
    const { phone, ...rest } = userData;
    localStorage.setItem('user_' + phone, JSON.stringify({ phone, ...rest }));
    return { success: true, id: phone };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message };
  }
};

// Update user balance and other fields
export const updateUserBalance = async (phone, newBalance, field = 'balance') => {
  try {
    const userData = localStorage.getItem('user_' + phone);
    if (userData) {
      const user = JSON.parse(userData);
      user[field] = newBalance;
      localStorage.setItem('user_' + phone, JSON.stringify(user));
      
      // Also update current user if logged in
      const currentUser = localStorage.getItem('user');
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed.phone === phone) {
          parsed[field] = newBalance;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      }
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error("Error updating balance:", error);
    return { success: false };
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('user_')) {
        const userData = localStorage.getItem(key);
        users.push(JSON.parse(userData));
      }
    }
    return users;
  } catch (error) {
    console.error("Error getting all users:", error);
    return [];
  }
};

// Add deposit
export const addDeposit = async (depositData) => {
  try {
    const deposits = JSON.parse(localStorage.getItem('deposits_' + depositData.userId) || '[]');
    deposits.push(depositData);
    localStorage.setItem('deposits_' + depositData.userId, JSON.stringify(deposits));
    return { success: true };
  } catch (error) {
    console.error("Error adding deposit:", error);
    return { success: false };
  }
};

// Get all deposits for a user
export const getUserDeposits = async (phone) => {
  try {
    return JSON.parse(localStorage.getItem('deposits_' + phone) || '[]');
  } catch (error) {
    console.error("Error getting deposits:", error);
    return [];
  }
};

// Add withdrawal
export const addWithdrawal = async (withdrawalData) => {
  try {
    const withdrawals = JSON.parse(localStorage.getItem('withdrawals_' + withdrawalData.userId) || '[]');
    withdrawals.push(withdrawalData);
    localStorage.setItem('withdrawals_' + withdrawalData.userId, JSON.stringify(withdrawals));
    
    // Also save to admin withdrawals list
    const adminWithdrawals = JSON.parse(localStorage.getItem('all_withdrawals') || '[]');
    adminWithdrawals.push(withdrawalData);
    localStorage.setItem('all_withdrawals', JSON.stringify(adminWithdrawals));
    
    return { success: true };
  } catch (error) {
    console.error("Error adding withdrawal:", error);
    return { success: false };
  }
};

// Get all withdrawals for a user
export const getUserWithdrawals = async (phone) => {
  try {
    return JSON.parse(localStorage.getItem('withdrawals_' + phone) || '[]');
  } catch (error) {
    console.error("Error getting withdrawals:", error);
    return [];
  }
};

// Get all withdrawals (for admin)
export const getAllWithdrawals = async () => {
  try {
    return JSON.parse(localStorage.getItem('all_withdrawals') || '[]');
  } catch (error) {
    console.error("Error getting all withdrawals:", error);
    return [];
  }
};

// Add investment
export const addInvestment = async (investmentData) => {
  try {
    const investments = JSON.parse(localStorage.getItem('investments_' + investmentData.userId) || '[]');
    investments.push(investmentData);
    localStorage.setItem('investments_' + investmentData.userId, JSON.stringify(investments));
    return { success: true };
  } catch (error) {
    console.error("Error adding investment:", error);
    return { success: false };
  }
};

// Get user investments
export const getUserInvestments = async (phone) => {
  try {
    return JSON.parse(localStorage.getItem('investments_' + phone) || '[]');
  } catch (error) {
    console.error("Error getting investments:", error);
    return [];
  }
};

// Add transaction
export const addTransaction = async (transactionData) => {
  try {
    const transactions = JSON.parse(localStorage.getItem('transactions_' + transactionData.userId) || '[]');
    transactions.push(transactionData);
    localStorage.setItem('transactions_' + transactionData.userId, JSON.stringify(transactions));
    return { success: true };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false };
  }
};

// Get all transactions for a user
export const getUserTransactions = async (phone) => {
  try {
    return JSON.parse(localStorage.getItem('transactions_' + phone) || '[]');
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
};

// Subscribe to user changes (not implemented for localStorage)
export const subscribeToUser = (phone, callback) => {
  // For localStorage, just call callback with current user
  const userData = localStorage.getItem('user_' + phone);
  if (userData) {
    callback(JSON.parse(userData));
  }
  // Return empty unsubscribe function
  return () => {};
};
