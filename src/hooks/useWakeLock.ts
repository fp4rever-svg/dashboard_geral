import { useEffect, useRef } from 'react';

export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<any | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = null;
        });
      }
      return;
    }

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          // Check if document is visible before requesting
          if (document.hidden) return;
          
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          
          wakeLockRef.current.addEventListener('release', () => {
            console.log('Wake Lock released');
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn('Failed to request Wake Lock', err);
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = null;
        });
      }
    };
  }, [enabled]);
}
