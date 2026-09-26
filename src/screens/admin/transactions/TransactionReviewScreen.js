import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
} from '../../../theme/theme';

import Input from '../../../components/Input';
import Button from '../../../components/Button';
import Card from '../../../components/Card';

import {
  getTransaction,
  approveTransaction,
  rejectTransaction,
} from '../../../services/adminService';

import {
  Screen,
  SectionTitle,
  Loading,
  ErrorBox,
  InfoBanner,
  styles,
} from '../AdminUI';


const OPTIONS = [
  {
    value: 'approve',
    label: 'Confirmer',
    icon: 'checkmark-circle',
    tone: colors.success,
  },
  {
    value: 'reject',
    label: 'Rejeter',
    icon: 'close-circle',
    tone: colors.error,
  },
];


export default function TransactionReviewScreen({
  route,
  navigation,
}) {
  const { transactionId } =
    route.params;

  const [decision, setDecision] =
    useState('approve');

  const [reason, setReason] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [screenLoading, setScreenLoading] =
    useState(true);

  const [proofCount, setProofCount] =
    useState(0);

  const [error, setError] =
    useState(null);


  const load = useCallback(
    async () => {
      try {
        setError(null);

        const result =
          await getTransaction(
            transactionId
          );

        setProofCount(
          result.executionProofs
            ?.length || 0
        );
      } catch (e) {
        setError(
          e?.message ||
            'Impossible de charger la transaction.'
        );
      } finally {
        setScreenLoading(false);
      }
    },
    [transactionId]
  );


  useEffect(() => {
    load();
  }, [load]);


  const submit =
    async () => {
      try {
        setLoading(true);

        if (
          decision === 'approve'
        ) {
          await approveTransaction({
            transactionId,
            reason,
          });
        } else {
          if (!reason.trim()) {
            throw new Error(
              'Un motif de rejet est requis.'
            );
          }

          await rejectTransaction({
            transactionId,
            reason:
              reason.trim(),
          });
        }

        Alert.alert(
          'Terminé',
          'La décision a été enregistrée.'
        );

        navigation.goBack();
      } catch (e) {
        Alert.alert(
          'Erreur',
          e?.message ||
            'Impossible d’enregistrer la décision.'
        );
      } finally {
        setLoading(false);
      }
    };


  if (screenLoading) {
    return (
      <Screen title="Vérifier la transaction">
        <Loading
          label="Vérification de la transaction…"
        />
      </Screen>
    );
  }


  if (error) {
    return (
      <Screen title="Vérifier la transaction">
        <ErrorBox
          message={error}
          onRetry={load}
        />
      </Screen>
    );
  }


  const hasProof =
    proofCount > 0;


  return (
    <Screen title="Vérifier la transaction">
      <ScrollView
        contentContainerStyle={
          styles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        <SectionTitle
          title="Décision"
          icon="git-compare-outline"
        />


        <View
          style={
            local.optionsRow
          }
        >
          {OPTIONS.map(
            (opt) => {
              const active =
                decision ===
                opt.value;

              return (
                <Pressable
                  key={
                    opt.value
                  }
                  onPress={() =>
                    setDecision(
                      opt.value
                    )
                  }
                  style={{
                    flex: 1,
                  }}
                >
                  <Card
                    style={{
                      alignItems:
                        'center',

                      paddingVertical:
                        spacing.lg,

                      borderWidth:
                        2,

                      borderColor:
                        active
                          ? opt.tone
                              .default
                          : colors.border
                              .light,

                      backgroundColor:
                        active
                          ? opt.tone
                              .light
                          : colors.background
                              .surface,
                    }}
                  >
                    <Ionicons
                      name={
                        opt.icon
                      }
                      size={28}
                      color={
                        active
                          ? opt.tone
                              .default
                          : colors.text
                              .tertiary
                      }
                    />

                    <Text
                      style={[
                        typography.bodyBold,
                        {
                          marginTop:
                            spacing.xs,

                          color:
                            active
                              ? opt.tone
                                  .text
                              : colors.text
                                  .primary,
                        },
                      ]}
                    >
                      {
                        opt.label
                      }
                    </Text>
                  </Card>
                </Pressable>
              );
            }
          )}
        </View>


        {/* =====================================================
         * PREUVE
         * ===================================================== */}

        {decision ===
        'approve' ? (
          <>
            <SectionTitle
              title="Preuve de réussite"
              icon="shield-checkmark-outline"
            />

            <Card>
              <InfoBanner
                tone={
                  hasProof
                    ? 'success'
                    : 'info'
                }
                icon={
                  hasProof
                    ? 'checkmark-circle-outline'
                    : 'information-circle-outline'
                }
                text={
                  hasProof
                    ? `${proofCount} preuve${
                        proofCount > 1
                          ? 's'
                          : ''
                      } de réussite enregistrée${
                        proofCount > 1
                          ? 's'
                          : ''
                      }.`
                    : 'Aucune preuve de réussite n’est enregistrée. Vous pouvez confirmer la transaction sans téléverser de preuve.'
                }
              />

              <View
                style={{
                  marginTop:
                    spacing.md,
                }}
              >
                <Button
                  title={
                    hasProof
                      ? 'Voir / modifier la preuve'
                      : 'Ajouter la preuve de réussite'
                  }
                  variant="outline"
                  onPress={() =>
                    navigation.navigate(
                      'AdminTransactionProof',
                      {
                        transactionId,
                      }
                    )
                  }
                />
              </View>
            </Card>
          </>
        ) : null}


        {/* =====================================================
         * MOTIF
         * ===================================================== */}

        <SectionTitle
          title="Motif"
          icon="create-outline"
        />

        <Card>
          <Input
            label={
              decision ===
              'reject'
                ? 'Motif de rejet *'
                : 'Motif / commentaire'
            }
            value={reason}
            onChangeText={
              setReason
            }
            placeholder={
              decision ===
              'reject'
                ? 'Précisez pourquoi la transaction est rejetée'
                : 'Commentaire facultatif'
            }
            autoCapitalize="sentences"
          />
        </Card>


        <View
          style={
            local.submitWrap
          }
        >
          <Button
            title={
              decision ===
              'approve'
                ? 'Confirmer cette transaction'
                : 'Rejeter cette transaction'
            }
            variant={
              decision ===
              'approve'
                ? 'success'
                : 'danger'
            }
            loading={loading}
            disabled={
              loading
            }
            onPress={
              submit
            }
          />
        </View>

      </ScrollView>
    </Screen>
  );
}


const local = StyleSheet.create({
  optionsRow: {
    flexDirection:
      'row',
    gap: spacing.sm,
  },

  submitWrap: {
    marginTop:
      spacing.lg,
  },
});