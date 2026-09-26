import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
} from '../../../theme/theme';

import Card from '../../../components/Card';

import {
  listRankRules,
} from '../../../services/adminService';

import {
  Screen,
  Loading,
  ErrorBox,
  Empty,
  Divider,
  styles as adminStyles,
} from '../AdminUI';

import {
  getRankColors,
} from '../../../theme/theme';

const formatMoney =
  (value) =>
    Number(value || 0)
      .toLocaleString('fr-FR')
      .replace(/\u202f/g, ' ');

export default function RankRulesScreen({
  navigation,
}) {
  const [
    rules,
    setRules,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  const load =
    useCallback(
      async () => {
        try {
          setError(null);

          setRules(
            await listRankRules()
          );
        } catch (e) {
          setError(
            e.message
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen title="Règles des rangs">
        <Loading />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Règles des rangs">
        <ErrorBox
          message={error}
          onRetry={load}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Règles des rangs">
      <ScrollView
        contentContainerStyle={
          adminStyles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text
          style={[
            typography.caption,
            {
              color:
                colors.text.secondary,
              marginBottom:
                spacing.md,
            },
          ]}
        >
          Définissez les seuils de transactions et les avantages associés à chaque rang.
        </Text>

        <Card>
          {rules.length ? (
            rules.map(
              (rule, index) => {
                const meta =
                  getRankColors(
                    rule.code
                  );

                return (
                  <View
                    key={
                      rule.id
                    }
                  >
                    <Pressable
                      onPress={() =>
                        navigation.navigate(
                          'AdminRankRuleForm',
                          {
                            rule,
                          }
                        )
                      }
                      style={
                        styles.row
                      }
                    >
                      <View
                        style={[
                          styles.rankIcon,
                          {
                            backgroundColor:
                              meta.background,
                            borderColor:
                              meta.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.rankIconText,
                            {
                              color:
                                meta.text,
                            },
                          ]}
                        >
                          {rule.label
                            .slice(
                              0,
                              1
                            )
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={
                            typography.bodyBold
                          }
                        >
                          {
                            rule.label
                          }
                        </Text>

                        <Text
                          style={
                            typography.caption
                          }
                        >
                          À partir de{' '}
                          {formatMoney(
                            rule.min_transaction_volume
                          )}{' '}
                          U
                          {' · '}
                          {rule.max_transaction_volume == null
                            ? 'sans plafond'
                            : `jusqu'à ${formatMoney(
                                rule.max_transaction_volume
                              )} U`}
                        </Text>

                        <Text
                          style={
                            typography.caption
                          }
                        >
                          Argent :{' '}
                          {
                            rule.money_loan_repayment_months
                          }{' '}
                          mois
                          {' · '}
                          {rule.max_money_loan_amount == null
                            ? 'sans plafond'
                            : `max ${formatMoney(rule.max_money_loan_amount)} U`}
                          {rule.money_loan_enabled === false
                            ? ' · indisponible'
                            : ''}
                        </Text>

                        <Text
                          style={
                            typography.caption
                          }
                        >
                          Billet :{' '}
                          {
                            rule.flight_loan_repayment_months
                          }{' '}
                          mois
                          {' · '}
                          {rule.max_flight_loan_amount == null
                            ? 'sans plafond'
                            : `max ${formatMoney(rule.max_flight_loan_amount)} U`}
                          {rule.flight_loan_enabled === false
                            ? ' · indisponible'
                            : ''}
                          {rule.flight_accommodation_months > 0
                            ? ` · Hébergement : ${rule.flight_accommodation_months} mois`
                            : ''}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={
                          colors.icon.muted
                        }
                      />
                    </Pressable>

                    {index <
                      rules.length -
                        1 && (
                      <Divider />
                    )}
                  </View>
                );
              }
            )
          ) : (
            <Empty
              icon="trophy-outline"
              title="Aucune règle"
              subtitle="Les règles de rangs ne sont pas configurées."
            />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:
      'row',
    alignItems:
      'center',
    paddingVertical:
      spacing.md,
  },

  rankIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginRight:
      spacing.md,
  },

  rankIconText: {
    fontSize: 18,
    fontWeight:
      '800',
  },
});