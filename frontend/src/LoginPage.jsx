import { useState } from 'react';
import './LoginPage.css';

function LoginPage({ onLogin }) {
  const [step, setStep]             = useState('splash');
  const [nameInput, setNameInput]   = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = nameInput.trim();
    const phone = phoneInput.trim();
    if (!name || phone.length < 10) return;
    onLogin(name, phone);
  };

  /* ── STEP 1: Splash ─────────────────────────────────────── */
  if (step === 'splash') {
    return (
      <div className="lp-splash">
        {/* Scattered background micro-ingredients */}
        <div className="lp-bg-foods" aria-hidden="true">
          {['🍅','🌿','🍋','🌶️','🫑','🍃','🫐','🧅'].map((e, i) =>
            <span key={i}>{e}</span>
          )}
        </div>

        {/* Logo */}
        <div className="lp-top">
          <div className="lp-logo">
            HUNGER<span>BUDDY</span>
            <div className="lp-logo-smile">╰◕ᗜ◕╯</div>
          </div>
          <p className="lp-slogan">Good Food, Great Mood</p>
        </div>

        {/* Hero */}
        <div className="lp-hero" aria-hidden="true">
          <div className="lp-hero-glow" />
          <span className="lp-hero-emoji">🍔</span>
          <div className="lp-hero-orbits">
            <span className="lp-orb o1">🍟</span>
            <span className="lp-orb o2">🧃</span>
            <span className="lp-orb o3">🥗</span>
          </div>
        </div>

        {/* Bottom card */}
        <div className="lp-bottom">
          <h1 className="lp-headline">
            Your Cravings,<br /><span>Our Mission!</span>
          </h1>
          <p className="lp-desc">
            Discover delicious meals from your campus food court, fast and easy.
          </p>
          <button className="lp-btn-primary" onClick={() => setStep('name')}>
            Let's Get Started
            <span className="lp-arrow-circle">›</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => setStep('name')}>
            Explore Menu
          </button>
          <div className="lp-dots">
            <span className="lp-dot active" />
            <span className="lp-dot" />
            <span className="lp-dot" />
          </div>
        </div>
      </div>
    );
  }

  /* ── STEP 2: Name entry ─────────────────────────────────── */
  return (
    <div className="lp-name">
      <div className="lp-name-top">
        {/* Floating food items */}
        <span className="lp-nf n1" aria-hidden="true">🍕</span>
        <span className="lp-nf n2" aria-hidden="true">🍔</span>
        <span className="lp-nf n3" aria-hidden="true">🧃</span>
        <span className="lp-nf n4" aria-hidden="true">🥗</span>

        <div className="lp-logo lp-logo-sm">
          HUNGER<span>BUDDY</span>
          <div className="lp-logo-smile">╰◕ᗜ◕╯</div>
        </div>

        <h2 className="lp-welcome">Hello VITian! 🎓</h2>
        <p className="lp-welcome-sub">
          Let's get you started with something delicious&nbsp;💚
        </p>
      </div>

      <div className="lp-form-card">
        <form onSubmit={handleSubmit}>
          <div className="lp-field-lbl">
            <span>👤</span> Enter your name
          </div>
          <div className="lp-input-row">
            <span className="lp-input-icon">👤</span>
            <input
              id="vitian-name"
              className="lp-input"
              type="text"
              placeholder="Your name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              autoFocus
              maxLength={30}
            />
          </div>

          <div className="lp-field-lbl" style={{ marginTop: 20 }}>
            <span>📞</span> Phone number
          </div>
          <div className="lp-input-row" style={{ paddingLeft: 6 }}>
            <div className="lp-phone-prefix">📞 +91</div>
            <input
              className="lp-input"
              type="tel"
              placeholder="Enter your mobile number"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
            />
          </div>

          <button
            className="lp-btn-primary lp-btn-continue"
            type="submit"
            disabled={!nameInput.trim() || phoneInput.length < 10}
          >
            Continue
            <span className="lp-arrow-circle">›</span>
          </button>
        </form>

        <p className="lp-privacy">
          By continuing, you agree to our{' '}
          <span>Terms of Use</span> and <span>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
