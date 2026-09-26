import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from '../../../theme/theme';

import Card from '../../../components/Card';
import TransactionListItem from '../../../components/TransactionListItem';
import SegmentedControl from '../../../components/SegmentedControl';
import Input from '../../../components/Input';
import Button from '../../../components/Button';

import {
  listTransactions,
} from '../../../services/adminService';

import {
  assignTransactionsBulk,
  listAssignableTransactionPartners,
} from '../../../services/transactionAssignmentService';

import {
  Screen,
  Loading,
  ErrorBox,
  Empty,
  Divider,
  styles,
} from '../AdminUI';


const FILTERS = [
  {
    label: 'Toutes',
    value: 'all',
  },
  {
    label: 'En attente',
    value: 'under_review',
  },
  {
    label: 'Confirmées',
    value: 'confirmed',
  },
  {
    label: 'Rejetées',
    value: 'rejected',
  },
];


function getTransactionTypeLabel(
  type
) {
  const labels = {
    deposit: 'Dépôt',
    transfer: 'Transfert',
    withdrawal: 'Retrait',
  };

  return (
    labels[type] ||
    type ||
    'Transaction'
  );
}


function isSelectableTransaction(
  transaction
) {
  return (
    transaction?.status ===
      'under_review' &&
    !transaction?.partner_id
  );
}


export default function AdminTransactionsScreen({
  navigation,
}) {
  const [
    filter,
    setFilter,
  ] =
    useState('all');

  const [
    data,
    setData,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState(null);

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState([]);

  const [
    assignmentVisible,
    setAssignmentVisible,
  ] =
    useState(false);

  const [
    partners,
    setPartners,
  ] =
    useState([]);

  const [
    partnersLoading,
    setPartnersLoading,
  ] =
    useState(false);

  const [
    selectedPartnerId,
    setSelectedPartnerId,
  ] =
    useState(null);

  const [
    assignmentNotes,
    setAssignmentNotes,
  ] =
    useState('');

  const [
    assignmentLoading,
    setAssignmentLoading,
  ] =
    useState(false);


  const load =
    useCallback(
      async () => {
        try {
          setError(null);

          const result =
            await listTransactions({
              status:
                filter ===
                'all'
                  ? null
                  : filter,

              limit: 50,
            });

          setData(
            result.data ||
              []
          );
        } catch (e) {
          setError(
            e?.message ||
              'Impossible de charger les transactions.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [filter]
    );


  useEffect(
    () => {
      setSelectedIds([]);
      setAssignmentVisible(
        false
      );
      setSelectedPartnerId(
        null
      );
    },
    [filter]
  );


  useEffect(
    () => {
      load();
    },
    [load]
  );


  const selectableTransactions =
    useMemo(
      () =>
        data.filter(
          isSelectableTransaction
        ),
      [data]
    );


  const selectedTransactions =
    useMemo(
      () =>
        data.filter(
          (transaction) =>
            selectedIds.includes(
              transaction.id
            )
        ),
      [data, selectedIds]
    );


  const allSelectableSelected =
    selectableTransactions.length >
      0 &&
    selectableTransactions.every(
      (transaction) =>
        selectedIds.includes(
          transaction.id
        )
    );


  const toggleSelection =
    useCallback(
      (transactionId) => {
        setSelectedIds(
          (current) =>
            current.includes(
              transactionId
            )
              ? current.filter(
                  (id) =>
                    id !==
                    transactionId
                )
              : [
                  ...current,
                  transactionId,
                ]
        );
      },
      []
    );


  const toggleSelectAll =
    useCallback(
      () => {
        if (
          !selectableTransactions.length
        ) {
          return;
        }

        setSelectedIds(
          (current) => {
            if (
              selectableTransactions.every(
                (transaction) =>
                  current.includes(
                    transaction.id
                  )
              )
            ) {
              return current.filter(
                (id) =>
                  !selectableTransactions.some(
                    (transaction) =>
                      transaction.id ===
                      id
                  )
              );
            }

            return selectableTransactions.map(
              (transaction) =>
                transaction.id
            );
          }
        );
      },
      [selectableTransactions]
    );


  const openAssignment =
    useCallback(
      async () => {
        if (
          !selectedIds.length
        ) {
          return;
        }

        try {
          setPartnersLoading(
            true
          );

          setAssignmentVisible(
            true
          );

          setSelectedPartnerId(
            null
          );

          setAssignmentNotes(
            ''
          );

          const eligiblePartners =
            await listAssignableTransactionPartners(
              {
                transactionIds:
                  selectedIds,
              }
            );

          setPartners(
            eligiblePartners
          );
        } catch (e) {
          setAssignmentVisible(
            false
          );

          Alert.alert(
            'Attribution impossible',
            e?.message ||
              'Impossible de déterminer les partenaires habilités.'
          );
        } finally {
          setPartnersLoading(
            false
          );
        }
      },
      [selectedIds]
    );


  const closeAssignment =
    useCallback(
      () => {
        if (
          assignmentLoading
        ) {
          return;
        }

        setAssignmentVisible(
          false
        );

        setSelectedPartnerId(
          null
        );

        setAssignmentNotes(
          ''
        );
      },
      [assignmentLoading]
    );


  const submitAssignment =
    useCallback(
      async () => {
        if (
          !selectedPartnerId ||
          !selectedIds.length
        ) {
          return;
        }

        const partner =
          partners.find(
            (item) =>
              item.id ===
              selectedPartnerId
          );

        try {
          setAssignmentLoading(
            true
          );

          const result =
            await assignTransactionsBulk(
              {
                transactionIds:
                  selectedIds,

                partnerId:
                  selectedPartnerId,

                notes:
                  assignmentNotes.trim() ||
                  null,
              }
            );

          setAssignmentVisible(
            false
          );

          setSelectedPartnerId(
            null
          );

          setAssignmentNotes(
            ''
          );

          setSelectedIds([]);

          setPartners([]);

          const count =
            result.count ||
            selectedIds.length;

          Alert.alert(
            'Attribution effectuée',
            `${count} transaction${count > 1 ? 's' : ''} ${count > 1 ? 'ont été attribuées' : 'a été attribuée'} à ${partner?.full_name || 'ce partenaire'}.`
          );

          await load();
        } catch (e) {
          Alert.alert(
            'Erreur',
            e?.message ||
              'Impossible d’attribuer les transactions sélectionnées.'
          );
        } finally {
          setAssignmentLoading(
            false
          );
        }
      },
      [
        selectedPartnerId,
        selectedIds,
        partners,
        assignmentNotes,
        load,
      ]
    );


  if (loading) {
    return (
      <Screen title="Transactions">
        <Loading
          label="Chargement des transactions…"
        />
      </Screen>
    );
  }


  if (
    error &&
    !data.length
  ) {
    return (
      <Screen title="Transactions">
        <ErrorBox
          message={error}
          onRetry={load}
        />
      </Screen>
    );
  }


  const activeLabel =
    FILTERS.find(
      (item) =>
        item.value ===
        filter
    )?.label;


  return (
    <Screen title="Transactions">

      <View
        style={
          local.filterBar
        }
      >
        <SegmentedControl
          options={FILTERS}
          value={filter}
          onChange={
            setFilter
          }
        />
      </View>


      {filter ===
        'under_review' &&
      selectableTransactions.length >
        0 ? (
        <View
          style={
            local.bulkToolbar
          }
        >
          <Pressable
            onPress={
              toggleSelectAll
            }
            style={
              local.selectAllButton
            }
          >
            <Ionicons
              name={
                allSelectableSelected
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={19}
              color={
                colors.brand
                  .primary
              }
            />

            <Text
              style={
                local.selectAllText
              }
            >
              {allSelectableSelected
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </Text>
          </Pressable>

          <Text
            style={
              local.selectionCount
            }
          >
            {selectedIds.length}{' '}
            sélectionnée
            {selectedIds.length >
            1
              ? 's'
              : ''}
          </Text>
        </View>
      ) : null}


      {selectedIds.length >
        0 &&
      filter ===
        'under_review' ? (
        <View
          style={
            local.actionBar
          }
        >
          <View
            style={
              local.actionSummary
            }
          >
            <View
              style={
                local.actionIcon
              }
            >
              <Ionicons
                name="people-outline"
                size={19}
                color={
                  colors.brand
                    .primary
                }
              />
            </View>

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  local.actionTitle
                }
              >
                {selectedIds.length}{' '}
                transaction
                {selectedIds.length >
                1
                  ? 's'
                  : ''}{' '}
                sélectionnée
                {selectedIds.length >
                1
                  ? 's'
                  : ''}
              </Text>

              <Text
                style={
                  local.actionSubtitle
                }
              >
                Attribution groupée à un partenaire habilité
              </Text>
            </View>
          </View>

          <Button
            title="Attribuer"
            onPress={
              openAssignment
            }
            style={
              local.actionButton
            }
          />
        </View>
      ) : null}


      <View
        style={
          local.summaryRow
        }
      >
        <Text
          style={[
            typography.caption,
            styles.muted,
            {
              marginTop: 0,
            },
          ]}
        >
          {data.length}{' '}
          transaction
          {data.length > 1
            ? 's'
            : ''}

          {filter !==
          'all'
            ? ` · ${activeLabel?.toLowerCase()}`
            : ''}
        </Text>
      </View>


      {error ? (
        <View
          style={
            local.inlineError
          }
        >
          <Text
            style={
              local.inlineErrorText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}


      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(
                true
              );
              load();
            }}
            tintColor={
              colors.brand
                .primary
            }
            colors={[
              colors.brand
                .primary,
            ]}
          />
        }
        contentContainerStyle={
          styles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Card>
          {data.length ? (
            data.map(
              (
                transaction,
                index
              ) => {
                const selectable =
                  filter ===
                    'under_review' &&
                  isSelectableTransaction(
                    transaction
                  );

                const selected =
                  selectedIds.includes(
                    transaction.id
                  );

                return (
                  <View
                    key={
                      transaction.id
                    }
                  >
                    <View
                      style={
                        local.transactionRow
                      }
                    >
                      {filter ===
                      'under_review' ? (
                        <Pressable
                          disabled={
                            !selectable
                          }
                          onPress={() =>
                            selectable &&
                            toggleSelection(
                              transaction.id
                            )
                          }
                          hitSlop={8}
                          style={[
                            local.checkbox,
                            selected &&
                              local.checkboxSelected,
                            !selectable &&
                              local.checkboxDisabled,
                          ]}
                        >
                          {selected ? (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={
                                colors
                                  .text
                                  .inverse
                              }
                            />
                          ) : null}
                        </Pressable>
                      ) : null}

                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <TransactionListItem
                          transaction={
                            transaction
                          }
                          onPress={() =>
                            navigation.navigate(
                              'AdminTransactionDetail',
                              {
                                transactionId:
                                  transaction.id,
                              }
                            )
                          }
                        />
                      </View>
                    </View>

                    {filter ===
                      'under_review' &&
                    transaction.partner_id ? (
                      <View
                        style={
                          local.assignedHint
                        }
                      >
                        <Ionicons
                          name="person-add-outline"
                          size={14}
                          color={
                            colors
                              .text
                              .secondary
                          }
                        />

                        <Text
                          style={
                            local.assignedHintText
                          }
                        >
                          Déjà attribuée · sélection indisponible
                        </Text>
                      </View>
                    ) : null}

                    {index <
                    data.length -
                      1 ? (
                      <Divider />
                    ) : null}
                  </View>
                );
              }
            )
          ) : (
            <Empty
              icon="swap-horizontal-outline"
              title="Aucune transaction"
              subtitle="Aucune opération ne correspond à ce filtre pour le moment."
            />
          )}
        </Card>
      </ScrollView>


      <Modal
        visible={
          assignmentVisible
        }
        transparent
        animationType="slide"
        onRequestClose={
          closeAssignment
        }
      >
        <View
          style={
            local.modalBackdrop
          }
        >
          <View
            style={
              local.modalSheet
            }
          >
            <View
              style={
                local.modalHeader
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    local.modalTitle
                  }
                >
                  Attribuer les transactions
                </Text>

                <Text
                  style={
                    local.modalSubtitle
                  }
                >
                  {selectedIds.length}{' '}
                  opération
                  {selectedIds.length >
                  1
                    ? 's'
                    : ''}{' '}
                  · uniquement les partenaires habilités
                </Text>
              </View>

              <Pressable
                onPress={
                  closeAssignment
                }
                disabled={
                  assignmentLoading
                }
                style={
                  local.closeButton
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    colors.text
                      .secondary
                  }
                />
              </Pressable>
            </View>


            <ScrollView
              style={{
                maxHeight:
                  430,
              }}
              contentContainerStyle={
                local.modalScroll
              }
              showsVerticalScrollIndicator={
                false
              }
            >
              {partnersLoading ? (
                <Loading
                  label="Recherche des partenaires habilités…"
                />
              ) : partners.length ? (
                <>
                  <Text
                    style={
                      local.modalSectionLabel
                    }
                  >
                    PARTENAIRES DISPONIBLES
                  </Text>

                  {partners.map(
                    (partner) => {
                      const active =
                        partner.id ===
                        selectedPartnerId;

                      return (
                        <Pressable
                          key={
                            partner.id
                          }
                          onPress={() =>
                            setSelectedPartnerId(
                              partner.id
                            )
                          }
                          style={[
                            local.partnerOption,
                            active &&
                              local.partnerOptionActive,
                          ]}
                        >
                          <View
                            style={[
                              local.partnerAvatar,
                              active &&
                                local.partnerAvatarActive,
                            ]}
                          >
                            <Text
                              style={[
                                local.partnerAvatarText,
                                active &&
                                  local.partnerAvatarTextActive,
                              ]}
                            >
                              {(
                                partner.full_name ||
                                'P'
                              )
                                .charAt(
                                  0
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
                                local.partnerName
                              }
                            >
                              {partner.full_name ||
                                'Partenaire'}
                            </Text>

                            <Text
                              style={
                                local.partnerMeta
                              }
                            >
                              {partner.phone_number ||
                                partner.whatsapp_number ||
                                'Coordonnées non renseignées'}
                            </Text>

                            <View
                              style={
                                local.roleWrap
                              }
                            >
                              {(
                                partner.roles ||
                                []
                              )
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    role
                                  ) => (
                                    <View
                                      key={
                                        role.id
                                      }
                                      style={
                                        local.roleChip
                                      }
                                    >
                                      <Text
                                        style={
                                          local.roleChipText
                                        }
                                      >
                                        {role.label ||
                                          role.code}
                                      </Text>
                                    </View>
                                  )
                                )}

                              {(
                                partner.roles ||
                                []
                              ).length >
                              3 ? (
                                <View
                                  style={
                                    local.roleChip
                                  }
                                >
                                  <Text
                                    style={
                                      local.roleChipText
                                    }
                                  >
                                    +
                                    {partner.roles.length -
                                      3}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          <View
                            style={[
                              local.radio,
                              active &&
                                local.radioActive,
                            ]}
                          >
                            {active ? (
                              <Ionicons
                                name="checkmark"
                                size={15}
                                color={
                                  colors
                                    .text
                                    .inverse
                                }
                              />
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    }
                  )}
                </>
              ) : (
                <View
                  style={
                    local.noPartnerBox
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={28}
                    color={
                      colors.text
                        .secondary
                    }
                  />

                  <Text
                    style={
                      local.noPartnerTitle
                    }
                  >
                    Aucun partenaire habilité
                  </Text>

                  <Text
                    style={
                      local.noPartnerText
                    }
                  >
                    Aucun partenaire actif ne possède les rôles/permissions nécessaires pour gérer toutes les transactions sélectionnées.
                  </Text>
                </View>
              )}


              {partners.length ? (
                <>
                  <Text
                    style={[
                      local.modalSectionLabel,
                      {
                        marginTop:
                          spacing.lg,
                      },
                    ]}
                  >
                    NOTES INTERNES
                  </Text>

                  <Input
                    label="Note d’affectation"
                    value={
                      assignmentNotes
                    }
                    onChangeText={
                      setAssignmentNotes
                    }
                    placeholder="Précision pour le partenaire ou le suivi interne"
                    autoCapitalize="sentences"
                    multiline
                    style={
                      local.notesInput
                    }
                  />

                  <View
                    style={
                      local.selectionPreview
                    }
                  >
                    <Text
                      style={
                        local.previewTitle
                      }
                    >
                      Résumé
                    </Text>

                    {selectedTransactions
                      .slice(
                        0,
                        5
                      )
                      .map(
                        (
                          transaction
                        ) => (
                          <View
                            key={
                              transaction.id
                            }
                            style={
                              local.previewRow
                            }
                          >
                            <View
                              style={
                                local.previewDot
                              }
                            />

                            <Text
                              style={
                                local.previewText
                              }
                              numberOfLines={
                                1
                              }
                            >
                              {getTransactionTypeLabel(
                                transaction.type
                              )}{' '}
                              ·{' '}
                              {
                                transaction.id
                              }
                            </Text>
                          </View>
                        )
                      )}

                    {selectedTransactions.length >
                    5 ? (
                      <Text
                        style={
                          local.previewMore
                        }
                      >
                        +
                        {selectedTransactions.length -
                          5}{' '}
                        autre
                        {selectedTransactions.length -
                          5 >
                        1
                          ? 's'
                          : ''}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}
            </ScrollView>


            <View
              style={
                local.modalFooter
              }
            >
              <Button
                title="Annuler"
                variant="outline"
                onPress={
                  closeAssignment
                }
                disabled={
                  assignmentLoading
                }
                style={{
                  flex: 1,
                }}
              />

              <Button
                title={`Attribuer ${
                  selectedIds.length >
                  1
                    ? 'les transactions'
                    : 'la transaction'
                }`}
                onPress={
                  submitAssignment
                }
                loading={
                  assignmentLoading
                }
                disabled={
                  !selectedPartnerId ||
                  !partners.length
                }
                style={{
                  flex: 1.2,
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}


const local = StyleSheet.create({
  filterBar: {
    marginBottom:
      spacing.sm,
  },

  summaryRow: {
    marginBottom:
      spacing.sm,

    paddingHorizontal:
      2,
  },

  bulkToolbar: {
    flexDirection:
      'row',

    alignItems:
      'center',

    justifyContent:
      'space-between',

    paddingHorizontal:
      2,

    paddingVertical:
      spacing.xs,

    marginBottom:
      spacing.sm,
  },

  selectAllButton: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.xs,
  },

  selectAllText: {
    ...typography.bodyBold,

    color:
      colors.brand.primary,

    fontSize:
      13,
  },

  selectionCount: {
    ...typography.caption,

    color:
      colors.text.secondary,

    marginTop:
      0,
  },

  actionBar: {
    marginBottom:
      spacing.sm,

    padding:
      spacing.md,

    borderRadius:
      radii.lg,

    backgroundColor:
      colors.brand
        .primaryLight,

    borderWidth:
      1,

    borderColor:
      colors.brand
        .primary +
      '22',

    ...shadows.card,
  },

  actionSummary: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      spacing.sm,

    marginBottom:
      spacing.sm,
  },

  actionIcon: {
    width:
      38,

    height:
      38,

    borderRadius:
      12,

    alignItems:
      'center',

    justifyContent:
      'center',

    backgroundColor:
      colors.background
        .surface,
  },

  actionTitle: {
    ...typography.bodyBold,

    color:
      colors.text
        .primary,
  },

  actionSubtitle: {
    ...typography.caption,

    color:
      colors.text
        .secondary,

    marginTop:
      2,
  },

  actionButton: {
    width:
      '100%',
  },

  inlineError: {
    marginBottom:
      spacing.sm,

    paddingHorizontal:
      spacing.sm,
  },

  inlineErrorText: {
    ...typography.caption,

    color:
      colors.error
        .default,

    marginTop:
      0,
  },

  transactionRow: {
    flexDirection:
      'row',

    alignItems:
      'center',
  },

  checkbox: {
    width:
      24,

    height:
      24,

    borderRadius:
      7,

    borderWidth:
      1.5,

    borderColor:
      colors.border
        .default,

    alignItems:
      'center',

    justifyContent:
      'center',

    marginRight:
      spacing.xs,

    backgroundColor:
      colors.background
        .surface,
  },

  checkboxSelected: {
    backgroundColor:
      colors.brand
        .primary,

    borderColor:
      colors.brand
        .primary,
  },

  checkboxDisabled: {
    opacity:
      0.35,
  },

  assignedHint: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      6,

    paddingLeft:
      34,

    paddingTop:
      2,

    paddingBottom:
      4,
  },

  assignedHintText: {
    ...typography.caption,

    color:
      colors.text
        .secondary,

    marginTop:
      0,
  },

  modalBackdrop: {
    flex:
      1,

    justifyContent:
      'flex-end',

    backgroundColor:
      'rgba(0,0,0,0.40)',
  },

  modalSheet: {
    backgroundColor:
      colors.background
        .surface,

    borderTopLeftRadius:
      24,

    borderTopRightRadius:
      24,

    paddingTop:
      spacing.md,

    paddingHorizontal:
      spacing
        .screenHorizontal,

    paddingBottom:
      spacing.lg,

    maxHeight:
      '90%',
  },

  modalHeader: {
    flexDirection:
      'row',

    alignItems:
      'center',

    paddingBottom:
      spacing.md,
  },

  modalTitle: {
    ...typography.h2,

    color:
      colors.text
        .primary,
  },

  modalSubtitle: {
    ...typography.caption,

    color:
      colors.text
        .secondary,

    marginTop:
      3,
  },

  closeButton: {
    width:
      38,

    height:
      38,

    borderRadius:
      19,

    alignItems:
      'center',

    justifyContent:
      'center',

    backgroundColor:
      colors.background
        .surfaceAlt,
  },

  modalScroll: {
    paddingBottom:
      spacing.md,
  },

  modalSectionLabel: {
    ...typography.caption,

    color:
      colors.text
        .secondary,

    fontSize:
      11,

    letterSpacing:
      0.8,

    marginBottom:
      spacing.sm,

    marginTop:
      2,
  },

  partnerOption: {
    flexDirection:
      'row',

    alignItems:
      'center',

    padding:
      spacing.sm,

    borderRadius:
      radii.lg,

    borderWidth:
      1,

    borderColor:
      colors.border
        .light,

    marginBottom:
      spacing.xs,

    backgroundColor:
      colors.background
        .surface,
  },

  partnerOptionActive: {
    borderColor:
      colors.brand
        .primary,

    backgroundColor:
      colors.brand
        .primaryLight,
  },

  partnerAvatar: {
    width:
      46,

    height:
      46,

    borderRadius:
      15,

    alignItems:
      'center',

    justifyContent:
      'center',

    backgroundColor:
      colors.background
        .surfaceAlt,

    marginRight:
      spacing.sm,
  },

  partnerAvatarActive: {
    backgroundColor:
      colors.brand
        .primary,
  },

  partnerAvatarText: {
    fontFamily:
      'Baloo2_700Bold',

    fontSize:
      18,

    color:
      colors.text
        .primary,
  },

  partnerAvatarTextActive: {
    color:
      colors.text
        .inverse,
  },

  partnerName: {
    ...typography.bodyBold,

    color:
      colors.text
        .primary,
  },

  partnerMeta: {
    ...typography.caption,

    color:
      colors.text
        .secondary,

    marginTop:
      2,
  },

  roleWrap: {
    flexDirection:
      'row',

    flexWrap:
      'wrap',

    gap:
      5,

    marginTop:
      7,
  },

  roleChip: {
    paddingHorizontal:
      8,

    paddingVertical:
      4,

    borderRadius:
      radii.pill,

    backgroundColor:
      colors.background
        .surfaceAlt,
  },

  roleChipText: {
    ...typography.caption,

    color:
      colors.text
        .secondary,

    fontSize:
      10,

    marginTop:
      0,
  },

  radio: {
    width:
      22,

    height:
      22,

    borderRadius:
      11,

    borderWidth:
      1.5,

    borderColor:
      colors.border
        .default,

    alignItems:
      'center',

    justifyContent:
      'center',

    marginLeft:
      spacing.xs,
  },

  radioActive: {
    backgroundColor:
      colors.brand
        .primary,

    borderColor:
      colors.brand
        .primary,
  },

  notesInput: {
    minHeight:
      92,

    textAlignVertical:
      'top',
  },

  selectionPreview: {
    padding:
      spacing.sm,

    borderRadius:
      radii.lg,

    backgroundColor:
      colors.background
        .surfaceAlt,

    marginTop:
      spacing.sm,
  },

  previewTitle: {
    ...typography.bodyBold,

    color:
      colors.text
        .primary,

    marginBottom:
      6,
  },

  previewRow: {
    flexDirection:
      'row',

    alignItems:
      'center',

    gap:
      6,

    marginBottom:
      4,
  },

  previewDot: {
    width:
      5,

    height:
      5,

    borderRadius:
      3,

    backgroundColor:
      colors.brand
        .primary,
  },

  previewText: {
    ...typography.caption,

    color:
      colors.text
        .secondary,

    flex:
      1,

    marginTop:
      0,
  },

  previewMore: {
    ...typography.caption,

    color:
      colors.brand
        .primary,

    marginTop:
      2,
  },

  noPartnerBox: {
    alignItems:
      'center',

    paddingVertical:
      spacing.xl,

    paddingHorizontal:
      spacing.lg,

    borderRadius:
      radii.lg,

    backgroundColor:
      colors.background
        .surfaceAlt,
  },

  noPartnerTitle: {
    ...typography.bodyBold,

    color:
      colors.text
        .primary,

    marginTop:
      spacing.sm,

    textAlign:
      'center',
  },

  noPartnerText: {
    ...typography.caption,

    color:
      colors.text
        .secondary,

    textAlign:
      'center',

    lineHeight:
      20,

    marginTop:
      5,
  },

  modalFooter: {
    flexDirection:
      'row',

    gap:
      spacing.sm,

    paddingTop:
      spacing.md,

    borderTopWidth:
      1,

    borderTopColor:
      colors.border
        .light,
  },
});