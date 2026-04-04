import { useState, useEffect, useRef } from 'react';
import './BannerCarousel.css';

const SLIDE_INTERVAL = 3500;

export default function BannerCarousel({ userName, ordersAhead = null, onOpenSpin }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  const banners = [
    {
      id: 'spin',
      gradient: 'linear-gradient(135deg, #ff4d6d 0%, #b34eff 100%)',
      glow: 'rgba(255,77,109,0.5)',
      emoji: '🎡',
      tag: 'SPIN & WIN',
      title: 'Spin the Wheel!',
      sub: 'Win free food, discounts & surprises',
      cta: 'Spin Now',
      ctaFn: onOpenSpin,
    },
    {
      id: 'trending',
      gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7c59f 100%)',
      glow: 'rgba(255,107,53,0.5)',
      emoji: '🔥',
      tag: 'TRENDING NOW',
      title: 'Hot & Popular',
      sub: 'Cheesy Burger, Peri Peri Fries & more…',
      cta: 'Explore',
    },
    {
      id: 'fast',
      gradient: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
      glow: 'rgba(0,180,216,0.5)',
      emoji: '⚡',
      tag: 'FAST DELIVERY',
      title: ordersAhead !== null && ordersAhead <= 3
        ? `Only ${ordersAhead} orders ahead!`
        : 'Lightning Fast',
      sub: ordersAhead !== null
        ? `~${(ordersAhead + 1) * 7} min estimated wait`
        : 'Most orders ready in under 15 mins',
      waitColor: ordersAhead <= 2 ? '#4ade80' : ordersAhead <= 4 ? '#fbbf24' : '#f87171',
    },
    {
      id: 'personal',
      gradient: 'linear-gradient(135deg, #ff85a2 0%, #ff4d6d 60%, #ff9a3c 100%)',
      glow: 'rgba(255,133,162,0.5)',
      emoji: '🍕',
      tag: 'JUST FOR YOU',
      title: `Hey ${userName || 'Foodie'}!`,
      sub: 'Craving something delicious today?',
      cta: 'Discover',
    },
  ];

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive(a => (a + 1) % banners.length);
    }, SLIDE_INTERVAL);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i) => { setActive(i); startTimer(); };

  return (
    <div className="bc-wrap">
      <div className="bc-track" style={{ transform: `translateX(-${active * 100}%)` }}>
        {banners.map((b, i) => (
          <div
            key={b.id}
            className="bc-slide"
            style={{ '--bg': b.gradient, '--glow': b.glow }}
          >
            {/* glow blob */}
            <div className="bc-blob" />

            <div className="bc-content">
              <span className="bc-tag">{b.tag}</span>
              <div className="bc-emoji">{b.emoji}</div>
              <h2 className="bc-title">{b.title}</h2>
              <p className="bc-sub">{b.sub}</p>
              {b.cta && (
                <button
                  className="bc-cta"
                  onClick={b.ctaFn || undefined}
                >
                  {b.cta} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="bc-dots">
        {banners.map((_, i) => (
          <button
            key={i}
            className={`bc-dot ${i === active ? 'bc-dot--active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
