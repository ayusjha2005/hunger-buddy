import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import './FoodSwipe.css';

const SWIPE_THRESHOLD = 100;
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Skeleton card shimmer ─────────────────────────────────
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

// ── Single swipeable card ─────────────────────────────────
function SwipeCard({ item, onSwipeLeft, onSwipeRight, isTop, stackIndex }) {
  const x        = useMotionValue(0);
  const rotate   = useTransform(x, [-300, 0, 300], [-25, 0, 25]);
  const likeOp   = useTransform(x, [10, 120], [0, 1]);
  const nopeOp   = useTransform(x, [-120, -10], [1, 0]);
  const controls = useAnimation();
  const isDragging = useRef(false);

  const handleDragEnd = useCallback(async (_, info) => {
    const velocity = info.velocity.x;
    const offset   = info.offset.x;

    if (offset > SWIPE_THRESHOLD || velocity > 600) {
      await controls.start({
        x: 600, rotate: 30, opacity: 0,
        transition: { duration: 0.35, ease: [0.2, 1, 0.4, 1] }
      });
      onSwipeRight();
    } else if (offset < -SWIPE_THRESHOLD || velocity < -600) {
      await controls.start({
        x: -600, rotate: -30, opacity: 0,
        transition: { duration: 0.35, ease: [0.2, 1, 0.4, 1] }
      });
      onSwipeLeft();
    } else {
      controls.start({
        x: 0, rotate: 0,
        transition: { type: 'spring', stiffness: 300, damping: 25 }
      });
    }
  }, [controls, onSwipeLeft, onSwipeRight]);

  // Programmatic swipe (from buttons)
  useEffect(() => {
    if (item?._swipeLeft) {
      controls.start({ x: -600, rotate: -30, opacity: 0, transition: { duration: 0.35 } }).then(onSwipeLeft);
    }
    if (item?._swipeRight) {
      controls.start({ x: 600, rotate: 30, opacity: 0, transition: { duration: 0.35 } }).then(onSwipeRight);
    }
  }, [item?._swipeLeft, item?._swipeRight]);

  const scale = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.95 : 0.9;
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
      onDragStart={() => { isDragging.current = true; }}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ scale: 0.85, opacity: 0, y: 60 }}
      whileInView={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      {/* LIKE stamp */}
      <motion.div className="fs-stamp fs-stamp--like" style={{ opacity: likeOp }}>
        <span>LIKE</span>
      </motion.div>
      {/* NOPE stamp */}
      <motion.div className="fs-stamp fs-stamp--nope" style={{ opacity: nopeOp }}>
        <span>NOPE</span>
      </motion.div>

      {/* Full-image background */}
      <div className="fs-card__img-wrap">
        <img src={item.imageUrl} alt={item.name} draggable={false} />
        <div className="fs-card__gradient" />
      </div>

      {/* Info body */}
      <div className="fs-card__body">
        <div className="fs-card__outlet">{item.outletName}</div>
        <h2 className="fs-card__name">{item.name}</h2>
        <p className="fs-card__desc">{item.description}</p>
        <div className="fs-card__footer">
          <span className="fs-card__price">₹{item.price}</span>
          <span className={`fs-card__cat fs-cat--${(item.category || '').toLowerCase().replace(/[^a-z]/g, '')}`}>
            {item.category === 'Veg' ? '🟢' : item.category === 'Non-Veg' ? '🔴' : '⚪'} {item.category}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main FoodSwipe Component ──────────────────────────────
function FoodSwipe({ onBack, onAddToCart }) {
  const [items, setItems]           = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedItems, setLikedItems] = useState([]);
  const [allDone, setAllDone]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [btnAnim, setBtnAnim]       = useState(null); // 'like' | 'nope'

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
    }
    advance();
  }, [items, currentIndex, onAddToCart, advance]);

  const handleSwipeLeft = useCallback(() => {
    advance();
  }, [advance]);

  const triggerBtn = (dir) => {
    setBtnAnim(dir);
    setTimeout(() => setBtnAnim(null), 350);
    if (dir === 'like') handleSwipeRight();
    else handleSwipeLeft();
  };

  const progress = items.length > 0 ? (currentIndex / items.length) * 100 : 0;

  // ── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="fs-screen">
        <div className="fs-header">
          <button className="fs-back-btn" onClick={onBack}>←</button>
          <div className="fs-title">Discover 🍽️</div>
          <div style={{ width: 34 }} />
        </div>
        <div className="fs-deck">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ── All Done ─────────────────────────────────────────
  if (allDone || items.length === 0) {
    return (
      <div className="fs-screen">
        <div className="fs-header">
          <button className="fs-back-btn" onClick={onBack}>←</button>
          <div className="fs-title">Discover 🍽️</div>
          <div style={{ width: 34 }} />
        </div>
        <motion.div
          className="fs-done"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          <div className="fs-done__emoji">🎉</div>
          <h2>You've seen it all!</h2>
          <p>{likedItems.length} item{likedItems.length !== 1 ? 's' : ''} added to cart</p>
          <div className="fs-liked-list">
            {likedItems.map((item, i) => (
              <motion.div
                key={i}
                className="fs-liked-chip"
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

  // ── Main UI ───────────────────────────────────────────
  const visibleCards = [0, 1, 2].map(offset => ({
    item: items[currentIndex + offset],
    stackIndex: offset,
  })).filter(c => c.item);

  return (
    <div className="fs-screen">
      {/* Header */}
      <div className="fs-header">
        <button className="fs-back-btn" onClick={onBack}>←</button>
        <div className="fs-title">Discover 🍽️</div>
        <motion.div
          className="fs-cart-badge"
          animate={likedItems.length > 0 ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          🛒 <span>{likedItems.length}</span>
        </motion.div>
      </div>

      {/* Progress */}
      <div className="fs-progress-track">
        <motion.div
          className="fs-progress-fill"
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

      {/* Hint */}
      <div className="fs-hints">
        <span className="fs-hint--nope">← NOPE</span>
        <span className="fs-hint--like">LIKE →</span>
      </div>

      {/* Action buttons */}
      <div className="fs-fab-row">
        <motion.button
          className="fs-fab fs-fab--nope"
          onClick={() => triggerBtn('nope')}
          animate={btnAnim === 'nope' ? { scale: [1, 0.8, 1.15, 1] } : {}}
          transition={{ duration: 0.3 }}
          aria-label="Skip"
        >
          ✕
        </motion.button>

        <motion.button
          className="fs-fab fs-fab--super"
          onClick={() => triggerBtn('like')}
          animate={btnAnim === 'like' || btnAnim === 'super' ? { scale: [1, 0.8, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
          aria-label="Super like"
        >
          ⚡
        </motion.button>

        <motion.button
          className="fs-fab fs-fab--like"
          onClick={() => triggerBtn('like')}
          animate={btnAnim === 'like' ? { scale: [1, 0.8, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
          aria-label="Add to cart"
        >
          ❤️
        </motion.button>
      </div>
    </div>
  );
}

export default FoodSwipe;
