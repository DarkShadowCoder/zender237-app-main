import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import {
  colors,
  fontSizes,
  lineHeights,
  radii,
  shadows,
  spacing,
  typography,
} from '../../theme/theme';

import {
  listWhatsappGroupRequests,
  reviewWhatsappGroupRequest,
} from '../../services/whatsappGroupService';

const STATUS_FILTERS = [
  {
    value: 'all',
    label: 'Toutes',
  },
  {
    value: 'pending',
    label: 'En attente',
  },
  {
    value: 'approved',
    label: 'Acceptées',
  },
  {
    value: 'rejected',
    label: 'Refusées',
  },
];

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(name) {
  const parts = String(name || 'U')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return (
    parts
      .map(
        (part) =>
          part[0]?.toUpperCase() || ''
      )
      .join('') || 'U'
  );
}

function getStatusConfig(status) {
  switch (status) {
    case 'approved':
      return {
        label: 'Acceptée',
        color: colors.success.default,
        background: colors.success.light,
        icon: 'checkmark-circle-outline',
      };

    case 'rejected':
      return {
        label: 'Refusée',
        color: colors.error.default,
        background: colors.error.light,
        icon: 'close-circle-outline',
      };

    default:
      return {
        label: 'En attente',
        color: colors.warning.default,
        background: colors.warning.light,
        icon: 'time-outline',
      };
  }
}

function StatusBadge({ status }) {
  const config = getStatusConfig(status);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: config.background,
        },
      ]}
    >
      <Ionicons
        name={config.icon}
        size={14}
        color={config.color}
      />

      <Text
        style={[
          styles.statusBadgeText,
          {
            color: config.color,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

function RequestCard({
  item,
  busy,
  onApprove,
  onReject,
}) {
  const status = getStatusConfig(item.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(item.full_name)}
            </Text>
          </View>

          <View style={styles.identityContent}>
            <Text
              style={styles.fullName}
              numberOfLines={1}
            >
              {item.full_name}
            </Text>

            <Text
              style={styles.phone}
              numberOfLines={1}
            >
              {item.whatsapp_number}
            </Text>
          </View>
        </View>

        <StatusBadge status={item.status} />
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.text.tertiary}
          />

          <Text style={styles.infoText}>
            {formatDate(item.requested_at)}
          </Text>
        </View>

        {item.reviewed_at ? (
          <View style={styles.infoItem}>
            <Ionicons
              name="checkmark-done-outline"
              size={16}
              color={colors.text.tertiary}
            />

            <Text style={styles.infoText}>
              {formatDate(item.reviewed_at)}
            </Text>
          </View>
        ) : null}
      </View>

      {item.admin_note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>
            Note admin
          </Text>

          <Text style={styles.noteText}>
            {item.admin_note}
          </Text>
        </View>
      ) : null}

      {item.status === 'pending' ? (
        <View style={styles.actionsRow}>
          <Pressable
            disabled={busy}
            onPress={() => onReject(item)}
            style={({ pressed }) => [
              styles.decisionButton,
              styles.rejectButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Refuser la demande de ${item.full_name}`}
            accessibilityState={{
              disabled: busy,
            }}
          >
            <Ionicons
              name="close-outline"
              size={18}
              color={colors.error.default}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />

            <Text
              style={[
                styles.decisionText,
                {
                  color: colors.error.default,
                },
              ]}
            >
              Refuser
            </Text>
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={() => onApprove(item)}
            style={({ pressed }) => [
              styles.decisionButton,
              styles.approveButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Accepter la demande de ${item.full_name}`}
            accessibilityState={{
              disabled: busy,
            }}
          >
            {busy ? (
              <ActivityIndicator
                size="small"
                color={colors.text.inverse}
              />
            ) : (
              <Ionicons
                name="checkmark-outline"
                size={18}
                color={colors.text.inverse}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            )}

            <Text
              style={[
                styles.decisionText,
                {
                  color: colors.text.inverse,
                },
              ]}
            >
              Accepter
            </Text>
          </Pressable>
        </View>
      ) : null}

      {item.status !== 'pending' ? (
        <View
          style={[
            styles.resolutionLine,
            {
              borderTopColor: status.color,
            },
          ]}
        >
          <Ionicons
            name={status.icon}
            size={15}
            color={status.color}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />

          <Text
            style={[
              styles.resolutionText,
              {
                color: status.color,
              },
            ]}
          >
            Demande déjà traitée
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const RequestListHeader = React.memo(
  function RequestListHeader({
    counts,
    searchInput,
    onSearchInputChange,
    onClearSearch,
    onSearch,
    onSearchSubmit,
    status,
    onStatusChange,
  }) {
    return (
      <View>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="logo-whatsapp"
              size={26}
              color={colors.brand.primary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Groupe WhatsApp
            </Text>

            <Text style={styles.subtitle}>
              Gérez les demandes d’intégration.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {counts.pending}
            </Text>

            <Text style={styles.statLabel}>
              En attente
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {counts.approved}
            </Text>

            <Text style={styles.statLabel}>
              Acceptées
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {counts.rejected}
            </Text>

            <Text style={styles.statLabel}>
              Refusées
            </Text>
          </View>
        </View>

        {/* =========================
            BARRE DE RECHERCHE
           ========================= */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.text.tertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />

            <TextInput
              value={searchInput}
              onChangeText={onSearchInputChange}
              onSubmitEditing={onSearchSubmit}
              placeholder="Rechercher par nom ou numéro"
              placeholderTextColor={colors.text.tertiary}
              style={[
                typography.caption,
                styles.searchInput,
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              blurOnSubmit={false}
              accessibilityRole="search"
              accessibilityLabel="Rechercher une demande"
              accessibilityHint="Saisissez un nom ou un numéro WhatsApp"
            />

            {searchInput ? (
              <Pressable
                onPress={onClearSearch}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.text.tertiary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={onSearch}
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.searchButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Rechercher"
            accessibilityHint="Lance la recherche avec le texte saisi"
          >
            <Ionicons
              name="search"
              size={20}
              color={colors.text.inverse}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        </View>

        {/* =========================
            FILTRES
           ========================= */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          directionalLockEnabled
        >
          {STATUS_FILTERS.map((item) => {
            const active =
              status === item.value;

            const count =
              item.value === 'all'
                ? null
                : counts[item.value];

            return (
              <Pressable
                key={item.value}
                onPress={() =>
                  onStatusChange(item.value)
                }
                style={[
                  styles.filterChip,
                  active &&
                    styles.filterChipActive,
                ]}
                accessibilityRole="tab"
                accessibilityLabel={
                  count === null
                    ? item.label
                    : `${item.label}, ${count} demande${
                        count > 1 ? 's' : ''
                      }`
                }
                accessibilityState={{
                  selected: active,
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>

                {count !== null ? (
                  <Text
                    style={[
                      styles.filterCount,
                      active &&
                        styles.filterCountActive,
                    ]}
                  >
                    {count}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);

export default function WhatsappGroupRequestsScreen() {
  const [items, setItems] = useState([]);

  /*
   * Texte actuellement saisi.
   * Cette valeur ne déclenche aucun appel réseau.
   */
  const [searchInput, setSearchInput] =
    useState('');

  /*
   * Recherche actuellement exécutée.
   */
  const [search, setSearch] = useState('');

  /*
   * Onglet actif.
   */
  const [status, setStatus] =
    useState('pending');

  /*
   * Refs utilisées pour maintenir loadRequests stable.
   *
   * Ainsi :
   * - taper dans la recherche ne recrée pas loadRequests ;
   * - changer d'onglet ne recrée pas loadRequests ;
   * - le useEffect initial ne se relance pas.
   */
  const searchRef = useRef('');
  const statusRef = useRef('pending');

  /*
   * Permet d'ignorer les anciennes réponses réseau
   * lorsqu'une requête plus récente est déjà en cours.
   */
  const requestSequenceRef =
    useRef(0);

  /*
   * Loader uniquement pour le premier chargement.
   */
  const [loading, setLoading] =
    useState(true);

  /*
   * Loader du Pull-to-refresh.
   */
  const [refreshing, setRefreshing] =
    useState(false);

  /*
   * Identifiant de la demande actuellement traitée.
   */
  const [busyId, setBusyId] =
    useState(null);

  /*
   * Fonction de chargement stable.
   */
  const loadRequests = useCallback(
    async ({
      refreshing: isRefreshing = false,
      initialLoad = false,
      searchOverride,
      statusOverride,
    } = {}) => {
      const effectiveSearch =
        searchOverride !== undefined
          ? searchOverride
          : searchRef.current;

      const effectiveStatus =
        statusOverride !== undefined
          ? statusOverride
          : statusRef.current;

      /*
       * Chaque requête reçoit un numéro séquentiel.
       * Seule la dernière requête autorisée
       * pourra mettre à jour l'interface.
       */
      const requestSequence =
        ++requestSequenceRef.current;

      if (isRefreshing) {
        setRefreshing(true);
      }

      /*
       * IMPORTANT :
       * ce loader ne doit être actif que lors
       * du premier chargement de l'écran.
       */
      if (initialLoad) {
        setLoading(true);
      }

      try {
        const data =
          await listWhatsappGroupRequests({
            search: effectiveSearch,
            status: effectiveStatus,
          });

        /*
         * Une autre requête plus récente est déjà
         * active : on ignore cette réponse.
         */
        if (
          requestSequence !==
          requestSequenceRef.current
        ) {
          return;
        }

        setItems(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        /*
         * Une erreur provenant d'une ancienne
         * requête ne doit pas remplacer l'état
         * courant de l'écran.
         */
        if (
          requestSequence !==
          requestSequenceRef.current
        ) {
          return;
        }

        console.error(
          '[WhatsappGroupRequests] load error:',
          error
        );

        Toast.show({
          type: 'error',
          text1: 'Erreur de chargement',
          text2:
            error?.message ||
            'Impossible de charger les demandes.',
        });
      } finally {
        /*
         * Ne modifie les loaders que si cette
         * requête est encore la requête active.
         */
        if (
          requestSequence ===
          requestSequenceRef.current
        ) {
          if (isRefreshing) {
            setRefreshing(false);
          }

          if (initialLoad) {
            setLoading(false);
          }
        }
      }
    },
    []
  );

  /*
   * Chargement initial UNE SEULE FOIS.
   *
   * Comme loadRequests est stable, cet effet
   * ne se relance plus lorsque status/search changent.
   */
  useEffect(() => {
    loadRequests({
      initialLoad: true,
    });
  }, [loadRequests]);

  /*
   * Lance explicitement la recherche.
   *
   * Aucun appel réseau pendant la frappe.
   */
  const handleSearch = useCallback(() => {
    const normalizedSearch =
      searchInput.trim();

    searchRef.current =
      normalizedSearch;

    setSearch(normalizedSearch);

    loadRequests({
      searchOverride:
        normalizedSearch,
      statusOverride:
        statusRef.current,
    });
  }, [
    loadRequests,
    searchInput,
  ]);

  /*
   * Recherche avec la touche Entrée.
   */
  const handleSearchSubmit =
    useCallback(() => {
      handleSearch();
    }, [handleSearch]);

  /*
   * Efface la recherche.
   */
  const handleClearSearch =
    useCallback(() => {
      searchRef.current = '';

      setSearchInput('');
      setSearch('');

      loadRequests({
        searchOverride: '',
        statusOverride:
          statusRef.current,
      });
    }, [loadRequests]);

  /*
   * Changement de filtre.
   *
   * IMPORTANT :
   * aucun setLoading(true) ici.
   *
   * Les anciennes données restent visibles
   * jusqu'à l'arrivée des nouvelles.
   */
  const handleStatusChange =
    useCallback(
      (nextStatus) => {
        if (
          nextStatus ===
          statusRef.current
        ) {
          return;
        }

        statusRef.current =
          nextStatus;

        setStatus(nextStatus);

        loadRequests({
          searchOverride:
            searchRef.current,
          statusOverride:
            nextStatus,
        });
      },
      [loadRequests]
    );

  /*
   * Comptage des demandes.
   */
  const counts = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc[item.status] =
            (acc[item.status] || 0) + 1;

          return acc;
        },
        {
          pending: 0,
          approved: 0,
          rejected: 0,
        }
      ),
    [items]
  );

  /*
   * Accepter / refuser une demande.
   */
  const handleDecision =
    useCallback(
      async (
        item,
        nextStatus
      ) => {
        if (busyId) {
          return;
        }

        setBusyId(item.id);

        try {
          await reviewWhatsappGroupRequest(
            {
              requestId: item.id,
              status: nextStatus,
            }
          );

          Toast.show({
            type: 'success',
            text1:
              nextStatus ===
              'approved'
                ? 'Demande acceptée'
                : 'Demande refusée',
            text2:
              item.full_name,
          });

          /*
           * Mise à jour locale.
           * Aucun rechargement global de la page.
           */
          if (
            nextStatus ===
              'approved' ||
            nextStatus ===
              'rejected'
          ) {
            setItems(
              (current) =>
                current.map(
                  (entry) =>
                    entry.id ===
                    item.id
                      ? {
                          ...entry,
                          status:
                            nextStatus,
                          reviewed_at:
                            new Date().toISOString(),
                        }
                      : entry
                )
            );
          }
        } catch (error) {
          console.error(
            '[WhatsappGroupRequests] decision error:',
            error
          );

          Toast.show({
            type: 'error',
            text1: 'Action impossible',
            text2:
              error?.message ||
              'La demande n’a pas pu être mise à jour.',
          });
        } finally {
          setBusyId(null);
        }
      },
      [busyId]
    );

  /*
   * Header séparé et stable.
   *
   * Le TextInput n'est plus contenu dans une
   * fonction renderHeader recréée à chaque render.
   *
   * Cela évite les remontages inutiles du champ
   * et permet au clavier de rester affiché
   * pendant la saisie.
   */
  const listHeader = (
    <RequestListHeader
      counts={counts}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onClearSearch={handleClearSearch}
      onSearch={handleSearch}
      onSearchSubmit={
        handleSearchSubmit
      }
      status={status}
      onStatusChange={
        handleStatusChange
      }
    />
  );

  /*
   * Loader uniquement pendant le premier
   * chargement de l'écran.
   *
   * Les recherches et les changements
   * d'onglets ne provoquent plus ce loader.
   */
  if (loading) {
    return (
      <View
        style={styles.loadingScreen}
      >
        <ActivityIndicator
          size="large"
          color={
            colors.brand.primary
          }
        />

        <Text
          style={styles.loadingText}
        >
          Chargement des demandes…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            busy={
              busyId === item.id
            }
            onApprove={(entry) =>
              handleDecision(
                entry,
                'approved'
              )
            }
            onReject={(entry) =>
              handleDecision(
                entry,
                'rejected'
              )
            }
          />
        )}
        ListHeaderComponent={
          listHeader
        }
        ListEmptyComponent={
          <View
            style={styles.emptyState}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="logo-whatsapp"
                size={30}
                color={
                  colors.text.tertiary
                }
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              Aucune demande
            </Text>

            <Text
              style={styles.emptyText}
            >
              {search
                ? `Aucune demande ne correspond à « ${search} ».`
                : 'Aucune demande ne correspond aux filtres sélectionnés.'}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadRequests({
                refreshing: true,
              })
            }
          />
        }
        contentContainerStyle={[
          styles.content,
          items.length === 0 &&
            styles.contentWithEmpty,
        ]}
        /*
         * Très important pour l'accessibilité
         * et l'utilisation du champ de recherche :
         * les interactions avec la FlatList
         * ne ferment pas automatiquement
         * le clavier.
         */
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        /*
         * Évite que les éléments du header/list
         * soient retirés trop agressivement de l'arbre
         * natif pendant les interactions.
         */
        removeClippedSubviews={false}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background.default,
    },

    content: {
      paddingHorizontal:
        spacing.screenHorizontal,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },

    contentWithEmpty: {
      flexGrow: 1,
    },

    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.background.default,
    },

    loadingText: {
      marginTop: spacing.md,
      color: colors.text.secondary,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },

    headerIcon: {
      width: 52,
      height: 52,
      borderRadius: radii.lg,
      backgroundColor:
        colors.brand.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },

    headerText: {
      flex: 1,
    },

    title: {
      ...typography.h2,
      color: colors.text.primary,
    },

    subtitle: {
      ...typography.caption,
      color: colors.text.secondary,
      lineHeight: lineHeights.md * 0.9,

    },

    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },

    statCard: {
      flex: 1,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor:
        colors.background.surface,
      borderWidth: 1,
      borderColor:
        colors.border.default,
    },

    statValue: {
      ...typography.h2,
      color: colors.brand.primary,
    },

    statLabel: {
      ...typography.caption,
      color: colors.text.secondary,
      marginTop: 2,
    },

    /*
     * Ligne contenant la barre de recherche
     * et le bouton.
     */
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },

    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      backgroundColor:
        colors.background.surface,
      borderWidth: 1,
      borderColor:
        colors.background.surfaceAlt,
      ...shadows.card,
    },

    searchInput: {
      flex: 1,
      marginLeft: spacing.sm,
      color: colors.text.primary,
      fontSize: fontSizes.md,
    },

    searchButton: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.brand.primary,
      ...shadows.card,
    },

    searchButtonPressed: {
      opacity: 0.8,
      transform: [
        {
          scale: 0.96,
        },
      ],
    },

    filtersContent: {
      gap: spacing.xs,
      paddingVertical: spacing.md,
    },

    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      minHeight: 38,
      borderRadius: radii.pill,
      backgroundColor:
        colors.background.surface,
      borderWidth: 1,
      borderColor:
        colors.background.surfaceAlt,
    },

    filterChipActive: {
      backgroundColor:
        colors.brand.primary,
      borderColor:
        colors.brand.primary,
    },

    filterText: {
      ...typography.caption,
      color: colors.text.secondary,
    },

    filterTextActive: {
      color: colors.text.inverse,
      fontWeight: '700',
    },

    filterCount: {
      marginLeft: spacing.xs,
      color: colors.text.tertiary,
      fontSize: fontSizes.xs,
      fontWeight: '700',
    },

    filterCountActive: {
      color: colors.text.inverse,
    },

    card: {
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor:
        colors.background.surface,
      borderWidth: 1,
      borderColor:
        colors.background.surfaceAlt,
      ...shadows.card,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
    },

    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      paddingRight: spacing.sm,
    },

    avatar: {
      width: 46,
      height: 46,
      borderRadius: radii.circle,
      backgroundColor:
        colors.brand.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },

    avatarText: {
      color:
        colors.brand.primaryDark,
      fontWeight: '800',
      fontSize: fontSizes.sm,
    },

    identityContent: {
      flex: 1,
    },

    fullName: {
      ...typography.h3,
      color: colors.text.primary,
    },

    phone: {
      ...typography.caption,
      color: colors.text.secondary,
      marginTop: 2,
    },

    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.pill,
      paddingHorizontal:
        spacing.sm,
      minHeight: 30,
    },

    statusBadgeText: {
      fontSize: fontSizes.xs,
      fontWeight: '700',
      marginLeft: 3,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },

    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    infoText: {
      ...typography.caption,
      color: colors.text.tertiary,
      marginLeft: spacing.xs,
    },

    noteBox: {
      marginTop: spacing.xs,
      padding: spacing.sm,
      borderRadius: radii.md,
      backgroundColor:
        colors.background.surfaceAlt,
    },

    noteLabel: {
      ...typography.caption,
      color: colors.text.tertiary,
      fontWeight: '700',
    },

    noteText: {
      ...typography.caption,
      color: colors.text.secondary,
      marginTop: 2,
    },

    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },

    decisionButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: radii.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },

    rejectButton: {
      backgroundColor:
        colors.error.light,
    },

    approveButton: {
      backgroundColor:
        colors.success.default,
    },

    decisionText: {
      fontWeight: '800',
      fontSize: fontSizes.sm,
    },

    resolutionLine: {
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },

    resolutionText: {
      fontSize: fontSizes.xs,
      fontWeight: '700',
    },

    pressed: {
      opacity: 0.84,
    },

    disabled: {
      opacity: 0.55,
    },

    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal:
        spacing.xl,
      paddingVertical:
        spacing.xxl * 2,
    },

    emptyIcon: {
      width: 68,
      height: 68,
      borderRadius: radii.circle,
      backgroundColor:
        colors.background.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },

    emptyTitle: {
      ...typography.h3,
      color: colors.text.primary,
      textAlign: 'center',
    },

    emptyText: {
      ...typography.caption,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: spacing.xs,
      lineHeight: lineHeights.md,
    },
  });