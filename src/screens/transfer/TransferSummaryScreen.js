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
  countries,
  paymentMethods,
  radii,
  spacing,
  typography,
} from '../../theme/theme';

import Header from '../../components/Header';
import Button from '../../components/Button';
import AmountDisplay from '../../components/AmountDisplay';

import {
  createTransfer,
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

export default function TransferSummaryScreen({
  route,
  navigation,
}) {
  const {
    country,
    method,
    amount,
    fromCountry,
    feeAmount,
    recipientName,
    recipientMobileNumber,
    recipientCountryCode,
    recipientCountry,
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

  const total =
    numericAmount +
    numericFee;

  const confirm =
    async () => {
      setSubmitting(true);

      try {
        await createTransfer({
          userId:
            user.id,

          amount:
            numericAmount,

          recipientName,

          recipientMobileNumber:
            normalizeInternationalPhone(
              recipientMobileNumber
            ),

          recipientCountryCode:
            recipientCountryCode ||
            getCountryCodeFromPhone(
              recipientMobileNumber
            ),

          recipientCountry:
            recipientCountry ||
            country,

          recipientLocation:
            null,

          referenceNote:
            `${countries[fromCountry]?.label || fromCountry} → ${countries[country]?.label || country} · ${paymentMethods[method]?.label || method}`,
        });

        setDone(true);
      } catch (error) {
        Toast.show({
          type:
            'error',

          text1:
            'Transfert impossible',

          text2:
            error?.message ||
            'Réessayez.',
        });
      } finally {
        setSubmitting(false);
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
          Vérifiez juste avant d’envoyer.
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
            label="Numéro"
            value={
              formatPhone(
                recipientMobileNumber
              )
            }
          />

          <Row
            label="Opérateur"
            value={
              paymentMethods[
                method
              ]?.label ||
              method
            }
          />

          <Row
            label="Pays"
            value={`${countries[fromCountry]?.flag || ''} ${countries[fromCountry]?.label || fromCountry} → ${countries[country]?.flag || ''} ${countries[country]?.label || country}`}
          />
        </View>

        <View
          style={
            styles.amountCard
          }
        >
          <AmountDisplay
            label="Envoi"
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
            label="Total"
            value={
              total
            }
            emphasize
          />
        </View>

        <Button
          title="Envoyer"
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

            <Text style={typography.h2}>
              C’est envoyé
            </Text>

            <Text
              style={[
                typography.caption,
                styles.modalText,
              ]}
            >
              Le transfert est en cours de traitement.
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
          styles.rowValue,
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
        colors.brand.primary,
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
      borderWidth: 1,
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

    rowValue: {
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
      borderWidth: 1,
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