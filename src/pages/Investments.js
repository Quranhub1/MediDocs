import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Investments = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [investAmount, setInvestAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInvestments, setUserInvestments] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('zenith_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      // Load user's investments
      const investments = JSON.parse(localStorage.getItem('investments_' + parsedUser.phone) || '[]');
      setUserInvestments(investments);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Investment Packages with specific ranges and daily returns
  const investmentPackages = [
    {
      id: 1,
      name: 'Starter Package',
      description: 'Perfect for beginners starting their investment journey',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
      minAmount: 20000,
      maxAmount: 500000,
      duration: '30 days',
      dailyReturns: '3%',
      totalReturns: '90%',
      category: 'Starter'
    },
    {
      id: 2,
      name: 'Growth Package',
      description: 'Medium-term investment with steady returns',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      minAmount: 100000,
      maxAmount: 1000000,
      duration: '45 days',
      dailyReturns: '4%',
      totalReturns: '180%',
      category: 'Growth'
    },
    {
      id: 3,
      name: 'Premium Package',
      description: 'Premium investment package for serious investors',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
      minAmount: 150000,
      maxAmount: 2000000,
      duration: '60 days',
      dailyReturns: '5%',
      totalReturns: '300%',
      category: 'Premium'
    },
    {
      id: 4,
      name: 'Elite Package',
      description: 'High-yield investment for maximum returns',
      image: 'https://images.unsplash.com/photo-1565514020176-6c2235c8e509?w=800',
      minAmount: 250000,
      maxAmount: 5000000,
      duration: '90 days',
      dailyReturns: '6%',
      totalReturns: '540%',
      category: 'Elite'
    },
    {
      id: 5,
      name: 'Platinum Package',
      description: 'VIP investment with exclusive benefits',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
      minAmount: 500000,
      maxAmount: 10000000,
      duration: '120 days',
      dailyReturns: '7%',
      totalReturns: '840%',
      category: 'Platinum'
    },
    {
      id: 6,
      name: 'Diamond Package',
      description: 'Ultimate investment for elite investors',
      image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800',
      minAmount: 1000000,
      maxAmount: 50000000,
      duration: '180 days',
      dailyReturns: '10%',
      totalReturns: '1800%',
      category: 'Diamond'
    }
  ];

  // Check if user has already invested in a package
  const hasInvestedInPackage = (packageId) => {
    return userInvestments.some(inv => inv.packageId === packageId && inv.status === 'active');
  };

  const handleInvest = (pkg) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check if user has already invested in this package
    if (hasInvestedInPackage(pkg.id)) {
      alert(`You have already invested in ${pkg.name}. You can only invest once in each package.`);
      return;
    }
    
    setSelectedPackage(pkg);
    setShowModal(true);
  };

  const submitInvestment = async () => {
    if (!investAmount || isNaN(investAmount)) {
      alert('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(investAmount);
    if (amount < selectedPackage.minAmount) {
      alert(`Minimum investment is UGX ${selectedPackage.minAmount.toLocaleString()}`);
      return;
    }
    if (amount > selectedPackage.maxAmount) {
      alert(`Maximum investment is UGX ${selectedPackage.maxAmount.toLocaleString()}`);
      return;
    }
    if (amount > user.balance) {
      alert('Insufficient balance. Please deposit funds first.');
      return;
    }

    setLoading(true);

    // Calculate daily returns
    const dailyReturnRate = parseFloat(selectedPackage.dailyReturns) / 100;
    const dailyEarnings = amount * dailyReturnRate;
    const totalDays = parseInt(selectedPackage.duration);
    const expectedReturn = amount + (dailyEarnings * totalDays);

    // Create investment record
    const investment = {
      id: Date.now(),
      userId: user.phone,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      amount: amount,
      dailyReturns: selectedPackage.dailyReturns,
      dailyEarnings: dailyEarnings,
      totalReturns: selectedPackage.totalReturns,
      expectedReturn: expectedReturn,
      duration: selectedPackage.duration,
      totalDays: totalDays,
      status: 'active',
      createdAt: new Date().toISOString(),
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString()
    };

    // Save to local storage
    const investments = JSON.parse(localStorage.getItem('investments_' + user.phone) || '[]');
    investments.push(investment);
    localStorage.setItem('investments_' + user.phone, JSON.stringify(investments));
    
    // Update user investments state
    setUserInvestments(investments);

    // Update user balance
    const newBalance = user.balance - amount;
    user.balance = newBalance;
    localStorage.setItem('zenith_user', JSON.stringify(user));

    setLoading(false);
    setShowModal(false);
    alert(`Investment of UGX ${amount.toLocaleString()} in ${selectedPackage.name} successful!\n\nDaily Earnings: UGX ${dailyEarnings.toLocaleString()}\nExpected Total Return: UGX ${expectedReturn.toLocaleString()}\nDuration: ${selectedPackage.duration}`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Investment Packages
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Choose your investment plan and start earning daily returns
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <p className="text-2xl font-bold">UGX 20K</p>
                <p className="text-sm text-blue-200">Minimum</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <p className="text-2xl font-bold">10%</p>
                <p className="text-sm text-blue-200">Max Daily</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <p className="text-2xl font-bold">{investmentPackages.length}</p>
                <p className="text-sm text-blue-200">Packages</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Balance Banner */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500">Your Balance</p>
              <p className="text-2xl font-bold text-green-600">
                UGX {user?.balance?.toLocaleString() || 0}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/deposit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                Deposit Funds
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Packages */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Available Investment Packages
        </h2>
        <p className="text-gray-600 mb-8">
          Each package can be invested in only once. Choose wisely!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {investmentPackages.map((pkg, index) => {
            const isInvested = hasInvestedInPackage(pkg.id);
            
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${isInvested ? 'opacity-75' : ''}`}
              >
                <div className="relative h-48">
                  <img
                    src={pkg.image}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                  {isInvested ? (
                    <div className="absolute top-4 right-4 bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Invested
                    </div>
                  ) : (
                    <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {pkg.dailyReturns} Daily
                    </div>
                  )}
                  <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                    {pkg.category}
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {pkg.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {pkg.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Min - Max</p>
                      <p className="font-semibold text-sm">
                        {pkg.minAmount.toLocaleString()} - {(pkg.maxAmount / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-semibold text-sm">{pkg.duration}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600">Daily Returns</p>
                      <p className="font-semibold text-green-700">{pkg.dailyReturns}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600">Total Returns</p>
                      <p className="font-semibold text-blue-700">{pkg.totalReturns}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleInvest(pkg)}
                    disabled={isInvested}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      isInvested
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isInvested ? 'Already Invested' : 'Invest Now'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* User's Active Investments */}
      {userInvestments.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-8 pb-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Your Active Investments
          </h2>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Return</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userInvestments.filter(inv => inv.status === 'active').map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{inv.packageName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600 font-semibold">
                      UGX {inv.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600">
                      {inv.dailyReturns} (UGX {inv.dailyEarnings.toLocaleString()})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-blue-600 font-semibold">
                      UGX {inv.expectedReturn.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{inv.duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investment Modal */}
      {showModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold mb-4">Invest in {selectedPackage.name}</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Minimum:</span>
                <span className="font-medium">UGX {selectedPackage.minAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Maximum:</span>
                <span className="font-medium">UGX {selectedPackage.maxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Daily Returns:</span>
                <span className="font-medium text-green-600">{selectedPackage.dailyReturns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Returns:</span>
                <span className="font-medium text-blue-600">{selectedPackage.totalReturns}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{selectedPackage.duration}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Amount (UGX)
              </label>
              <input
                type="number"
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                placeholder={`Min: ${selectedPackage.minAmount}`}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {investAmount && parseFloat(investAmount) >= selectedPackage.minAmount && (
              <div className="bg-green-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800 font-medium">Estimated Returns:</p>
                <p className="text-lg font-bold text-green-700">
                  Daily: UGX {(parseFloat(investAmount) * parseFloat(selectedPackage.dailyReturns) / 100).toLocaleString()}
                </p>
                <p className="text-sm text-green-600">
                  Total after {selectedPackage.duration}: UGX {(
                    parseFloat(investAmount) + 
                    (parseFloat(investAmount) * parseFloat(selectedPackage.dailyReturns) / 100 * parseInt(selectedPackage.duration))
                  ).toLocaleString()}
                </p>
              </div>
            )}
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitInvestment}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Investment'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Investments;
