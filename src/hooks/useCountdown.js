import { useEffect, useRef, useState } from 'react';

/** Décompte en secondes, utilisé pour "Renvoyer le code dans 00:41". */
export function useCountdown(initialSeconds) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      clearInterval(intervalRef.current);
      return undefined;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [secondsLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = (seconds = initialSeconds) => setSecondsLeft(seconds);

  return { secondsLeft, isExpired: secondsLeft <= 0, restart };
}
