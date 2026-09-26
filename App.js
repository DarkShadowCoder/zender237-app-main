import 'react-native-url-polyfill/auto';

import React, {
  useCallback,
} from 'react';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import * as SplashScreen
  from 'expo-splash-screen';


import {
  useFonts,

  Baloo2_400Regular,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,

} from '@expo-google-fonts/baloo-2';


import Toast
  from 'react-native-toast-message';


import {
  AuthProvider,
} from './src/context/AuthContext';

import {
  LocaleProvider,
} from './src/context/LocaleContext';

import {
  AuthorizationProvider,
} from './src/context/AuthorizationContext';

import {
  WalletProvider,
} from './src/context/WalletContext';

import {
  NotificationProvider,
} from './src/context/NotificationContext';


import RootNavigator
  from './src/navigation/RootNavigator';


SplashScreen
  .preventAutoHideAsync()
  .catch(() => {});


export default function App() {

  const [
    fontsLoaded,
  ] =
    useFonts({

      Baloo2_400Regular,
      Baloo2_500Medium,
      Baloo2_600SemiBold,
      Baloo2_700Bold,
      Baloo2_800ExtraBold,

    });


  const onLayoutRootView =
    useCallback(
      async () => {

        if (
          fontsLoaded
        ) {

          await SplashScreen
            .hideAsync();

        }

      },
      [
        fontsLoaded,
      ]
    );


  if (
    !fontsLoaded
  ) {

    return null;

  }


  return (

    <GestureHandlerRootView

      style={{
        flex: 1,
      }}

      onLayout={
        onLayoutRootView
      }

    >

      <SafeAreaProvider>

        <LocaleProvider>

          <AuthProvider>

            <AuthorizationProvider>

              <WalletProvider>

                <NotificationProvider>

                  <StatusBar
                    style="dark"
                  />

                  <RootNavigator />

                  <Toast />

                </NotificationProvider>

              </WalletProvider>

            </AuthorizationProvider>

          </AuthProvider>

        </LocaleProvider>

      </SafeAreaProvider>

    </GestureHandlerRootView>

  );

}