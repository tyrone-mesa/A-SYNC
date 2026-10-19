import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

/**
 * PS5-style swipeable carousel for mobile
 * - Horizontal snap scrolling with center focus
 * - No buttons/arrows, swipe only
 * - Smooth scaling and centering animation
 * - Desktop: Shows all cards in grid (via CSS)
 * - Mobile: Shows 1 card at a time with peek at next/prev
 */
const PS5Carousel = ({ items, renderCard, columns = 3, isMobile = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Handle mouse/touch drag start
  const handleDragStart = (e) => {
    if (!isMobile) return;
    setDragStart(e.clientX || e.touches?.[0]?.clientX);
    setIsDragging(true);
  };

  // Handle mouse/touch drag end (with swipe detection)
  const handleDragEnd = (e) => {
    if (!isMobile || dragStart === null) return;
    setIsDragging(false);

    const currentX = e.clientX || e.changedTouches?.[0]?.clientX;
    const diff = dragStart - currentX;

    // Swipe threshold: 30px
    if (Math.abs(diff) > 30) {
      if (diff > 0) {
        // Swiped left → next
        setActiveIndex((prev) => (prev + 1) % items.length);
      } else {
        // Swiped right → previous
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    }
    setDragStart(null);
  };

  // Handle mouse leave to cancel drag
  const handleMouseLeave = () => {
    if (isDragging) {
      setDragStart(null);
      setIsDragging(false);
    }
  };

  // For mobile: show single card per swipe
  // For desktop: show all in grid (handled by CSS)
  if (!isMobile) {
    return (
      <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
        {items.map((item, index) => (
          <div key={index}>{renderCard(item, index)}</div>
        ))}
      </div>
    );
  }

  // Mobile carousel (PS5-style swipe)
  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onMouseDown={handleDragStart}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleDragStart}
      onTouchEnd={handleDragEnd}
    >
      {/* Carousel container with smooth transitions */}
      <motion.div
        className="flex gap-4"
        animate={{
          x: `-${activeIndex * (100 + 16 / items.length)}%`, // 100% + gap % per item
        }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 25,
        }}
      >
        {items.map((item, index) => {
          const isCenter = index === activeIndex;
          const offset = Math.abs(index - activeIndex);

          return (
            <motion.div
              key={index}
              className="min-w-full shrink-0 px-2"
              animate={{
                scale: isCenter ? 1 : 0.85,
                opacity: offset <= 1 ? 1 : 0.5,
              }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 25,
              }}
            >
              {renderCard(item, index, isCenter)}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Subtle dot indicators at bottom */}
      <div className="mt-4 flex justify-center gap-2">
        {items.map((_, index) => (
          <motion.div
            key={index}
            className="h-1.5 rounded-full bg-[#1E5D46]"
            animate={{
              width: index === activeIndex ? 24 : 8,
              opacity: index === activeIndex ? 1 : 0.3,
            }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </div>
    </div>
  );
};

export default PS5Carousel;
