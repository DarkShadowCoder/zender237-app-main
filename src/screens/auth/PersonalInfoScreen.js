import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  colors,
  typography,
  spacing,
  countries,
} from '../../theme/theme';
import Input from '../../components/Input';
import SelectField from '../../components/SelectField';
import SecretCodeInput from '../../components/SecretCodeInput';
import Checkbox from '../../components/Checkbox';
import Button from '../../components/Button';
import {
  completeRegistration,
} from '../../services/authService';
import {
  isValidUsername,
} from '../../utils/validators';
import {
  SECRET_CODE_LENGTH,
} from '../../constants';

export default function PersonalInfoScreen({
  route,
  navigation,
}) {
  const {
    whatsappNumber,
  } = route.params;

  const [fullName, setFullName] =
    useState('');

  const [username, setUsername] =
    useState('');

  const [country, setCountry] =
    useState('cameroun');

  const [secretCode, setSecretCode] =
    useState('');

  const [accepted, setAccepted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [errors, setErrors] =
    useState({});

  const handleSubmit =
    async () => {
      const nextErrors = {};

      if (!fullName.trim()) {
        nextErrors.fullName =
          'Nom complet requis.';
      }

      if (!isValidUsername(username)) {
        nextErrors.username =
          "Nom d'utilisateur invalide (3-20 caractères).";
      }

      if (
        secretCode.length !==
        SECRET_CODE_LENGTH
      ) {
        nextErrors.secret =
          'Code secret incomplet.';
      }

      if (!accepted) {
        nextErrors.accepted =
          'Veuillez accepter les conditions.';
      }

      setErrors(
        nextErrors
      );

      if (
        Object.keys(
          nextErrors
        ).length
      ) {
        return;
      }

      setLoading(true);

      try {
        await completeRegistration({
          username,
          whatsappNumber,
          country,
          secretCode,
          fullName,
        });

        navigation.replace(
          'AccountCreated'
        );
      } catch (e) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2:
            e?.message ||
            'Impossible de créer le compte.',
        });
      } finally {
        setLoading(false);
      }
    };

  return (
    <ScrollView
      contentContainerStyle={
        styles.wrapper
      }
    >
      <Text style={typography.h1}>
        Informations personnelles
      </Text>

      <View
        style={{
          marginTop: spacing.xl,
        }}
      />

      <Input
        label="Nom complet"
        value={fullName}
        onChangeText={
          setFullName
        }
        placeholder="Yvan Landry"
        error={
          errors.fullName
        }
      />

      <Input
        label="Nom d'utilisateur"
        value={username}
        onChangeText={
          setUsername
        }
        placeholder="yvan_landry"
        error={
          errors.username
        }
      />

      <SelectField
        label="Pays"
        valueLabel={`${countries[country].flag} ${countries[country].label}`}
        onPress={() => {
          const order =
            Object.keys(
              countries
            );

          const idx =
            order.indexOf(
              country
            );

          setCountry(
            order[
              (idx + 1) %
                order.length
            ]
          );
        }}
      />

      <SecretCodeInput
        label="Code secret (6 chiffres)"
        value={secretCode}
        onChangeText={
          setSecretCode
        }
        maxLength={
          SECRET_CODE_LENGTH
        }
        error={
          errors.secret
        }
      />

      <Checkbox
        checked={accepted}
        onToggle={() =>
          setAccepted(
            (value) =>
              !value
          )
        }
      >
        J'accepte les Conditions d'utilisation et la Politique de confidentialité.
      </Checkbox>

      {errors.accepted ? (
        <Text style={styles.error}>
          {errors.accepted}
        </Text>
      ) : null}

      <View
        style={{
          marginTop: spacing.xl,
        }}
      >
        <Button
          title="Continuer"
          onPress={
            handleSubmit
          }
          loading={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      flexGrow: 1,
      backgroundColor:
        colors.background.default,
      padding:
        spacing.screenHorizontal,
      paddingTop: 60,
    },

    error: {
      marginTop: spacing.sm,
      color:
        colors.error.default,
    },
  });