import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay` milliseconds. Keeps the text input responsive to
 * every keystroke while the database is only asked once the typing settles.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
