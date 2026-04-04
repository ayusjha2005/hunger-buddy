import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import FoodSwipe from './FoodSwipe';
import SpinWheelBanner from './SpinWheelBanner';
import LoginPage from './LoginPage';

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
  // ── Theme (dark | light) ─────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('hb_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hb_theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── User identity ──────────────────────────────────────────────
  const [userName, setUserName]     = useState('');
  const [nameInput, setNameInput]   = useState('');
  const [showGreeting, setShowGreeting] = useState(false);

  // Time-based greeting
  const getTimeGreeting = (name) => {
    const h = new Date().getHours();
    if (h < 6)  return [`Good night, ${name}! \uD83C\uDF19`, 'Night owl spotted'];
    if (h < 12) return [`Good morning, ${name}! \uD83C\uDF05`, 'Start the day with great food!'];
    if (h < 17) return [`Hey, ${name}! \u2600\uFE0F`, 'Craving something delicious?'];
    if (h < 21) return [`Good evening, ${name}! \uD83C\uDF06`, "What's for dinner tonight?"];
    return [`Late night hunger, ${name}? \uD83C\uDF19`, "We've got you covered!"];
  };

  // ── App state ──────────────────────────────────────────────────
  const [currentView, setCurrentView]   = useState('home');
  const [outlets, setOutlets]           = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [menu, setMenu]                 = useState([]);
  const [cart, setCart]                 = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // ── Order scheduling ────────────────────────────────────────────
  const [scheduleMode, setScheduleMode]   = useState('now');   // 'now' | 'later'
  const [scheduleTime, setScheduleTime]   = useState('');

  // ── Placed order history (persisted) ────────────────────────────
  const [placedOrders, setPlacedOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hb_orders') || '[]'); } catch { return []; }
  });

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
  const handleLogin = (name) => {
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
      .then(data => { setMenu(Array.isArray(data) ? data : (data ? [data] : [])); setSearchLoading(false); })
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
    const orderTime = scheduleMode === 'now' ? 'ASAP' : scheduleTime;
    fetch(`${API}/order/simulate`, { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        setCheckoutLoading(false);
        setOrderResult({
          waitTime: data.waitTimeMinutes,
          scheduledFor: orderTime,
          items: [...cart],
          outlet: selectedOutlet?.name || 'HungerBuddy',
          total: cart.reduce((s, i) => s + i.price, 0),
          placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setCart([]);
      })
      .catch(() => { setCheckoutLoading(false); showError('Payment failed.'); });
  };

  const dismissOrder = () => {
    if (orderResult) {
      const newOrder = { ...orderResult, id: Date.now() };
      const updated = [newOrder, ...placedOrders].slice(0, 10); // keep last 10
      setPlacedOrders(updated);
      localStorage.setItem('hb_orders', JSON.stringify(updated));
    }
    setOrderResult(null);
    setCurrentView('home');
  };

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
  // FIRST-TIME LOGIN — new two-step LoginPage
  // ════════════════════════════════════════════════════════════════
  if (!userName && !showGreeting) {
    return <LoginPage onLogin={handleLogin} />;
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
    <div className="foodies-container" data-theme={theme}>

      {/* Error Toast */}
      {errorMsg && <div className="error-toast">⚠️ {errorMsg}</div>}

      {/* Order Success Overlay */}
      {orderResult && (
        <div className="order-success-overlay" onClick={dismissOrder}>
          <div className="order-success-card" onClick={e => e.stopPropagation()}>
            <div className="order-success-icon">🎉</div>
            <h2 className="order-success-title">Thank you for ordering, {userName}!</h2>
            <p className="order-success-sub">Order confirmed from <strong>{orderResult?.outlet}</strong></p>
            <div className="order-wait-badge">
              <span className="order-wait-time">{orderResult?.waitTime}</span>
              <span className="order-wait-label">mins</span>
            </div>
            {orderResult?.scheduledFor && orderResult.scheduledFor !== 'ASAP' && (
              <div className="order-scheduled-tag">⏰ Scheduled for {orderResult.scheduledFor}</div>
            )}
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
              <div className="header-greeting">{getTimeGreeting(userName)[1]}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button className="reseed-btn" onClick={handleLogout} title="Logout" style={{ fontSize: 16 }}>🚪</button>
              <button className="reseed-btn" onClick={seedDataAndStart} title="Reload menu data" disabled={seedLoading}>
                {seedLoading ? <span className="btn-spinner" /> : '🔄'}
              </button>
            </div>
          </div>

          {/* ── My Orders section ── */}
          {placedOrders.length > 0 && (
            <div className="placed-orders-section">
              <div className="section-title" style={{ marginBottom: 10 }}>
                <h3>🧾 My Orders</h3>
                <button
                  style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => { setPlacedOrders([]); localStorage.removeItem('hb_orders'); }}
                >Clear all</button>
              </div>
              <div className="order-history-scroll">
                {placedOrders.map(order => (
                  <div className="order-history-card" key={order.id}>
                    <div className="ohc-top">
                      <span className="ohc-outlet">{order.outlet}</span>
                      <span className={`ohc-time-badge ${order.scheduledFor === 'ASAP' ? 'asap' : 'scheduled'}`}>
                        {order.scheduledFor === 'ASAP' ? '⚡ ASAP' : `⏰ ${order.scheduledFor}`}
                      </span>
                    </div>
                    <div className="ohc-items">
                      {order.items.slice(0, 3).map((it, i) => (
                        <span key={i} className="ohc-item-chip">{it.name}</span>
                      ))}
                      {order.items.length > 3 && <span className="ohc-item-chip">+{order.items.length - 3} more</span>}
                    </div>
                    <div className="ohc-bottom">
                      <span className="ohc-total">₹{order.total}</span>
                      <span className="ohc-placed">Placed at {order.placedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spin Wheel Banner */}
          <SpinWheelBanner />

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

          {/* Outlets — vertical list */}
          <div className="section-title" style={{ marginTop: 4 }}>
            <h3>
              {activeCategory === 'All'
                ? 'Our Outlets'
                : `${HOME_CATS.find(c => c.n === activeCategory)?.icon} ${activeCategory} Outlets`}
            </h3>
            {activeCategory === 'All' && <span style={{ color: 'var(--accent-green)', fontSize: 13 }}>See all</span>}
          </div>

          {filteredOutlets.length === 0 && (
            <div className="empty-menu">
              <span>🔍</span>
              <p>No outlets found for "{activeCategory}"</p>
              <button className="filter-btn" onClick={() => setActiveCategory('All')}>Clear filter</button>
            </div>
          )}

          <div className="outlets-vertical">
            {filteredOutlets.map(o => (
              <div className="outlet-card-v" key={o._id} onClick={() => openOutletMenu(o)}>
                <div className="outlet-card-v__img">
                  <img src={o.imageUrl} alt={o.name} />
                  <div className="outlet-rating">★ {o.rating}</div>
                </div>
                <div className="outlet-card-v__info">
                  <h4>{o.name}</h4>
                  <p>{o.location}</p>
                  <span className="outlet-open-tag">Open Now</span>
                </div>
                <div className="outlet-card-v__arrow">›</div>
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

              {/* ── Schedule Order ── */}
              <div className="schedule-section">
                <h3>🕐 Schedule Order</h3>
                <div className="schedule-options">
                  <button
                    className={`schedule-opt ${scheduleMode === 'now' ? 'active' : ''}`}
                    onClick={() => setScheduleMode('now')}
                  >
                    ⚡ Right Now
                  </button>
                  <button
                    className={`schedule-opt ${scheduleMode === 'later' ? 'active' : ''}`}
                    onClick={() => setScheduleMode('later')}
                  >
                    ⏰ Schedule for Later
                  </button>
                </div>
                {scheduleMode === 'later' && (
                  <div className="schedule-time-wrap">
                    <label>Pick a time</label>
                    <input
                      type="time"
                      className="schedule-time-input"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                    />
                  </div>
                )}
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
              <button
                className="btn-large"
                onClick={handleCheckout}
                disabled={checkoutLoading || (scheduleMode === 'later' && !scheduleTime)}
              >
                {checkoutLoading
                  ? <><span className="btn-spinner" /> Processing…</>
                  : <>Pay ₹{cartTotal} via {paymentMethod}{scheduleMode === 'later' && scheduleTime ? ` · 🕐 ${scheduleTime}` : ''}</>
                }
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
