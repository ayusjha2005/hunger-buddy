import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import FoodSwipe from './FoodSwipe';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Category icons for the home screen slider
const HOME_CATS = [
  { icon: '🍕', n: 'Pizza'   },
  { icon: '🥙', n: 'Frankie' },
  { icon: '🥪', n: 'Sandwich'},
  { icon: '🍗', n: 'Chicken' },
  { icon: '🍟', n: 'Fries'   },
  { icon: '🫙', n: 'Chaat'   },
  { icon: '🍰', n: 'Cakes'   },
];

// Map subCategory names → emoji for section headers
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
  const [currentView, setCurrentView] = useState('home');
  const [outlets, setOutlets]         = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [menu, setMenu]               = useState([]);
  const [cart, setCart]               = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Loading / feedback states
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

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3500);
  };

  // ── Fetch Outlets ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/outlets`)
      .then(r => r.json())
      .then(data => {
        setOutlets(data);
        setTimeout(() => setSplashLoading(false), 1200);
      })
      .catch(() => setSplashLoading(false));
  }, []);

  // ── Open Outlet Menu ───────────────────────────────────────────
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

  // ── Seed / Re-Seed Data ────────────────────────────────────────
  const seedDataAndStart = () => {
    setSeedLoading(true);
    fetch(`${API}/seed`, { method: 'POST' })
      .then(() => window.location.reload())
      .catch(() => { showError('Seed failed. Is the backend running?'); setSeedLoading(false); });
  };

  // ── Sort Menu ──────────────────────────────────────────────────
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

  // ── Search Menu ────────────────────────────────────────────────
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

  // ── Add to Cart ────────────────────────────────────────────────
  const addToCart = (item) => {
    setAddingItem(item._id);
    fetch(`${API}/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, newItem: item })
    })
      .then(r => r.json())
      .then(data => { setCart(data); setTimeout(() => setAddingItem(null), 600); })
      .catch(() => {
        setCart(prev => [...prev, item]);
        setTimeout(() => setAddingItem(null), 600);
        showError('Added offline. Check connection.');
      });
  };

  // ── Remove from Cart ───────────────────────────────────────────
  const removeFromCart = (index) => {
    setRemovingItem(index);
    setTimeout(() => {
      setCart(prev => prev.filter((_, i) => i !== index));
      setRemovingItem(null);
    }, 350);
  };

  const popCart = () => { if (cart.length > 0) removeFromCart(cart.length - 1); };

  // ── Checkout ───────────────────────────────────────────────────
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    fetch(`${API}/order/simulate`, { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        setCheckoutLoading(false);
        setOrderResult({ waitTime: data.waitTimeMinutes });
        setCart([]);
      })
      .catch(() => { setCheckoutLoading(false); showError('Payment failed. Try again.'); });
  };

  const dismissOrder = () => { setOrderResult(null); setCurrentView('home'); };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  // ── Group menu by subCategory (preserves order from DB) ────────
  const menuGrouped = useMemo(() => {
    if (!menu.length) return [];
    const map = new Map();
    menu.forEach(item => {
      const key = item.subCategory || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries()); // [[subCatName, items[]], ...]
  }, [menu]);

  // ──────────────────────────────────────────────────────────────
  // SPLASH
  if (splashLoading) {
    return (
      <div className="splash-screen">
        <div className="brand-logo">Hunger<span>Buddy</span></div>
        <div className="loader-spinner" />
      </div>
    );
  }

  // WELCOME / GET STARTED
  if (outlets.length === 0) {
    return (
      <div className="welcome-screen">
        <div className="welcome-content">
          <h1>Welcome to<br /><span className="highlight-text">Hunger Buddy!</span> 👋</h1>
          <p>Your college food court, all in one place.</p>
          <button className="btn-get-started" onClick={seedDataAndStart} disabled={seedLoading}>
            {seedLoading ? <><span className="btn-spinner" /> Setting up...</> : 'Get Started'}
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  return (
    <div className="foodies-container">

      {/* ── Error Toast ───────────────────────── */}
      {errorMsg && <div className="error-toast">⚠️ {errorMsg}</div>}

      {/* ── Order Success Overlay ──────────────── */}
      {orderResult && (
        <div className="order-success-overlay" onClick={dismissOrder}>
          <div className="order-success-card" onClick={e => e.stopPropagation()}>
            <div className="order-success-icon">🎉</div>
            <h2 className="order-success-title">Order Placed!</h2>
            <p className="order-success-sub">Your order is confirmed. Estimated wait time:</p>
            <div className="order-wait-badge">
              <span className="order-wait-time">{orderResult.waitTime}</span>
              <span className="order-wait-label">mins</span>
            </div>
            <p className="order-success-hint">Sit back &amp; relax — your food is being prepared 🍳</p>
            <button className="btn-large order-success-btn" onClick={dismissOrder}>Back to Home</button>
          </div>
        </div>
      )}

      {/* ── Checkout Loading ───────────────────── */}
      {checkoutLoading && (
        <div className="loader-overlay">
          <div className="checkout-loading-wrap">
            <div className="loader-spinner" />
            <h3>Processing Payment...</h3>
            <p>{paymentMethod}</p>
          </div>
        </div>
      )}

      {/* ═══════════════ HOME VIEW ═══════════════ */}
      {currentView === 'home' && (
        <div className="fade-in">
          <div className="top-header">
            <div className="brand-title">Hunger<span>Buddy</span></div>
            <button className="reseed-btn" onClick={seedDataAndStart} title="Reload menu data" disabled={seedLoading}>
              {seedLoading ? <span className="btn-spinner" /> : '🔄'}
            </button>
          </div>

          <div className="section-title">
            <h3>Special offers</h3>
          </div>

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
                onClick={() => setActiveCategory(activeCategory === cat.n ? 'All' : cat.n)}
              >
                <div className="category-icon">{cat.icon}</div>
                <p>{cat.n}</p>
              </div>
            ))}
          </div>

          {/* Discover Mode Entry */}
          <button className="discover-btn" onClick={() => setCurrentView('swipe')}>
            <div className="discover-btn__left">
              <h4>🃏 Discover Mode</h4>
              <p>Swipe to explore &amp; add food to cart</p>
            </div>
            <div className="discover-btn__icon">🍽️</div>
          </button>

          <div className="section-title" style={{ marginTop: 4 }}>
            <h3>Our Outlets</h3>
            <span style={{ color: 'var(--accent-green)', fontSize: 13 }}>See all</span>
          </div>

          <div className="outlets-horizontal">
            {outlets.map(o => (
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

      {/* ═══════════════ SWIPE VIEW ══════════════ */}
      {currentView === 'swipe' && (
        <FoodSwipe
          onBack={() => setCurrentView('home')}
          onAddToCart={(item) => {
            fetch(`${API}/cart/add`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cart, newItem: item })
            })
              .then(r => r.json())
              .then(data => setCart(data))
              .catch(() => setCart(prev => [...prev, item]));
          }}
        />
      )}

      {/* ═══════════════ MENU VIEW ═══════════════ */}
      {currentView === 'menu' && (
        <div className="screen-slide-in">
          <div className="top-header">
            <button className="back-btn" onClick={() => setCurrentView('home')}>←</button>
            <div className="brand-title" style={{ fontSize: 18 }}>{selectedOutlet?.name}</div>
            <div style={{ width: 32 }} />
          </div>

          {/* Search & Sort */}
          <div className="search-filter-bar">
            <div className="search-input-wrap">
              <input
                type="text"
                className="search-input"
                placeholder="Search menu..."
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
              {sortLoading ? '...' : 'Sort ₹'}
            </button>
            <button className="filter-btn" onClick={() => sortMenu('name')} disabled={sortLoading}>A–Z</button>
          </div>

          {/* Menu Feed — grouped by subCategory */}
          <div className="menu-feed">
            {menuLoading ? (
              <div className="menu-loading">
                {[1, 2, 3, 4].map(i => <div className="skeleton-card" key={i} />)}
              </div>
            ) : menuGrouped.length > 0 ? (
              menuGrouped.map(([catName, items]) => (
                <div key={catName} className="menu-section">
                  {/* Category Section Header */}
                  <div className="menu-section-header">
                    <span className="menu-section-icon">{SUB_CAT_ICON[catName] || '🍽️'}</span>
                    <span className="menu-section-title">{catName}</span>
                    <span className="menu-section-count">{items.length}</span>
                  </div>

                  {/* Items within section */}
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
                            aria-label={`Add ${item.name} to cart`}
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
                  <button className="filter-btn" onClick={() => { setSearchQuery(''); sortMenu('name'); }}>
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ CART VIEW ═══════════════ */}
      {currentView === 'cart' && (
        <div className="screen-slide-in" style={{ zIndex: 300 }}>
          <div className="top-header">
            <button className="back-btn" onClick={() => setCurrentView('menu')}>←</button>
            <div className="brand-title" style={{ fontSize: 20 }}>My Cart</div>
            <button className="back-btn" style={{ fontSize: 15, color: 'var(--danger)' }} onClick={popCart} disabled={cart.length === 0}>
              ↺ Undo
            </button>
          </div>

          <div className="cart-items-list">
            {cart.map((item, idx) => (
              <div className={`cart-item ${removingItem === idx ? 'cart-item--removing' : ''}`} key={idx}>
                <img src={item.imageUrl} alt={item.name} />
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <p>₹{item.price}</p>
                </div>
                <button className="cart-item-delete" onClick={() => removeFromCart(idx)} aria-label={`Remove ${item.name}`}>
                  🗑
                </button>
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
                  <div
                    key={method}
                    className={`payment-option ${paymentMethod === method ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    <input type="radio" checked={paymentMethod === method} readOnly />
                    <label>{method}</label>
                    {paymentMethod === method && <span className="pay-check">✓</span>}
                  </div>
                ))}
              </div>

              <button className={`btn-large ${checkoutLoading ? 'btn-large--loading' : ''}`} onClick={handleCheckout} disabled={checkoutLoading}>
                {checkoutLoading
                  ? <><span className="btn-spinner" /> Processing...</>
                  : <>Pay ₹{cartTotal} via {paymentMethod}</>
                }
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Sticky Cart Bar ────────────────────── */}
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
