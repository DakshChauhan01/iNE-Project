import { useState, useEffect } from 'react';

export function useWakingUp(isLoading: boolean, delayMs = 3000) {
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        setIsWakingUp(true);
      }, delayMs);
    } else {
      setIsWakingUp(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, delayMs]);

  return isWakingUp;
}
