// src/screens/admin/configuration/TariffsScreen.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import * as DocumentPicker from 'expo-document-picker';

import File from 'expo-file-system';

import {
  colors,
  typography,
  spacing,
  radii,
  fontWeights,
} from '../../../theme/theme';

import Card from '../../../components/Card';

import {
  parseTariffCsv,
} from '../../../utils/tariffCsv';

import {
  formatAmount,
} from '../../../utils/formatters';

import {
  getTariffRouteKey,
  listTransferTariffs,
  deleteTransferTariff,
} from '../../../services/tariffService';

import {
  importTransferTariffs,
} from '../../../services/tariffImportService';

import {
  Screen,
  Loading,
  ErrorBox,
  Empty,
  Divider,
  styles as adminStyles,
} from '../AdminUI';


const COUNTRY_META = {
  mali: {
    label: 'Mali',
    flag: '🇲🇱',
  },

  guinee: {
    label: 'Guinée',
    flag: '🇬🇳',
  },

  cameroun: {
    label: 'Cameroun',
    flag: '🇨🇲',
  },
};


function countryLabel(
  code
) {
  return (
    COUNTRY_META?.[code]?.label ??
    code ??
    '—'
  );
}


function countryFlag(
  code
) {
  return (
    COUNTRY_META?.[code]?.flag ??
    '🏳️'
  );
}


export default function TariffsScreen({
  navigation,
}) {
  const [
    data,
    setData,
  ] = useState(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    error,
    setError,
  ] = useState(
    null
  );

  const [
    importing,
    setImporting,
  ] = useState(
    false
  );

  const [
    deletingId,
    setDeletingId,
  ] = useState(
    null
  );

  const [
    search,
    setSearch,
  ] = useState(
    ''
  );


  const load =
    useCallback(
      async () => {
        try {
          setError(
            null
          );

          const tariffs =
            await listTransferTariffs();

          setData(
            Array.isArray(
              tariffs
            )
              ? tariffs
              : []
          );
        } catch (
          loadError
        ) {
          console.error(
            '[TariffsScreen] loading failed:',
            loadError
          );

          setError(
            loadError?.message ||
              'Impossible de charger les tarifs.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );


  useEffect(
    () => {
      load();
    },
    [load]
  );


  const handleImportCsv =
    useCallback(
      async () => {
        if (
          importing
        ) {
          return;
        }

        try {
          setImporting(
            true
          );

          const result =
            await DocumentPicker.getDocumentAsync({
              type: [
                'text/csv',
                'text/comma-separated-values',
                'application/csv',
                'text/plain',
                '*/*',
              ],

              multiple:
                false,

              copyToCacheDirectory:
                true,
            });

          if (
            result.canceled
          ) {
            return;
          }

          const asset =
            result.assets?.[0];

          if (!asset?.uri) {
            throw new Error(
              'Le fichier sélectionné est invalide.'
            );
          }

          const fileName =
            String(
              asset.name ||
                ''
            ).trim();

          if (
            fileName &&
            !fileName
              .toLowerCase()
              .endsWith(
                '.csv'
              )
          ) {
            throw new Error(
              'Veuillez sélectionner un fichier CSV (.csv).'
            );
          }

          const file =
            new File(
              asset.uri
            );

          const csvText =
            await file.text();

          const parsed =
            parseTariffCsv(
              csvText,
              fileName
            );

          if (
            parsed.errors
              .length >
            0
          ) {
            const visibleErrors =
              parsed.errors
                .slice(
                  0,
                  8
                )
                .join('\n');

            const remaining =
              parsed.errors.length >
              8
                ? `\n… et ${parsed.errors.length - 8} autre(s) erreur(s).`
                : '';

            Alert.alert(
              'CSV invalide',
              `${visibleErrors}${remaining}`
            );

            return;
          }

          if (
            parsed.rows.length ===
            0
          ) {
            Alert.alert(
              'CSV vide',
              'Aucune ligne tarifaire valide n’a été trouvée.'
            );

            return;
          }

          const routeCount =
            new Set(
              parsed.rows.map(
                (
                  row
                ) =>
                  getTariffRouteKey(
                    row.country_a,
                    row.country_b
                  )
              )
            ).size;

          Alert.alert(
            'Importer la grille tarifaire',

            `${parsed.rows.length} tranche(s) valide(s) pour ${routeCount} Frais(s) réversible(s) seront créées ou mises à jour.\n\nChaque ligne sera valable dans les deux sens.`,

            [
              {
                text:
                  'Annuler',

                style:
                  'cancel',
              },

              {
                text:
                  'Importer',

                onPress:
                  async () => {
                    try {
                      const importResult =
                        await importTransferTariffs(
                          parsed.rows
                        );

                      await load();

                      Alert.alert(
                        'Import terminé',
                        `${importResult.count} tranche(s) tarifaire(s) ont été créées ou mises à jour.`
                      );
                    } catch (
                      importError
                    ) {
                      console.error(
                        '[TariffsScreen] import failed:',
                        importError
                      );

                      Alert.alert(
                        'Erreur d’import',
                        importError?.message ||
                          'Impossible de mettre à jour les tarifs.'
                      );
                    }
                  },
              },
            ]
          );
        } catch (
          pickerError
        ) {
          console.error(
            '[TariffsScreen] picker failed:',
            pickerError
          );

          Alert.alert(
            'Erreur',
            pickerError?.message ||
              'Impossible de lire le fichier CSV.'
          );
        } finally {
          setImporting(
            false
          );
        }
      },
      [
        importing,
        load,
      ]
    );


  const handleDelete =
    useCallback(
      (
        tariff
      ) => {
        if (
          !tariff?.id
        ) {
          Alert.alert(
            'Erreur',
            'Identifiant du tarif manquant.'
          );

          return;
        }

        if (
          deletingId
        ) {
          return;
        }

        const route =
          `${countryLabel(
            tariff.country_a
          )} ↔ ${countryLabel(
            tariff.country_b
          )}`;

        const range =
          `${formatAmount(
            tariff.min_amount
          )} – ${formatAmount(
            tariff.max_amount
          )}`;

        const fee =
          formatAmount(
            tariff.fee_amount
          );

        Alert.alert(
          'Supprimer ce tarif ?',

          `${route}\nTranche : ${range}\nFrais : ${fee}\n\nCette action est définitive.`,

          [
            {
              text:
                'Annuler',

              style:
                'cancel',
            },

            {
              text:
                'Supprimer',

              style:
                'destructive',

              onPress:
                async () => {
                  try {
                    setDeletingId(
                      tariff.id
                    );

                    await deleteTransferTariff({
                      tariffId:
                        tariff.id,
                    });

                    setData(
                      (
                        current
                      ) =>
                        current.filter(
                          (
                            item
                          ) =>
                            item.id !==
                            tariff.id
                        )
                    );

                    Alert.alert(
                      'Tarif supprimé',
                      'Le tarif a été supprimé avec succès.'
                    );
                  } catch (
                    deleteError
                  ) {
                    console.error(
                      '[TariffsScreen] delete failed:',
                      deleteError
                    );

                    Alert.alert(
                      'Suppression impossible',
                      deleteError?.message ||
                        'Impossible de supprimer ce tarif.'
                    );
                  } finally {
                    setDeletingId(
                      null
                    );
                  }
                },
            },
          ]
        );
      },
      [
        deletingId,
      ]
    );


  const routeCount =
    useMemo(
      () =>
        new Set(
          data.map(
            (
              tariff
            ) =>
              getTariffRouteKey(
                tariff.country_a,
                tariff.country_b
              )
          )
        ).size,
      [
        data,
      ]
    );


  const filteredData =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (
          !query
        ) {
          return data;
        }

        return data.filter(
          (
            tariff
          ) => {
            const a =
              `${countryLabel(
                tariff.country_a
              )} ${tariff.country_a}`
                .toLowerCase();

            const b =
              `${countryLabel(
                tariff.country_b
              )} ${tariff.country_b}`
                .toLowerCase();

            return (
              a.includes(
                query
              ) ||
              b.includes(
                query
              )
            );
          }
        );
      },
      [
        data,
        search,
      ]
    );


  if (
    loading
  ) {
    return (
      <Screen
        title="Tarifs"
      >
        <Loading />
      </Screen>
    );
  }


  if (
    error
  ) {
    return (
      <Screen
        title="Tarifs"
      >
        <ErrorBox
          message={
            error
          }
          onRetry={
            load
          }
        />
      </Screen>
    );
  }


  return (
    <Screen
      title="Tarifs"
    >
      <ScrollView
        contentContainerStyle={
          adminStyles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Card
          style={
            styles.hero
          }
        >
          <View
            style={
              styles.heroHeader
            }
          >
            <View
              style={
                styles.heroIcon
              }
            >
              <Ionicons
                name="swap-horizontal"
                size={22}
                color={
                  colors
                    .brand
                    .primary
                }
              />
            </View>

            <View
              style={
                styles.heroText
              }
            >
              <Text
                style={
                  typography.h3
                }
              >
                Tarifs réversibles
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Un tarif unique couvre automatiquement les deux sens du Frais.
              </Text>
            </View>
          </View>

          <View
            style={
              styles.actionRow
            }
          >
            <Pressable
              disabled={
                importing
              }
              onPress={
                handleImportCsv
              }
              style={({
                pressed,
              }) => [
                styles.secondaryButton,

                pressed && {
                  opacity:
                    0.85,
                },
              ]}
            >
              {importing ? (
                <ActivityIndicator
                  size="small"
                  color={
                    colors
                      .brand
                      .primary
                  }
                />
              ) : (
                <Ionicons
                  name="cloud-upload-outline"
                  size={19}
                  color={
                    colors
                      .brand
                      .primary
                  }
                />
              )}

              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                {importing
                  ? 'Import…'
                  : 'Importer CSV'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                navigation.navigate(
                  'AdminTariffForm'
                )
              }
              style={({
                pressed,
              }) => [
                styles.primaryButton,

                pressed && {
                  opacity:
                    0.9,
                },
              ]}
            >
              <Ionicons
                name="add"
                size={20}
                color={
                  colors
                    .text
                    .inverse
                }
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Ajouter un tarif
              </Text>
            </Pressable>
          </View>
        </Card>


        <View
          style={
            styles.searchBar
          }
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={
              colors
                .text
                .tertiary
            }
          />

          <TextInput
            value={
              search
            }
            onChangeText={
              setSearch
            }
            placeholder="Rechercher un pays…"
            placeholderTextColor={
              colors
                .text
                .tertiary
            }
            style={
              styles.searchInput
            }
          />

          {search ? (
            <Pressable
              onPress={() =>
                setSearch(
                  ''
                )
              }
              hitSlop={
                8
              }
            >
              <Ionicons
                name="close-circle"
                size={17}
                color={
                  colors
                    .text
                    .tertiary
                }
              />
            </Pressable>
          ) : null}
        </View>


        <View
          style={
            styles.listHeader
          }
        >
          <View
            style={
              styles.listHeaderText
            }
          >
            <Text
              style={
                typography.h3
              }
            >
              Liste des tarifs
            </Text>

            <Text
              style={
                styles.listSubtitle
              }
            >
              Chaque ligne est valable dans les deux directions.
            </Text>
          </View>

          {routeCount >
          0 ? (
            <View
              style={
                styles.countPill
              }
            >
              <Text
                style={
                  styles.countPillText
                }
              >
                {routeCount}{' '}
                Frais
              </Text>
            </View>
          ) : null}
        </View>


        <Card
          style={
            styles.listCard
          }
        >
          {filteredData.length ===
          0 ? (
            <Empty
              icon="pricetag-outline"

              title={
                search
                  ? 'Aucun résultat'
                  : 'Aucun tarif'
              }

              subtitle={
                search
                  ? `Aucun Frais ne correspond à « ${search} ».`
                  : 'Ajoutez une grille tarifaire pour commencer.'
              }
            />
          ) : (
            filteredData.map(
              (
                tariff,
                index
              ) => {
                const isDeleting =
                  deletingId ===
                  tariff.id;

                return (
                  <View
                    key={
                      tariff.id
                    }
                  >
                    <View
                      style={
                        styles.tariffRow
                      }
                    >
                      <View
                        style={
                          styles.routeColumn
                        }
                      >
                        <View
                          style={
                            styles.routeRow
                          }
                        >
                          <Text
                            style={
                              styles.flag
                            }
                          >
                            {countryFlag(
                              tariff.country_a
                            )}
                          </Text>

                          <Text
                            style={
                              styles.countryText
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {countryLabel(
                              tariff.country_a
                            )}
                          </Text>

                          <Ionicons
                            name="swap-horizontal"
                            size={14}
                            color={
                              colors
                                .text
                                .tertiary
                            }
                            style={{
                              marginHorizontal:
                                5,
                            }}
                          />

                          <Text
                            style={
                              styles.flag
                            }
                          >
                            {countryFlag(
                              tariff.country_b
                            )}
                          </Text>

                          <Text
                            style={
                              styles.countryText
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {countryLabel(
                              tariff.country_b
                            )}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.rangeText
                          }
                        >
                          {formatAmount(
                            tariff.min_amount
                          )}{' '}
                          –{' '}
                          {formatAmount(
                            tariff.max_amount
                          )}
                        </Text>
                      </View>


                      <Text
                        style={
                          styles.feeText
                        }
                      >
                        {formatAmount(
                          tariff.fee_amount
                        )}
                      </Text>


                      <Pressable
                        onPress={() =>
                          navigation.navigate(
                            'AdminTariffForm',
                            {
                              tariff,
                            }
                          )
                        }
                        disabled={
                          isDeleting
                        }
                        hitSlop={
                          6
                        }
                        style={
                          styles.actionCircle
                        }
                      >
                        <Ionicons
                          name="pencil"
                          size={16}
                          color={
                            colors
                              .brand
                              .primary
                          }
                        />
                      </Pressable>


                      <Pressable
                        onPress={() =>
                          handleDelete(
                            tariff
                          )
                        }
                        disabled={
                          isDeleting ||
                          Boolean(
                            deletingId
                          )
                        }
                        hitSlop={
                          6
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer le Frais ${countryLabel(
                          tariff.country_a
                        )} vers ${countryLabel(
                          tariff.country_b
                        )}`}
                        style={[
                          styles.actionCircle,
                          styles.deleteAction,
                        ]}
                      >
                        {isDeleting ? (
                          <ActivityIndicator
                            size="small"
                            color={
                              colors
                                .error
                                .default
                            }
                          />
                        ) : (
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color={
                              colors
                                .error
                                .default
                            }
                          />
                        )}
                      </Pressable>
                    </View>

                    {index <
                      filteredData.length -
                        1 ? (
                      <Divider />
                    ) : null}
                  </View>
                );
              }
            )
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}


const styles =
  StyleSheet.create({
    hero: {
      marginBottom:
        spacing.md,

      padding:
        spacing.lg,
    },

    heroHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        spacing.md,
    },

    heroIcon: {
      width: 42,
      height: 42,

      borderRadius:
        radii.md,

      backgroundColor:
        colors
          .brand
          .primaryLight,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing.sm,
    },

    heroText: {
      flex: 1,
    },

    subtitle: {
      marginTop:
        3,

      color:
        colors
          .text
          .secondary,

      fontSize:
        13,

      lineHeight:
        18,
    },

    actionRow: {
      flexDirection:
        'row',

      gap:
        spacing.sm,
    },

    secondaryButton: {
      flex: 1,

      minHeight:
        44,

      borderRadius:
        radii.pill,

      backgroundColor:
        colors
          .brand
          .primaryLight,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing.xs,

      paddingHorizontal:
        spacing.sm,
    },

    secondaryButtonText: {
      color:
        colors
          .brand
          .primary,

      fontWeight:
        fontWeights
          .semiBold,

      fontSize:
        13,
    },

    primaryButton: {
      flex: 1,

      minHeight:
        44,

      borderRadius:
        radii.pill,

      backgroundColor:
        colors
          .brand
          .primary,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing.xs,

      paddingHorizontal:
        spacing.sm,
    },

    primaryButtonText: {
      color:
        colors
          .text
          .inverse,

      fontWeight:
        fontWeights
          .semiBold,

      fontSize:
        13,
    },

    searchBar: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,

      backgroundColor:
        colors
          .background
          .surface,

      borderWidth:
        1,

      borderColor:
        colors
          .border
          .default,

      borderRadius:
        radii.pill,

      paddingHorizontal:
        spacing.md,

      minHeight:
        44,

      marginBottom:
        spacing.lg,
    },

    searchInput: {
      flex: 1,

      color:
        colors
          .text
          .primary,

      fontSize:
        14,
    },

    listHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.sm,

      gap:
        spacing.sm,
    },

    listHeaderText: {
      flex: 1,
    },

    listSubtitle: {
      marginTop:
        2,

      color:
        colors
          .text
          .secondary,

      fontSize:
        12,

      lineHeight:
        17,
    },

    countPill: {
      backgroundColor:
        colors
          .brand
          .primaryLight,

      borderRadius:
        radii.pill,

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        4,
    },

    countPillText: {
      color:
        colors
          .brand
          .primaryDark,

      fontSize:
        12,

      fontWeight:
        fontWeights
          .semiBold,
    },

    listCard: {
      padding:
        spacing.sm,

      borderRadius:
        radii.xs,
    },

    tariffRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingVertical:
        spacing.sm,

      paddingHorizontal:
        spacing.xs,
    },

    routeColumn: {
      flex: 1,

      minWidth:
        0,
    },

    routeRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      minWidth:
        0,
    },

    flag: {
      fontSize:
        16,

      marginRight:
        3,
    },

    countryText: {
      color:
        colors
          .text
          .secondary,

      fontSize:
        13,

      fontWeight:
        fontWeights
          .bold,

      flexShrink:
        1,
    },

    reversibleBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      marginLeft:
        spacing.xs,

      paddingHorizontal:
        spacing.xs,

      paddingVertical:
        2,

      borderRadius:
        radii.pill,

      backgroundColor:
        colors
          .brand
          .primaryLight,
    },

    reversibleBadgeText: {
      color:
        colors
          .brand
          .primary,

      fontSize:
        10,

      lineHeight:
        13,

      fontWeight:
        fontWeights
          .semiBold,
    },

    rangeText: {
      color:
        colors
          .text
          .tertiary,

      fontSize:
        12,

      marginTop:
        3,
    },

    feeText: {
      color:
        colors
          .brand
          .primary,

      minWidth:
        70,

      marginLeft:
        spacing.xs,

      marginRight:
        spacing.xs,

      textAlign:
        'right',

      fontSize:
        13,

      fontWeight:
        fontWeights
          .bold,
    },

    actionCircle: {
      width: 32,
      height: 32,

      borderRadius:
        radii.circle,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors
          .brand
          .primaryLight,

      marginLeft:
        spacing.xs,
    },

    deleteAction: {
      backgroundColor:
        colors
          .error
          .light,
    },
  });