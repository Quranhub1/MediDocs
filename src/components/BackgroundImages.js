import React, { useState, useEffect } from 'react';

const BackgroundImages = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = [
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504813180591-4a21e2030201?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1579684385122-6d0c12c48f2a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80'
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
            alt={`Medical background ${index + 1}`}
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
