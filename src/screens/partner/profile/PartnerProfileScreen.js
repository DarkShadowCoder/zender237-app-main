import React, { useMemo, useState } from 'react';

import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import {
  colors,
  fontSizes,
  fontWeights,
  radii,
  shadows,
  spacing,
} from '../../../theme/theme';

import { useAuth } from '../../../context/AuthContext';
import { useAuthorization } from '../../../context/AuthorizationContext';

/* ============================================================
 * HELPERS
 * ============================================================ */

function getInitials(name) {
  const value = String(name || '').trim();

  if (!value) {
    return 'P';
  }

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeRole(role) {
  if (!role) {
    return '';
  }

  if (typeof role === 'string') {
    return role.trim().toLowerCase();
  }

  return String(
    role.code ??
      role.role_code ??
      role.name ??
      role.label ??
      ''
  )
    .trim()
    .toLowerCase();
}

function getRoleLabel(role) {
  switch (normalizeRole(role)) {
    case 'partner':
      return 'Partenaire';

    case 'admin':
      return 'Administrateur';

    case 'kmerdiaspora':
      return 'KmerDiaspora';

    case 'kmerdiaspora_admin':
      return 'Administrateur KmerDiaspora';

    default:
      return 'Partenaire';
  }
}

function getRoleIcon(role) {
  switch (normalizeRole(role)) {
    case 'admin':
      return 'shield-checkmark';

    case 'kmerdiaspora':
      return 'people';

    case 'kmerdiaspora_admin':
      return 'shield';

    case 'partner':
    default:
      return 'briefcase';
  }
}

function formatPhone(phone) {
  if (!phone) {
    return 'Non renseigné';
  }

  const value = String(phone).trim();

  return value || 'Non renseigné';
}

function getAuthorizationValue(authorization, methodName) {
  if (
    !authorization ||
    typeof authorization[methodName] !== 'function'
  ) {
    return false;
  }

  try {
    return Boolean(authorization[methodName]());
  } catch (error) {
    console.warn(
      `[PartnerProfileScreen] Impossible de vérifier ${methodName}:`,
      error
    );

    return false;
  }
}

/* ============================================================
 * SMALL COMPONENTS
 * ============================================================ */

function SectionHeader({ icon, title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={colors.brand.primary}
        />
      </View>

      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        {!!subtitle && (
          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

function InformationRow({
  icon,
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !last && styles.infoRowBorder,
      ]}
    >
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={colors.icon.default}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text
          style={styles.infoValue}
          numberOfLines={2}
        >
          {value || 'Non renseigné'}
        </Text>
      </View>
    </View>
  );
}

function AccessItem({
  icon,
  title,
  description,
  enabled,
  accent = 'primary',
}) {
  const iconColor = enabled
    ? accent === 'success'
      ? colors.success.default
      : colors.brand.primary
    : colors.icon.muted;

  const backgroundColor = enabled
    ? accent === 'success'
      ? colors.success.light
      : colors.brand.primaryLight
    : colors.background.surfaceAlt;

  return (
    <View style={styles.accessItem}>
      <View
        style={[
          styles.accessIcon,
          { backgroundColor },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={iconColor}
        />
      </View>

      <View style={styles.accessContent}>
        <Text style={styles.accessTitle}>
          {title}
        </Text>

        <Text style={styles.accessDescription}>
          {description}
        </Text>
      </View>

      <View
        style={[
          styles.accessBadge,
          enabled
            ? styles.accessBadgeEnabled
            : styles.accessBadgeDisabled,
        ]}
      >
        <Text
          style={[
            styles.accessBadgeText,
            enabled
              ? styles.accessBadgeTextEnabled
              : styles.accessBadgeTextDisabled,
          ]}
        >
          {enabled ? 'Actif' : 'Inactif'}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
 * SCREEN
 * ============================================================ */

export default function PartnerProfileScreen() {
  const { partner, logout } = useAuth();

  const authorization = useAuthorization();

  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(true);

  const [
    confirmationAlertsEnabled,
    setConfirmationAlertsEnabled,
  ] = useState(true);

  /*
   * Dans l'espace partenaire, le rôle métier reste
   * "partner". Les permissions réelles sont déterminées
   * par AuthorizationContext.
   */
  const primaryRole = 'partner';

  const initials = useMemo(
    () => getInitials(partner?.full_name),
    [partner?.full_name]
  );

  const roleLabel = getRoleLabel(primaryRole);
  const roleIcon = getRoleIcon(primaryRole);

  const isActive = partner?.active !== false;

  const canViewTransactions = getAuthorizationValue(
    authorization,
    'canViewTransactions'
  );

  const canConfirmTransaction = getAuthorizationValue(
    authorization,
    'canConfirmTransaction'
  );

  const canViewSettlements = getAuthorizationValue(
    authorization,
    'canViewSettlements'
  );

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter de votre espace partenaire ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              if (typeof logout !== 'function') {
                throw new Error(
                  'La fonction de déconnexion est indisponible.'
                );
              }

              await logout();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2:
                  error?.message ||
                  'Impossible de se déconnecter.',
              });
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ======================================================
       * HERO
       * ====================================================== */}

      <View style={styles.hero}>
        <View style={styles.heroGlowTop} />
        <View style={styles.heroGlowBottom} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroAvatarWrapper}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {initials}
              </Text>
            </View>

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isActive
                    ? colors.success.default
                    : colors.error.default,
                },
              ]}
            />
          </View>

          <View style={styles.heroIdentity}>
            <Text style={styles.heroGreeting}>
              Espace partenaire
            </Text>

            <Text
              style={styles.heroName}
              numberOfLines={2}
            >
              {partner?.full_name || 'Partenaire'}
            </Text>

            <View style={styles.heroRoleBadge}>
              <Ionicons
                name={roleIcon}
                size={14}
                color={colors.brand.primary}
              />

              <Text style={styles.heroRoleText}>
                {roleLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.heroFooter}>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusBadgeDot,
                {
                  backgroundColor: isActive
                    ? colors.success.default
                    : colors.error.default,
                },
              ]}
            />

            <Text style={styles.statusBadgeText}>
              {isActive
                ? 'Compte actif'
                : 'Compte désactivé'}
            </Text>
          </View>

          <Text style={styles.heroFooterHint}>
            Gestion sécurisée du compte
          </Text>
        </View>
      </View>

      {/* ======================================================
       * INFORMATIONS
       * ====================================================== */}

      <View style={styles.sectionCard}>
        <SectionHeader
          icon="person-outline"
          title="Informations du compte"
          subtitle="Les informations essentielles de votre profil"
        />

        <View style={styles.sectionDivider} />

        <InformationRow
          icon="person-outline"
          label="Nom complet"
          value={partner?.full_name}
        />

        <InformationRow
          icon="call-outline"
          label="Téléphone"
          value={formatPhone(partner?.phone_number)}
        />

        <InformationRow
          icon="logo-whatsapp"
          label="WhatsApp"
          value={formatPhone(partner?.whatsapp_number)}
          last
        />
      </View>

      {/* ======================================================
       * ROLE & ACCESS
       * ====================================================== */}

      <View style={styles.sectionCard}>
        <SectionHeader
          icon="shield-checkmark-outline"
          title="Rôle et accès"
          subtitle="Votre niveau d'accès dans Zender237"
        />

        <View style={styles.roleSummary}>
          <View style={styles.roleSummaryIcon}>
            <Ionicons
              name={roleIcon}
              size={23}
              color={colors.brand.primary}
            />
          </View>

          <View style={styles.roleSummaryContent}>
            <Text style={styles.roleSummaryTitle}>
              {roleLabel}
            </Text>

            <Text style={styles.roleSummaryDescription}>
              Opérations partenaires et suivi des
              transactions qui vous sont affectées.
            </Text>
          </View>
        </View>

        <View style={styles.accessList}>
          <AccessItem
            icon="swap-horizontal-outline"
            title="Transactions"
            description="Consultation et traitement des opérations affectées."
            enabled={canViewTransactions}
          />

          <AccessItem
            icon="checkmark-circle-outline"
            title="Confirmation"
            description="Confirmation des transactions prises en charge."
            enabled={canConfirmTransaction}
            accent="success"
          />

          <AccessItem
            icon="business-outline"
            title="Règlements"
            description="Accès réservé aux comptes autorisés à gérer les règlements."
            enabled={canViewSettlements}
          />
        </View>
      </View>

      {/* ======================================================
       * PREFERENCES
       * ====================================================== */}

      <View style={styles.sectionCard}>
        <SectionHeader
          icon="notifications-outline"
          title="Préférences"
          subtitle="Contrôlez les alertes de votre espace partenaire"
        />

        <View style={styles.preferenceRow}>
          <View style={styles.preferenceIcon}>
            <Ionicons
              name="notifications-outline"
              size={19}
              color={colors.brand.primary}
            />
          </View>

          <View style={styles.preferenceContent}>
            <Text style={styles.preferenceTitle}>
              Notifications
            </Text>

            <Text style={styles.preferenceDescription}>
              Recevoir les alertes importantes de
              l'espace partenaire.
            </Text>
          </View>

          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{
              false: colors.border.default,
              true: colors.brand.primary,
            }}
            thumbColor={colors.background.surface}
          />
        </View>

        <View style={styles.preferenceSeparator} />

        <View style={styles.preferenceRow}>
          <View style={styles.preferenceIcon}>
            <Ionicons
              name="checkmark-done-outline"
              size={19}
              color={colors.success.default}
            />
          </View>

          <View style={styles.preferenceContent}>
            <Text style={styles.preferenceTitle}>
              Alertes de confirmation
            </Text>

            <Text style={styles.preferenceDescription}>
              Être averti lorsqu'une opération nécessite
              votre intervention.
            </Text>
          </View>

          <Switch
            value={confirmationAlertsEnabled}
            onValueChange={setConfirmationAlertsEnabled}
            trackColor={{
              false: colors.border.default,
              true: colors.success.default,
            }}
            thumbColor={colors.background.surface}
          />
        </View>
      </View>

      {/* ======================================================
       * SECURITY
       * ====================================================== */}

      <View style={styles.securityCard}>
        <View style={styles.securityIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={21}
            color={colors.success.default}
          />
        </View>

        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>
            Compte sécurisé
          </Text>

          <Text style={styles.securityText}>
            Les informations sensibles et les actions
            financières restent protégées par les
            autorisations de votre compte.
          </Text>
        </View>
      </View>

      {/* ======================================================
       * LOGOUT
       * ====================================================== */}

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.logoutButtonPressed,
        ]}
      >
        <View style={styles.logoutIcon}>
          <Ionicons
            name="log-out-outline"
            size={20}
            color={colors.error.default}
          />
        </View>

        <Text style={styles.logoutText}>
          Se déconnecter
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.error.default}
        />
      </Pressable>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

/* ============================================================
 * STYLES
 * ============================================================ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },

  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge + spacing.xl,
  },

  /* ========================================================
   * HERO
   * ====================================================== */

  hero: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.brand.navy,
    ...shadows.card,
  },

  heroGlowTop: {
    position: 'absolute',
    width: 170,
    height: 170,
    top: -90,
    right: -60,
    borderRadius: 170,
    backgroundColor: 'rgba(31, 99, 242, 0.22)',
  },

  heroGlowBottom: {
    position: 'absolute',
    width: 140,
    height: 140,
    bottom: -90,
    left: -50,
    borderRadius: 140,
    backgroundColor: 'rgba(254, 184, 13, 0.10)',
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },

  heroAvatarWrapper: {
    position: 'relative',
  },

  heroAvatar: {
    width: 82,
    height: 82,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  heroAvatarText: {
    color: colors.text.inverse,
    fontFamily: 'Baloo2_800ExtraBold',
    fontWeight: fontWeights.extraBold,
    fontSize: 29,
    letterSpacing: 0.5,
  },

  statusDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    right: -2,
    bottom: -2,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: colors.brand.navy,
  },

  heroIdentity: {
    flex: 1,
  },

  heroGreeting: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    marginBottom: 2,
  },

  heroName: {
    color: colors.text.inverse,
    fontFamily: 'Baloo2_700Bold',
    fontWeight: fontWeights.bold,
    fontSize: 25,
    lineHeight: 31,
    maxWidth: '100%',
  },

  heroRoleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(234, 241, 254, 0.96)',
  },

  heroRoleText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: fontWeights.extraBold,
  },

  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    gap: spacing.md,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },

  statusBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusBadgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: fontWeights.bold,
  },

  heroFooterHint: {
    flex: 1,
    textAlign: 'right',
    color: 'rgba(255,255,255,0.58)',
    fontSize: 11,
    lineHeight: 15,
  },

  /* ========================================================
   * CARDS
   * ====================================================== */

  sectionCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.background.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
    ...shadows.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primaryLight,
  },

  sectionHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    color: colors.text.primary,
    fontFamily: 'Baloo2_700Bold',
    fontWeight: fontWeights.bold,
    fontSize: 17,
    lineHeight: 21,
  },

  sectionSubtitle: {
    color: colors.text.tertiary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.md,
  },

  /* ========================================================
   * INFORMATION
   * ====================================================== */

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surfaceAlt,
    marginRight: spacing.md,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: fontWeights.medium,
    marginBottom: 3,
  },

  infoValue: {
    color: colors.text.primary,
    fontFamily: 'Baloo2_600SemiBold',
    fontWeight: fontWeights.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },

  /* ========================================================
   * ROLE
   * ====================================================== */

  roleSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background.surfaceAlt,
  },

  roleSummaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primaryLight,
    marginRight: spacing.md,
  },

  roleSummaryContent: {
    flex: 1,
  },

  roleSummaryTitle: {
    color: colors.text.primary,
    fontFamily: 'Baloo2_700Bold',
    fontWeight: fontWeights.bold,
    fontSize: 15,
  },

  roleSummaryDescription: {
    color: colors.text.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  accessList: {
    marginTop: spacing.md,
  },

  accessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  accessIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  accessContent: {
    flex: 1,
    paddingRight: spacing.sm,
  },

  accessTitle: {
    color: colors.text.primary,
    fontFamily: 'Baloo2_600SemiBold',
    fontWeight: fontWeights.semiBold,
    fontSize: 13,
  },

  accessDescription: {
    color: colors.text.tertiary,
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 2,
  },

  accessBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },

  accessBadgeEnabled: {
    backgroundColor: colors.success.light,
  },

  accessBadgeDisabled: {
    backgroundColor: colors.background.surfaceAlt,
  },

  accessBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.extraBold,
  },

  accessBadgeTextEnabled: {
    color: colors.success.text,
  },

  accessBadgeTextDisabled: {
    color: colors.text.tertiary,
  },

  /* ========================================================
   * PREFERENCES
   * ====================================================== */

  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },

  preferenceIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surfaceAlt,
  },

  preferenceContent: {
    flex: 1,
    marginRight: spacing.sm,
  },

  preferenceTitle: {
    color: colors.text.primary,
    fontFamily: 'Baloo2_600SemiBold',
    fontWeight: fontWeights.semiBold,
    fontSize: 13,
  },

  preferenceDescription: {
    color: colors.text.tertiary,
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 2,
  },

  preferenceSeparator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: spacing.lg,
  },

  /* ========================================================
   * SECURITY
   * ====================================================== */

  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.success.light,
    borderWidth: 1,
    borderColor: colors.success.border,
  },

  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    color: colors.success.text,
    fontFamily: 'Baloo2_700Bold',
    fontWeight: fontWeights.bold,
    fontSize: 14,
  },

  securityText: {
    color: colors.success.text,
    opacity: 0.82,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  /* ========================================================
   * VERSION
   * ====================================================== */

  versionBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  versionLogo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
  },

  versionLogoText: {
    color: colors.text.inverse,
    fontFamily: 'Baloo2_800ExtraBold',
    fontSize: 17,
  },

  versionBrand: {
    color: colors.text.primary,
    fontFamily: 'Baloo2_700Bold',
    fontWeight: fontWeights.bold,
    fontSize: 12,
  },

  versionText: {
    color: colors.text.tertiary,
    fontSize: 10,
    marginTop: 1,
  },

  /* ========================================================
   * LOGOUT
   * ====================================================== */

  logoutButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.error.light,
    borderWidth: 1,
    borderColor: colors.error.border,
  },

  logoutButtonPressed: {
    opacity: 0.78,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  logoutIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
  },

  logoutText: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.error.text,
    fontFamily: 'Baloo2_700Bold',
    fontWeight: fontWeights.bold,
    fontSize: 14,
  },

  bottomSpace: {
    height: spacing.lg,
  },
});