import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { components, colors, typography, spacing, radii, shadows, countries } from '../theme/theme';

/**
 * Formate une chaîne de chiffres en numéro de téléphone lisible :
 * 1 chiffre, puis des groupes de 2, séparés par des espaces.
 * Exemple : "612345678" -> "6 12 34 56 78" (format utilisé dans
 * toutes les maquettes : "+237 6 12 34 56 78").
 */
export function formatPhoneDigits(digits) {
  if (!digits) return '';
  const first = digits.slice(0, 1);
  const rest = digits.slice(1);
  const groups = rest.match(/.{1,2}/g) || [];
  return [first, ...groups].join(' ');
}

/** Retire tout ce qui n'est pas un chiffre (espaces compris) d'une saisie. */
export function digitsOnly(text) {
  return (text || '').replace(/[^0-9]/g, '');
}

/**
 * Champ "Numéro WhatsApp" avec drapeau + indicatif intégrés dans le champ
 * (voir maquettes "Créer un compte", "Connexion", "Récupérer le code secret").
 *
 * Appuyer sur la partie droite du champ (drapeau + indicatif) déroule un
 * petit menu listant les 2 autres pays gérés par l'app — Mali, Guinée,
 * Cameroun (enum `user_country` du schéma) ; en choisir un l'applique
 * immédiatement comme indicatif actif.
 *
 * Saisie : seuls les chiffres sont acceptés (tout le reste est filtré),
 * et le numéro est automatiquement regroupé par paquets de 2 chiffres au
 * fur et à mesure de la frappe (ex. "612345678" -> "6 12 34 56 78"),
 * limité à `maxDigits` chiffres (9 par défaut, taille d'un numéro mobile
 * local).
 *
 * `value` correspond à la partie nationale du numéro déjà formatée avec
 * espaces (sans le +indicatif) ; pour obtenir le numéro complet à envoyer
 * au backend, composez `countries[country].dialCode + digitsOnly(value)`.
 */
export default function PhoneNumberInput({
  label,
  country = 'cameroun',
  onChangeCountry,
  value,
  onChangeText,
  error,
  placeholder = '6 12 34 56 78',
  maxDigits = 9,
}) {
  const [focused, setFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const io = components.input;
  const { flag, dialCode } = countries[country];
  const selectable = typeof onChangeCountry === 'function';
  const otherCountries = Object.keys(countries).filter((key) => key !== country);

  const borderColor = error ? io.errorBorderColor : focused ? io.focusBorderColor : io.borderColor;

  const handleSelect = (key) => {
    onChangeCountry(key);
    setDropdownOpen(false);
  };

  const handleChangeText = (text) => {
    const raw = digitsOnly(text).slice(0, maxDigits);
    onChangeText(formatPhoneDigits(raw));
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={io.labelStyle}>{label}</Text> : null}

      <View style={styles.anchor}>
        <View
          style={[
            styles.wrapper,
            {
              height: io.height,
              borderRadius: io.radius,
              backgroundColor: io.backgroundColor,
              borderColor,
            },
          ]}
        >
          <Pressable
            style={styles.prefix}
            onPress={() => selectable && setDropdownOpen((v) => !v)}
            disabled={!selectable}
          >
            <Text style={styles.flag}>{flag}</Text>
            <Text style={[styles.dialCode, { color: io.textColor }]}>{dialCode}</Text>
            {selectable ? (
              <Ionicons
                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.icon.muted}
                style={{ marginLeft: 2 }}
              />
            ) : null}
          </Pressable>
          <View style={styles.divider} />
          <TextInput
            style={[styles.input, { color: io.textColor }]}
            value={value}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor={io.placeholderColor}
            keyboardType="number-pad"
            inputMode="numeric"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>

        {selectable && dropdownOpen ? (
          <>
            {/* Grande zone invisible pour fermer le menu au tap en dehors */}
            <Pressable style={styles.outsideCatcher} onPress={() => setDropdownOpen(false)} />

            <View style={[styles.dropdown, { borderRadius: io.radius }, shadows.modal]}>
              {otherCountries.map((key) => {
                const c = countries[key];
                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [styles.dropdownRow, pressed && styles.dropdownRowPressed]}
                    onPress={() => handleSelect(key)}
                  >
                    <Text style={styles.flag}>{c.flag}</Text>
                    <View style={{ marginLeft: spacing.sm }}>
                      <Text style={typography.bodyBold}>{c.label}</Text>
                      <Text style={typography.caption}>{c.dialCode}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'relative',
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  prefix: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag: { fontSize: 18 },
  dialCode: { fontSize: 16, fontWeight: '600' },
  divider: {
    width: 1,
    height: '55%',
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.sm,
  },
  input: { flex: 1, fontSize: 16 },
  error: { marginTop: 4, fontSize: 12, color: colors.error.default },

  // Zone transparente surdimensionnée : ferme le menu au tap en dehors
  // sans dépendre d'un <Modal> plein écran.
  outsideCatcher: {
    position: 'absolute',
    top: -2000,
    left: -2000,
    right: -2000,
    bottom: -2000,
    zIndex: 10,
  },

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: spacing.xs,
    minWidth: 170,
    backgroundColor: colors.background.surface,
    paddingVertical: spacing.xs,
    zIndex: 20,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  dropdownRowPressed: {
    backgroundColor: colors.overlay.pressed,
  },
});