import React, { useState, useEffect } from 'react';

const BackgroundImages = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = [
    'https://picsum.photos/seed/med1/800/600',
    'https://picsum.photos/seed/med2/800/600',
    'https://picsum.photos/seed/med3/800/600',
    'https://picsum.photos/seed/med4/800/600',
    'https://picsum.photos/seed/med5/800/600',
    'https://picsum.photos/seed/med6/800/600',
    'https://picsum.photos/seed/med7/800/600',
    'https://picsum.photos/seed/med8/800/600'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 40000);

    return () => clearInterval(interval);
  }, [images.length]);

  const floatingShapes = [
    { class: 'top-20 left-10 w-20 h-20', delay: '0s' },
    { class: 'top-40 right-20 w-16 h-16', delay: '2s' },
    { class: 'bottom-32 left-1/4 w-12 h-12', delay: '4s' },
    { class: 'bottom-20 right-1/3 w-24 h-24', delay: '1s' },
    { class: 'top-1/3 left-1/3 w-8 h-8', delay: '3s' },
  ];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900"></div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 z-10"></div>
      
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
            loading="lazy"
          />
        </div>
      ))}
      
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
