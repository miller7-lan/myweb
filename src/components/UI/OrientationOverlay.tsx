import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

export const OrientationOverlay: React.FC = () => {
  const [show, setShow] = useState(false);

  // Use a slight delay to prevent flashing on initial load if orientation resolves quickly
  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
      
      // We only force landscape on mobile devices
      // If it's a desktop browser resized to portrait, we can ignore or let them be
      // But standard practice for mobile is checking userAgent or screen size
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      
      if (isPortrait && isMobile && isTouch) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020204]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center transition-opacity duration-500">
      <div className="mb-8 relative">
        <Smartphone size={56} className="text-gray-400 animate-[spin_3s_ease-in-out_infinite] rotate-90" />
      </div>
      <h2 className="text-xl font-medium text-white tracking-[0.2em] uppercase mb-4">
        Landscape Recommended
      </h2>
      <p className="text-sm text-gray-400 tracking-wider font-light leading-relaxed max-w-xs">
        为了获得最佳的 3D 星系漫游体验，请您关闭方向锁定，并将手机横置。
      </p>
    </div>
  );
};
