// Haptic feedback hook for mobile devices
export const useHaptic = () => {
  const trigger = (type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light') => {
    // Check if the Vibration API is available
    if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate(30);
          break;
        case 'selection':
          navigator.vibrate(5);
          break;
        case 'success':
          navigator.vibrate([10, 50, 10]);
          break;
        case 'warning':
          navigator.vibrate([20, 30, 20]);
          break;
        case 'error':
          navigator.vibrate([30, 50, 30, 50, 30]);
          break;
      }
    }
  };

  return { trigger };
};
