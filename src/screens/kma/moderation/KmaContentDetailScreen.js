
import React, {
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import Header from '../../../../src/components/Header';
import Card from '../../../../src/components/Card';

import {
  colors,
  fontSizes,
  lineHeights,
  radii,
  shadows,
  spacing,
  typography,
  components,
} from '../../../../src/theme/theme';

import {
  moderateContent,
} from '../../../../src/services/kmerDiasporaService';

import {
  KmaStatus,
} from '../../../components/kma/KmaUI';


/* ============================================================
 * BACKGROUND
 * ============================================================ */

const KMA_BACKGROUND =
  require('../../../../assets/images/KmBackground.png');


/* ============================================================
 * HELPERS
 * ============================================================ */

function normalizeType(contentType) {
  if (
    contentType === 'job_request' ||
    contentType === 'job' ||
    contentType === 'post'
  ) {
    return 'job_request';
  }

  if (
    contentType === 'driver_request' ||
    contentType === 'driver'
  ) {
    return 'driver_request';
  }

  return 'quest';
}


function formatAmount(value) {
  const numericValue =
    Number(value) || 0;

  return `${numericValue.toLocaleString(
    'fr-FR'
  )} XAF`;
}


function formatNumber(value) {
  const numericValue =
    Number(value) || 0;

  return numericValue.toLocaleString(
    'fr-FR'
  );
}


function formatDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toLocaleDateString(
    'fr-FR',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );
}


function getInitials(name) {
  const value =
    String(name || '')
      .trim();

  if (!value) {
    return 'K';
  }

  const parts =
    value
      .split(/\s+/)
      .filter(Boolean);

  return (
    parts
      .slice(0, 2)
      .map(
        (part) =>
          part[0]?.toUpperCase() ||
          ''
      )
      .join('') || 'K'
  );
}


function getTypeConfig(type) {
  switch (normalizeType(type)) {
    case 'job_request':
      return {
        eyebrow:
          'DEMANDE DE POSTE',

        title:
          'Demande de poste',

        icon:
          'briefcase-outline',

        iconColor:
          colors.brand.primary,

        iconBackground:
          colors.brand.primaryLight,

        subtitle:
          'Profil professionnel et recherche de poste',

        actionLabel:
          'Gérer cette demande',
      };

    case 'driver_request':
      return {
        eyebrow:
          'BESOIN DE CONDUCTEUR',

        title:
          'Demande de conducteur',

        icon:
          'people-outline',

        iconColor:
          colors.success.default,

        iconBackground:
          colors.success.light,

        subtitle:
          'Besoin opérationnel et localisation',

        actionLabel:
          'Gérer cette demande',
      };

    default:
      return {
        eyebrow:
          'QUÊTE COMMUNAUTAIRE',

        title:
          'Quête',

        icon:
          'heart-outline',

        iconColor:
          colors.brand.secondaryDark,

        iconBackground:
          '#FFF4D8',

        subtitle:
          'Collecte et soutien communautaire',

        actionLabel:
          'Gérer cette quête',
      };
  }
}


function getStatusLabel(status) {
  switch (status) {
    case 'published':
      return 'Publié';

    case 'open':
      return 'Ouvert';

    case 'active':
      return 'Actif';

    case 'accepted':
      return 'Accepté';

    case 'matched':
      return 'Correspondance trouvée';

    case 'partially_matched':
      return 'Partiellement correspondant';

    case 'pending':
      return 'En attente';

    case 'pending_validation':
      return 'En validation';

    case 'processing':
      return 'En traitement';

    case 'suspended':
      return 'Suspendu';

    case 'rejected':
      return 'Rejeté';

    case 'cancelled':
      return 'Annulé';

    case 'closed':
      return 'Clôturé';

    case 'completed':
      return 'Terminé';

    default:
      return 'En cours';
  }
}


function getQuestProgress(
  current,
  target
) {
  const currentAmount =
    Number(current) || 0;

  const targetAmount =
    Number(target) || 0;

  if (
    targetAmount <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (currentAmount /
          targetAmount) *
          100
      )
    )
  );
}


function getCities(item) {
  const cities =
    item?.cities;

  if (Array.isArray(cities)) {
    return cities
      .map(
        (entry) =>
          typeof entry === 'string'
            ? entry
            : entry?.city ||
              entry?.name
      )
      .filter(Boolean);
  }

  if (
    typeof cities ===
    'string'
  ) {
    return cities
      .split(',')
      .map(
        (city) =>
          city.trim()
      )
      .filter(Boolean);
  }

  return [];
}


/* ============================================================
 * SECTION HEADER
 * ============================================================ */

function SectionHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <View
        style={
          styles.sectionIcon
        }
      >
        <Ionicons
          name={icon}
          size={18}
          color={
            colors.brand.primary
          }
        />
      </View>

      <View
        style={
          styles.sectionText
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={
              styles.sectionSubtitle
            }
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}


/* ============================================================
 * INFO ITEM
 * ============================================================ */

function InfoItem({
  icon,
  label,
  value,
  multiline = false,
}) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return null;
  }

  return (
    <View
      style={
        styles.infoItem
      }
    >
      <View
        style={
          styles.infoIcon
        }
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            colors.brand.primary
          }
        />
      </View>

      <View
        style={
          styles.infoContent
        }
      >
        <Text
          style={
            styles.infoLabel
          }
        >
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            multiline &&
              styles.infoValueMultiline,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


/* ============================================================
 * HERO
 * ============================================================ */

function ContentHero({
  typeConfig,
  title,
  subtitle,
  status,
}) {
  return (
    <LinearGradient
      colors={[
        colors.brand.primary,
        colors.brand.primaryDark,
      ]}
      start={{
        x: 0,
        y: 0,
      }}
      end={{
        x: 1,
        y: 1,
      }}
      style={
        styles.heroCard
      }
    >
      <View
        style={
          styles.heroTop
        }
      >
        <View
          style={[
            styles.heroIcon,
            {
              backgroundColor:
                'rgba(255,255,255,0.16)',
            },
          ]}
        >
          <Ionicons
            name={
              typeConfig.icon
            }
            size={24}
            color={
              colors.text.inverse
            }
          />
        </View>

        <KmaStatus
          status={
            status
          }
        />
      </View>

      <Text
        style={
          styles.heroEyebrow
        }
      >
        {
          typeConfig.eyebrow
        }
      </Text>

      <Text
        style={
          styles.heroTitle
        }
        numberOfLines={3}
      >
        {title}
      </Text>

      <Text
        style={
          styles.heroSubtitle
        }
        numberOfLines={3}
      >
        {subtitle}
      </Text>
    </LinearGradient>
  );
}


/* ============================================================
 * SCREEN
 * ============================================================ */

export default function KmaContentDetailScreen({
  navigation,
  route,
}) {
  const {
    contentType,
    contentId,
    content,
    request,
  } =
    route.params || {};

  const item =
    content ||
    request ||
    {};

  const type =
    normalizeType(
      contentType
    );

  const typeConfig =
    getTypeConfig(
      type
    );

  const [
    loading,
    setLoading,
  ] = useState(false);


  /* ==========================================================
   * DERIVED CONTENT
   * ========================================================== */

  const viewModel =
    useMemo(() => {
      const candidateProfile =
        item?.profile ||
        {};

      const candidateName =
        item?.full_name ||
        item?.name ||
        candidateProfile?.full_name ||
        candidateProfile?.username ||
        null;

      const title =
        type === 'job_request'
          ? item?.title ||
            item?.position ||
            'Poste recherché'
          : type === 'driver_request'
            ? `${formatNumber(
                item?.drivers_needed || 0
              )} conducteur${
                Number(
                  item?.drivers_needed
                ) > 1
                  ? 's'
                  : ''
              }`
            : item?.title ||
              'Quête communautaire';


      const cities =
        getCities(item);

      const location =
        [
          item?.city,
          item?.region,
          item?.country,
        ]
          .filter(Boolean)
          .join(' · ');


      const mobility =
        item?.mobility_area ||
        candidateProfile?.mobility_area ||
        null;


      const description =
        item?.description ||
        item?.details ||
        null;


      const targetAmount =
        Number(
          item?.target_amount ||
            item?.target ||
            0
        );


      const currentAmount =
        Number(
          item?.current_amount ||
            item?.raised_amount ||
            item?.collected_amount ||
            0
        );


      const progress =
        type === 'quest'
          ? getQuestProgress(
              currentAmount,
              targetAmount
            )
          : 0;


      const beneficiaryName =
        item?.beneficiary_name ||
        item?.beneficiary_full_name ||
        item?.beneficiary?.full_name ||
        null;


      return {
        candidateName,
        title,
        cities,
        location,
        mobility,
        description,
        targetAmount,
        currentAmount,
        progress,
        beneficiaryName,
        createdAt:
          formatDate(
            item?.created_at
          ),
        startDate:
          formatDate(
            item?.start_date
          ),
        endDate:
          formatDate(
            item?.end_date
          ),
      };
    }, [
      item,
      type,
    ]);


  /* ==========================================================
   * MODERATION
   * ========================================================== */

  const runModeration =
    (
      action
    ) => {
      const labels = {
        approve:
          'Approuver / restaurer',

        suspend:
          'Suspendre',

        reject:
          'Rejeter / retirer',
      };

      const newStatus =
        action === 'approve'
          ? 'published'
          : action === 'suspend'
            ? 'suspended'
            : action === 'reject'
              ? 'rejected'
              : item.status;


      Alert.alert(
        labels[action],
        `Confirmer l’action « ${
          labels[action]
        .toLowerCase()} » ?`,
        [
          {
            text:
              'Annuler',

            style:
              'cancel',
          },

          {
            text:
              'Confirmer',

            style:
              action ===
              'reject'
                ? 'destructive'
                : 'default',

            onPress:
              async () => {
                setLoading(
                  true
                );

                try {
                  await moderateContent({
                    contentType,
                    contentId,
                    action,

                    reason:
                      `Décision KMA : ${labels[action]}`,

                    oldStatus:
                      item.status,

                    newStatus,
                  });

                  Alert.alert(
                    'Décision enregistrée',
                    'La décision de modération a bien été enregistrée.',
                    [
                      {
                        text:
                          'OK',

                        onPress:
                          () =>
                            navigation.goBack(),
                      },
                    ]
                  );
                } catch (error) {
                  Alert.alert(
                    'Erreur',
                    error?.message ||
                      'Impossible d’enregistrer la décision.'
                  );
                } finally {
                  setLoading(
                    false
                  );
                }
              },
          },
        ]
      );
    };


  /* ==========================================================
   * RENDER
   * ========================================================== */

  return (
    <ImageBackground
      source={
        KMA_BACKGROUND
      }
      style={
        styles.screen
      }
      imageStyle={
        styles.backgroundImage
      }
    >
      <LinearGradient
        colors={[
          'rgba(0,18,87,0.14)',
          'rgba(255,255,255,0.84)',
          'rgba(255,255,255,0.96)',
        ]}
        locations={[
          0,
          0.34,
          1,
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 0,
          y: 1,
        }}
        pointerEvents="none"
        style={
          StyleSheet.absoluteFill
        }
      />

      <Header
        title={
          typeConfig.title
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* ====================================================
         * HERO
         * ==================================================== */}

        <ContentHero
          typeConfig={
            typeConfig
          }
          title={
            viewModel.title
          }
          subtitle={
            type ===
            'job_request'
              ? viewModel.candidateName ||
                typeConfig.subtitle
              : typeConfig.subtitle
          }
          status={
            item.status
          }
        />


        {/* ====================================================
         * JOB REQUEST
         * ==================================================== */}

        {type ===
        'job_request' ? (
          <>
            <SectionHeader
              icon="briefcase-outline"
              title="Profil recherché"
              subtitle="Informations principales de la demande"
            />

            <Card
              style={
                styles.sectionCard
              }
            >
              <InfoItem
                icon="person-outline"
                label="Candidat"
                value={
                  viewModel.candidateName
                }
              />

              <View
                style={
                  styles.divider
                }
              />

              <InfoItem
                icon="briefcase-outline"
                label="Poste recherché"
                value={
                  viewModel.title
                }
              />

              <View
                style={
                  styles.divider
                }
              />

              <InfoItem
                icon="location-outline"
                label="Localisation"
                value={
                  viewModel.location
                }
              />

              <View
                style={
                  styles.divider
                }
              />

              <InfoItem
                icon="navigate-outline"
                label="Mobilité"
                value={
                  viewModel.mobility
                }
              />
            </Card>

            {viewModel.description ? (
              <>
                <SectionHeader
                  icon="document-text-outline"
                  title="Présentation"
                  subtitle="Description fournie par le candidat"
                />

                <Card
                  style={
                    styles.descriptionCard
                  }
                >
                  <Text
                    style={
                      styles.description
                    }
                  >
                    {
                      viewModel.description
                    }
                  </Text>
                </Card>
              </>
            ) : null}
          </>
        ) : null}


        {/* ====================================================
         * DRIVER REQUEST
         * ==================================================== */}

        {type ===
        'driver_request' ? (
          <>
            <SectionHeader
              icon="people-outline"
              title="Besoin opérationnel"
              subtitle="Informations principales de la demande"
            />

            <Card
              style={
                styles.sectionCard
              }
            >
              <InfoItem
                icon="people-outline"
                label="Conducteurs recherchés"
                value={`${formatNumber(
                  item?.drivers_needed ||
                    0
                )} conducteur${
                  Number(
                    item?.drivers_needed
                  ) > 1
                    ? 's'
                    : ''
                }`}
              />

              <View
                style={
                  styles.divider
                }
              />

              <InfoItem
                icon="location-outline"
                label="Villes"
                value={
                  viewModel.cities
                    .length > 0
                    ? viewModel.cities.join(
                        ' · '
                      )
                    : viewModel.location
                }
              />

              <View
                style={
                  styles.divider
                }
              />

              <InfoItem
                icon="map-outline"
                label="Quartier / zone"
                value={
                  item?.neighborhood
                }
              />

              <View
                style={
                  styles.divider
                }
              />

              <InfoItem
                icon="globe-outline"
                label="Pays"
                value={
                  item?.country
                }
              />

              {item?.mobility_area ? (
                <>
                  <View
                    style={
                      styles.divider
                    }
                  />

                  <InfoItem
                    icon="navigate-outline"
                    label="Zone de mobilité"
                    value={
                      item.mobility_area
                    }
                  />
                </>
              ) : null}
            </Card>

            {viewModel.description ? (
              <>
                <SectionHeader
                  icon="document-text-outline"
                  title="Description du besoin"
                  subtitle="Informations communiquées au KMA"
                />

                <Card
                  style={
                    styles.descriptionCard
                  }
                >
                  <Text
                    style={
                      styles.description
                    }
                  >
                    {
                      viewModel.description
                    }
                  </Text>
                </Card>
              </>
            ) : null}
          </>
        ) : null}


        {/* ====================================================
         * QUEST
         * ==================================================== */}

        {type ===
        'quest' ? (
          <>
            <SectionHeader
              icon="heart-outline"
              title="Objectif de la quête"
              subtitle="Suivi de la collecte communautaire"
            />

            <Card
              style={
                styles.questCard
              }
            >
              <View
                style={
                  styles.questAmountRow
                }
              >
                <View
                  style={
                    styles.questAmountBlock
                  }
                >
                  <Text
                    style={
                      styles.questAmountLabel
                    }
                  >
                    Collecté
                  </Text>

                  <Text
                    style={
                      styles.questAmountValue
                    }
                  >
                    {formatAmount(
                      viewModel.currentAmount
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.questAmountBlock
                  }
                >
                  <Text
                    style={
                      styles.questAmountLabel
                    }
                  >
                    Objectif
                  </Text>

                  <Text
                    style={
                      styles.questTargetValue
                    }
                  >
                    {formatAmount(
                      viewModel.targetAmount
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.progressTrack
                }
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        `${viewModel.progress}%`,
                    },
                  ]}
                />
              </View>

              <View
                style={
                  styles.progressFooter
                }
              >
                <Text
                  style={
                    styles.progressText
                  }
                >
                  {
                    viewModel.progress
                  } % atteint
                </Text>

                <Ionicons
                  name="trending-up-outline"
                  size={15}
                  color={
                    colors.brand.primary
                  }
                />
              </View>
            </Card>

            <Card
              style={
                styles.sectionCard
              }
            >
              <InfoItem
                icon="person-outline"
                label="Bénéficiaire"
                value={
                  viewModel.beneficiaryName
                }
              />

              {viewModel.startDate ? (
                <>
                  <View
                    style={
                      styles.divider
                    }
                  />

                  <InfoItem
                    icon="calendar-outline"
                    label="Début"
                    value={
                      viewModel.startDate
                    }
                  />
                </>
              ) : null}

              {viewModel.endDate ? (
                <>
                  <View
                    style={
                      styles.divider
                    }
                  />

                  <InfoItem
                    icon="calendar-outline"
                    label="Fin"
                    value={
                      viewModel.endDate
                    }
                  />
                </>
              ) : null}

              <View
                style={
                  styles.divider
                }
              />

              <InfoItem
                icon="globe-outline"
                label="Pays"
                value={
                  item?.country
                }
              />
            </Card>

            {viewModel.description ? (
              <>
                <SectionHeader
                  icon="document-text-outline"
                  title="Présentation"
                  subtitle="Description de la collecte"
                />

                <Card
                  style={
                    styles.descriptionCard
                  }
                >
                  <Text
                    style={
                      styles.description
                    }
                  >
                    {
                      viewModel.description
                    }
                  </Text>
                </Card>
              </>
            ) : null}
          </>
        ) : null}


        {/* ====================================================
         * META
         * ==================================================== */}

        {viewModel.createdAt ? (
          <View
            style={
              styles.metaRow
            }
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={
                colors.text.tertiary
              }
            />

            <Text
              style={
                styles.metaText
              }
            >
              Publié le {
                viewModel.createdAt
              }
            </Text>
          </View>
        ) : null}


        {/* ====================================================
         * MODERATION
         * ==================================================== */}

        <SectionHeader
          icon="shield-checkmark-outline"
          title="Modération"
          subtitle="Décision à appliquer à ce contenu"
        />

        <Card
          style={
            styles.moderationCard
          }
        >
          <View
            style={
              styles.moderationNotice
            }
          >
            <View
              style={
                styles.moderationNoticeIcon
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <Text
              style={
                styles.moderationNoticeText
              }
            >
              Les actions ci-dessous sont enregistrées
              dans l’historique de modération KMA.
            </Text>
          </View>

          <Pressable
            disabled={
              loading
            }
            onPress={() =>
              runModeration(
                'approve'
              )
            }
            style={({ pressed }) => [
              styles.moderationAction,
              styles.approveAction,
              pressed &&
                !loading &&
                styles.actionPressed,
            ]}
          >
            <View
              style={[
                styles.actionIcon,
                styles.approveIcon,
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color={
                  colors.success.default
                }
              />
            </View>

            <View
              style={
                styles.actionContent
              }
            >
              <Text
                style={
                  styles.actionTitle
                }
              >
                Approuver / restaurer
              </Text>

              <Text
                style={
                  styles.actionSubtitle
                }
              >
                Rendre le contenu à nouveau visible
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.text.tertiary
              }
            />
          </Pressable>

          <View
            style={
              styles.divider
            }
          />

          <Pressable
            disabled={
              loading
            }
            onPress={() =>
              runModeration(
                'suspend'
              )
            }
            style={({ pressed }) => [
              styles.moderationAction,
              pressed &&
                !loading &&
                styles.actionPressed,
            ]}
          >
            <View
              style={[
                styles.actionIcon,
                styles.suspendIcon,
              ]}
            >
              <Ionicons
                name="pause-circle-outline"
                size={21}
                color={
                  colors.warning.default
                }
              />
            </View>

            <View
              style={
                styles.actionContent
              }
            >
              <Text
                style={
                  styles.actionTitle
                }
              >
                Suspendre
              </Text>

              <Text
                style={
                  styles.actionSubtitle
                }
              >
                Retirer temporairement le contenu
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.text.tertiary
              }
            />
          </Pressable>

          <View
            style={
              styles.divider
            }
          />

          <Pressable
            disabled={
              loading
            }
            onPress={() =>
              runModeration(
                'reject'
              )
            }
            style={({ pressed }) => [
              styles.moderationAction,
              pressed &&
                !loading &&
                styles.actionPressed,
            ]}
          >
            <View
              style={[
                styles.actionIcon,
                styles.rejectIcon,
              ]}
            >
              <Ionicons
                name="close-circle-outline"
                size={21}
                color={
                  colors.error.default
                }
              />
            </View>

            <View
              style={
                styles.actionContent
              }
            >
              <Text
                style={
                  styles.actionTitle
                }
              >
                Rejeter / retirer
              </Text>

              <Text
                style={
                  styles.actionSubtitle
                }
              >
                Retirer définitivement le contenu publié
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.text.tertiary
              }
            />
          </Pressable>
        </Card>

        <View
          style={
            styles.footer
          }
        >
          <View
            style={
              styles.footerDot
            }
          />

          <Text
            style={
              styles.footerText
            }
          >
            Contenu supervisé par KmerDiaspora
          </Text>
        </View>

      </ScrollView>
    </ImageBackground>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
     * ROOT
     * ======================================================== */

    screen: {
      flex: 1,
    },

    backgroundImage: {
      resizeMode:
        'cover',
    },

    content: {
      paddingHorizontal:
        spacing.screenHorizontal,

      paddingTop:
        spacing.md,

      paddingBottom:
        spacing.huge + 40,
    },


    /* ========================================================
     * HERO
     * ======================================================== */

    heroCard: {
      padding:
        spacing.lg,

      borderRadius:
        radii.xl,

      overflow:
        'hidden',

      ...shadows.button,
    },

    heroTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    heroIcon: {
      width: 48,

      height: 48,

      borderRadius:
        radii.md,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    heroEyebrow: {
      marginTop:
        spacing.xl,

      color:
        'rgba(255,255,255,0.68)',

      fontFamily:
        typography.overline.fontFamily,

      fontWeight:
        typography.overline.fontWeight,

      fontSize:
        10,

      letterSpacing:
        1,
    },

    heroTitle: {
      marginTop:
        spacing.xs,

      color:
        colors.text.inverse,

      fontFamily:
        typography.h1.fontFamily,

      fontWeight:
        typography.h1.fontWeight,

      fontSize:
        fontSizes.xl,

      lineHeight:
        lineHeights.xl,
    },

    heroSubtitle: {
      marginTop:
        spacing.xs,

      color:
        'rgba(255,255,255,0.78)',

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },


    /* ========================================================
     * SECTION HEADER
     * ======================================================== */

    sectionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.lg,

      marginBottom:
        spacing.sm,
    },

    sectionIcon: {
      width: 38,

      height: 38,

      borderRadius:
        radii.sm,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },

    sectionText: {
      flex: 1,

      minWidth: 0,
    },

    sectionTitle: {
      color:
        colors.text.primary,

      fontFamily:
        typography.h3.fontFamily,

      fontWeight:
        typography.h3.fontWeight,

      fontSize:
        fontSizes.md,
    },

    sectionSubtitle: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
     * CARDS
     * ======================================================== */

    sectionCard: {
      padding:
        spacing.sm,

      borderRadius:
        radii.xl,

      backgroundColor:
        'rgba(255,255,255,0.95)',
    },

    descriptionCard: {
      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        'rgba(255,255,255,0.95)',
    },

    infoItem: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      padding:
        spacing.sm,
    },

    infoIcon: {
      width: 38,

      height: 38,

      borderRadius:
        radii.sm,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },

    infoContent: {
      flex: 1,

      minWidth: 0,
    },

    infoLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        10,

      fontWeight:
        '600',

      letterSpacing:
        0.5,

      textTransform:
        'uppercase',
    },

    infoValue: {
      marginTop:
        3,

      color:
        colors.text.primary,

      fontFamily:
        typography.body.fontFamily,

      fontWeight:
        typography.body.fontWeight,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },

    infoValueMultiline: {
      lineHeight:
        21,
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,

      backgroundColor:
        colors.border.light,

      marginHorizontal:
        spacing.sm,
    },

    description: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        22,
    },


    /* ========================================================
     * QUEST
     * ======================================================== */

    questCard: {
      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        'rgba(255,255,255,0.95)',
    },

    questAmountRow: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      gap:
        spacing.md,
    },

    questAmountBlock: {
      flex: 1,
    },

    questAmountLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        '600',

      textTransform:
        'uppercase',
    },

    questAmountValue: {
      marginTop:
        4,

      color:
        colors.brand.primaryDark,

      fontFamily:
        typography.h2.fontFamily,

      fontWeight:
        typography.h2.fontWeight,

      fontSize:
        fontSizes.lg,
    },

    questTargetValue: {
      marginTop:
        4,

      color:
        colors.text.primary,

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.md,
    },

    progressTrack: {
      height: 8,

      marginTop:
        spacing.lg,

      borderRadius:
        radii.pill,

      overflow:
        'hidden',

      backgroundColor:
        colors.background.surfaceAlt,
    },

    progressFill: {
      height:
        '100%',

      borderRadius:
        radii.pill,

      backgroundColor:
        colors.brand.primary,
    },

    progressFooter: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'flex-end',

      marginTop:
        spacing.xs,

      gap:
        spacing.xxs,
    },

    progressText: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        '600',
    },


    /* ========================================================
     * META
     * ======================================================== */

    metaRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginTop:
        spacing.md,

      gap:
        spacing.xxs,
    },

    metaText: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    /* ========================================================
     * MODERATION
     * ======================================================== */

    moderationCard: {
      padding:
        spacing.sm,

      borderRadius:
        radii.xl,

      backgroundColor:
        'rgba(255,255,255,0.97)',

      ...shadows.card,
    },

    moderationNotice: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      padding:
        spacing.sm,

      marginBottom:
        spacing.xs,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.brand.primaryLight,
    },

    moderationNoticeIcon: {
      marginRight:
        spacing.xs,
    },

    moderationNoticeText: {
      flex: 1,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,
    },

    moderationAction: {
      flexDirection:
        'row',

      alignItems:
        'center',

      minHeight:
        68,

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        spacing.sm,

      borderRadius:
        radii.md,
    },

    actionPressed: {
      backgroundColor:
        colors.overlay.pressed,
    },

    actionIcon: {
      width: 40,

      height: 40,

      borderRadius:
        radii.sm,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing.sm,
    },

    approveIcon: {
      backgroundColor:
        colors.success.light,
    },

    suspendIcon: {
      backgroundColor:
        colors.warning.light,
    },

    rejectIcon: {
      backgroundColor:
        colors.error.light,
    },

    approveAction: {
      marginTop:
        spacing.xs,
    },

    actionContent: {
      flex: 1,

      minWidth: 0,

      paddingRight:
        spacing.xs,
    },

    actionTitle: {
      color:
        colors.text.primary,

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.sm,
    },

    actionSubtitle: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
     * FOOTER
     * ======================================================== */

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

      marginRight:
        spacing.xs,

      backgroundColor:
        colors.success.default,
    },

    footerText: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },
  });
