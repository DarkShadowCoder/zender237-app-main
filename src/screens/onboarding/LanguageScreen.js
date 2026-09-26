import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import Header from '../../components/Header';
import Button from '../../components/Button';

import {
  colors,
  typography,
  spacing,
  radii,
} from '../../theme/theme';

import i18n from '../../i18n';

import {
  useLocale,
} from '../../context/LocaleContext';

const OPTIONS = [
  {
    value: 'fr',
    label: 'Français',
    flag: '🇫🇷',
  },
  {
    value: 'en',
    label: 'English',
    flag: '🇬🇧',
  },
];

export default function LanguageScreen({ navigation }) {
  const {
    locale,
    changeLocale,
  } = useLocale();

  const [changing, setChanging] = useState(false);

  /**
   * Change language
   */
  const handleChange = async (nextLocale) => {
    if (nextLocale === locale || changing) {
      return;
    }

    try {
      setChanging(true);

      await changeLocale(nextLocale);

      Toast.show({
        type: 'success',
        text1: i18n.t('language.saved'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2:
          error?.message ||
          'Impossible de changer la langue.',
      });
    } finally {
      setChanging(false);
    }
  };

  /**
   * Continue to SignUp
   */
  const handleContinue = () => {
    navigation.replace('SignUp');
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header
          title={i18n.t('language.title')}
        />

        <View style={styles.card}>
          {OPTIONS.map((option, index) => {
            const selected =
              option.value === locale;

            return (
              <Pressable
                key={option.value}
                onPress={() =>
                  handleChange(option.value)
                }
                disabled={changing}
                style={({ pressed }) => [
                  styles.row,
                  index <
                    OPTIONS.length - 1 &&
                    styles.border,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.flag}>
                  {option.flag}
                </Text>

                <Text
                  style={[
                    typography.bodyBold,
                    styles.label,
                  ]}
                >
                  {option.label}
                </Text>

                <Ionicons
                  name={
                    selected
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={24}
                  color={
                    selected
                      ? colors.brand.primary
                      : colors.text.tertiary
                  }
                />
              </Pressable>
            );
          })}
        </View>

        {/* Bouton Continuer */}
        <View style={styles.buttonContainer}>
          <Button
            title="Continuer"
            onPress={handleContinue}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor:
      colors.background.default,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal:
      spacing.screenHorizontal,

    paddingBottom: spacing.xxl,

    flexGrow: 1,
  },

  card: {
    backgroundColor:
      colors.background.surface,

    borderRadius:
      radii.md,

    borderWidth: 1,

    borderColor:
      colors.border.light,

    paddingHorizontal:
      spacing.lg,

    marginTop:
      spacing.xl,
  },

  row: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingVertical:
      spacing.lg,

    minHeight: 64,
  },

  pressed: {
    opacity: 0.65,
  },

  border: {
    borderBottomWidth: 1,

    borderBottomColor:
      colors.border.light,
  },

  flag: {
    fontSize: 24,

    width: 32,

    textAlign: 'center',
  },

  label: {
    flex: 1,

    marginLeft:
      spacing.md,
  },

  buttonContainer: {
    marginTop:
      spacing.xl,

    marginBottom:
      spacing.lg,
  },
});
