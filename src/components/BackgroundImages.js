import React, { useState, useEffect } from 'react';

const BackgroundImages = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
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

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={image}
            alt={`Medical ${index + 1}`}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.8)' }}
          />
        </div>
      ))}
    </div>
  );
};

export default BackgroundImages;
