// src/screens/admin/kmerdiaspora/KmAdministratorsScreen.js

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Pressable,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  supabase,
} from '../../../lib/supabase';

import {
  deleteKmAdministrator,
} from '../../../services/adminService';

import {
  colors,
  spacing,
  typography,
} from '../../../theme/theme';

import Card from '../../../components/Card';
import Button from '../../../components/Button';
import EmptyState from '../../../components/EmptyState';

import {
  Screen,
  Loading,
  SectionTitle,
  Pill,
  styles,
} from '../AdminUI';


/* ============================================================
 * HELPERS
 * ============================================================ */

function normalizeWhatsapp(value) {
  return String(value || '')
    .replace(/[\s-]/g, '')
    .trim();
}

function isSameContact(
  item,
  settings
) {
  if (!item || !settings) {
    return false;
  }

  const itemNumber =
    normalizeWhatsapp(
      item.whatsapp_number
    );

  const configuredNumber =
    normalizeWhatsapp(
      settings.whatsapp_admin_number
    );

  if (
    !itemNumber ||
    !configuredNumber
  ) {
    return false;
  }

  if (
    itemNumber !==
    configuredNumber
  ) {
    return false;
  }

  if (
    settings.whatsapp_admin_name &&
    item.full_name &&
    settings.whatsapp_admin_name !==
      item.full_name
  ) {
    return false;
  }

  return true;
}


/* ============================================================
 * CARD KMERADMIN
 * ============================================================ */

function AdministratorCard({
  item,
  onEdit,
  onDelete,
}) {
  const active =
    item?.active !== false;

  return (
    <Card
      style={{
        marginBottom:
          spacing.md,
      }}
    >
      <View
        style={{
          flexDirection:
            'row',
          alignItems:
            'flex-start',
          gap:
            spacing.md,
        }}
      >
        <View
          style={
            localStyles.avatar
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={
              colors.brand.primary
            }
          />
        </View>

        <View
          style={{
            flex: 1,
          }}
        >
          <View
            style={{
              flexDirection:
                'row',
              alignItems:
                'center',
              gap:
                spacing.xs,
              flexWrap:
                'wrap',
            }}
          >
            <Text
              style={
                typography.h3
              }
              numberOfLines={
                2
              }
            >
              {
                item?.full_name ||
                'KmAdministrateur sans nom'
              }
            </Text>

            <Pill
              label={
                active
                  ? 'Actif'
                  : 'Inactif'
              }
              tone={
                active
                  ? 'success'
                  : 'neutral'
              }
            />

            {item?.is_whatsapp_contact ? (
              <Pill
                label="Contact WhatsApp"
                tone="info"
                icon="logo-whatsapp"
              />
            ) : null}
          </View>

          <View
            style={
              localStyles.infoRow
            }
          >
            <Ionicons
              name="logo-whatsapp"
              size={15}
              color={
                colors.success
                  .default
              }
            />

            <Text
              style={[
                typography.caption,
                localStyles.whatsapp,
              ]}
            >
              {
                item?.whatsapp_number ||
                'WhatsApp non renseigné'
              }
            </Text>
          </View>

          {item?.created_at ? (
            <View
              style={
                localStyles.infoRow
              }
            >
              <Ionicons
                name="calendar-outline"
                size={15}
                color={
                  colors.text
                    .tertiary
                }
              />

              <Text
                style={[
                  typography.caption,
                  styles.muted,
                ]}
              >
                Créé le{' '}
                {new Date(
                  item.created_at
                ).toLocaleDateString(
                  'fr-FR'
                )}
              </Text>
            </View>
          ) : null}

          {item?.notes ? (
            <Text
              style={[
                typography.caption,
                styles.muted,
                localStyles.notes,
              ]}
              numberOfLines={3}
            >
              {item.notes}
            </Text>
          ) : null}
        </View>

        <View
          style={
            localStyles.actions
          }
        >
          <Pressable
            onPress={() =>
              onEdit(item)
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Modifier ${
              item?.full_name ||
              'le KmAdministrateur'
            }`}
            style={({
              pressed,
            }) => [
              localStyles.editButton,
              pressed && {
                opacity: 0.7,
              },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={19}
              color={
                colors.brand.primary
              }
            />
          </Pressable>

          <Pressable
            onPress={() =>
              onDelete(item)
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Supprimer ${
              item?.full_name ||
              'le KmAdministrateur'
            }`}
            style={({
              pressed,
            }) => [
              localStyles.deleteButton,
              pressed && {
                opacity: 0.55,
              },
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={19}
              color={
                colors.error
                  .default
              }
            />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}


/* ============================================================
 * PAGE
 * ============================================================ */

export default function KmAdministratorsScreen({
  navigation,
}) {
  const [
    items,
    setItems,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    configuredContact,
    setConfiguredContact,
  ] = useState(null);


  /* ============================================================
   * CHARGEMENT
   * ============================================================ */

  const load =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          setError(null);

          const {
            data:
              authData,
            error:
              authError,
          } =
            await supabase.auth.getUser();

          if (authError) {
            throw authError;
          }

          const authUser =
            authData?.user;

          if (!authUser) {
            throw new Error(
              'Utilisateur non authentifié.'
            );
          }

          /* ======================================================
           * VÉRIFIER QUE C'EST BIEN UN ADMIN
           * ====================================================== */

          const {
            data:
              currentAdmin,
            error:
              currentAdminError,
          } =
            await supabase
              .from(
                'admins'
              )
              .select(
                'id, auth_user_id, active'
              )
              .eq(
                'auth_user_id',
                authUser.id
              )
              .maybeSingle();

          if (
            currentAdminError
          ) {
            throw currentAdminError;
          }

          if (!currentAdmin) {
            throw new Error(
              'Compte administrateur introuvable.'
            );
          }

          if (
            currentAdmin.active ===
            false
          ) {
            throw new Error(
              'Votre compte administrateur est désactivé.'
            );
          }

          /* ======================================================
           * CHARGER TOUS LES KMERADMINISTRATEURS
           * ====================================================== */

          const {
            data:
              administrators,
            error:
              administratorsError,
          } =
            await supabase
              .from(
                'kmerdiaspora_admins'
              )
              .select(`
                id,
                auth_user_id,
                full_name,
                whatsapp_number,
                secret_code_hash,
                login_attempts,
                active,
                notes,
                created_at,
                updated_at
              `)
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              );

          if (
            administratorsError
          ) {
            throw administratorsError;
          }

          /* ======================================================
           * CHARGER LE CONTACT WHATSAPP PRINCIPAL
           * ====================================================== */

          let settings = null;

          const {
            data:
              settingsData,
            error:
              settingsError,
          } =
            await supabase
              .from(
                'kd_settings'
              )
              .select(
                'id, whatsapp_admin_number, whatsapp_admin_name'
              )
              .eq(
                'id',
                1
              )
              .maybeSingle();

          if (
            !settingsError
          ) {
            settings =
              settingsData ||
              null;
          } else {
            console.warn(
              '[KmAdministratorsScreen] kd_settings unavailable:',
              settingsError
            );
          }

          setConfiguredContact(
            settings
          );

          /* ======================================================
           * MARQUER LE CONTACT PRINCIPAL
           * ====================================================== */

          const mapped =
            (
              administrators ||
              []
            ).map(
              (item) => ({
                ...item,

                is_whatsapp_contact:
                  isSameContact(
                    item,
                    settings
                  ),
              })
            );

          setItems(
            mapped
          );
        } catch (e) {
          console.error(
            '[KmAdministratorsScreen] load error:',
            e
          );

          setError(
            e?.message ||
              'Impossible de charger les KmAdministrateurs.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );


  /* ============================================================
   * INITIALISATION
   * ============================================================ */

  useEffect(() => {
    load();

    const unsubscribe =
      navigation.addListener(
        'focus',
        () => {
          load({
            silent: true,
          });
        }
      );

    return unsubscribe;
  }, [
    navigation,
    load,
  ]);


  /* ============================================================
   * REFRESH
   * ============================================================ */

  const refresh =
    useCallback(
      async () => {
        setRefreshing(
          true
        );

        await load({
          silent: true,
        });
      },
      [load]
    );


  /* ============================================================
   * SUPPRESSION
   * ============================================================ */

  const handleDelete =
    useCallback(
      (administrator) => {
        if (
          !administrator?.id
        ) {
          return;
        }

        Alert.alert(
          'Supprimer le KmAdministrateur',
          `Voulez-vous vraiment supprimer ${
            administrator.full_name ||
            'ce compte'
          } ?\n\nCette action est définitive. Les actions, rapports et traces historiques seront conservés, mais leurs références vers ce KmAdministrateur seront détachées.`,
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress:
                async () => {
                  try {
                    await deleteKmAdministrator(
                      administrator.id
                    );

                    setItems(
                      (current) =>
                        current.filter(
                          (item) =>
                            item.id !==
                            administrator.id
                        )
                    );
                  } catch (e) {
                    Alert.alert(
                      'Suppression impossible',
                      e?.message ||
                        'Impossible de supprimer ce KmAdministrateur.'
                    );
                  }
                },
            },
          ]
        );
      },
      []
    );


  /* ============================================================
   * LOADING INITIAL
   * ============================================================ */

  if (
    loading &&
    items.length ===
      0
  ) {
    return (
      <Screen title="KmAdministrateur">
        <Loading
          label="Chargement des KmAdministrateurs…"
        />
      </Screen>
    );
  }


  /* ============================================================
   * UI
   * ============================================================ */

  return (
    <Screen
      title="KmAdministrateur"
      right={
        <Pressable
          onPress={() =>
            navigation.navigate(
              'AdminCreateKmAdministrator'
            )
          }
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un KmAdministrateur"
        >
          <Ionicons
            name="add-circle-outline"
            size={25}
            color={
              colors.brand.primary
            }
          />
        </Pressable>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scroll
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              refresh
            }
            tintColor={
              colors.brand.primary
            }
          />
        }
      >
        <Card
          style={
            localStyles.hero
          }
        >
          <View
            style={
              localStyles.heroIcon
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={23}
              color={
                colors.brand.primary
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
                typography.h3
              }
            >
              Gestion KmerDiaspora
            </Text>

            <Text
              style={[
                typography.caption,
                styles.muted,
                localStyles.heroText,
              ]}
            >
              Gérez les comptes
              KmAdministrateur
              existants.
            </Text>
          </View>
        </Card>

        <SectionTitle
          title="Comptes"
          subtitle={`
            ${items.length}
            compte${
              items.length >
              1
                ? 's'
                : ''
            }
          `}
          icon="people-outline"
          actionLabel="Actualiser"
          onAction={
            refresh
          }
        />

        {items.length ===
        0 ? (
          <>
            <EmptyState
              icon="shield-outline"
              title="Aucun KmAdministrateur trouvé"
              subtitle={
                error ||
                'La table kmerdiaspora_admins ne retourne actuellement aucun compte.'
              }
            />

            <Button
              title="Créer un KmAdministrateur"
              icon={
                <Ionicons
                  name="add-circle-outline"
                  size={19}
                  color={
                    colors.text
                      .inverse
                  }
                />
              }
              onPress={() =>
                navigation.navigate(
                  'AdminCreateKmAdministrator'
                )
              }
              style={{
                marginTop:
                  spacing.md,
              }}
            />
          </>
        ) : (
          items.map(
            (item) => (
              <AdministratorCard
                key={item.id}
                item={item}
                onEdit={
                  (administrator) =>
                    navigation.navigate(
                      'AdminEditKmAdministrator',
                      {
                        administrator,
                      }
                    )
                }
                onDelete={
                  handleDelete
                }
              />
            )
          )
        )}

        {error &&
        items.length >
          0 ? (
          <Card
            style={
              localStyles.errorCard
            }
          >
            <Ionicons
              name="warning-outline"
              size={18}
              color={
                colors.warning
                  .default
              }
            />

            <Text
              style={[
                typography.caption,
                {
                  color:
                    colors
                      .warning
                      .text,
                  marginLeft:
                    spacing.sm,
                  flex: 1,
                },
              ]}
            >
              {error}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const localStyles = {
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.brand.primaryLight,
  },

  actions: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap:
      spacing.xs,
  },

  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.brand.primaryLight,
  },

  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.error.light,
  },

  infoRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    marginTop:
      spacing.xs,
  },

  whatsapp: {
    marginLeft:
      spacing.xs,
    color:
      colors.text.secondary,
  },

  notes: {
    marginTop:
      spacing.sm,
    lineHeight: 18,
  },

  hero: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap:
      spacing.md,
    marginBottom:
      spacing.md,
  },

  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.brand.primaryLight,
  },

  heroText: {
    marginTop:
      spacing.xs,
    lineHeight: 18,
  },

  contactCard: {
    marginBottom:
      spacing.lg,
  },

  contactHeader: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap:
      spacing.md,
  },

  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent:
      'center',
    backgroundColor:
      colors.success.light,
  },

  diagnosticCard: {
    marginTop:
      spacing.sm,
  },

  diagnosticHeader: {
    flexDirection:
      'row',
    alignItems:
      'center',
  },

  errorCard: {
    flexDirection:
      'row',
    alignItems:
      'center',
    marginTop:
      spacing.md,
    backgroundColor:
      colors.warning.light,
  },
};