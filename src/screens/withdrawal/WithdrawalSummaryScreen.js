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

import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import {
  colors,
  radii,
  spacing,
  typography,
} from '../../theme/theme';

import Header from '../../components/Header';
import Button from '../../components/Button';
import AmountDisplay from '../../components/AmountDisplay';

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
  getCountryCodeFromPhone,
  normalizeInternationalPhone,
} from '../../utils/phone';

const METHOD_LABELS = {
  mobile_money:
    'Mobile Money',

  bank_transfer:
    'Compte bancaire',

  partner_agent:
    'Point partenaire',
};

export default function WithdrawalSummaryScreen({
  route,
  navigation,
}) {
  const {
    amount,
    feeAmount,
    method,
    recipientName,
    recipientMobileNumber,
    recipientCountryCode,
  } = route.params;

  const {
    user,
  } = useAuth();

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    done,
    setDone,
  ] = useState(false);

  const numericAmount =
    Number(amount);

  const numericFee =
    Number(
      feeAmount || 0
    );

  const received =
    numericAmount -
    numericFee;

  const isPhone =
    method !==
    'bank_transfer';

  const normalizedPhone =
    isPhone
      ? normalizeInternationalPhone(
          recipientMobileNumber
        )
      : recipientMobileNumber;

  const countryCode =
    isPhone
      ? recipientCountryCode ||
        getCountryCodeFromPhone(
          normalizedPhone
        )
      : null;

  const confirm =
    async () => {
      setSubmitting(
        true
      );

      try {
        await createWithdrawal({
          userId:
            user.id,

          amount:
            numericAmount,

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

  const closeDone =
    () => {
      setDone(false);

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
          />
        </View>

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
            label="Frais"
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

        <Button
          title="Retirer"
          onPress={
            confirm
          }
          loading={
            submitting
          }
          style={
            styles.button
          }
        />
      </ScrollView>

      <Modal
        visible={done}
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

function Row({
  label,
  value,
}) {
  return (
    <View
      style={
        styles.row
      }
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
        numberOfLines={2}
      >
        {value ||
          '—'}
      </Text>
    </View>
  );
}

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
        colors.border.default,
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
      width: '100%',
      maxWidth: 420,
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