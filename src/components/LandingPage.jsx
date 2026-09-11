import React, { useState, useEffect } from 'react';
import './LandingPage.css';

export default function LandingPage({ onGoToLogin }) {
  // Fungsi untuk semak sama ada skrin patut guna paparan Potret (Mobile & Tablet/iPad Portrait)
  const checkIsPortraitOrMobile = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;

    // Gunakan gambar mobile jika lebar <= 1024px DALAM keadaan potret, ATAU skrin telefon biasa (<= 768px)
    return (isPortrait && width <= 1024) || width <= 768;
  };

  const [isMobile, setIsMobile] = useState(checkIsPortraitOrMobile());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsPortraitOrMobile());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const bgImage = isMobile
    ? `${process.env.PUBLIC_URL}/HomepageMobile.png`
    : `${process.env.PUBLIC_URL}/Homepage.png`;

  return (
    <div 
      className="embed-landing-container"
      style={{
        backgroundImage: `url(${bgImage})`
      }}
    >
      {/* Butang Kuning Timbul Tepat */}
      <button 
        className="animated-login-btn" 
        onClick={onGoToLogin}
        title="Click to Log In"
        aria-label="Log In"
      >
        LOGIN
      </button>
    </div>
  );
}