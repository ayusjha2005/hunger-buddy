import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import FoodSwipe from './FoodSwipe';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Category chips and which outlet NAMES serve them
const HOME_CATS = [
  { icon: '🍕', n: 'Pizza',    outlets: ['Oasis Kitchens'] },
  { icon: '🌯', n: 'Frankie',  outlets: ['Oasis Kitchens'] },
  { icon: '🥪', n: 'Sandwich', outlets: ['Oasis Kitchens'] },
  { icon: '🍗', n: 'Chicken',  outlets: ['Oasis Kitchens'] },
  { icon: '🍟', n: 'Fries',    outlets: ['Oasis Kitchens'] },
  { icon: '🫙', n: 'Chaat',    outlets: ['Puri Vuri Express'] },
  { icon: '🍰', n: 'Cakes',    outlets: ['Cake Stories'] },
];

const SUB_CAT_ICON = {
  'Pizza (Veg)':     '🍕',
  'Pizza (Non-Veg)': '🍕',
  'Sandwiches':      '🥪',
  'Garlic Breads':   '🧄',
  'Fries & Sides':   '🍟',
  'Fried Chicken':   '🍗',
  'Frankies':        '🌯',
  'Shawarma':        '🥙',
  'Pani Puri':       '🫙',
  'Chaat':           '🍛',
  'Cakes':           '🍰',
};

function App() {
  // ── User identity ──────────────────────────────────────────────
  const [userName, setUserName]     = useState(() => localStorage.getItem('hb_username') || '');
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('hb_username'));
  const [nameInput, setNameInput]   = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);

  // ── App state ──────────────────────────────────────────────────
  const [currentView, setCurrentView]   = useState('home');
  const [outlets, setOutlets]           = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [menu, setMenu]                 = useState([]);
  const [cart, setCart]                 = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // ── Loading / feedback ──────────────────────────────────────────
  const [splashLoading, setSplashLoading]     = useState(true);
  const [menuLoading, setMenuLoading]         = useState(false);
  const [sortLoading, setSortLoading]         = useState(false);
  const [searchLoading, setSearchLoading]     = useState(false);
  const [addingItem, setAddingItem]           = useState(null);
  const [removingItem, setRemovingItem]       = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [seedLoading, setSeedLoading]         = useState(false);
  const [orderResult, setOrderResult]         = useState(null);
  const [errorMsg, setErrorMsg]               = useState('');
  const [paymentMethod, setPaymentMethod]     = useState('UPI');

  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 3500); };

  // ── Fetch Outlets ───────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/outlets`)
      .then(r => r.json())
      .then(data => { setOutlets(data); setTimeout(() => setSplashLoading(false), 1000); })
      .catch(() => setSplashLoading(false));
  }, []);

  // ── Filtered outlets by active category ─────────────────────────
  const filteredOutlets = useMemo(() => {
    if (activeCategory === 'All') return outlets;
    const cat = HOME_CATS.find(c => c.n === activeCategory);
    if (!cat) return outlets;
    return outlets.filter(o => cat.outlets.includes(o.name));
  }, [outlets, activeCategory]);

  // ── Login handler ───────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem('hb_username', name);
    setUserName(name);
    setShowGreeting(true);
    setTimeout(() => setShowGreeting(false), 1800);
  };

  const handleLogout = () => {
    localStorage.removeItem('hb_username');
    setUserName('');
    setNameInput('');
    setPhoneInput('');
    setShowWelcome(true);
  };

  // ── Outlet menu open ────────────────────────────────────────────
  const openOutletMenu = (outlet) => {
    setSelectedOutlet(outlet);
    setCurrentView('menu');
    setSearchQuery('');
    setMenuLoading(true);
    fetch(`${API}/menu/${outlet._id}`)
      .then(r => r.json())
      .then(data => { setMenu(data); setMenuLoading(false); })
      .catch(() => { showError('Failed to load menu.'); setMenuLoading(false); });
  };

  // ── Seed ────────────────────────────────────────────────────────
  const seedDataAndStart = () => {
    setSeedLoading(true);
    fetch(`${API}/seed`, { method: 'POST' })
      .then(() => window.location.reload())
      .catch(() => { showError('Seed failed.'); setSeedLoading(false); });
  };

  // ── Sort ────────────────────────────────────────────────────────
  const sortMenu = useCallback((sortBy) => {
    if (!selectedOutlet) return;
    setSortLoading(true);
    fetch(`${API}/menu/sort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outletId: selectedOutlet._id, sortBy })
    })
      .then(r => r.json())
      .then(data => { setMenu(data); setSortLoading(false); })
      .catch(() => { showError('Sort failed.'); setSortLoading(false); });
  }, [selectedOutlet]);

  // ── Search ──────────────────────────────────────────────────────
  const searchMenu = useCallback(() => {
    if (!selectedOutlet) return;
    if (!searchQuery.trim()) return sortMenu('name');
    setSearchLoading(true);
    fetch(`${API}/menu/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outletId: selectedOutlet._id, targetName: searchQuery.trim() })
    })
      .then(r => r.json())
      .then(data => { setMenu(data ? [data] : []); setSearchLoading(false); })
      .catch(() => { showError('Search failed.'); setSearchLoading(false); });
  }, [selectedOutlet, searchQuery, sortMenu]);

  const handleSearchKey = (e) => {
    if (e.key === 'Enter')  searchMenu();
    if (e.key === 'Escape') { setSearchQuery(''); sortMenu('name'); }
  };

  // ── Cart ────────────────────────────────────────────────────────
  const addToCart = (item) => {
    setAddingItem(item._id);
    fetch(`${API}/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, newItem: item })
    })
      .then(r => r.json())
      .then(data => { setCart(data); setTimeout(() => setAddingItem(null), 600); })
      .catch(() => { setCart(prev => [...prev, item]); setTimeout(() => setAddingItem(null), 600); });
  };

  const removeFromCart = (index) => {
    setRemovingItem(index);
    setTimeout(() => { setCart(prev => prev.filter((_, i) => i !== index)); setRemovingItem(null); }, 350);
  };

  // ── Checkout ────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    fetch(`${API}/order/simulate`, { method: 'POST' })
      .then(r => r.json())
      .then(data => { setCheckoutLoading(false); setOrderResult({ waitTime: data.waitTimeMinutes }); setCart([]); })
      .catch(() => { setCheckoutLoading(false); showError('Payment failed.'); });
  };

  const dismissOrder = () => { setOrderResult(null); setCurrentView('home'); };

  // ── Menu grouping ───────────────────────────────────────────────
  const menuGrouped = useMemo(() => {
    if (!menu.length) return [];
    const map = new Map();
    menu.forEach(item => { const k = item.subCategory || 'Other'; if (!map.has(k)) map.set(k, []); map.get(k).push(item); });
    return Array.from(map.entries());
  }, [menu]);

  const cartTotal = cart.reduce((sum, i) => sum + i.price, 0);

  // ── Category chip click ─────────────────────────────────────────
  const onCategoryClick = (cat) => {
    if (activeCategory === cat.n) { setActiveCategory('All'); return; }
    setActiveCategory(cat.n);
  };

  // ════════════════════════════════════════════════════════════════
  // SPLASH
  // ════════════════════════════════════════════════════════════════
  if (splashLoading) {
    return (
      <div className="splash-screen">
        <div className="brand-logo">Hunger<span>Buddy</span></div>
        <div className="loader-spinner" />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // 1) WELCOME SCREEN (Left design)
  // ════════════════════════════════════════════════════════════════
  if (showWelcome && !userName && !showGreeting) {
    return (
      <div className="welcome-screen-v2">
        <div className="welcome-top">
          <div className="login-brand" style={{marginTop: '20px', zIndex: 10}}>
            <h1 className="logo-text text-center">
              HUNGER<br/><span className="logo-green">BUDDY</span>
            </h1>
            <svg className="smile-svg" viewBox="0 0 100 20" width="80" style={{marginTop: '-5px'}}>
              <path d="M 10 5 Q 50 25 90 5" fill="transparent" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <circle cx="50" cy="18" r="3" fill="white" />
            </svg>
            <p className="welcome-tagline-text">Good Food, Great Mood</p>
          </div>
          
          <div className="welcome-food-hero">
            <div className="hero-emoji">🍔</div>
            <div className="hero-emoji side-box">🥗</div>
            <div className="hero-emoji drink">🥤</div>
          </div>
        </div>

        <div className="welcome-bottom">
          <h2 className="welcome-title">Your Cravings,<br/><span className="logo-green">Our Mission!</span></h2>
          <p className="welcome-desc">Discover delicious meals from your<br/>favorite restaurants, fast and easy.</p>
          
          <button className="btn-started-fill" onClick={() => setShowWelcome(false)}>
            Let's Get Started
            <span className="arrow-circle arrow-circle-white">➔</span>
          </button>
          <button className="btn-started-outline" onClick={() => setShowWelcome(false)}>
            Explore Menu
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // 2) FIRST-TIME LOGIN (no name - Right design)
  // ════════════════════════════════════════════════════════════════
  if (!userName && !showGreeting) {
    return (
      <div className="login-screen-v2">
        <div className="login-top-section">
          {/* Floating elements */}
          <div className="float-item float-item-1">🍕</div>
          <div className="float-item float-item-2">🍔</div>
          <div className="float-item float-item-3">🥤</div>
          <div className="float-item float-item-4">🥗</div>
          
          <div className="login-brand">
            <h1 className="logo-text">
              HUNGER<br/><span className="logo-green">BUDDY</span>
            </h1>
            <svg className="smile-svg" viewBox="0 0 100 20" width="80">
              <path d="M 10 5 Q 50 25 90 5" fill="transparent" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <circle cx="50" cy="18" r="3" fill="white" />
            </svg>
          </div>
          
          <h2 className="welcome-text">Welcome!</h2>
          <p className="welcome-sub">Let's get you started<br/>with something delicious 💚</p>
        </div>

        <div className="login-bottom-sheet">
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label><span className="input-icon">👤</span> Enter your name</label>
              <div className="input-wrapper">
                <span className="inner-icon">👤</span>
                <input
                  type="text"
                  placeholder="Your name"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  maxLength={30}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label><span className="input-icon">📞</span> Phone number</label>
              <div className="input-wrapper phone-wrapper">
                <span className="inner-icon">📞</span>
                <div className="phone-prefix">+91</div>
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>

            <button className="btn-continue" type="submit" disabled={!nameInput.trim()}>
              Continue <span className="arrow-circle">➔</span>
            </button>
            
            <p className="terms-text">
              By continuing, you agree to our<br/>
              <span className="green-link">Terms of Use</span> and <span className="green-link">Privacy Policy</span>.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // GREETING OVERLAY (1.8s flash after login)
  // ════════════════════════════════════════════════════════════════
  if (showGreeting) {
    return (
      <div className="greeting-overlay">
        <div className="greeting-emoji">👋</div>
        <h1 className="greeting-title">Hey, {userName}!</h1>
        <p className="greeting-sub">Your food adventure begins now…</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // WELCOME SCREEN (no outlets yet — needs seeding)
  // ════════════════════════════════════════════════════════════════
  if (outlets.length === 0) {
    return (
      <div className="welcome-screen">
        <div className="welcome-content">
          <h1>Hey {userName}!<br /><span className="highlight-text">Ready to eat? 🍕</span></h1>
          <p>Set up the menu to get started.</p>
          <button className="btn-get-started" onClick={seedDataAndStart} disabled={seedLoading}>
            {seedLoading ? <><span className="btn-spinner" /> Setting up…</> : 'Load Menu'}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // MAIN APP
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="foodies-container">

      {/* Error Toast */}
      {errorMsg && <div className="error-toast">⚠️ {errorMsg}</div>}

      {/* Order Success Overlay */}
      {orderResult && (
        <div className="order-success-overlay" onClick={dismissOrder}>
          <div className="order-success-card" onClick={e => e.stopPropagation()}>
            <div className="order-success-icon">🎉</div>
            <h2 className="order-success-title">Order Placed!</h2>
            <p className="order-success-sub">Your order is confirmed, {userName}. Estimated wait:</p>
            <div className="order-wait-badge">
              <span className="order-wait-time">{orderResult.waitTime}</span>
              <span className="order-wait-label">mins</span>
            </div>
            <p className="order-success-hint">Sit back &amp; relax — your food is being prepared 🍳</p>
            <button className="btn-large order-success-btn" onClick={dismissOrder}>Back to Home</button>
          </div>
        </div>
      )}

      {/* Checkout Loading */}
      {checkoutLoading && (
        <div className="loader-overlay">
          <div className="checkout-loading-wrap">
            <div className="loader-spinner" />
            <h3>Processing Payment…</h3>
            <p>{paymentMethod}</p>
          </div>
        </div>
      )}

      {/* ══════ HOME ══════ */}
      {currentView === 'home' && (
        <div className="fade-in">
          <div className="top-header">
            <div>
              <div className="brand-title">Hunger<span>Buddy</span></div>
              <div className="header-greeting" onClick={handleLogout} style={{ cursor: 'pointer', title: 'Click to logout' }}>
                Hey, {userName} 👋 <span>(Logout)</span>
              </div>
            </div>
            <button className="reseed-btn" onClick={seedDataAndStart} title="Reload menu data" disabled={seedLoading}>
              {seedLoading ? <span className="btn-spinner" /> : '🔄'}
            </button>
          </div>

          <div className="section-title"><h3>Special offers</h3></div>
          <div className="promotional-banner">
            <div className="promo-text">
              <h1>20%</h1>
              <p>off on all<br />Pizzas today</p>
            </div>
            <img src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=400&q=80" alt="Pizza offer" />
          </div>

          {/* Category Chips */}
          <div className="categories-slider">
            {HOME_CATS.map(cat => (
              <div
                className={`category-item ${activeCategory === cat.n ? 'active' : ''}`}
                key={cat.n}
                onClick={() => onCategoryClick(cat)}
              >
                <div className="category-icon">{cat.icon}</div>
                <p>{cat.n}</p>
              </div>
            ))}
          </div>

          {/* Category filter banner */}
          {activeCategory !== 'All' && (
            <div className="cat-filter-banner">
              <span>
                {HOME_CATS.find(c => c.n === activeCategory)?.icon} Showing outlets with <strong>{activeCategory}</strong>
              </span>
              <button className="cat-filter-clear" onClick={() => setActiveCategory('All')}>✕ Clear</button>
            </div>
          )}

          {/* Discover Mode */}
          {activeCategory === 'All' && (
            <button className="discover-btn" onClick={() => setCurrentView('swipe')}>
              <div className="discover-btn__left">
                <h4>🃏 Discover Mode</h4>
                <p>Swipe to explore &amp; add food to cart</p>
              </div>
              <div className="discover-btn__icon">🍽️</div>
            </button>
          )}

          {/* Outlets */}
          <div className="section-title" style={{ marginTop: 4 }}>
            <h3>
              {activeCategory === 'All'
                ? 'Our Outlets'
                : `${HOME_CATS.find(c => c.n === activeCategory)?.icon} ${activeCategory} Outlets`}
            </h3>
            {activeCategory === 'All' && <span style={{ color: 'var(--accent-green)', fontSize: 13 }}>See all</span>}
          </div>

          {/* No outlets match */}
          {filteredOutlets.length === 0 && (
            <div className="empty-menu">
              <span>🔍</span>
              <p>No outlets found for "{activeCategory}"</p>
              <button className="filter-btn" onClick={() => setActiveCategory('All')}>Clear filter</button>
            </div>
          )}

          <div className="outlets-horizontal">
            {filteredOutlets.map(o => (
              <div className="outlet-card" key={o._id} onClick={() => openOutletMenu(o)}>
                <div className="outlet-img-wrapper">
                  <img src={o.imageUrl} alt={o.name} />
                  <div className="outlet-rating">★ {o.rating}</div>
                </div>
                <div className="outlet-info">
                  <h4>{o.name}</h4>
                  <p>{o.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════ SWIPE ══════ */}
      {currentView === 'swipe' && (
        <FoodSwipe
          onBack={() => setCurrentView('home')}
          onAddToCart={(item) => {
            fetch(`${API}/cart/add`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cart, newItem: item })
            }).then(r => r.json()).then(data => setCart(data)).catch(() => setCart(prev => [...prev, item]));
          }}
        />
      )}

      {/* ══════ MENU ══════ */}
      {currentView === 'menu' && (
        <div className="screen-slide-in">
          <div className="top-header">
            <button className="back-btn" onClick={() => setCurrentView('home')}>←</button>
            <div className="brand-title" style={{ fontSize: 17 }}>{selectedOutlet?.name}</div>
            <div style={{ width: 32 }} />
          </div>

          <div className="search-filter-bar">
            <div className="search-input-wrap">
              <input
                type="text"
                className="search-input"
                placeholder="Search menu…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKey}
              />
              {searchLoading && <span className="search-spinner" />}
              {searchQuery && !searchLoading && (
                <button className="search-clear" onClick={() => { setSearchQuery(''); sortMenu('name'); }}>✕</button>
              )}
            </div>
            <button className={`filter-btn ${sortLoading ? 'loading' : ''}`} onClick={() => sortMenu('price')} disabled={sortLoading}>
              {sortLoading ? '…' : 'Sort ₹'}
            </button>
            <button className="filter-btn" onClick={() => sortMenu('name')} disabled={sortLoading}>A–Z</button>
          </div>

          <div className="menu-feed">
            {menuLoading ? (
              <div className="menu-loading">{[1,2,3,4].map(i => <div className="skeleton-card" key={i} />)}</div>
            ) : menuGrouped.length > 0 ? (
              menuGrouped.map(([catName, items]) => (
                <div key={catName} className="menu-section">
                  <div className="menu-section-header">
                    <span className="menu-section-icon">{SUB_CAT_ICON[catName] || '🍽️'}</span>
                    <span className="menu-section-title">{catName}</span>
                    <span className="menu-section-count">{items.length}</span>
                  </div>
                  {items.map(item => (
                    <div className="menu-feed-item" key={item._id}>
                      <div className="menu-feed-content">
                        <div>
                          <div className="menu-veg-dot">
                            {item.category === 'Veg' ? '🟢' : item.category === 'Non-Veg' ? '🔴' : '⚪'}
                          </div>
                          <h4>{item.name}</h4>
                          <p className="menu-feed-desc">{item.description}</p>
                        </div>
                        <div className="menu-feed-bottom">
                          <span className="menu-feed-price">₹{item.price}</span>
                          <button
                            className={`btn-add-round ${addingItem === item._id ? 'adding' : ''}`}
                            onClick={() => addToCart(item)}
                            disabled={addingItem === item._id}
                            aria-label={`Add ${item.name}`}
                          >
                            {addingItem === item._id ? '✓' : '+'}
                          </button>
                        </div>
                      </div>
                      <div className="menu-feed-img">
                        <img src={item.imageUrl} alt={item.name} />
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="empty-menu">
                <span>🍽️</span>
                <p>No items found.</p>
                {searchQuery && (
                  <button className="filter-btn" onClick={() => { setSearchQuery(''); sortMenu('name'); }}>Clear search</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ CART ══════ */}
      {currentView === 'cart' && (
        <div className="screen-slide-in" style={{ zIndex: 300 }}>
          <div className="top-header">
            <button className="back-btn" onClick={() => setCurrentView('menu')}>←</button>
            <div className="brand-title" style={{ fontSize: 20 }}>My Cart</div>
            <button className="back-btn" style={{ fontSize: 13, color: 'var(--danger)' }} onClick={() => removeFromCart(cart.length - 1)} disabled={cart.length === 0}>↺</button>
          </div>

          <div className="cart-items-list">
            {cart.map((item, idx) => (
              <div className={`cart-item ${removingItem === idx ? 'cart-item--removing' : ''}`} key={idx}>
                <img src={item.imageUrl} alt={item.name} />
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <p>₹{item.price}</p>
                </div>
                <button className="cart-item-delete" onClick={() => removeFromCart(idx)} aria-label={`Remove ${item.name}`}>🗑</button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="empty-menu" style={{ marginTop: 40 }}>
                <span>🛒</span>
                <p>Your cart is empty!</p>
                <button className="filter-btn" onClick={() => setCurrentView('menu')}>Browse Menu</button>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <>
              <div className="cart-summary-row">
                <span>{cart.length} item{cart.length > 1 ? 's' : ''}</span>
                <span className="menu-feed-price">₹{cartTotal}</span>
              </div>
              <div className="payment-section">
                <h3 style={{ marginBottom: 15 }}>Payment Method</h3>
                {['UPI', 'Credit/Debit Card', 'Net Banking'].map(method => (
                  <div key={method} className={`payment-option ${paymentMethod === method ? 'selected' : ''}`} onClick={() => setPaymentMethod(method)}>
                    <input type="radio" checked={paymentMethod === method} readOnly />
                    <label>{method}</label>
                    {paymentMethod === method && <span className="pay-check">✓</span>}
                  </div>
                ))}
              </div>
              <button className="btn-large" onClick={handleCheckout} disabled={checkoutLoading}>
                {checkoutLoading ? <><span className="btn-spinner" /> Processing…</> : <>Pay ₹{cartTotal} via {paymentMethod}</>}
              </button>
            </>
          )}
        </div>
      )}

      {/* Sticky Cart Bar */}
      {cart.length > 0 && currentView !== 'cart' && currentView !== 'swipe' && (
        <div className="sticky-cart-bar" onClick={() => setCurrentView('cart')}>
          <span>{cart.length} item{cart.length > 1 ? 's' : ''} | ₹{cartTotal}</span>
          <span>Go to Cart ➝</span>
        </div>
      )}
    </div>
  );
}

export default App;
