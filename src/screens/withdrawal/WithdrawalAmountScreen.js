import React, {
  useMemo,
  useState,
} from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
  countries,
  radii,
  spacing,
  typography,
} from '../../theme/theme';

import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import PhoneNumberInput from '../../components/PhoneNumberInput';

import {
  useWallet,
} from '../../context/WalletContext';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  formatAmount,
} from '../../utils/formatters';

import {
  isValidAmount,
} from '../../utils/validators';

import {
  buildInternationalPhone,
  digitsOnlyPhone,
} from '../../utils/phone';

/*
 * ============================================================
 * PARAMÈTRES
 * ============================================================
 *
 * Le retrait est toujours fait par Mobile Money.
 * Il n'y a donc plus aucun choix de mode dans l'interface.
 */
const WITHDRAWAL_METHOD =
  'mobile_money';

const MAX_PHONE_DIGITS = 9;

const MIN_PHONE_DIGITS = 8;


/*
 * ============================================================
 * FORMATAGE DU MONTANT
 * ============================================================
 */

function formatPrice(value) {
  const digits =
    String(
      value || ''
    ).replace(
      /\D/g,
      ''
    );

  if (!digits) {
    return '';
  }

  return digits.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ' '
  );
}

function normalizePrice(value) {
  const digits =
    String(
      value || ''
    ).replace(
      /\D/g,
      ''
    );

  return digits
    ? Number(digits)
    : 0;
}


/*
 * ============================================================
 * ÉCRAN
 * ============================================================
 */

export default function WithdrawalAmountScreen({
  navigation,
}) {
  const {
    wallet,
  } = useWallet();

  const {
    profile,
  } = useAuth();


  /*
   * ----------------------------------------------------------
   * MONTANT
   * ----------------------------------------------------------
   */

  const [
    amount,
    setAmount,
  ] = useState('');


  /*
   * ----------------------------------------------------------
   * BÉNÉFICIAIRE
   * ----------------------------------------------------------
   */

  const [
    recipientName,
    setRecipientName,
  ] = useState('');


  /*
   * ----------------------------------------------------------
   * TÉLÉPHONE
   * ----------------------------------------------------------
   */

  const [
    recipientNumber,
    setRecipientNumber,
  ] = useState('');


  /*
   * ----------------------------------------------------------
   * PAYS DU NUMÉRO
   * ----------------------------------------------------------
   *
   * On utilise le pays du profil comme valeur initiale.
   * L'utilisateur peut ensuite le changer directement
   * dans PhoneNumberInput.
   */

  const [
    recipientCountry,
    setRecipientCountry,
  ] = useState(
    profile?.country &&
    countries[
      profile.country
    ]
      ? profile.country
      : 'cameroun'
  );


  /*
   * ----------------------------------------------------------
   * ERREUR
   * ----------------------------------------------------------
   */

  const [
    error,
    setError,
  ] = useState(null);


  /*
   * ----------------------------------------------------------
   * MONTANTS
   * ----------------------------------------------------------
   */

  const numericAmount =
    normalizePrice(
      amount
    );

  /*
   * Frais actuels : 2 %
   */
  const feeAmount =
    numericAmount
      ? Math.round(
          numericAmount *
            0.02
        )
      : 0;

  const available =
    Number(
      wallet?.available_balance ||
      0
    );


  /*
   * ----------------------------------------------------------
   * VALIDATION
   * ----------------------------------------------------------
   */

  const phoneDigits =
    digitsOnlyPhone(
      recipientNumber
    );

  const canContinue =
    useMemo(() => {
      /*
       * Montant
       */
      if (
        !isValidAmount(
          amount
        )
      ) {
        return false;
      }

      /*
       * Solde
       */
      if (
        numericAmount +
          feeAmount >
        available
      ) {
        return false;
      }

      /*
       * Nom
       */
      if (
        !recipientName.trim()
      ) {
        return false;
      }

      /*
       * Téléphone
       */
      if (
        phoneDigits.length <
        MIN_PHONE_DIGITS
      ) {
        return false;
      }

      if (
        phoneDigits.length >
        MAX_PHONE_DIGITS
      ) {
        return false;
      }

      return true;
    }, [
      amount,
      numericAmount,
      feeAmount,
      available,
      recipientName,
      phoneDigits.length,
    ]);


  /*
   * ==========================================================
   * CONTINUER
   * ==========================================================
   */

  const continueToSummary =
    () => {
      setError(null);


      /*
       * Vérifier le montant
       */
      if (
        !isValidAmount(
          amount
        )
      ) {
        setError(
          'Entrez un montant valide.'
        );

        return;
      }


      /*
       * Vérifier le solde
       */
      if (
        numericAmount +
          feeAmount >
        available
      ) {
        setError(
          'Votre solde est insuffisant.'
        );

        return;
      }


      /*
       * Vérifier le nom
       */
      if (
        !recipientName.trim()
      ) {
        setError(
          'Entrez le nom.'
        );

        return;
      }


      /*
       * Vérifier le numéro
       */
      if (
        phoneDigits.length <
        MIN_PHONE_DIGITS
      ) {
        setError(
          'Entrez le numéro complet.'
        );

        return;
      }

      if (
        phoneDigits.length >
        MAX_PHONE_DIGITS
      ) {
        setError(
          'Le numéro est trop long.'
        );

        return;
      }


      /*
       * Construire le numéro complet.
       *
       * Exemple :
       *
       * pays = cameroun
       * numéro = 6 12 34 56 78
       *
       * résultat :
       * +237612345678
       */
      const internationalPhone =
        buildInternationalPhone(
          recipientNumber,
          recipientCountry
        );


      /*
       * Aller directement au résumé.
       *
       * Le mode est fixé côté application.
       * L'utilisateur ne peut pas le modifier.
       */
      navigation.navigate(
        'WithdrawalSummary',
        {
          amount:
            numericAmount,

          feeAmount:
            feeAmount,

          method:
            WITHDRAWAL_METHOD,

          recipientName:
            recipientName.trim(),

          recipientCountry:
            recipientCountry,

          recipientCountryCode:
            countries[
              recipientCountry
            ]?.dialCode ||
            null,

          recipientMobileNumber:
            internationalPhone,
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
        title="Retirer"
      />


      {/* ---------------------------------------------------- */}
      {/* ÉTAPE */}
      {/* ---------------------------------------------------- */}

      <View
        style={
          styles.stepRow
        }
      >
        <View
          style={
            styles.stepActive
          }
        >
          <Text
            style={
              styles.stepNumber
            }
          >
            1
          </Text>
        </View>

        <Text
          style={
            typography.caption
          }
        >
          Informations
        </Text>
      </View>


      {/* ---------------------------------------------------- */}
      {/* SOLDE */}
      {/* ---------------------------------------------------- */}

      <View
        style={
          styles.balanceCard
        }
      >
        <Text
          style={
            typography.caption
          }
        >
          Solde disponible
        </Text>

        <Text
          style={
            typography.amountMd
          }
        >
          {formatAmount(
            available
          )}
        </Text>
      </View>


      {/* ---------------------------------------------------- */}
      {/* MONTANT */}
      {/* ---------------------------------------------------- */}

      <Text
        style={[
          typography.h2,
          styles.title,
        ]}
      >
        Combien ?
      </Text>

      <Input
        label="Montant"
        value={
          amount
        }
        onChangeText={(
          value
        ) => {
          setAmount(
            formatPrice(
              value
            )
          );

          setError(null);
        }}
        keyboardType="number-pad"
        placeholder="50 000"
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
          error
        }
        autoFocus
      />


      {/* ---------------------------------------------------- */}
      {/* FRAIS */}
      {/* ---------------------------------------------------- */}

      {amount ? (
        <View
          style={
            styles.feeRow
          }
        >
          <Text
            style={
              typography.caption
            }
          >
            Frais
          </Text>

          <Text
            style={
              typography.caption
            }
          >
            {formatAmount(
              feeAmount
            )}
          </Text>
        </View>
      ) : null}


      {/* ---------------------------------------------------- */}
      {/* NOM */}
      {/* ---------------------------------------------------- */}

      <Input
        label="Quel est votre nom ?"
        value={
          recipientName
        }
        onChangeText={(
          value
        ) => {
          setRecipientName(
            value
          );

          setError(null);
        }}
        format="name"
        placeholder="Nom de la personne"
      />


      {/* ---------------------------------------------------- */}
      {/* NUMÉRO */}
      {/* ---------------------------------------------------- */}

      <View
        style={
          styles.phoneSection
        }
      >
        <Text
          style={
            styles.phoneTitle
          }
        >
          Dans quel numero recevoir l'argent ?
        </Text>

        <PhoneNumberInput
          label={null}
          value={
            recipientNumber
          }
          country={
            recipientCountry
          }

          /*
           * Permet à l'utilisateur
           * de choisir +237 / +224 / +223
           */
          onChangeCountry={(
            value
          ) => {
            setRecipientCountry(
              value
            );

            /*
             * Le numéro actuel
             * ne doit pas être gardé
             * lorsqu'on change de pays.
             */
            setRecipientNumber(
              ''
            );

            setError(null);
          }}

          /*
           * Le composant :
           * - accepte uniquement les chiffres
           * - formate automatiquement
           * - limite à 9 chiffres
           */
          maxDigits={
            MAX_PHONE_DIGITS
          }

          placeholder="6 12 34 56 78"

          onChangeText={(
            value
          ) => {
            setRecipientNumber(
              value
            );

            setError(null);
          }}

          error={
            error &&
            phoneDigits.length <
              MIN_PHONE_DIGITS
              ? error
              : null
          }
        />

        <Text
          style={
            styles.phoneHint
          }
        >
          Choisissez le pays puis écrivez le numéro.
        </Text>
      </View>


      {/* ---------------------------------------------------- */}
      {/* BOUTON */}
      {/* ---------------------------------------------------- */}

      <Button
        title="Vérifier"
        onPress={
          continueToSummary
        }
        disabled={
          !canContinue
        }
        style={
          styles.button
        }
      />
    </ScrollView>
  );
}


/*
 * ============================================================
 * STYLES
 * ============================================================
 */

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
        spacing.xxxl,
    },

    stepRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,

      marginTop:
        spacing.lg,
    },

    stepActive: {
      width: 28,

      height: 28,

      borderRadius: 14,

      backgroundColor:
        colors
          .brand
          .primary,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    stepNumber: {
      color:
        colors
          .text
          .inverse,

      fontWeight:
        '800',
    },

    balanceCard: {
      marginTop:
        spacing.xl,

      padding:
        spacing.lg,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors
          .background
          .surface,

      borderWidth:
        1,

      borderColor:
        colors
          .border
          .light,
    },

    title: {
      marginTop:
        spacing.xl,

      marginBottom:
        spacing.md,
    },

    feeRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      marginTop:
        -spacing.sm,

      marginBottom:
        spacing.lg,

      paddingHorizontal:
        spacing.xs,
    },

    phoneSection: {
      marginTop:
        spacing.xs,
    },

    phoneTitle: {
      ...typography.caption,

      marginBottom:
        spacing.xs,
    },

    phoneHint: {
      ...typography.caption,

      color:
        colors
          .text
          .secondary,

      marginTop:
        -spacing.xs,

      marginBottom:
        spacing.md,
    },

    button: {
      marginTop:
        spacing.xl,
    },
  });