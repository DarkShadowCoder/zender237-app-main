import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getAppLocale,
  initializeAppLocale,
  setAppLocale,
  subscribeToLocale,
} from '../i18n';

const LocaleContext =
  createContext(null);

export function LocaleProvider({
  children,
}) {
  const [locale, setLocale] =
    useState(getAppLocale());

  useEffect(() => {
    let mounted = true;

    initializeAppLocale()
      .then((nextLocale) => {
        if (mounted) {
          setLocale(nextLocale);
        }
      })
      .catch((error) => {
        console.warn(
          '[LocaleContext] initialization failed:',
          error
        );
      });

    const unsubscribe =
      subscribeToLocale((nextLocale) => {
        if (mounted) {
          setLocale(nextLocale);
        }
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const changeLocale =
    useCallback(async (nextLocale) => {
      const updated =
        await setAppLocale(nextLocale);

      setLocale(updated);

      return updated;
    }, []);

  const value = useMemo(
    () => ({
      locale,
      changeLocale,
    }),
    [locale, changeLocale]
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context =
    useContext(LocaleContext);

  if (!context) {
    throw new Error(
      'useLocale doit être utilisé dans un <LocaleProvider>'
    );
  }

  return context;
}