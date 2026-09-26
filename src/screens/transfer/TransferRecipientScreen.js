import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import {
  colors,
  typography,
  spacing,
  countries,
} from '../../theme/theme';

import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import PhoneNumberInput from '../../components/PhoneNumberInput';
import InfoBanner from '../../components/InfoBanner';

import {
  getTransferFee,
} from '../../services/feeService';

import {
  isValidTransferAmount,
  isValidRecipientName,
} from '../../utils/validators';

import {
  normalizePrice,
} from '../../components/Input';

import {
  buildInternationalPhone,
  digitsOnlyPhone,
} from '../../utils/phone';

const FEE_DEBOUNCE_MS = 400;

export default function TransferRecipientScreen({
  route,
  navigation,
}) {
  const {
    country,
    method,
    fromCountry,
  } = route.params;


  /*
   * ==========================================================
   * FORMULAIRE
   * ==========================================================
   */

  const [
    amount,
    setAmount,
  ] = useState('');

  const [
    fullName,
    setFullName,
  ] = useState('');

  const [
    mobileNumber,
    setMobileNumber,
  ] = useState('');


  /*
   * ==========================================================
   * ERREURS
   * ==========================================================
   */

  const [
    errors,
    setErrors,
  ] = useState({});


  /*
   * ==========================================================
   * FRAIS
   * ==========================================================
   */

  const [
    feeAmount,
    setFeeAmount,
  ] = useState(null);

  const [
    feeLoading,
    setFeeLoading,
  ] = useState(false);

  const [
    feeError,
    setFeeError,
  ] = useState(null);


  /*
   * ==========================================================
   * CALCUL DES FRAIS
   * ==========================================================
   */

  useEffect(() => {
    if (
      !isValidTransferAmount(
        amount
      )
    ) {
      setFeeAmount(null);
      setFeeError(null);

      return undefined;
    }

    let cancelled = false;

    setFeeLoading(true);
    setFeeError(null);

    const timer =
      setTimeout(() => {
        getTransferFee({
          fromCountry,
          toCountry:
            country,
          amount:
            normalizePrice(
              amount
            ),
        })
          .then((fee) => {
            if (
              cancelled
            ) {
              return;
            }

            const normalizedFee =
              Number(fee);

            if (
              fee === null ||
              fee === undefined ||
              Number.isNaN(
                normalizedFee
              ) ||
              normalizedFee < 0
            ) {
              setFeeAmount(
                null
              );

              setFeeError(
                'Aucun frais pour ce montant.'
              );
            } else {
              setFeeAmount(
                normalizedFee
              );

              setFeeError(null);
            }
          })
          .catch((error) => {
            if (
              !cancelled
            ) {
              setFeeAmount(
                null
              );

              setFeeError(
                error?.message ||
                  'Impossible de calculer les frais.'
              );
            }
          })
          .finally(() => {
            if (
              !cancelled
            ) {
              setFeeLoading(
                false
              );
            }
          });
      }, FEE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    amount,
    fromCountry,
    country,
  ]);


  /*
   * ==========================================================
   * DONNÉES DU FORMULAIRE
   * ==========================================================
   */

  const phoneDigits =
    digitsOnlyPhone(
      mobileNumber
    );

  const numericAmount =
    normalizePrice(
      amount
    );


  /*
   * ==========================================================
   * VALIDATION DU BOUTON
   * ==========================================================
   *
   * La localisation n'existe plus dans les conditions.
   *
   * Pour continuer :
   * - montant valide
   * - nom valide
   * - numéro valide
   * - frais disponibles
   */

  const canContinue =
    useMemo(() => {
      if (
        feeLoading
      ) {
        return false;
      }

      if (
        !isValidTransferAmount(
          amount
        )
      ) {
        return false;
      }

      if (
        feeAmount === null ||
        feeAmount === undefined
      ) {
        return false;
      }

      if (
        !isValidRecipientName(
          fullName
        )
      ) {
        return false;
      }

      if (
        phoneDigits.length <
        8
      ) {
        return false;
      }

      return true;
    }, [
      amount,
      feeLoading,
      feeAmount,
      fullName,
      phoneDigits.length,
    ]);


  /*
   * ==========================================================
   * CONTINUER
   * ==========================================================
   */

  const handleContinue =
    () => {
      const nextErrors = {};


      /*
       * Pays de départ
       */

      if (
        !fromCountry
      ) {
        nextErrors.amount =
          'Le pays de départ n’est pas disponible.';
      }


      /*
       * Même pays
       */

      if (
        fromCountry ===
        country
      ) {
        nextErrors.amount =
          'Le pays de départ et le pays de destination doivent être différents.';
      }


      /*
       * Montant
       */

      if (
        !isValidTransferAmount(
          amount
        )
      ) {
        nextErrors.amount =
          'Montant invalide.';
      }


      /*
       * Nom
       */

      if (
        !isValidRecipientName(
          fullName
        )
      ) {
        nextErrors.fullName =
          'Entrez le nom du destinataire.';
      }


      /*
       * Numéro
       */

      if (
        phoneDigits.length <
        8
      ) {
        nextErrors.mobileNumber =
          'Entrez un numéro valide.';
      }


      /*
       * Frais
       */

      if (
        (
          feeAmount ===
            null ||
          feeAmount ===
            undefined
        ) &&
        !nextErrors.amount
      ) {
        nextErrors.amount =
          feeError ||
          'Les frais ne sont pas disponibles.';
      }


      setErrors(
        nextErrors
      );


      /*
       * Il y a une erreur :
       * on reste sur cet écran.
       */

      if (
        Object.keys(
          nextErrors
        ).length
      ) {
        return;
      }


      /*
       * ------------------------------------------------------
       * NAVIGATION
       * ------------------------------------------------------
       *
       * Aucun recipientLocation ici.
       */

      navigation.navigate(
        'TransferSummary',
        {
          country,

          method,

          amount:
            numericAmount,

          feeAmount,

          recipientName:
            fullName.trim(),

          recipientMobileNumber:
            buildInternationalPhone(
              mobileNumber,
              country
            ),

          recipientCountryCode:
            countries[
              country
            ]?.dialCode,

          recipientCountry:
            country,

          fromCountry,
        }
      );
    };


  /*
   * ==========================================================
   * AFFICHAGE
   * ==========================================================
   */

  return (
    <ScrollView
      style={
        styles.wrapper
      }
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <Header
        title="Destinataire"
      />


      {/* ---------------------------------------------------- */}
      {/* PAYS DE DÉPART */}
      {/* ---------------------------------------------------- */}

      <View
        style={
          styles.originInfo
        }
      >
        <Text
          style={
            styles.originInfoLabel
          }
        >
          Pays de départ
        </Text>

        <Text
          style={
            styles.originInfoValue
          }
        >
          {
            countries[
              fromCountry
            ]?.flag
          }{' '}

          {
            countries[
              fromCountry
            ]?.label ||
            fromCountry ||
            '—'
          }
        </Text>
      </View>


      {/* ---------------------------------------------------- */}
      {/* TITRE */}
      {/* ---------------------------------------------------- */}

      <Text
        style={[
          typography.body,
          styles.description,
        ]}
      >
        Entrez les informations du destinataire.
      </Text>


      {/* ---------------------------------------------------- */}
      {/* MONTANT */}
      {/* ---------------------------------------------------- */}

      <Input
        label="Montant"
        value={
          amount
        }
        onChangeText={(
          value
        ) => {
          setAmount(
            value
          );

          if (
            errors.amount
          ) {
            setErrors(
              current => ({
                ...current,
                amount:
                  null,
              })
            );
          }
        }}
        format="price"
        keyboardType="number-pad"
        placeholder="100 000"
        rightAdornment={
          <Text
            style={
              typography.caption
            }
          >
            U
          </Text>
        }
        error={
          errors.amount
        }
      />


      {/* ---------------------------------------------------- */}
      {/* FRAIS */}
      {/* ---------------------------------------------------- */}

      <View
        style={
          styles.feeRow
        }
      >
        {feeLoading ? (
          <View
            style={
              styles.feeLoading
            }
          >
            <ActivityIndicator
              size="small"
              color={
                colors.brand
                  .primary
              }
            />

            <Text
              style={
                typography.caption
              }
            >
              Calcul des frais...
            </Text>
          </View>
        ) : feeAmount !== null &&
          feeAmount !==
            undefined ? (
          <Text
            style={[
              typography.caption,
              styles.feeText,
            ]}
          >
            Frais :{' '}
            {feeAmount.toLocaleString(
              'fr-FR'
            )}{' '}
            U
            {' · '}
            Total :{' '}
            {(
              numericAmount +
              feeAmount
            ).toLocaleString(
              'fr-FR'
            )}{' '}
            U
          </Text>
        ) : feeError ? (
          <Text
            style={[
              typography.caption,
              styles.feeError,
            ]}
          >
            {feeError}
          </Text>
        ) : null}
      </View>


      {/* ---------------------------------------------------- */}
      {/* NOM */}
      {/* ---------------------------------------------------- */}

      <Input
        label="Nom complet"
        value={
          fullName
        }
        onChangeText={(
          value
        ) => {
          setFullName(
            value
          );

          if (
            errors.fullName
          ) {
            setErrors(
              current => ({
                ...current,
                fullName:
                  null,
              })
            );
          }
        }}
        format="name"
        placeholder="Mamadou Traoré"
        error={
          errors.fullName
        }
      />


      {/* ---------------------------------------------------- */}
      {/* NUMÉRO */}
      {/* ---------------------------------------------------- */}

      <PhoneNumberInput
        label="Numéro Mobile Money"
        value={
          mobileNumber
        }
        country={
          country
        }
        onChangeText={(
          value
        ) => {
          setMobileNumber(
            value
          );

          if (
            errors.mobileNumber
          ) {
            setErrors(
              current => ({
                ...current,
                mobileNumber:
                  null,
              })
            );
          }
        }}
        error={
          errors.mobileNumber
        }
      />


      {/* ---------------------------------------------------- */}
      {/* MESSAGE */}
      {/* ---------------------------------------------------- */}

      <InfoBanner
        text="Vérifiez que le numéro est correct avant de continuer."
        icon="alert-circle-outline"
      />


      {/* ---------------------------------------------------- */}
      {/* BOUTON */}
      {/* ---------------------------------------------------- */}

      <View
        style={
          styles.buttonContainer
        }
      >
        <Button
          title="Continuer"
          onPress={
            handleContinue
          }
          disabled={
            !canContinue
          }
        />
      </View>
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    wrapper: {
      flex: 1,

      backgroundColor:
        colors
          .background
          .default,
    },

    content: {
      padding:
        spacing
          .screenHorizontal,

      paddingBottom:
        spacing
          .xxxl,
    },

    originInfo: {
      marginTop:
        spacing.md,

      marginBottom:
        spacing.md,

      padding:
        spacing.sm,

      backgroundColor:
        colors
          .background
          .surface,

      borderWidth:
        1,

      borderColor:
        colors
          .brand
          .primaryLight,

      borderRadius:
        12,
    },

    originInfoLabel: {
      ...typography.caption,

      color:
        colors
          .text
          .secondary,
    },

    originInfoValue: {
      ...typography.body,

      marginTop:
        spacing.xxs,

      color:
        colors
          .text
          .primary,

      fontWeight:
        '700',
    },

    description: {
      marginTop:
        spacing.lg,

      marginBottom:
        spacing.xl,

      lineHeight:
        spacing.md * 1.8,
    },

    feeRow: {
      minHeight:
        24,

      marginTop:
        -spacing.sm,

      marginBottom:
        spacing.md,
    },

    feeLoading: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,
    },

    feeText: {
      color:
        colors
          .text
          .secondary,
    },

    feeError: {
      color:
        colors
          .error
          .default,
    },

    buttonContainer: {
      marginTop:
        spacing.xl,
    },
  });