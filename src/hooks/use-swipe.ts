import { useState, useRef, useCallback } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  swiping: boolean;
  direction: "left" | "right" | "up" | "down" | null;
  deltaX: number;
  deltaY: number;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export const useSwipe = (
  handlers: SwipeHandlers,
  options: { threshold?: number; preventScroll?: boolean; minVelocity?: number } = {}
) => {
  const { threshold = 50, preventScroll = false, minVelocity = 0.3 } = options;
  const [swipeState, setSwipeState] = useState<SwipeState>({
    swiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
  });

  const startPos = useRef<TouchPosition | null>(null);
  const currentPos = useRef<TouchPosition | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    currentPos.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setSwipeState({ swiping: true, direction: null, deltaX: 0, deltaY: 0 });
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startPos.current) return;

      const touch = e.touches[0];
      currentPos.current = { x: touch.clientX, y: touch.clientY };

      const deltaX = touch.clientX - startPos.current.x;
      const deltaY = touch.clientY - startPos.current.y;

      let direction: "left" | "right" | "up" | "down" | null = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? "right" : "left";
      } else {
        direction = deltaY > 0 ? "down" : "up";
      }

      if (preventScroll && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }

      setSwipeState({ swiping: true, direction, deltaX, deltaY });
    },
    [preventScroll]
  );

  const handleTouchEnd = useCallback(() => {
    if (!startPos.current || !currentPos.current) {
      setSwipeState({ swiping: false, direction: null, deltaX: 0, deltaY: 0 });
      return;
    }

    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;
    const deltaTime = Date.now() - startPos.current.time;
    
    // Calculate velocity (pixels per millisecond)
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    // Only trigger swipe if both threshold AND velocity requirements are met
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold && velocityX >= minVelocity && handlers.onSwipeRight) {
        handlers.onSwipeRight();
      } else if (deltaX < -threshold && velocityX >= minVelocity && handlers.onSwipeLeft) {
        handlers.onSwipeLeft();
      }
    } else {
      if (deltaY > threshold && velocityY >= minVelocity && handlers.onSwipeDown) {
        handlers.onSwipeDown();
      } else if (deltaY < -threshold && velocityY >= minVelocity && handlers.onSwipeUp) {
        handlers.onSwipeUp();
      }
    }

    startPos.current = null;
    currentPos.current = null;
    setSwipeState({ swiping: false, direction: null, deltaX: 0, deltaY: 0 });
  }, [handlers, threshold, minVelocity]);

  return {
    swipeState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};
