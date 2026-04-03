import { useState, useRef, useEffect } from 'react';

const SWIPE_THRESHOLD = 80;
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function FoodSwipe({ onBack, onAddToCart }) {
  const [items, setItems]               = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [dragX, setDragX]               = useState(0);
  const [likedItems, setLikedItems]     = useState([]);
  const [showResult, setShowResult]     = useState(null);
  const [allDone, setAllDone]           = useState(false);
  const [loading, setLoading]           = useState(true);

  const dragStartX = useRef(0);
  const cardRef    = useRef(null);

  useEffect(() => {
    fetch(`${API}/outlets`)
      .then(r => r.json())
      .then(outlets => {
        const fetches = outlets.map(o =>
          fetch(`${API}/menu/${o._id}`)
            .then(r => r.json())
            .then(items => items.map(item => ({ ...item, outletName: o.name })))
        );
        return Promise.all(fetches);
      })
      .then(allMenus => {
        const flat = allMenus.flat();
        const shuffled = flat.sort(() => Math.random() - 0.5);
        setItems(shuffled);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const currentItem = items[currentIndex];

  const commitSwipe = (direction) => {
    setSwipeDirection(direction);
    setShowResult(direction === 'right' ? 'liked' : 'skipped');

    if (direction === 'right' && currentItem) {
      setLikedItems(prev => [...prev, currentItem]);
      fetch(`${API}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: [], newItem: currentItem })
      }).catch(() => {});
      if (onAddToCart) onAddToCart(currentItem);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      setDragX(0);
      setShowResult(null);
      const next = currentIndex + 1;
      if (next >= items.length) setAllDone(true);
      else setCurrentIndex(next);
    }, 420);
  };

  const onDragStart = (clientX) => { dragStartX.current = clientX; setIsDragging(true); };
  const onDragMove  = (clientX) => { if (!isDragging) return; setDragX(clientX - dragStartX.current); };
  const onDragEnd   = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX >  SWIPE_THRESHOLD) commitSwipe('right');
    else if (dragX < -SWIPE_THRESHOLD) commitSwipe('left');
    else setDragX(0);
  };

  const onMouseDown = (e) => onDragStart(e.clientX);
  const onMouseMove = (e) => { if (isDragging) onDragMove(e.clientX); };
  const onMouseUp   = ()  => onDragEnd();

  const onTouchStart = (e) => onDragStart(e.touches[0].clientX);
  const onTouchMove  = (e) => onDragMove(e.touches[0].clientX);
  const onTouchEnd   = ()  => onDragEnd();

  const getCardStyle = () => {
    if (swipeDirection === 'left')
      return { transform: 'translateX(-130%) rotate(-28deg)', opacity: 0, transition: 'all 0.42s cubic-bezier(0.4,0,0.2,1)' };
    if (swipeDirection === 'right')
      return { transform: 'translateX(130%) rotate(28deg)', opacity: 0, transition: 'all 0.42s cubic-bezier(0.4,0,0.2,1)' };
    const rotate = dragX * 0.06;
    return {
      transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      cursor: isDragging ? 'grabbing' : 'grab',
    };
  };

  const likeOpacity = Math.min(Math.max(dragX  / SWIPE_THRESHOLD, 0), 1);
  const skipOpacity = Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);
  const progress    = items.length > 0 ? (currentIndex / items.length) * 100 : 0;

  // ── Loading ────────────────────────────────
  if (loading) {
    return (
      <div className="swipe-screen" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
        <div className="swipe-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="brand-title">Discover 🍽️</div>
          <div style={{ width: 34 }} />
        </div>
        <div className="swipe-loading-wrap">
          <div className="loader-spinner" />
          <p style={{ color: 'var(--text-secondary)', marginTop: 16, fontSize: 14 }}>Loading menu…</p>
        </div>
      </div>
    );
  }

  // ── All Done ───────────────────────────────
  if (allDone || items.length === 0) {
    return (
      <div className="swipe-screen">
        <div className="swipe-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div className="brand-title">Discover 🍽️</div>
          <div style={{ width: 34 }} />
        </div>
        <div className="swipe-done-screen">
          <div className="swipe-done-emoji">🎉</div>
          <h2>You've seen it all!</h2>
          <p>{likedItems.length} item{likedItems.length !== 1 ? 's' : ''} added to cart</p>
          <div className="liked-summary">
            {likedItems.map((item, i) => (
              <div key={i} className="liked-chip">
                <img src={item.imageUrl} alt={item.name} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
          <button className="btn-large" style={{ marginTop: 20 }} onClick={onBack}>Back to Home</button>
        </div>
      </div>
    );
  }

  // ── Main Swipe UI ──────────────────────────
  return (
    <div
      className="swipe-screen"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Header */}
      <div className="swipe-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="brand-title">Discover 🍽️</div>
        <div className="swipe-cart-count">
          🛒 <span>{likedItems.length}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="swipe-progress-track">
        <div className="swipe-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="swipe-step-label">{currentIndex + 1} / {items.length}</p>

      {/* Deck */}
      <div className="swipe-deck">
        {items[currentIndex + 1] && (
          <div className="food-card food-card--back">
            <img src={items[currentIndex + 1].imageUrl} alt="" />
          </div>
        )}

        <div
          ref={cardRef}
          className="food-card food-card--front"
          style={getCardStyle()}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Stamp overlays */}
          <div className="swipe-overlay swipe-overlay--like" style={{ opacity: likeOpacity }}>
            <span>❤️ ADD</span>
          </div>
          <div className="swipe-overlay swipe-overlay--skip" style={{ opacity: skipOpacity }}>
            <span>✕ SKIP</span>
          </div>

          <div className="food-card__image-wrap">
            <img src={currentItem.imageUrl} alt={currentItem.name} draggable={false} />
            <div className="food-card__gradient" />
          </div>

          <div className="food-card__body">
            <div className="food-card__outlet-tag">{currentItem.outletName}</div>
            <h2 className="food-card__name">{currentItem.name}</h2>
            <p className="food-card__desc">{currentItem.description}</p>
            <div className="food-card__footer">
              <span className="food-card__price">₹{currentItem.price}</span>
              <span className={`food-card__cat food-card__cat--${(currentItem.category || '').toLowerCase()}`}>
                {currentItem.category === 'Veg' ? '🟢' : currentItem.category === 'Non-Veg' ? '🔴' : '⚪'} {currentItem.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hint row */}
      <div className="swipe-hint">
        <span className="swipe-hint__skip">← Skip</span>
        <span className="swipe-hint__heart">❤️ Like</span>
        <span className="swipe-hint__add">Add →</span>
      </div>

      {/* FAB row */}
      <div className="swipe-fab-row">
        <button className="swipe-fab swipe-fab--skip" onClick={() => commitSwipe('left')} aria-label="Skip">✕</button>
        <button className="swipe-fab swipe-fab--super" onClick={() => commitSwipe('right')} aria-label="Super like">⚡</button>
        <button className="swipe-fab swipe-fab--like"  onClick={() => commitSwipe('right')} aria-label="Add to cart">❤️</button>
      </div>

      {showResult && (
        <div className={`swipe-toast swipe-toast--${showResult}`}>
          {showResult === 'liked' ? '❤️ Added to Cart!' : '⏭ Skipped'}
        </div>
      )}
    </div>
  );
}

export default FoodSwipe;
