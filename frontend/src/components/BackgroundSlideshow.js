import React, { useState, useEffect, useCallback, useRef } from 'react';

// Background image manifest - categorized by folder
const BACKGROUND_CATEGORIES = {
  random: {
    label: 'Random',
    images: [
      '/backgrounds/random/280046.jpg',
      '/backgrounds/random/4k-steam-wallpaper.jpg',
      '/backgrounds/random/call-of-duty-2560x1440.jpg',
      '/backgrounds/random/call-of-duty-black.jpg',
      '/backgrounds/random/call-of-duty-ww2.jpg',
      '/backgrounds/random/gaming-pc-master-race.jpg',
      '/backgrounds/random/pirate-boats.jpg',
      '/backgrounds/random/wp2626296.png',
      '/backgrounds/random/wp2626302.jpg',
      '/backgrounds/random/YI0OjR.jpg'
    ]
  },
  arma3: {
    label: 'Arma 3',
    images: [
      '/backgrounds/arma3/arma-3-x0.jpg',
      '/backgrounds/arma3/EJTYfT5UEAUC4WI.jpg',
      '/backgrounds/arma3/hq720.jpg',
      '/backgrounds/arma3/military-helicopter-sunset.jpg',
      '/backgrounds/arma3/video-game-arma3.jpg'
    ]
  },
  arma_reforger: {
    label: 'Arma Reforger',
    images: [
      '/backgrounds/arma_reforger/06.jpg',
      '/backgrounds/arma_reforger/arma-reforger-update.jpg'
    ]
  }
};

// Get all images combined
function getAllImages() {
  const all = [];
  Object.values(BACKGROUND_CATEGORIES).forEach(cat => {
    all.push(...cat.images);
  });
  return all;
}

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BackgroundSlideshow({ intervalSeconds = 15, category = 'all' }) {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef(null);

  // Build image list based on category - only when category changes
  useEffect(() => {
    let list;
    if (category === 'all') {
      list = shuffle(getAllImages());
    } else if (BACKGROUND_CATEGORIES[category]) {
      list = shuffle(BACKGROUND_CATEGORIES[category].images);
    } else {
      list = shuffle(getAllImages());
    }
    setImages(list);
    setCurrentIndex(0);
    setNextIndex(list.length > 1 ? 1 : 0);
    setTransitioning(false);
  }, [category]);

  // Preload all images at full quality
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);

  // Single stable timer for advancing slides
  // Uses setTimeout chain instead of setInterval for precise per-cycle control
  useEffect(() => {
    if (images.length <= 1) return;
    
    let timeoutId = null;
    let active = true;

    const scheduleNext = () => {
      if (!active) return;
      
      // Wait the full display interval before starting any transition
      timeoutId = setTimeout(() => {
        if (!active) return;
        
        // Start crossfade
        setTransitioning(true);

        // After crossfade completes, swap layers and schedule the next one
        setTimeout(() => {
          if (!active) return;
          setCurrentIndex(prev => {
            const next = (prev + 1) % images.length;
            setNextIndex((next + 1) % images.length);
            return next;
          });
          setTransitioning(false);
          
          // Schedule the next cycle
          scheduleNext();
        }, 1200);
      }, intervalSeconds * 1000);
    };

    // Start the first cycle
    scheduleNext();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [intervalSeconds, images]); // eslint-disable-line

  if (images.length === 0) return null;

  return (
    <div className="bg-slideshow" data-testid="background-slideshow">
      {/* Current image layer */}
      <div
        className={`bg-slide bg-slide-current ${transitioning ? 'bg-slide-out' : ''}`}
        style={{ backgroundImage: `url(${images[currentIndex]})` }}
      />
      {/* Next image layer (underneath, revealed during fade) */}
      <div
        className="bg-slide bg-slide-next"
        style={{ backgroundImage: `url(${images[nextIndex]})` }}
      />
      {/* Glass overlay */}
      <div className="bg-glass-overlay" />
    </div>
  );
}

export { BACKGROUND_CATEGORIES, getAllImages };
