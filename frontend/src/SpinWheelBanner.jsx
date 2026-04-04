import React, { useState, useRef } from 'react';
import './SpinWheelBanner.css';

const REWARDS = [
  { label: 'FREE\nDESSERT', emoji: '🍰', color: '#b34eff', light: '#e8c8ff' },
  { label: '20%\nOFF',      emoji: '🎉', color: '#00b8ff', light: '#c8f0ff' },
  { label: '₹100\nOFF',    emoji: '💸', color: '#ff9500', light: '#ffe4b0' },
  { label: 'BETTER\nLUCK', emoji: '🍀', color: '#ff3b30', light: '#ffc8c6' },
  { label: 'FREE\nDRINK',  emoji: '🥤', color: '#4cde78', light: '#b8f5cc' },
  { label: '15%\nOFF',     emoji: '⚡', color: '#ff4d6d', light: '#ffb3c6' },
];
const SLICE_DEG = 360 / REWARDS.length; // 60°

export default function SpinWheelBanner() {
  const [spinning, setSpinning]     = useState(false);
  const [rotation, setRotation]     = useState(0);
  const [reward, setReward]         = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [glowing, setGlowing]       = useState(false);
  const currentRot = useRef(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setShowResult(false);
    setGlowing(true);

    const randomIndex = Math.floor(Math.random() * REWARDS.length);
    // Pointer is at top (0°). Slice i occupies [i*60, (i+1)*60].
    // Centre of slice i = (i + 0.5) * 60. We want centre under pointer.
    // Wheel needs to rotate so that (i+0.5)*60 aligns with 0/360.
    const targetAngle = 360 - (randomIndex + 0.5) * SLICE_DEG;
    const fullSpins   = 360 * 7; // 7 full rotations for drama
    const finalRot    = currentRot.current + fullSpins + targetAngle - (currentRot.current % 360);

    currentRot.current = finalRot;
    setRotation(finalRot);

    setTimeout(() => {
      setSpinning(false);
      setGlowing(false);
      setReward(REWARDS[randomIndex]);
      setShowResult(true);
    }, 4200);
  };

  // Build conic gradient
  const conicStops = REWARDS.map((r, i) => {
    const s = i * SLICE_DEG, e = (i + 1) * SLICE_DEG;
    return `${r.color} ${s}deg ${e}deg`;
  }).join(', ');

  return (
    <>
      <div className={`spin-banner ${spinning ? 'spin-banner--active' : ''}`}>
        {/* Animated glow blobs */}
        <div className="swb-glow swb-glow1" />
        <div className="swb-glow swb-glow2" />

        {/* Left text */}
        <div className="spin-banner-left">
          <div className="spin-badge">★ FEELING LUCKY?</div>
          <h2 className="spin-banner-title">
            Spin &amp; Win<br /><span>Tasty Rewards!</span>
          </h2>
          <p className="spin-banner-subtitle">
            Spin the wheel and unlock exciting offers on your next order.
          </p>
          <button
            className={`spin-btn ${spinning ? 'spin-btn--spinning' : ''}`}
            onClick={spin}
            disabled={spinning}
          >
            <span className="spin-btn-icon">{spinning ? '🌀' : '🎯'}</span>
            <span>{spinning ? 'Spinning…' : 'Spin Now'}</span>
            {!spinning && <span className="spin-btn-arrow">›</span>}
          </button>
        </div>

        {/* Right wheel */}
        <div className="spin-banner-right">
          <div className={`wheel-wrapper ${glowing ? 'wheel-wrapper--glow' : ''}`}>
            {/* Outer ring glow */}
            <div className="wheel-ring-glow" />

            {/* The wheel */}
            <div
              className="wheel"
              style={{
                background: `conic-gradient(${conicStops})`,
                transform: `rotate(${rotation}deg)`,
                transition: spinning
                  ? 'transform 4.2s cubic-bezier(0.15, 0.85, 0.25, 1)'
                  : 'none',
              }}
            >
              {/* Divider lines */}
              {REWARDS.map((_, i) => (
                <div
                  key={i}
                  className="wheel-divider"
                  style={{ transform: `rotate(${i * SLICE_DEG}deg)` }}
                />
              ))}
              {/* Labels */}
              {REWARDS.map((r, i) => (
                <div
                  key={i}
                  className="wheel-text"
                  style={{ transform: `rotate(${(i + 0.5) * SLICE_DEG}deg)` }}
                >
                  <div className="wheel-emoji">{r.emoji}</div>
                  <div className="wheel-label">
                    {r.label.split('\n').map((line, j) => <div key={j}>{line}</div>)}
                  </div>
                </div>
              ))}
            </div>

            {/* Centre hub */}
            <div className="wheel-hub">
              <span>🍔</span>
            </div>

            {/* Triangle pointer */}
            <div className="wheel-pointer" />

            {/* Floating emojis */}
            <span className="sc-food sc-food-1">🌟</span>
            <span className="sc-food sc-food-2">✨</span>
          </div>
        </div>
      </div>

      {/* Result overlay */}
      {showResult && reward && (
        <div className="reward-overlay" onClick={() => setShowResult(false)}>
          <div className="reward-card" onClick={e => e.stopPropagation()}>
            {/* Confetti particles */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rw-confetti" style={{
                left: `${Math.random() * 100}%`,
                background: REWARDS[i % REWARDS.length].color,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.2 + Math.random()}s`,
              }} />
            ))}
            <div className="reward-icon">{reward.emoji}</div>
            <h2 className="reward-title">You Won! 🎉</h2>
            <div className="reward-prize" style={{ color: reward.color, borderColor: reward.color + '33' }}>
              {reward.label.replace('\n', ' ')}
            </div>
            <p className="reward-subtitle">
              {reward.label.includes('LUCK')
                ? "Don't worry, better luck next time!"
                : 'Your reward will automatically apply to your cart! 🛒'}
            </p>
            <button className="btn-large reward-btn" onClick={() => setShowResult(false)}>
              Awesome! 🚀
            </button>
          </div>
        </div>
      )}
    </>
  );
}
