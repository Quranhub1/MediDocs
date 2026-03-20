import React, { useState, useEffect } from 'react';

const BackgroundImages = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 30 medical education related images
  const images = [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800',
    'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800',
    'https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=800',
    'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800',
    'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
    'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=800',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800',
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
    'https://images.unsplash.com/photo-1626544827763-d516dce335e2?w=800',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800',
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800',
    'https://images.unsplash.com/photo-1554683316-39533d378338?w=800',
    'https://images.unsplash.com/photo-1584515933487-779824d29609?w=800',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
    'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=800',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800',
    'https://images.unsplash.com/photo-1551863535-6ed6a4c7c9b5?w=800',
    'https://images.unsplash.com/photo-1576091620696-5d7a185d6dbc?w=800',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800',
    'https://images.unsplash.com/photo-1576091622271-dc22937e6343?w=800',
    'https://images.unsplash.com/photo-1609726494499-27d3e942456c?w=800'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 40000); // 40 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  // Floating shapes animation
  const floatingShapes = [
    { class: 'top-20 left-10 w-20 h-20', delay: '0s' },
    { class: 'top-40 right-20 w-16 h-16', delay: '2s' },
    { class: 'bottom-32 left-1/4 w-12 h-12', delay: '4s' },
    { class: 'bottom-20 right-1/3 w-24 h-24', delay: '1s' },
    { class: 'top-1/3 left-1/3 w-8 h-8', delay: '3s' },
  ];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Gradient fallback background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900"></div>
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 z-10"></div>
      
      {/* Floating shapes */}
      <div className="absolute inset-0 z-5 overflow-hidden pointer-events-none">
        {floatingShapes.map((shape, index) => (
          <div
            key={index}
            className={`absolute ${shape.class} rounded-full bg-white/5 backdrop-blur-sm animate-float`}
            style={{
              animationDelay: shape.delay,
              animationDuration: '6s',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out'
            }}
          ></div>
        ))}
      </div>

      {/* Background images with smooth transition */}
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-[2000ms] ease-in-out ${
            index === currentImageIndex 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-105'
          }`}
        >
          <img
            src={image}
            alt={`Medical ${index + 1}`}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.7) saturate(1.1)' }}
            onLoad={() => setIsLoaded(true)}
          />
        </div>
      ))}
      
      {/* Animated particles/dots */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-teal-300/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-emerald-300/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-cyan-300/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/4 right-1/2 w-3 h-3 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>
    </div>
  );
};

export default BackgroundImages;
