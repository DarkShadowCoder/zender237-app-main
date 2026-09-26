import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useAuth,
} from './AuthContext';

import {
  getWallet,
  subscribeToWallet,
} from '../services/walletService';


const WalletContext =
  createContext(null);


const EMPTY_WALLET = {
  available_balance: 0,
  pending_balance: 0,
};


export function WalletProvider({
  children,
}) {

  const {
    user,
    isUser,
  } = useAuth();


  const [
    wallet,
    setWallet,
  ] = useState(
    EMPTY_WALLET
  );


  const [
    loading,
    setLoading,
  ] = useState(false);


  const refresh =
    useCallback(
      async () => {

        /*
         * Aucun wallet pour :
         *
         * ADMIN
         * PARTNER
         * KMA
         */
        if (
          !user ||
          !isUser
        ) {
          setWallet(
            EMPTY_WALLET
          );
          return;
        }


        setLoading(true);

        try {

          const value =
            await getWallet(
              user.id
            );

          setWallet(
            value ||
            EMPTY_WALLET
          );

        } catch (error) {

          console.error(
            '[WalletContext] refresh failed:',
            error
          );

        } finally {
          setLoading(false);
        }

      },
      [
        user,
        isUser,
      ]
    );


  useEffect(
    () => {

      if (
        !user ||
        !isUser
      ) {
        setWallet(
          EMPTY_WALLET
        );

        return undefined;
      }


      refresh();


      const unsubscribe =
        subscribeToWallet(
          user.id,
          (
            updated
          ) => {

            setWallet(
              updated ||
              EMPTY_WALLET
            );

          }
        );


      return (
        typeof unsubscribe ===
        'function'
          ? unsubscribe
          : undefined
      );

    },
    [
      user,
      isUser,
      refresh,
    ]
  );


  const value =
    useMemo(
      () => ({
        wallet,
        loading,
        refresh,
      }),
      [
        wallet,
        loading,
        refresh,
      ]
    );


  return (
    <WalletContext.Provider
      value={value}
    >
      {children}
    </WalletContext.Provider>
  );
}


export function useWallet() {

  const context =
    useContext(
      WalletContext
    );

  if (!context) {
    throw new Error(
      'useWallet doit être utilisé dans un <WalletProvider>'
    );
  }

  return context;
}