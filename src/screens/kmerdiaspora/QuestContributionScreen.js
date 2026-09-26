
import React, {
  useMemo,
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  contributeToQuest,
  getQuest,
} from '../../services/kmerDiasporaService';

import SecretCodeInput from '../../components/SecretCodeInput';

import NumericKeypad from '../../components/NumericKeypad';

import {
  Button,
  KdScreen,
  KdFormSection,
  InfoBanner,
} from './components/KdUI';

import {
  typography,
  spacing,
  colors,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
  components,
} from '../../theme/theme';


/* ============================================================
 * UTILITAIRES
 * ============================================================ */

function getDigits(value) {
  return String(
    value ?? ''
  ).replace(
    /[^0-9]/g,
    ''
  );
}


function formatAmount(value) {
  const digits =
    getDigits(value);

  if (!digits) {
    return '';
  }

  return digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ' '
  );
}


function numeric(value) {
  const digits =
    getDigits(value);

  if (!digits) {
    return 0;
  }

  return Number(digits);
}


/* ============================================================
 * PAGE
 * ============================================================ */

export default function QuestContributionScreen({
  route,
  navigation,
}) {
  const questId =
    route.params?.questId;


  const [
    amount,
    setAmount,
  ] = useState('');


  const [
    secretCode,
    setSecretCode,
  ] = useState('');


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState(null);


  /* ==========================================================
   * MONTANT
   * ========================================================== */

  const amountValue =
    useMemo(
      () =>
        numeric(amount),
      [amount]
    );


  const formattedAmount =
    useMemo(
      () =>
        formatAmount(
          amount
        ),
      [amount]
    );


  /* ==========================================================
   * CHANGEMENT DU MONTANT
   * ========================================================== */

  const handleAmountChange =
    (value) => {
      setError(null);

      /*
       * On conserve uniquement les chiffres.
       * Le formatage est appliqué après.
       *
       * Exemple :
       * 25000 -> 25 000
       */
      const digits =
        getDigits(value);

      const formatted =
        formatAmount(
          digits
        );

      setAmount(
        formatted
      );
    };


  /* ==========================================================
   * SUBMIT
   * ========================================================== */

  const submit =
    async () => {
      const value =
        numeric(
          amount
        );


      if (
        value <= 0
      ) {
        setError(
          'Saisissez un montant supérieur à zéro.'
        );

        return;
      }


      if (
        secretCode.length !== 6
      ) {
        setError(
          'Entrez votre code secret à 6 chiffres.'
        );

        return;
      }


      if (!questId) {
        setError(
          'Identifiant de quête manquant.'
        );

        return;
      }


      setError(null);

      setLoading(true);


      try {
        /*
         * Vérification de la quête avant
         * d'effectuer la contribution.
         */
        await getQuest(
          questId
        );


        await contributeToQuest({
          questId,
          amount: value,
          secretCode,
        });


        Alert.alert(
          'Don effectué',
          `Votre contribution de ${formatAmount(
            value
          )} XAF a été enregistrée avec succès.`,
          [
            {
              text:
                'Voir la quête',

              onPress:
                () =>
                  navigation.replace(
                    'QuestDetail',
                    {
                      questId,
                    }
                  ),
            },
          ]
        );

      } catch (e) {
        console.error(
          '[QuestContribution] Contribution error:',
          e
        );

        setError(
          e?.message ||
            'Contribution impossible.'
        );

      } finally {
        setLoading(false);
      }
    };


  /* ==========================================================
   * CLAVIER CODE SECRET
   * ========================================================== */

  const key =
    (digit) => {
      setError(null);

      setSecretCode(
        (current) =>
          (
            current +
            String(digit)
          ).slice(
            0,
            6
          )
      );
    };


  const back =
    () => {
      setError(null);

      setSecretCode(
        (current) =>
          current.slice(
            0,
            -1
          )
      );
    };


  /* ==========================================================
   * RENDU
   * ========================================================== */

  return (
    <KdScreen
      title="Faire un don"
      scrollView={ScrollView}
    >

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={
          styles.keyboardContainer
        }
      >

        {/* ====================================================
            SECURITE
            ==================================================== */}

        <InfoBanner
          icon="lock-closed-outline"
          text="Le montant sera débité de votre solde disponible après vérification de votre code secret."
        />


        {/* ====================================================
            MONTANT
            ==================================================== */}

        <KdFormSection
          title="Votre contribution"
        >

          <View
            style={
              styles.amountCard
            }
          >

            <View
              style={
                styles.amountIcon
              }
            >
              <Ionicons
                name="heart-outline"
                size={20}
                color={
                  colors.brand.primary
                }
              />
            </View>


            <Text
              style={[
                typography.caption,
                styles.amountEyebrow,
              ]}
            >
              MONTANT DU DON
            </Text>


            {/* ==================================================
                CHAMP MONTANT — TEXTINPUT NATIF
                ================================================== */}

            <View
              style={[
                styles.amountInputWrapper,
                error &&
                  styles.amountInputError,
              ]}
            >

              <TextInput
                value={
                  amount
                }

                onChangeText={
                  handleAmountChange
                }

                placeholder="25 000"

                placeholderTextColor={
                  colors.text.tertiary
                }

                keyboardType="numeric"

                inputMode="numeric"

                editable={
                  !loading
                }

                autoCorrect={
                  false
                }

                autoCapitalize="none"

                returnKeyType="done"

                selectTextOnFocus={
                  false
                }

                textAlign="center"

                style={
                  styles.amountInput
                }

                cursorColor={
                  colors.brand.primary
                }

                selectionColor={
                  colors.brand.primary
                }
              />

              <Text
                style={
                  styles.currencySuffix
                }
              >
                XAF
              </Text>

            </View>


            {error &&
            !secretCode.length ? (
              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>
            ) : null}


            <View
              style={
                styles.totalRow
              }
            >

              <Text
                style={[
                  typography.caption,
                  styles.totalLabel,
                ]}
              >
                Total à débiter
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.totalValue,
                ]}
              >
                {formattedAmount ||
                  '0'}{' '}
                XAF
              </Text>

            </View>

          </View>

        </KdFormSection>


        {/* ====================================================
            CONFIRMATION
            ==================================================== */}

        <KdFormSection
          title="Confirmation sécurisée"
        >

          <View
            style={
              styles.securityCard
            }
          >

            <View
              style={
                styles.securityHeader
              }
            >

              <View
                style={
                  styles.securityIcon
                }
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={
                    colors.brand.primary
                  }
                />
              </View>


              <View
                style={
                  styles.securityContent
                }
              >

                <Text
                  style={[
                    typography.body,
                    styles.securityTitle,
                  ]}
                >
                  Confirmez votre don
                </Text>

                <Text
                  style={[
                    typography.caption,
                    styles.securityText,
                  ]}
                >
                  Entrez votre code secret pour autoriser le débit de votre solde.
                </Text>

              </View>

            </View>


            <SecretCodeInput
              label="Code secret"
              value={
                secretCode
              }
              onChangeText={(
                value
              ) => {
                setError(null);

                setSecretCode(
                  value
                );
              }}
              error={
                error
              }
            />

          </View>
        </KdFormSection>


        {/* ====================================================
            RESUME
            ==================================================== */}

        <View
          style={
            styles.confirmationCard
          }
        >

          <View
            style={
              styles.confirmationIcon
            }
          >
            <Ionicons
              name="wallet-outline"
              size={17}
              color={
                colors.brand.primary
              }
            />
          </View>


          <View
            style={
              styles.confirmationContent
            }
          >

            <Text
              style={[
                typography.caption,
                styles.confirmationLabel,
              ]}
            >
              SOMME À ENVOYER
            </Text>

            <Text
              style={[
                typography.h3,
                styles.confirmationAmount,
              ]}
            >
              {formattedAmount ||
                '0'}{' '}
              XAF
            </Text>

          </View>

        </View>


        {/* ====================================================
            ACTION
            ==================================================== */}

        <Button
          title="Confirmer le don"
          onPress={
            submit
          }
          loading={
            loading
          }
          disabled={
            loading ||
            amountValue <= 0 ||
            secretCode.length !== 6
          }
          style={
            styles.button
          }
        />


        {/* ====================================================
            INFORMATION
            ==================================================== */}

        <Text
          style={
            styles.footerHint
          }
        >
          Votre contribution sera enregistrée immédiatement après la vérification de votre code secret et de votre solde disponible.
        </Text>

      </KeyboardAvoidingView>

    </KdScreen>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    keyboardContainer: {
      flex: 1,
    },


    /* ========================================================
       MONTANT
       ======================================================== */

    amountCard: {
      alignItems:
        'center',

      marginTop:
        spacing.xs,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      shadowColor:
        '#000',

      shadowOpacity:
        0.05,

      shadowRadius:
        9,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },


    amountIcon: {
      width:
        42,

      height:
        42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginBottom:
        spacing.xs,
    },


    amountEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.7,
    },


    amountInputWrapper: {
      width:
        '100%',

      minHeight:
        68,

      marginTop:
        spacing.sm,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1.5,

      borderColor:
        components.input
          .borderColor,

      borderRadius:
        components.input
          .radius,

      backgroundColor:
        components.input
          .backgroundColor,

      paddingHorizontal:
        spacing.md,
    },


    amountInputError: {
      borderColor:
        colors.error.default,
    },


    amountInput: {
      flex:
        1,

      minWidth:
        0,

      paddingVertical:
        10,

      paddingHorizontal:
        4,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.xl,

      lineHeight:
        lineHeights.xl,

      fontWeight:
        fontWeights.bold,

      textAlign:
        'center',
    },


    currencySuffix: {
      marginLeft:
        spacing.xs,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    errorText: {
      width:
        '100%',

      marginTop:
        5,

      color:
        colors.error.default,

      fontSize:
        12,

      lineHeight:
        16,

      textAlign:
        'center',
    },


    totalRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      width:
        '100%',

      marginTop:
        spacing.sm,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    totalLabel: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },


    totalValue: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.bold,
    },


    /* ========================================================
       SECURITY
       ======================================================== */

    securityCard: {
      marginTop:
        spacing.xs,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    securityHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        spacing.md,
    },


    securityIcon: {
      width:
        36,

      height:
        36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    securityContent: {
      flex:
        1,
    },


    securityTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    securityText: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       KEYPAD
       ======================================================== */

    keypadCard: {
      marginTop:
        spacing.sm,

      padding:
        spacing.sm,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.default,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    keypadTitle: {
      marginBottom:
        spacing.xs,

      textAlign:
        'center',

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    /* ========================================================
       CONFIRMATION
       ======================================================== */

    confirmationCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.md,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.brand.primaryLight,

      borderWidth:
        1,

      borderColor:
        colors.brand.primaryLight,
    },


    confirmationIcon: {
      width:
        36,

      height:
        36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background.surface,

      marginRight:
        spacing.sm,
    },


    confirmationContent: {
      flex:
        1,
    },


    confirmationLabel: {
      color:
        colors.text.secondary,

      fontSize:
        9,

      lineHeight:
        11,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.5,
    },


    confirmationAmount: {
      marginTop:
        2,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      lineHeight:
        lineHeights.lg,

      fontWeight:
        fontWeights.bold,
    },


    /* ========================================================
       BUTTON
       ======================================================== */

    button: {
      marginTop:
        spacing.lg,
    },


    footerHint: {
      marginTop:
        spacing.sm,

      marginHorizontal:
        spacing.md,

      marginBottom:
        spacing.lg,

      textAlign:
        'center',

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },

  });
