
import React from 'react';

import {
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  spacing,
  typography,
} from '../../../theme/theme';

import {
  useAuthorization,
} from '../../../context/AuthorizationContext';


export default function PartnerKmerDiasporaGuard({
  children,
}) {

  const {
    canViewKmerDiaspora,
  } =
    useAuthorization();


  if (
    canViewKmerDiaspora()
  ) {
    return children;
  }


  return (
    <View
      style={{
        flex: 1,

        alignItems:
          'center',

        justifyContent:
          'center',

        backgroundColor:
          colors
            .background
            .default,

        paddingHorizontal:
          spacing
            .screenHorizontal,
      }}
    >

      <Ionicons
        name="lock-closed-outline"
        size={38}
        color={
          colors
            .text
            .secondary
        }
      />


      <Text
        style={[
          typography.h2,
          {
            marginTop:
              spacing.md,

            textAlign:
              'center',
          },
        ]}
      >
        Accès KmerDiaspora refusé
      </Text>


      <Text
        style={[
          typography.caption,
          {
            marginTop:
              spacing.xs,

            textAlign:
              'center',
          },
        ]}
      >
        Ce compte partenaire ne possède pas le rôle nécessaire pour consulter KmerDiaspora.
      </Text>

    </View>
  );
}
