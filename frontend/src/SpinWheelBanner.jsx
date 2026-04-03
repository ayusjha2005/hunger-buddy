import React, { useState } from 'react';
import './SpinWheelBanner.css';

const REWARDS = [
  { label: 'FREE\nDESSERT', color: '#B34EFF' },
  { label: '20%\nOFF', color: '#00B8FF' },
  { label: '₹100\nOFF', color: '#FFB000' },
  { label: 'BETTER\nLUCK', color: '#FF3B30' },
  { label: 'FREE\nDRINK', color: '#4CDE78' },
];

export default function SpinWheelBanner() {
  const [spinning, setSpinning] = useState(false);
  const [degree, setDegree] = useState(0);
  const [reward, setReward] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setShowResult(false);
    
    // Choose a random reward index
    const randomIndex = Math.floor(Math.random() * REWARDS.length);
    
    // Calculate angle to land on that reward (pointer at top)
    // Conic gradient starts at 12 o'clock. 5 items = 72 deg slices.
    // Center of slice i is (36 + i * 72).
    // Rotation = 360 - (center of slice i).
    const rotations = 360 * 6; // 6 full spins
    const stoppingAngle = 324 - (randomIndex * 72);
    const finalDegree = degree + rotations + stoppingAngle - (degree % 360);

    setDegree(finalDegree);

    setTimeout(() => {
      setSpinning(false);
      setReward(REWARDS[randomIndex]);
      setShowResult(true);
    }, 4000); // matches CSS transition duration
  };

  const closeOverlay = () => {
    setShowResult(false);
  };

  // Generate conic gradient string for wheel slices
  // Because we want hard edges:
  const conicStops = REWARDS.map((r, i) => {
    const start = i * 72;
    const end = (i + 1) * 72;
    return `${r.color} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <>
      <div className="spin-banner">
        {/* Decorative background confetti elements */}
        <div className="spin-confetti c1"></div>
        <div className="spin-confetti c2"></div>
        
        <div className="spin-banner-left">
          <div className="spin-badge">★ FEELING LUCKY?</div>
          <h2 className="spin-banner-title">Spin & Win<br /><span>Tasty Rewards!</span></h2>
          <p className="spin-banner-subtitle">
            Spin the wheel and unlock exciting offers on your next order.
          </p>
          <button className="spin-btn" onClick={spin} disabled={spinning}>
            {spinning ? 'Spinning...' : 'Spin Now ›'}
          </button>
        </div>

        <div className="spin-banner-right">
          <div className="wheel-wrapper">
            <div 
              className="wheel" 
              style={{
                background: `conic-gradient(${conicStops})`,
                transform: `rotate(${degree}deg)`
              }}
            >
              {REWARDS.map((r, i) => {
                const rotation = 36 + (i * 72);
                return (
                  <div 
                    key={i} 
                    className="wheel-text"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  >
                    <div className="wheel-label">
                      {r.label.split('\n').map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* The Pointer */}
            <div className="wheel-pointer"></div>
            {/* Some floating food images like the reference */}
            <span className="sc-food sc-food-1">🍔</span>
            <span className="sc-food sc-food-2">🍟</span>
          </div>
        </div>
      </div>

      {/* Reward Result Overlay */}
      {showResult && reward && (
        <div className="reward-overlay">
          <div className="reward-card">
            <div className="reward-icon">🎉</div>
            <h2 className="reward-title">You Won!</h2>
            <div className="reward-prize" style={{ color: reward.color }}>
              {reward.label}
            </div>
            <p className="reward-subtitle">
              {reward.label === 'BETTER LUCK NEXT TIME' 
                ? 'Don\'t worry, there\'s always next time!' 
                : 'Your reward will automatically apply to your cart.'}
            </p>
            <button className="btn-large reward-btn" onClick={closeOverlay}>
              Awesome!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
