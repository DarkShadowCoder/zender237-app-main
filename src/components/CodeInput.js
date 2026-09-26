import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { components } from '../theme/theme';

/**
 * Saisie de code à N cases (OTP à 6 chiffres, code secret à 6 chiffres).
 * Utilisé sur les écrans "Vérification OTP", "Code secret", "Récupération".
 */
export default function CodeInput({ length = 6, value, onChange, secure = false }) {
  const inputsRef = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const digits = value ?? Array(length).fill('');

  const handleChange = (text, index) => {
    const clean = text.replace(/[^0-9]/g, '');
    const next = [...digits];

    if (clean.length > 1) {
      // collé/saisie rapide
      clean.split('').forEach((d, i) => {
        if (index + i < length) next[index + i] = d;
      });
      onChange(next);
      const lastFilled = Math.min(index + clean.length, length - 1);
      inputsRef.current[lastFilled]?.focus();
      return;
    }

    next[index] = clean;
    onChange(next);
    if (clean && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const cellTokens = components.otpCell;

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, index) => {
        const filled = !!digits[index];
        const isFocused = focusedIndex === index;
        return (
          <TextInput
            key={index}
            ref={(el) => (inputsRef.current[index] = el)}
            style={[
              styles.cell,
              {
                width: cellTokens.size,
                height: cellTokens.size,
                borderRadius: cellTokens.radius,
                borderColor: isFocused ? cellTokens.activeBorderColor : cellTokens.borderColor,
                backgroundColor: filled ? cellTokens.filledBackgroundColor : 'transparent',
                color: cellTokens.textColor,
              },
            ]}
            value={secure && digits[index] ? '•' : digits[index]}
            onChangeText={(t) => handleChange(t, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocusedIndex(index)}
            keyboardType="number-pad"
            maxLength={length} // permet le collage multi-chiffres
            textAlign="center"
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '700',
  },
});
