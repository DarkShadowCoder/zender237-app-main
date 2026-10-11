import React, {
  useState,
} from 'react';

import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import Toast from
  'react-native-toast-message';

import {
  colors,
  radii,
  spacing,
  typography,
  countries,
} from '../../theme/theme';

import Header from
  '../../components/Header';

import Button from
  '../../components/Button';

import AmountDisplay from
  '../../components/AmountDisplay';

import {
  createWithdrawal,
} from '../../services/transactionService';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  formatPhone,
} from '../../components/Input';

import {
  buildInternationalPhone,
  digitsOnlyPhone,
  getCountryKeyFromPhone,
} from '../../utils/phone';


const METHOD_LABELS = {
  mobile_money:
    'Mobile Money',

  bank_transfer:
    'Compte bancaire',

  partner_agent:
    'Point partenaire',
};


/*
 * ============================================================
 * FORMATAGE DES MONTANTS
 * ============================================================
 *
 * Exemple :
 * 5000    -> 5 000
 * 50000   -> 50 000
 * 125000  -> 125 000
 */

function formatAmount(
  amount
) {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    )
  ) {
    return '0';
  }

  return new Intl.NumberFormat(
    'fr-FR',
    {
      maximumFractionDigits: 0,
    }
  ).format(
    numericAmount
  );
}


/*
 * ============================================================
 * FRAIS
 * ============================================================
 *
 * 0 à 50 000 inclus : 5 %
 * Au-dessus de 50 000 : 3 %
 */

function getWithdrawalFeeRate(
  amount
) {
  return Number(amount) > 50000
    ? 0.03
    : 0.05;
}


function calculateWithdrawalFee(
  amount
) {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    ) ||
    numericAmount <= 0
  ) {
    return 0;
  }

  return Math.round(
    numericAmount *
      getWithdrawalFeeRate(
        numericAmount
      )
  );
}


/*
 * ============================================================
 * ÉCRAN
 * ============================================================
 */

export default function WithdrawalSummaryScreen({
  route,
  navigation,
}) {
  const {
    amount,
    method,
    recipientName,
    recipientMobileNumber,
  } = route.params;


  const {
    user,
    profile,
  } = useAuth();


  /*
   * ----------------------------------------------------------
   * ÉTATS
   * ----------------------------------------------------------
   */

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    done,
    setDone,
  ] = useState(false);


  /*
   * Modal demandant une confirmation explicite
   * avant de créer le retrait.
   */
  const [
    confirmationVisible,
    setConfirmationVisible,
  ] = useState(false);


  const numericAmount =
    Number(amount);


  /*
   * ----------------------------------------------------------
   * INDICATIF FIXE DU COMPTE
   * ----------------------------------------------------------
   *
   * Le country code du destinataire est toujours basé
   * sur le numéro WhatsApp du compte connecté.
   */

  const loginCountryKey =
    getCountryKeyFromPhone(
      profile?.whatsapp_number
    );


  const fixedRecipientCountry =
    loginCountryKey &&
    countries[
      loginCountryKey
    ]
      ? loginCountryKey
      : profile?.country &&
          countries[
            profile.country
          ]
        ? profile.country
        : 'cameroun';


  const fixedRecipientDialCode =
    countries[
      fixedRecipientCountry
    ]?.dialCode ||
    '+237';


  /*
   * ----------------------------------------------------------
   * FRAIS
   * ----------------------------------------------------------
   */

  const numericFeeRate =
    getWithdrawalFeeRate(
      numericAmount
    );


  const numericFee =
    calculateWithdrawalFee(
      numericAmount
    );


  const received =
    numericAmount -
    numericFee;


  /*
   * ----------------------------------------------------------
   * DESTINATAIRE
   * ----------------------------------------------------------
   */

  const isPhone =
    method !==
    'bank_transfer';


  /*
   * Le numéro provenant de l'écran précédent peut être
   * complet (+237..., +224..., etc.).
   *
   * On conserve uniquement les chiffres locaux puis on
   * reconstruit le numéro avec le country code du compte connecté.
   */

  const localPhoneDigits =
    isPhone
      ? digitsOnlyPhone(
          recipientMobileNumber
        ).slice(-9)
      : '';


  const normalizedPhone =
    isPhone
      ? buildInternationalPhone(
          localPhoneDigits,
          fixedRecipientCountry
        )
      : recipientMobileNumber;


  const countryCode =
    isPhone
      ? fixedRecipientDialCode
      : null;


  /*
   * ==========================================================
   * MODAL DE CONFIRMATION
   * ==========================================================
   */

  const openConfirmation =
    () => {
      if (submitting) {
        return;
      }

      setConfirmationVisible(
        true
      );
    };


  const closeConfirmation =
    () => {
      if (submitting) {
        return;
      }

      setConfirmationVisible(
        false
      );
    };


  /*
   * ==========================================================
   * CRÉATION DU RETRAIT
   * ==========================================================
   *
   * Cette fonction n'est appelée qu'après confirmation
   * explicite dans le modal.
   */

  const confirm =
    async () => {
      setConfirmationVisible(
        false
      );

      setSubmitting(
        true
      );


      try {
        await createWithdrawal({
          userId:
            user.id,

          amount:
            numericAmount,

          /*
           * Règle officielle :
           *
           * <= 50 000 -> 5 %
           * >  50 000 -> 3 %
           */
          feeAmount:
            numericFee,

          recipientMobileNumber:
            normalizedPhone,

          recipientCountryCode:
            countryCode,

          recipientName,

          method:
            METHOD_LABELS[
              method
            ],
        });


        setDone(
          true
        );

      } catch (error) {
        Toast.show({
          type:
            'error',

          text1:
            'Retrait impossible',

          text2:
            error?.message ||
            'Réessayez.',
        });

      } finally {
        setSubmitting(
          false
        );
      }
    };


  /*
   * ==========================================================
   * RETOUR APRÈS SUCCÈS
   * ==========================================================
   */

  const closeDone =
    () => {
      setDone(
        false
      );

      navigation.reset({
        index: 0,

        routes: [
          {
            name:
              'MainTabs',
          },
        ],
      });
    };


  /*
   * ==========================================================
   * AFFICHAGE
   * ==========================================================
   */

  return (
    <>
      <ScrollView
        style={
          styles.wrapper
        }
        contentContainerStyle={
          styles.content
        }
      >
        <Header
          title="Vérifier"
        />


        {/* -------------------------------------------------- */}
        {/* ÉTAPES */}
        {/* -------------------------------------------------- */}

        <View
          style={
            styles.stepRow
          }
        >
          <View
            style={
              styles.stepDone
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


          <View
            style={
              styles.line
            }
          />


          <View
            style={
              styles.stepActive
            }
          >
            <Text
              style={
                styles.stepNumberInverse
              }
            >
              2
            </Text>
          </View>


          <Text
            style={
              typography.caption
            }
          >
            Confirmé
          </Text>
        </View>


        {/* -------------------------------------------------- */}
        {/* TITRE */}
        {/* -------------------------------------------------- */}

        <Text
          style={[
            typography.h2,
            styles.title,
          ]}
        >
          Tout est bon ?
        </Text>


        <Text
          style={[
            typography.caption,
            styles.caption,
          ]}
        >
          Vérifiez juste avant de retirer.
        </Text>


        {/* -------------------------------------------------- */}
        {/* DESTINATAIRE */}
        {/* -------------------------------------------------- */}

        <View
          style={
            styles.card
          }
        >
          <Row
            label="Nom"
            value={
              recipientName
            }
          />


          <Row
            label={
              isPhone
                ? 'Numéro'
                : 'Compte'
            }
            value={
              isPhone
                ? formatPhone(
                    normalizedPhone
                  )
                : normalizedPhone
            }
          />


          <Row
            label="Mode"
            value={
              METHOD_LABELS[
                method
              ]
            }
            last
          />
        </View>


        {/* -------------------------------------------------- */}
        {/* MONTANTS */}
        {/* -------------------------------------------------- */}

        <View
          style={
            styles.amountCard
          }
        >
          <AmountDisplay
            label="Montant"
            value={
              numericAmount
            }
          />


          <AmountDisplay
            label={`Frais (${numericFeeRate * 100} %)`}
            value={
              numericFee
            }
          />


          <View
            style={
              styles.divider
            }
          />


          <AmountDisplay
            label="Vous recevez"
            value={
              received
            }
            emphasize
          />
        </View>


        {/* -------------------------------------------------- */}
        {/* BOUTON */}
        {/* -------------------------------------------------- */}

        <Button
          title="Retirer"
          onPress={
            openConfirmation
          }
          loading={
            submitting
          }
          style={
            styles.button
          }
        />
      </ScrollView>


      {/* ======================================================
       * MODAL DE CONFIRMATION
       * ====================================================== */}

      <Modal
        visible={
          confirmationVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeConfirmation
        }
      >
        <View
          style={
            styles.confirmOverlay
          }
        >
          <View
            style={
              styles.confirmCard
            }
          >
            <View
              style={
                styles.confirmIcon
              }
            >
              <Ionicons
                name="help-circle-outline"
                size={34}
                color={
                  colors.brand.primary
                }
              />
            </View>


            <Text
              style={
                typography.h2
              }
            >
              Confirmer le retrait ?
            </Text>


            <Text
              style={[
                typography.caption,
                styles.confirmText,
              ]}
            >
              Êtes-vous sûr de vouloir confirmer cette demande de retrait ?
            </Text>


            <View
              style={
                styles.confirmSummary
              }
            >
              <Row
                label="Destinataire"
                value={
                  recipientName
                }
              />


              <Row
                label="Numéro"
                value={
                  isPhone
                    ? formatPhone(
                        normalizedPhone
                      )
                    : normalizedPhone
                }
              />


              <Row
                label="Montant"
                value={`${formatAmount(
                  numericAmount
                )} FCFA`}
              />


              <Row
                label="Frais"
                value={`${formatAmount(
                  numericFee
                )} FCFA`}
              />


              <Row
                label="Vous recevez"
                value={`${formatAmount(
                  received
                )} FCFA`}
                last
              />
            </View>


            <View
              style={
                styles.confirmActions
              }
            >
              <Button
                title="Annuler"
                variant="outline"
                onPress={
                  closeConfirmation
                }
                disabled={
                  submitting
                }
                style={
                  styles.confirmButton
                }
              />


              <Button
                title="confirmer"
                onPress={
                  confirm
                }
                loading={
                  submitting
                }
                style={
                  styles.confirmButton
                }
              />
            </View>
          </View>
        </View>
      </Modal>


      {/* ======================================================
       * MODAL SUCCÈS
       * ====================================================== */}

      <Modal
        visible={
          done
        }
        transparent
        animationType="fade"
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalIcon
              }
            >
              <Ionicons
                name="checkmark"
                size={34}
                color={
                  colors.brand.primary
                }
              />
            </View>


            <Text
              style={
                typography.h2
              }
            >
              C’est envoyé
            </Text>


            <Text
              style={[
                typography.caption,
                styles.modalText,
              ]}
            >
              Votre demande de retrait est en cours.
            </Text>


            <Button
              title="Retour à l’accueil"
              onPress={
                closeDone
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}


/*
 * ============================================================
 * ROW
 * ============================================================
 */

function Row({
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.row,
        !last &&
          styles.rowSpacing,
      ]}
    >
      <Text
        style={
          typography.caption
        }
      >
        {label}
      </Text>


      <Text
        style={[
          typography.caption,
          styles.value,
        ]}
        numberOfLines={
          2
        }
      >
        {value || '—'}
      </Text>
    </View>
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
        colors.background
          .default,
    },


    content: {
      padding:
        spacing.screenHorizontal,

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


    stepDone: {
      width: 28,

      height: 28,

      borderRadius: 14,

      backgroundColor:
        colors.brand
          .primaryLight,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    stepActive: {
      width: 28,

      height: 28,

      borderRadius: 14,

      backgroundColor:
        colors.brand
          .primary,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    stepNumber: {
      color:
        colors.brand
          .primary,

      fontWeight:
        '800',
    },


    stepNumberInverse: {
      color:
        colors.text.inverse,

      fontWeight:
        '800',
    },


    line: {
      width: 24,

      height: 1,

      backgroundColor:
        colors.border
          .default,
    },


    title: {
      marginTop:
        spacing.xl,
    },


    caption: {
      marginTop:
        spacing.xs,

      marginBottom:
        spacing.lg,
    },


    card: {
      padding:
        spacing.lg,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background
          .surface,

      borderWidth:
        1,

      borderColor:
        colors.border
          .light,
    },


    row: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      gap:
        spacing.md,
    },


    rowSpacing: {
      marginBottom:
        spacing.sm,
    },


    value: {
      flex: 1,

      textAlign:
        'right',

      color:
        colors.text.primary,
    },


    amountCard: {
      marginTop:
        spacing.md,

      padding:
        spacing.lg,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background
          .surface,

      borderWidth:
        1,

      borderColor:
        colors.border
          .light,
    },


    divider: {
      height: 1,

      backgroundColor:
        colors.border
          .light,

      marginVertical:
        spacing.sm,
    },


    button: {
      marginTop:
        spacing.xl,
    },


    /* ========================================================
     * MODAL CONFIRMATION
     * ======================================================== */

    confirmOverlay: {
      flex: 1,

      backgroundColor:
        'rgba(0,0,0,0.45)',

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        spacing.xl,
    },


    confirmCard: {
      width:
        '100%',

      maxWidth:
        420,

      padding:
        spacing.xl,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background
          .surface,
    },


    confirmIcon: {
      width: 68,

      height: 68,

      borderRadius: 34,

      backgroundColor:
        colors.brand
          .primaryLight,

      alignItems:
        'center',

      justifyContent:
        'center',

      alignSelf:
        'center',

      marginBottom:
        spacing.sm,
    },


    confirmText: {
      textAlign:
        'center',

      marginTop:
        spacing.xs,

      marginBottom:
        spacing.md,

      lineHeight:
        22,
    },


    confirmSummary: {
      padding:
        spacing.md,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.background
          .default,

      borderWidth:
        1,

      borderColor:
        colors.border
          .light,
    },


    confirmActions: {
      flexDirection:
        'row',

      gap:
        spacing.sm,

      marginTop:
        spacing.lg,
    },


    confirmButton: {
      flex: 1,
    },


    /* ========================================================
     * MODAL SUCCÈS
     * ======================================================== */

    modalOverlay: {
      flex: 1,

      backgroundColor:
        'rgba(0,0,0,0.45)',

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        spacing.xl,
    },


    modalCard: {
      width:
        '100%',

      maxWidth:
        420,

      padding:
        spacing.xl,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background
          .surface,

      alignItems:
        'center',

      gap:
        spacing.sm,
    },


    modalIcon: {
      width: 72,

      height: 72,

      borderRadius: 36,

      backgroundColor:
        colors.brand
          .primaryLight,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        spacing.xs,
    },


    modalText: {
      textAlign:
        'center',

      marginBottom:
        spacing.md,
    },
  });
