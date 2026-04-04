import { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import './FoodSwipe.css';

const SWIPE_THRESHOLD = 100;
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Floating confetti pieces
const CONFETTI_COLORS = ['#ff4d6d', '#ff85a2', '#ffb3c6', '#ffd6e0', '#ff9500', '#ffcc02'];
const HEARTS = ['❤️', '🩷', '💕', '💖', '💗'];

function SkeletonCard() {
  return (
    <div className="fs-skeleton">
      <div className="fs-skel-img shimmer" />
      <div className="fs-skel-body">
        <div className="fs-skel-tag shimmer" />
        <div className="fs-skel-title shimmer" />
        <div className="fs-skel-desc shimmer" />
      </div>
    </div>
  );
}

// ── Match Screen ──────────────────────────────────────────
function MatchScreen({ item, onKeepSwiping, onGoBack }) {
  const confetti = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    size: `${8 + Math.random() * 10}px`,
  }));
  const hearts = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    emoji: HEARTS[i % HEARTS.length],
    delay: `${Math.random() * 3}s`,
    duration: `${3 + Math.random() * 2}s`,
    size: `${16 + Math.random() * 20}px`,
  }));

  return (
    <div className="fs-match-screen">
      {/* Floating hearts background */}
      <div className="fs-match-hearts">
        {hearts.map(h => (
          <div key={h.id} className="fs-match-heart"
            style={{ left: h.left, fontSize: h.size, animationDuration: h.duration, animationDelay: h.delay }}
          >{h.emoji}</div>
        ))}
        {confetti.map(c => (
          <div key={c.id} className="fs-confetti"
            style={{
              left: c.left, backgroundColor: c.color,
              width: c.size, height: c.size,
              animationDuration: c.duration, animationDelay: c.delay,
            }}
          />
        ))}
      </div>

      <div className="fs-match-big-heart">❤️</div>
      <div className="fs-match-title">It's a Match!</div>
      <p className="fs-match-sub">
        You and <strong>{item.name}</strong> liked each other!<br />
        Looks like you're in for a delicious time.
      </p>

      <div className="fs-match-card-preview">
        <img src={item.imageUrl} alt={item.name} />
        <div className="fs-match-card-info">
          <h4>{item.name} 🍔</h4>
          <p>⭐ 4.8 · {item.outletName}</p>
        </div>
      </div>

      <div className="fs-match-btns">
        <button className="fs-match-btn-primary" onClick={onGoBack}>
          🛒 View in Cart
        </button>
        <button className="fs-match-btn-secondary" onClick={onKeepSwiping}>↺ Keep Swiping</button>
      </div>
    </div>
  );
}

// ── Single swipeable card ─────────────────────────────────
function SwipeCard({ item, onSwipeLeft, onSwipeRight, isTop, stackIndex }) {
  const x        = useMotionValue(0);
  const rotate   = useTransform(x, [-300, 0, 300], [-22, 0, 22]);
  const likeOp   = useTransform(x, [10, 110], [0, 1]);
  const nopeOp   = useTransform(x, [-110, -10], [1, 0]);
  const controls = useAnimation();

  const handleDragEnd = useCallback(async (_, info) => {
    const velocity = info.velocity.x;
    const offset   = info.offset.x;

    if (offset > SWIPE_THRESHOLD || velocity > 600) {
      await controls.start({
        x: 700, rotate: 28, opacity: 0,
        transition: { duration: 0.35, ease: [0.2, 1, 0.4, 1] }
      });
      onSwipeRight();
    } else if (offset < -SWIPE_THRESHOLD || velocity < -600) {
      await controls.start({
        x: -700, rotate: -28, opacity: 0,
        transition: { duration: 0.35, ease: [0.2, 1, 0.4, 1] }
      });
      onSwipeLeft();
    } else {
      controls.start({
        x: 0, rotate: 0,
        transition: { type: 'spring', stiffness: 320, damping: 28 }
      });
    }
  }, [controls, onSwipeLeft, onSwipeRight]);

  const scale   = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.95 : 0.9;
  const yOffset = stackIndex === 0 ? 0 : stackIndex === 1 ? 14 : 26;

  if (!isTop) {
    return (
      <motion.div
        className="fs-card fs-card--back"
        animate={{ scale, y: yOffset }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        style={{ zIndex: 10 - stackIndex }}
      >
        <img src={item.imageUrl} alt="" draggable={false} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fs-card fs-card--top"
      style={{ x, rotate, zIndex: 20 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ scale: 0.82, opacity: 0, y: 70 }}
      whileInView={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } }}
      whileHover={{ scale: 1.025, transition: { duration: 0.2 } }}
    >
      {/* Overlays */}
      <motion.div className="fs-stamp fs-stamp--like" style={{ opacity: likeOp }}>
        <span>LIKE ❤️</span>
      </motion.div>
      <motion.div className="fs-stamp fs-stamp--nope" style={{ opacity: nopeOp }}>
        <span>NOPE ✕</span>
      </motion.div>

      <div className="fs-card__img-wrap">
        <img src={item.imageUrl} alt={item.name} draggable={false} />
        <div className="fs-card__gradient" />
      </div>

      <div className="fs-card__body">
        <div className="fs-card__outlet">{item.outletName}</div>
        <h2 className="fs-card__name">{item.name}</h2>
        <p className="fs-card__desc">{item.description}</p>
        <div className="fs-card__footer">
          <span className="fs-card__price">₹{item.price}</span>
          <span className="fs-card__cat">
            {item.category === 'Veg' ? '🟢' : item.category === 'Non-Veg' ? '🔴' : '⚪'} {item.category}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────
function FoodSwipe({ onBack, onAddToCart }) {
  const [items, setItems]           = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedItems, setLikedItems] = useState([]);
  const [allDone, setAllDone]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [matchItem, setMatchItem]   = useState(null); // "It's a Match!" screen
  const [btnAnim, setBtnAnim]       = useState(null);

  useEffect(() => {
    fetch(`${API}/outlets`)
      .then(r => r.json())
      .then(outlets => Promise.all(
        outlets.map(o =>
          fetch(`${API}/menu/${o._id}`)
            .then(r => r.json())
            .then(items => items.map(item => ({ ...item, outletName: o.name })))
        )
      ))
      .then(allMenus => {
        const flat = allMenus.flat().sort(() => Math.random() - 0.5);
        setItems(flat);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const advance = useCallback(() => {
    const next = currentIndex + 1;
    if (next >= items.length) setAllDone(true);
    else setCurrentIndex(next);
  }, [currentIndex, items.length]);

  const handleSwipeRight = useCallback(() => {
    const item = items[currentIndex];
    if (item) {
      setLikedItems(prev => [...prev, item]);
      if (onAddToCart) onAddToCart(item);
      fetch(`${API}/cart/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: [], newItem: item })
      }).catch(() => {});
      // Show match screen briefly
      setMatchItem(item);
    }
  }, [items, currentIndex, onAddToCart]);

  const handleSwipeLeft = useCallback(() => {
    advance();
  }, [advance]);

  const dismissMatch = () => {
    setMatchItem(null);
    advance();
  };

  const triggerBtn = (dir) => {
    setBtnAnim(dir);
    setTimeout(() => setBtnAnim(null), 350);
    if (dir === 'like') handleSwipeRight();
    else handleSwipeLeft();
  };

  const progress = items.length > 0 ? (currentIndex / items.length) * 100 : 0;

  // Loading
  if (loading) {
    return (
      <div className="fs-screen">
        <div className="fs-header">
          <button className="fs-back-btn" onClick={onBack}>←</button>
          <div className="fs-title">Discover 🍽️</div>
          <div style={{ width: 34 }} />
        </div>
        <div className="fs-deck"><SkeletonCard /></div>
      </div>
    );
  }

  // All done
  if (allDone || (items.length === 0 && !loading)) {
    return (
      <div className="fs-screen">
        <div className="fs-header">
          <button className="fs-back-btn" onClick={onBack}>←</button>
          <div className="fs-title">Discover 🍽️</div>
          <div style={{ width: 34 }} />
        </div>
        <motion.div className="fs-done"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          <div className="fs-done__emoji">🎉</div>
          <h2>You've seen it all!</h2>
          <p>{likedItems.length} item{likedItems.length !== 1 ? 's' : ''} added to cart</p>
          <div className="fs-liked-list">
            {likedItems.map((item, i) => (
              <motion.div key={i} className="fs-liked-chip"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <img src={item.imageUrl} alt={item.name} />
                <span>{item.name}</span>
              </motion.div>
            ))}
          </div>
          <button className="fs-cta-btn" onClick={onBack}>Back to Home</button>
        </motion.div>
      </div>
    );
  }

  const visibleCards = [0, 1, 2]
    .map(offset => ({ item: items[currentIndex + offset], stackIndex: offset }))
    .filter(c => c.item);

  return (
    <div className="fs-screen">
      {/* Match overlay */}
      <AnimatePresence>
        {matchItem && (
          <motion.div
            key="match"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            style={{ position: 'absolute', inset: 0, zIndex: 200 }}
          >
            <MatchScreen
              item={matchItem}
              onKeepSwiping={dismissMatch}
              onGoBack={() => { setMatchItem(null); onBack(); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="fs-header">
        <button className="fs-back-btn" onClick={onBack}>←</button>
        <div className="fs-title">Swipe Your Hunger ❤️</div>
        <motion.div className="fs-cart-badge"
          animate={likedItems.length > 0 ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          🛒 <span>{likedItems.length}</span>
        </motion.div>
      </div>

      {/* Progress */}
      <div className="fs-progress-track">
        <motion.div className="fs-progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </div>
      <p className="fs-step-label">{currentIndex + 1} / {items.length}</p>

      {/* Card Stack */}
      <div className="fs-deck">
        <AnimatePresence>
          {[...visibleCards].reverse().map(({ item, stackIndex }) => (
            <SwipeCard
              key={`${currentIndex + stackIndex}-${item._id}`}
              item={item}
              isTop={stackIndex === 0}
              stackIndex={stackIndex}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Hints */}
      <div className="fs-hints">
        <span className="fs-hint--nope">← SKIP</span>
        <span className="fs-hint--like">LIKE →</span>
      </div>

      {/* FABs */}
      <div className="fs-fab-row">
        <motion.button className="fs-fab fs-fab--nope"
          onClick={() => triggerBtn('nope')}
          animate={btnAnim === 'nope' ? { scale: [1, 0.75, 1.15, 1] } : {}}
          transition={{ duration: 0.3 }}
          aria-label="Skip"
        >✕</motion.button>

        <motion.button className="fs-fab fs-fab--super"
          onClick={() => triggerBtn('like')}
          animate={btnAnim === 'super' ? { scale: [1, 0.75, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
          aria-label="Super like"
        >⚡</motion.button>

        <motion.button className="fs-fab fs-fab--like"
          onClick={() => triggerBtn('like')}
          animate={btnAnim === 'like' ? { scale: [1, 0.75, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
          aria-label="Add to cart"
        >❤️</motion.button>
      </div>
    </div>
  );
}

export default FoodSwipe;
