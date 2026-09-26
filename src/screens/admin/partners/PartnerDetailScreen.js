
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Pressable,
  Alert,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  Ionicons,
} from '@expo/vector-icons';

import Toast from 'react-native-toast-message';

import Card from '../../../components/Card';
import Button from '../../../components/Button';

import {
  getPartner,
} from '../../../services/adminService';

import {
  getPartnerRoleIds,
  listPartnerAssignableRoles,
  setPartnerRoles,
} from '../../../services/partnerRoleService';

import {
  colors,
  typography,
  spacing,
  radii,
  fontSizes,
  lineHeights,
  fontWeights,
} from '../../../theme/theme';

import {
  Screen,
  Loading,
  ErrorBox,
} from '../AdminUI';


/* ============================================================
 * HELPERS
 * ============================================================ */

function formatScope(scope) {
  if (!scope) {
    return 'Partenaire';
  }

  return String(scope)
    .replace(/[_-]/g, ' ')
    .replace(/^./, (char) =>
      char.toUpperCase()
    );
}


function formatRoleLabel(role) {
  if (role?.label) {
    return role.label;
  }

  if (!role?.code) {
    return 'Rôle';
  }

  return String(role.code)
    .replace(/\./g, ' · ')
    .replace(/_/g, ' ')
    .replace(/^./, (char) =>
      char.toUpperCase()
    );
}


function getRoleDescription(role) {
  const code =
    String(role?.code || '')
      .toLowerCase();

  if (
    code.includes('review') ||
    code.includes('approve') ||
    code.includes('reject')
  ) {
    return 'Examiner et traiter les opérations affectées';
  }

  if (
    code.includes('execute') ||
    code.includes('operation')
  ) {
    return 'Exécuter les opérations autorisées';
  }

  if (
    code.includes('settlement') ||
    code.includes('batch')
  ) {
    return 'Gérer les opérations de règlement';
  }

  if (
    code.includes('kmer') ||
    code.includes('quest') ||
    code.includes('driver') ||
    code.includes('match')
  ) {
    return 'Accéder aux opérations KmerDiaspora autorisées';
  }

  return 'Autorisation attribuée au partenaire';
}


function getRoleIcon(role) {
  const code =
    String(role?.code || '')
      .toLowerCase();

  if (
    code.includes('deposit')
  ) {
    return 'arrow-down-circle-outline';
  }

  if (
    code.includes('withdraw')
  ) {
    return 'arrow-up-circle-outline';
  }

  if (
    code.includes('transfer')
  ) {
    return 'swap-horizontal-outline';
  }

  if (
    code.includes('settlement') ||
    code.includes('batch')
  ) {
    return 'business-outline';
  }

  if (
    code.includes('momo')
  ) {
    return 'phone-portrait-outline';
  }

  if (
    code.includes('kmer') ||
    code.includes('quest')
  ) {
    return 'globe-outline';
  }

  if (
    code.includes('match')
  ) {
    return 'git-network-outline';
  }

  if (
    code.includes('review') ||
    code.includes('approve') ||
    code.includes('reject')
  ) {
    return 'shield-checkmark-outline';
  }

  return 'key-outline';
}


function roleMatchesScope(role) {
  const scope =
    String(role?.scope || '')
      .toLowerCase();

  if (!scope) {
    return true;
  }

  /*
   * Les rôles purement système/administrateur
   * ne doivent pas être attribuables à un partenaire.
   */
  const forbiddenScopes = [
    'admin_only',
    'administrator',
    'system',
    'superadmin',
  ];

  return !forbiddenScopes.includes(
    scope
  );
}


/* ============================================================
 * ROLE ROW
 * ============================================================ */

function RoleRow({
  role,
  enabled,
  onToggle,
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.roleRow,
        pressed &&
          styles.rolePressed,
      ]}
      accessibilityRole="switch"
      accessibilityState={{
        checked: enabled,
      }}
      accessibilityLabel={
        formatRoleLabel(role)
      }
    >
      <View
        style={[
          styles.roleIcon,
          enabled
            ? styles.roleIconActive
            : styles.roleIconInactive,
        ]}
      >
        <Ionicons
          name={
            getRoleIcon(role)
          }
          size={19}
          color={
            enabled
              ? colors.brand.primary
              : colors.text.tertiary
          }
        />
      </View>

      <View
        style={
          styles.roleContent
        }
      >
        <Text
          style={
            [
              typography.caption,
              styles.roleTitle,
            ]
          }
          numberOfLines={2}
        >
          {
            formatRoleLabel(role)
          }
        </Text>

        <Text
          style={
            [
              typography.caption,
              styles.roleDescription,
            ]
          }
          numberOfLines={2}
        >
          {
            getRoleDescription(
              role
            )
          }
        </Text>

        <View
          style={
            styles.roleMeta
          }
        >
          <View
            style={
              styles.scopeChip
            }
          >
            <Text
              style={
                styles.scopeChipText
              }
            >
              {
                formatScope(
                  role?.scope
                )
              }
            </Text>
          </View>
        </View>
      </View>

      <Switch
        value={
          enabled
        }
        onValueChange={
          onToggle
        }
        trackColor={{
          false:
            colors.border.default,

          true:
            colors.brand.primaryLight,
        }}
        thumbColor={
          enabled
            ? colors.brand.primary
            : colors.background.surface
        }
        ios_backgroundColor={
          colors.border.default
        }
      />
    </Pressable>
  );
}


/* ============================================================
 * SCREEN
 * ============================================================ */

export default function PartnerDetailScreen({
  route,
  navigation,
}) {
  const {
    partnerId,
  } = route.params;

  const [
    partner,
    setPartner,
  ] = useState(null);

  const [
    roles,
    setRoles,
  ] = useState([]);

  const [
    selectedRoleIds,
    setSelectedRoleIds,
  ] = useState([]);

  const [
    initialRoleIds,
    setInitialRoleIds,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingRoles,
    setSavingRoles,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load = useCallback(
    async ({
      silent = false,
    } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        const [
          partnerData,
          availableRoles,
          assignedRoleIds,
        ] = await Promise.all([
          getPartner(
            partnerId
          ),

          listPartnerAssignableRoles(),

          getPartnerRoleIds(
            partnerId
          ),
        ]);

        const filteredRoles =
          (availableRoles || [])
            .filter(
              roleMatchesScope
            );

        const allowedRoleIds =
          new Set(
            filteredRoles.map(
              (role) =>
                String(role.id)
            )
          );

        const normalizedAssigned =
          (assignedRoleIds || [])
            .map(String)
            .filter(
              (roleId) =>
                allowedRoleIds.has(
                  roleId
                )
            );

        /*
         * CORRECTION PRINCIPALE
         *
         * getPartner() renvoie :
         *
         * {
         *   partner,
         *   roles,
         *   transactions,
         *   settlements
         * }
         *
         * L'ancien code faisait :
         *
         * setPartner(partnerData)
         *
         * Ce qui plaçait l'objet conteneur dans l'état
         * "partner". Les accès :
         *
         * partner.full_name
         * partner.phone_number
         * partner.active
         *
         * devenaient donc undefined.
         *
         * On récupère maintenant réellement la fiche :
         */
        setPartner(
          partnerData?.partner ??
          partnerData
        );

        setRoles(
          filteredRoles
        );

        setSelectedRoleIds(
          normalizedAssigned
        );

        setInitialRoleIds(
          normalizedAssigned
        );
      } catch (e) {
        console.error(
          '[PartnerDetail] load:',
          e
        );

        setError(
          e?.message ||
            'Impossible de charger le partenaire.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [partnerId]
  );


  /*
   * Recharge la fiche à chaque focus.
   */
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );


  /* ==========================================================
   * TOGGLE ROLE
   * ========================================================== */

  const toggleRole =
    useCallback(
      (roleId) => {
        const id =
          String(roleId);

        setSelectedRoleIds(
          (current) => {
            if (
              current.includes(id)
            ) {
              return current.filter(
                (item) =>
                  item !== id
              );
            }

            return [
              ...current,
              id,
            ];
          }
        );
      },
      []
    );


  /* ==========================================================
   * DIRTY STATE
   * ========================================================== */

  const hasChanges =
    useMemo(() => {
      const current = [
        ...selectedRoleIds,
      ].sort();

      const initial = [
        ...initialRoleIds,
      ].sort();

      if (
        current.length !==
        initial.length
      ) {
        return true;
      }

      return current.some(
        (value, index) =>
          value !==
          initial[index]
      );
    }, [
      selectedRoleIds,
      initialRoleIds,
    ]);


  /* ==========================================================
   * SAVE
   * ========================================================== */

  const saveRoles =
    useCallback(
      async () => {
        if (savingRoles) {
          return;
        }

        const roleCount =
          selectedRoleIds.length;

        const roleLabel =
          roleCount === 0
            ? 'aucun rôle'
            : `${roleCount} rôle${
                roleCount > 1
                  ? 's'
                  : ''
              }`;

        Alert.alert(
          'Enregistrer les permissions',
          `Le partenaire pourra utiliser ${roleLabel}. Confirmer cette modification ?`,
          [
            {
              text:
                'Annuler',

              style:
                'cancel',
            },

            {
              text:
                'Enregistrer',

              onPress:
                async () => {
                  try {
                    setSavingRoles(
                      true
                    );

                    await setPartnerRoles(
                      {
                        partnerId,
                        roleIds:
                          selectedRoleIds,
                      }
                    );

                    setInitialRoleIds(
                      [
                        ...selectedRoleIds,
                      ]
                    );

                    Toast.show({
                      type:
                        'success',

                      text1:
                        'Permissions mises à jour',

                      text2:
                        'Les rôles du partenaire ont été enregistrés.',
                    });
                  } catch (e) {
                    console.error(
                      '[PartnerDetail] save roles:',
                      e
                    );

                    Toast.show({
                      type:
                        'error',

                      text1:
                        'Enregistrement impossible',

                      text2:
                        e?.message ||
                        'Une erreur est survenue.',
                    });
                  } finally {
                    setSavingRoles(
                      false
                    );
                  }
                },
            },
          ]
        );
      },
      [
        partnerId,
        savingRoles,
        selectedRoleIds,
      ]
    );


  /* ==========================================================
   * RESET
   * ========================================================== */

  const resetRoles =
    useCallback(() => {
      setSelectedRoleIds(
        [
          ...initialRoleIds,
        ]
      );
    }, [
      initialRoleIds,
    ]);


  /* ==========================================================
   * LOADING / ERROR
   * ========================================================== */

  if (
    loading &&
    !partner
  ) {
    return (
      <Screen
        title="Partenaire"
      >
        <Loading
          label="Chargement du partenaire…"
        />
      </Screen>
    );
  }


  if (
    error &&
    !partner
  ) {
    return (
      <Screen
        title="Partenaire"
      >
        <ErrorBox
          message={
            error
          }
          onRetry={() =>
            load()
          }
        />
      </Screen>
    );
  }


  /* ==========================================================
   * DERIVED
   * ========================================================== */

  const activeRolesCount =
    selectedRoleIds.length;

  const availableRolesCount =
    roles.length;


  return (
    <Screen
      title="Partenaire"
    >
      <ScrollView
        contentContainerStyle={
          styles.scroll
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(
                true
              );

              load({
                silent: true,
              });
            }}
            tintColor={
              colors.brand.primary
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* ==================================================
         * PARTNER CARD
         * ================================================== */}

        <Card
          style={
            styles.partnerCard
          }
        >
          <View
            style={
              styles.partnerHeader
            }
          >
            <View
              style={
                styles.partnerAvatar
              }
            >
              <Text
                style={
                  styles.partnerAvatarText
                }
              >
                {
                  String(
                    partner?.full_name ||
                      'P'
                  )
                    .trim()
                    .split(
                      /\s+/
                    )
                    .slice(
                      0,
                      2
                    )
                    .map(
                      (part) =>
                        part[0]
                          ?.toUpperCase() ||
                        ''
                    )
                    .join('') ||
                  'P'
                }
              </Text>
            </View>

            <View
              style={
                styles.partnerIdentity
              }
            >
              <Text
                style={
                  styles.partnerName
                }
                numberOfLines={2}
              >
                {
                  partner?.full_name ||
                  'Partenaire'
                }
              </Text>

              <Text
                style={
                  styles.partnerPhone
                }
                numberOfLines={1}
              >
                {
                  partner?.phone_number ||
                  partner?.whatsapp_number ||
                  'Numéro non renseigné'
                }
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,

                partner?.active
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,

                  partner?.active
                    ? styles.statusDotActive
                    : styles.statusDotInactive,
                ]}
              />

              <Text
                style={
                  styles.statusText
                }
              >
                {
                  partner?.active
                    ? 'Actif'
                    : 'Désactivé'
                }
              </Text>
            </View>
          </View>

          <View
            style={
              styles.partnerDivider
            }
          />

          <View
            style={
              styles.partnerStats
            }
          >
            <View
              style={
                styles.partnerStat
              }
            >
              <Text
                style={
                  styles.partnerStatValue
                }
              >
                {
                  activeRolesCount
                }
              </Text>

              <Text
                style={
                  styles.partnerStatLabel
                }
              >
                rôles actifs
              </Text>
            </View>

            <View
              style={
                styles.partnerStatDivider
              }
            />

            <View
              style={
                styles.partnerStat
              }
            >
              <Text
                style={
                  styles.partnerStatValue
                }
              >
                {
                  availableRolesCount
                }
              </Text>

              <Text
                style={
                  styles.partnerStatLabel
                }
              >
                disponibles
              </Text>
            </View>
          </View>

          <Button
            title="Modifier les informations"
            variant="outline"
            onPress={() =>
              navigation.navigate(
                'AdminEditPartner',
                {
                  partner,
                }
              )
            }
            style={
              styles.editButton
            }
          />
        </Card>


        {/* ==================================================
         * ROLE HEADER
         * ================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View
            style={
              styles.sectionHeaderText
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Opérations autorisées
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Activez ou désactivez les rôles que ce partenaire peut utiliser.
            </Text>
          </View>

          <View
            style={
              styles.selectedBadge
            }
          >
            <Text
              style={
                styles.selectedBadgeText
              }
            >
              {
                activeRolesCount
              }
            </Text>
          </View>
        </View>


        {/* ==================================================
         * ROLE LIST
         * ================================================== */}

        <Card
          style={
            styles.rolesCard
          }
        >
          {roles.length === 0 ? (
            <View
              style={
                styles.emptyRoles
              }
            >
              <View
                style={
                  styles.emptyRolesIcon
                }
              >
                <Ionicons
                  name="key-outline"
                  size={25}
                  color={
                    colors.text.tertiary
                  }
                />
              </View>

              <Text
                style={
                  styles.emptyRolesTitle
                }
              >
                Aucun rôle disponible
              </Text>

              <Text
                style={
                  styles.emptyRolesText
                }
              >
                Aucun rôle actif et compatible avec un partenaire n’est actuellement configuré.
              </Text>
            </View>
          ) : (
            roles.map(
              (
                role,
                index
              ) => (
                <View
                  key={
                    role.id
                  }
                >
                  <RoleRow
                    role={
                      role
                    }
                    enabled={
                      selectedRoleIds.includes(
                        String(
                          role.id
                        )
                      )
                    }
                    onToggle={() =>
                      toggleRole(
                        role.id
                      )
                    }
                  />

                  {index <
                    roles.length -
                      1 ? (
                    <View
                      style={
                        styles.divider
                      }
                    />
                  ) : null}
                </View>
              )
            )
          )}
        </Card>


        {/* ==================================================
         * SAVE
         * ================================================== */}

        {roles.length > 0 ? (
          <View
            style={
              styles.saveSection
            }
          >
            {hasChanges ? (
              <View
                style={
                  styles.unsavedBanner
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={
                    colors.warning.default
                  }
                />

                <Text
                  style={
                    styles.unsavedText
                  }
                >
                  Des modifications de permissions ne sont pas encore enregistrées.
                </Text>
              </View>
            ) : null}

            <Button
              title="Enregistrer les permissions"
              onPress={
                saveRoles
              }
              loading={
                savingRoles
              }
              disabled={
                !hasChanges
              }
              style={
                styles.saveButton
              }
            />

            {hasChanges ? (
              <Pressable
                onPress={
                  resetRoles
                }
                disabled={
                  savingRoles
                }
                style={
                  styles.resetButton
                }
              >
                <Text
                  style={
                    styles.resetText
                  }
                >
                  Annuler les modifications
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

      </ScrollView>
    </Screen>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles = StyleSheet.create({
  scroll: {
    paddingBottom:
      spacing.huge + 40,
  },

  partnerCard: {
    marginBottom:
      spacing.lg,
  },

  partnerHeader: {
    flexDirection:
      'row',
    alignItems:
      'center',
  },

  partnerAvatar: {
    width: 56,
    height: 56,
    borderRadius:
      28,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.brand.primaryLight,
    marginRight:
      spacing.sm,
  },

  partnerAvatarText: {
    color:
      colors.brand.primaryDark,
    fontFamily:
      typography.bodyBold.fontFamily,
    fontWeight:
      typography.bodyBold.fontWeight,
    fontSize:
      fontSizes.md,
  },

  partnerIdentity: {
    flex: 1,
    minWidth: 0,
  },

  partnerName: {
    color:
      colors.text.primary,
    fontFamily:
      typography.h2.fontFamily,
    fontWeight:
      typography.h2.fontWeight,
    fontSize:
      fontSizes.lg,
    lineHeight:
      lineHeights.lg,
  },

  partnerPhone: {
    marginTop:
      2,
    color:
      colors.text.secondary,
    fontSize:
      fontSizes.xs,
  },

  statusBadge: {
    flexDirection:
      'row',
    alignItems:
      'center',
    paddingHorizontal:
      spacing.xs,
    paddingVertical:
      5,
    borderRadius:
      radii.pill,
    marginLeft:
      spacing.xs,
  },

  statusActive: {
    backgroundColor:
      colors.success.light,
  },

  statusInactive: {
    backgroundColor:
      colors.error.light,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius:
      3.5,
    marginRight:
      5,
  },

  statusDotActive: {
    backgroundColor:
      colors.success.default,
  },

  statusDotInactive: {
    backgroundColor:
      colors.error.default,
  },

  statusText: {
    color:
      colors.text.primary,
    fontSize: 10,
    fontWeight:
      '700',
  },

  partnerDivider: {
    height:
      StyleSheet.hairlineWidth,
    backgroundColor:
      colors.border.light,
    marginVertical:
      spacing.md,
  },

  partnerStats: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  partnerStat: {
    flex: 1,
    alignItems:
      'center',
  },

  partnerStatValue: {
    color:
      colors.brand.primary,
    fontFamily:
      typography.h2.fontFamily,
    fontWeight:
      typography.h2.fontWeight,
    fontSize:
      fontSizes.lg,
  },

  partnerStatLabel: {
    marginTop:
      1,
    color:
      colors.text.tertiary,
    fontSize:
      fontSizes.xs,
  },

  partnerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor:
      colors.border.light,
  },

  editButton: {
    marginTop:
      spacing.md,
  },

  sectionHeader: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    marginBottom:
      spacing.sm,
  },

  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
    paddingRight:
      spacing.sm,
  },

  sectionTitle: {
    color:
      colors.text.primary,
    fontFamily:
      typography.h2.fontFamily,
    fontWeight:
      typography.h2.fontWeight,
    fontSize:
      fontSizes.md,
  },

  sectionSubtitle: {
    marginTop:
      3,
    color:
      colors.text.secondary,
    fontSize:
      fontSizes.xs,
    lineHeight:
      lineHeights.md,
  },

  selectedBadge: {
    minWidth: 32,
    height: 30,
    paddingHorizontal:
      spacing.xs,
    borderRadius:
      radii.pill,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.brand.primaryLight,
  },

  selectedBadgeText: {
    color:
      colors.brand.primary,
    fontSize:
      fontSizes.xs,
    fontWeight:
      '800',
  },

  notice: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    padding:
      spacing.sm,
    marginBottom:
      spacing.sm,
    borderRadius:
      radii.md,
    backgroundColor:
      colors.brand.primaryLight,
  },

  noticeText: {
    flex: 1,
    marginLeft:
      spacing.xs,
    color:
      colors.text.secondary,
    fontSize:
      fontSizes.xs,
    lineHeight:
      lineHeights.md,
  },

  rolesCard: {
    padding:
      spacing.sm,
    marginBottom:
      spacing.md,
  },

  roleRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    minHeight:
      88,
    paddingHorizontal:
      spacing.xs,
    paddingVertical:
      spacing.sm,
    borderRadius:
      radii.md,
  },

  rolePressed: {
    backgroundColor:
      colors.overlay.pressed,
  },

  roleIcon: {
    width: 42,
    height: 42,
    borderRadius:
      radii.sm,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginRight:
      spacing.sm,
  },

  roleIconActive: {
    backgroundColor:
      colors.brand.primaryLight,
  },

  roleIconInactive: {
    backgroundColor:
      colors.background.surfaceAlt,
  },

  roleContent: {
    flex: 1,
    minWidth: 0,
    paddingRight:
      spacing.xs,
  },

  roleTitle: {
    color:
      colors.text.primary,
    fontWeight:
      fontWeights.semiBold,
    fontSize:
      fontSizes.sm,
    lineHeight:
      lineHeights.sm,
  },

  roleDescription: {
    marginTop:
      2,
    color:
      colors.text.secondary,
    fontSize:
      fontSizes.xs,
    lineHeight:
      lineHeights.sm,
  },

  roleMeta: {
    flexDirection:
      'row',
    marginTop:
      spacing.xxs,
  },

  scopeChip: {
    paddingHorizontal:
      6,
    paddingVertical:
      2,
    borderRadius:
      radii.pill,
    backgroundColor:
      colors.background.surfaceAlt,
  },

  scopeChipText: {
    color:
      colors.text.tertiary,
    fontSize:
      fontSizes.xxs,
    fontWeight:
      '600',
  },

  divider: {
    height:
      StyleSheet.hairlineWidth,
    backgroundColor:
      colors.border.light,
    marginHorizontal:
      spacing.xs,
  },

  emptyRoles: {
    alignItems:
      'center',
    padding:
      spacing.xl,
  },

  emptyRolesIcon: {
    width: 60,
    height: 60,
    borderRadius:
      30,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.background.surfaceAlt,
    marginBottom:
      spacing.sm,
  },

  emptyRolesTitle: {
    color:
      colors.text.primary,
    fontFamily:
      typography.h3.fontFamily,
    fontWeight:
      typography.h3.fontWeight,
    fontSize:
      fontSizes.md,
    textAlign:
      'center',
  },

  emptyRolesText: {
    marginTop:
      spacing.xs,
    color:
      colors.text.secondary,
    fontSize:
      fontSizes.xs,
    lineHeight:
      lineHeights.md,
    textAlign:
      'center',
    maxWidth:
      320,
  },

  saveSection: {
    marginTop:
      spacing.sm,
  },

  unsavedBanner: {
    flexDirection:
      'row',
    alignItems:
      'flex-start',
    padding:
      spacing.sm,
    marginBottom:
      spacing.sm,
    borderRadius:
      radii.md,
    backgroundColor:
      colors.warning.light,
  },

  unsavedText: {
    flex: 1,
    marginLeft:
      spacing.xs,
    color:
      colors.text.secondary,
    fontSize:
      fontSizes.xs,
    lineHeight:
      lineHeights.md,
  },

  saveButton: {
    marginTop:
      spacing.xs,
  },

  resetButton: {
    minHeight:
      44,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginTop:
      spacing.xs,
    borderRadius:
      radii.md,
  },

  resetText: {
    color:
      colors.text.secondary,
    fontFamily:
      typography.bodyBold.fontFamily,
    fontWeight:
      typography.bodyBold.fontWeight,
    fontSize:
      fontSizes.xs,
  },

  footer: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'center',
    marginTop:
      spacing.lg,
  },

  footerDot: {
    width: 8,
    height: 8,
    borderRadius:
      4,
    backgroundColor:
      colors.success.default,
    marginRight:
      spacing.xs,
  },

  footerText: {
    color:
      colors.text.tertiary,
    fontSize:
      fontSizes.xs,
  },
});
