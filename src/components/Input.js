
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import {
  components,
  colors,
  spacing,
  fontWeights,
  fontSizes,
  typography,
} from '../theme/theme';

export function digitsOnly(text) {
  return (text || '').replace(/[^0-9]/g, '');
}

/**
 * Formatage des montants :
 *
 * 5000       -> 5 000
 * 50000      -> 50 000
 * 1250000    -> 1 250 000
 */
export function formatPriceDigits(digits) {
  if (!digits) return '';

  return digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ' '
  );
}

/**
 * Retourne toujours un nombre utilisable
 * par les services/backend.
 *
 * "50 000" -> 50000
 */
export function normalizePrice(text) {
  const digits =
    digitsOnly(text);

  return digits
    ? Number(digits)
    : 0;
}

/**
 * Formatage des numéros de téléphone.
 *
 * Exemples :
 *
 * 650658852
 * -> 6 50 65 88 52
 *
 * +237650658852
 * -> +237 65 06 58 85 2
 *
 * +22366123456
 * -> +223 66 12 34 56
 *
 * +224621234567
 * -> +224 62 12 34 56 7
 */
export function formatPhone(value) {
  if (!value) return '';

  const original =
    String(value).trim();

  const hasPlus =
    original.startsWith('+');

  const digits =
    original.replace(
      /\D/g,
      ''
    );

  if (!digits) {
    return hasPlus
      ? '+'
      : '';
  }

  /*
   * Indicatifs supportés par
   * l'application.
   */
  if (hasPlus) {
    const countryCode =
      [
        '237',
        '223',
        '224',
      ].find(
        (code) =>
          digits.startsWith(code)
      );

    if (countryCode) {
      const local =
        digits.slice(
          countryCode.length
        );

      const groups =
        local.match(
          /.{1,2}/g
        ) || [];

      return `+${countryCode}${
        local
          ? ` ${groups.join(' ')}`
          : ''
      }`.trim();
    }

    const groups =
      digits.match(
        /.{1,2}/g
      ) || [];

    return `+${groups.join(' ')}`.trim();
  }

  /*
   * Format camerounais/local :
   *
   * 6 50 65 88 52
   */
  const first =
    digits.slice(0, 1);

  const rest =
    digits.slice(1);

  const groups =
    rest.match(
      /.{1,2}/g
    ) || [];

  return [
    first,
    ...groups,
  ].join(' ');
}

/**
 * Supprime le formatage avant stockage/API.
 *
 * "6 50 65 88 52"
 * -> "650658852"
 *
 * "+237 6 50 65 88 52"
 * -> "+237650658852"
 */
export function normalizePhone(value) {
  if (!value) return '';

  const original =
    String(value).trim();

  const digits =
    original.replace(
      /\D/g,
      ''
    );

  if (!digits) return '';

  return original.startsWith('+')
    ? `+${digits}`
    : digits;
}

export function lettersOnly(text) {
  return (text || '')
    .replace(
      /[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g,
      ''
    )
    .replace(
      /\s{2,}/g,
      ' '
    );
}

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  secureTextEntry = false,
  autoCapitalize = 'none',
  leftAdornment,
  rightAdornment,
  editable = true,

  /*
   * Formats supportés :
   *
   * none
   * price
   * phone
   * name
   * numeric
   */
  format = 'none',

  maxLength,

  ...rest
}) {
  const [
    focused,
    setFocused,
  ] = useState(false);

  const io =
    components.input;

  const borderColor =
    error
      ? io.errorBorderColor
      : focused
        ? io.focusBorderColor
        : io.borderColor;

  const handleChangeText =
    (text) => {
      switch (format) {

        /*
         * ==============================================
         * MONTANT
         * ==============================================
         */
        case 'price': {
          const raw =
            digitsOnly(
              text
            ).slice(
              0,
              maxLength ??
                undefined
            );

          onChangeText(
            formatPriceDigits(
              raw
            )
          );

          return;
        }

        /*
         * ==============================================
         * TELEPHONE
         * ==============================================
         */
        case 'phone': {
          /*
           * On ne limite pas maxLength ici car
           * le nombre de caractères visibles comprend
           * les espaces.
           */
          onChangeText(
            formatPhone(text)
          );

          return;
        }

        /*
         * ==============================================
         * NOM
         * ==============================================
         */
        case 'name': {
          onChangeText(
            lettersOnly(
              text
            ).slice(
              0,
              maxLength ??
                undefined
            )
          );

          return;
        }

        /*
         * ==============================================
         * NUMERIQUE
         * ==============================================
         */
        case 'numeric': {
          onChangeText(
            digitsOnly(
              text
            ).slice(
              0,
              maxLength ??
                undefined
            )
          );

          return;
        }

        /*
         * ==============================================
         * TEXTE NORMAL
         * ==============================================
         */
        default:
          onChangeText(
            maxLength
              ? String(
                  text
                ).slice(
                  0,
                  maxLength
                )
              : text
          );
      }
    };

  const resolvedKeyboardType =
    format === 'price' ||
    format === 'numeric'
      ? 'number-pad'
      : format === 'phone'
        ? 'phone-pad'
        : keyboardType ||
          'default';

  return (
    <View
      style={{
        marginBottom:
          spacing.md,
      }}
    >
      {label ? (
        <Text
          style={
            io.labelStyle
          }
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.wrapper,
          {
            height: io.height,
            borderRadius:
              io.radius,
            backgroundColor:
              io.backgroundColor,
            borderColor,
            paddingHorizontal:
              io.paddingHorizontal,
          },
        ]}
      >
        {leftAdornment}

        <TextInput
          {...rest}
          style={[
            styles.input,
            typography.caption,
            {
              color:
                components
                  .input
                  .textColor,
            },
          ]}
          value={value}
          onChangeText={
            handleChangeText
          }
          placeholder={
            placeholder
          }
          placeholderTextColor={
            io.placeholderColor
          }
          keyboardType={
            resolvedKeyboardType
          }
          secureTextEntry={
            secureTextEntry
          }
          autoCapitalize={
            autoCapitalize
          }
          editable={editable}
          /*
           * On retire maxLength du TextInput.
           * Le contrôle est effectué dans handleChangeText
           * afin de travailler sur les chiffres réels et non
           * sur les espaces de formatage.
           */
          maxLength={
            undefined
          }
          onFocus={() =>
            setFocused(true)
          }
          onBlur={() =>
            setFocused(false)
          }
        />

        {rightAdornment}
      </View>

      {error ? (
        <Text
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
    },

    input: {
      flex: 1,
      fontSize:
        fontSizes.xl,
      fontWeight:
        fontWeights.bold,
      color:
        colors.brand.navy,
    },

    error: {
      marginTop: 4,
      fontSize: 12,
      color:
        colors.error.default,
    },
  });
