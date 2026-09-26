
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  ImageBackground,
  Linking,
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
import Button from '../../../../src/components/Button';
import Card from '../../../../src/components/Card';

import {
  colors,
  fontSizes,
  lineHeights,
  radii,
  shadows,
  spacing,
  typography,
} from '../../../../src/theme/theme';

import {
  getMatch,
  markMatchContactInitiated,
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

function getScoreColor(score) {
  if (score >= 80) {
    return colors.success.default;
  }

  if (score >= 60) {
    return colors.warning.default;
  }

  return colors.brand.primary;
}


function getScoreLabel(score) {
  if (score >= 80) {
    return 'Excellente correspondance';
  }

  if (score >= 60) {
    return 'Bonne correspondance';
  }

  if (score >= 40) {
    return 'Correspondance moyenne';
  }

  return 'Faible correspondance';
}


function getStatusLabel(status) {
  switch (status) {
    case 'contact_initiated':
      return 'Contact initié';

    case 'recruitment_requested':
      return 'Prise en charge';

    case 'accepted':
      return 'Acceptée';

    case 'matched':
      return 'Correspondance trouvée';

    case 'partially_matched':
      return 'Partiellement correspondante';

    case 'pending':
      return 'En attente';

    case 'pending_validation':
      return 'En validation';

    case 'processing':
      return 'En traitement';

    case 'rejected':
      return 'Rejetée';

    case 'cancelled':
      return 'Annulée';

    case 'suspended':
      return 'Suspendue';

    default:
      return 'En cours';
  }
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
          part[0]?.toUpperCase() || ''
      )
      .join('') || 'K'
  );
}


function getCities(value) {
  if (Array.isArray(value)) {
    return value
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
    typeof value === 'string'
  ) {
    return value
      .split(',')
      .map(
        (entry) =>
          entry.trim()
      )
      .filter(Boolean);
  }

  return [];
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
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={colors.brand.primary}
        />
      </View>

      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>
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
 * SECTION HEADER
 * ============================================================ */

function SectionHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
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

        {subtitle ? (
          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}


/* ============================================================
 * SCORE CARD
 * ============================================================ */

function ScoreCard({
  score,
  candidateName,
  candidateTitle,
  status,
  contactInitiated,
}) {
  const safeScore =
    Math.min(
      100,
      Math.max(
        0,
        Number(score) || 0
      )
    );

  const scoreColor =
    getScoreColor(
      safeScore
    );

  const scoreLabel =
    getScoreLabel(
      safeScore
    );

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
        styles.scoreCard
      }
    >
      <View
        style={
          styles.scoreHeader
        }
      >
        <View
          style={
            styles.scoreHeaderText
          }
        >
          <Text
            style={
              styles.scoreEyebrow
            }
          >
            CORRESPONDANCE
          </Text>

          <Text
            style={
              styles.scoreTitle
            }
            numberOfLines={2}
          >
            {candidateName}
          </Text>

          <Text
            style={
              styles.scoreSubtitle
            }
            numberOfLines={2}
          >
            {candidateTitle}
          </Text>
        </View>

        <View
          style={
            styles.statusContainer
          }
        >
          <KmaStatus
            status={
              contactInitiated
                ? 'contact_initiated'
                : status
            }
          />
        </View>
      </View>

      <View
        style={
          styles.scoreMain
        }
      >
        <View
          style={
            styles.scoreRingOuter
          }
        >
          <View
            style={[
              styles.scoreRingInner,
              {
                borderColor:
                  'rgba(255,255,255,0.22)',
              },
            ]}
          >
            <Text
              style={
                styles.scoreValue
              }
            >
              {safeScore}
            </Text>

            <Text
              style={
                styles.scorePercent
              }
            >
              %
            </Text>
          </View>
        </View>

        <View
          style={
            styles.scoreSummary
          }
        >
          <Text
            style={
              styles.scoreSummaryLabel
            }
          >
            Niveau de compatibilité
          </Text>

          <Text
            style={
              styles.scoreSummaryTitle
            }
          >
            {scoreLabel}
          </Text>

          <View
            style={
              styles.scoreProgressTrack
            }
          >
            <View
              style={[
                styles.scoreProgressFill,
                {
                  width:
                    `${safeScore}%`,
                  backgroundColor:
                    scoreColor,
                },
              ]}
            />
          </View>

          <Text
            style={
              styles.scoreSummaryText
            }
          >
            Score calculé à partir des critères
            de correspondance disponibles.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}


/* ============================================================
 * PARTICIPANT
 * ============================================================ */

function ParticipantCard({
  icon,
  iconBackground,
  iconColor,
  role,
  name,
  subtitle,
}) {
  return (
    <View
      style={
        styles.participantCard
      }
    >
      <View
        style={[
          styles.participantIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={iconColor}
        />
      </View>

      <View
        style={
          styles.participantBody
        }
      >
        <Text
          style={
            styles.participantRole
          }
        >
          {role}
        </Text>

        <Text
          style={
            styles.participantName
          }
          numberOfLines={2}
        >
          {name}
        </Text>

        {subtitle ? (
          <Text
            style={
              styles.participantSubtitle
            }
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}


/* ============================================================
 * SCREEN
 * ============================================================ */

export default function KmaMatchDetailScreen({
  navigation,
  route,
}) {
  const [
    match,
    setMatch,
  ] = useState(
    route.params?.match ||
      null
  );

  const [
    loading,
    setLoading,
  ] = useState(
    !route.params?.match
  );

  const [
    busy,
    setBusy,
  ] = useState(false);


  const matchId =
    route.params?.matchId;


  /* ==========================================================
   * LOAD
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        if (!matchId) {
          return;
        }

        const result =
          await getMatch(
            matchId
          );

        setMatch(
          result
        );
      },
      [
        matchId,
      ]
    );


  useEffect(() => {
    let mounted = true;

    load()
      .catch((error) => {
        if (!mounted) {
          return;
        }

        console.error(
          '[KmaMatchDetail]',
          error
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    load,
  ]);


  /* ==========================================================
   * CONTACT
   * ========================================================== */

  const markContact =
    useCallback(
      async () => {
        if (!match?.id) {
          return;
        }

        setBusy(
          true
        );

        try {
          await markMatchContactInitiated(
            match.id
          );

          /*
           * Recharge le matching pour récupérer
           * whatsapp_initiated_at depuis Supabase.
           */
          await load();

          Alert.alert(
            'Contact enregistré',
            'La prise en charge de cette correspondance a bien été enregistrée.'
          );
        } catch (error) {
          console.error(
            '[KmaMatchDetail] markContact:',
            error
          );

          Alert.alert(
            'Erreur',
            error?.message ||
              'Impossible d’enregistrer la prise en charge.'
          );
        } finally {
          setBusy(
            false
          );
        }
      },
      [
        match,
        load,
      ]
    );


  /* ==========================================================
   * WHATSAPP
   * ========================================================== */

  const openWhatsApp =
    useCallback(
      async (
        phone,
        label
      ) => {
        const normalized =
          String(
            phone || ''
          ).replace(
            /\D/g,
            ''
          );

        if (!normalized) {
          Alert.alert(
            'Numéro indisponible',
            `Le numéro WhatsApp de ${label} n’est pas disponible.`
          );

          return;
        }

        const url =
          `https://wa.me/${normalized}`;

        try {
          const supported =
            await Linking.canOpenURL(
              url
            );

          if (!supported) {
            throw new Error(
              'WhatsApp est indisponible sur cet appareil.'
            );
          }

          await Linking.openURL(
            url
          );

          /*
           * Le timestamp whatsapp_initiated_at
           * est désormais la source de vérité.
           */
          if (
            !match?.whatsapp_initiated_at
          ) {
            await markContact();
          }
        } catch (error) {
          console.error(
            '[KmaMatchDetail] WhatsApp:',
            error
          );

          Alert.alert(
            'WhatsApp',
            error?.message ||
              'Impossible d’ouvrir WhatsApp.'
          );
        }
      },
      [
        match,
        markContact,
      ]
    );


  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loading) {
    return (
      <ImageBackground
        source={
          KMA_BACKGROUND
        }
        style={
          styles.stateScreen
        }
        imageStyle={
          styles.backgroundImage
        }
      >
        <LinearGradient
          colors={[
            'rgba(0,18,87,0.18)',
            'rgba(255,255,255,0.90)',
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 0,
            y: 1,
          }}
          style={
            StyleSheet.absoluteFill
          }
        />

        <View
          style={
            styles.stateCard
          }
        >
          <View
            style={
              styles.stateIcon
            }
          >
            <ActivityIndicator
              size="large"
              color={
                colors.brand.primary
              }
            />
          </View>

          <Text
            style={
              styles.stateTitle
            }
          >
            Chargement de la correspondance
          </Text>

          <Text
            style={
              styles.stateText
            }
          >
            Récupération des informations du matching…
          </Text>
        </View>
      </ImageBackground>
    );
  }


  /* ==========================================================
   * NOT FOUND
   * ========================================================== */

  if (!match) {
    return (
      <ImageBackground
        source={
          KMA_BACKGROUND
        }
        style={
          styles.stateScreen
        }
        imageStyle={
          styles.backgroundImage
        }
      >
        <LinearGradient
          colors={[
            'rgba(0,18,87,0.18)',
            'rgba(255,255,255,0.90)',
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 0,
            y: 1,
          }}
          style={
            StyleSheet.absoluteFill
          }
        />

        <View
          style={
            styles.stateCard
          }
        >
          <View
            style={[
              styles.stateIcon,
              styles.stateIconError,
            ]}
          >
            <Ionicons
              name="search-outline"
              size={30}
              color={
                colors.error.default
              }
            />
          </View>

          <Text
            style={
              styles.stateTitle
            }
          >
            Correspondance introuvable
          </Text>

          <Text
            style={
              styles.stateText
            }
          >
            Cette correspondance n’est plus disponible
            ou n’a pas pu être chargée.
          </Text>

          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            style={
              styles.backButton
            }
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={
                colors.text.inverse
              }
            />

            <Text
              style={
                styles.backButtonText
              }
            >
              Retour
            </Text>
          </Pressable>
        </View>
      </ImageBackground>
    );
  }


  /* ==========================================================
   * DATA
   * ========================================================== */

  const score =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(
          Number(
            match.score ??
              match.match_score ??
              0
          ) || 0
        )
      )
    );


  const candidate =
    match.job_request ||
    {};

  const candidateProfile =
    candidate.profile ||
    {};


  const candidateName =
    candidate.full_name ||
    candidateProfile.full_name ||
    candidateProfile.username ||
    'Candidat';


  const candidateTitle =
    candidate.title ||
    candidate.position ||
    'Demande de poste';


  const candidatePhone =
    candidate.phone_number ||
    candidate.whatsapp_number ||
    candidateProfile.phone_number ||
    candidateProfile.whatsapp_number ||
    null;


  const candidateCity =
    candidate.city ||
    candidateProfile.city ||
    null;


  const candidateCountry =
    candidate.country ||
    candidateProfile.residence_country ||
    null;


  const candidateMobility =
    candidate.mobility_area ||
    candidateProfile.mobility_area ||
    null;


  const recruiterName =
    match.driver_request
      ?.contact_name ||
    match.driver_request
      ?.recruiter_name ||
    'Recruteur';


  const recruiterPhone =
    match.driver_request
      ?.contact_phone ||
    match.driver_request
      ?.whatsapp_number ||
    null;


  const cities =
    getCities(
      match.driver_request
        ?.cities
    );


  const missionLocation =
    cities.length > 0
      ? cities.join(' · ')
      : [
          match.driver_request
            ?.city,
          match.driver_request
            ?.country,
        ]
          .filter(Boolean)
          .join(' · ');


  const driversNeeded =
    Number(
      match.driver_request
        ?.drivers_needed
    ) || 0;


  /*
   * Le timestamp est maintenant la source
   * de vérité pour la prise en charge.
   */
  const isContactInitiated =
    !!match.whatsapp_initiated_at ||
    match.status ===
      'contact_initiated';


  const statusLabel =
    isContactInitiated
      ? 'Contact initié'
      : getStatusLabel(
          match.status
        );


  const candidateInitials =
    getInitials(
      candidateName
    );


  const recruiterInitials =
    getInitials(
      recruiterName
    );


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
          'rgba(255,255,255,0.82)',
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
        title="Correspondance"
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* ==================================================
         * SCORE
         * ================================================== */}

        <ScoreCard
          score={
            score
          }
          candidateName={
            candidateName
          }
          candidateTitle={
            candidateTitle
          }
          status={
            match.status
          }
          contactInitiated={
            isContactInitiated
          }
        />


        {/* ==================================================
         * PARTICIPANTS
         * ================================================== */}

        <SectionHeader
          icon="people-outline"
          title="Participants"
          subtitle="Les parties concernées par la mise en relation"
        />

        <Card
          style={
            styles.participantsCard
          }
        >
          <ParticipantCard
            icon="person-outline"
            iconBackground={
              colors.brand.primaryLight
            }
            iconColor={
              colors.brand.primary
            }
            role="CANDIDAT"
            name={
              candidateName
            }
            subtitle={
              candidateTitle
            }
          />

          <View
            style={
              styles.connector
            }
          >
            <View
              style={
                styles.connectorLine
              }
            />

            <View
              style={
                styles.connectorIcon
              }
            >
              <Ionicons
                name="git-network-outline"
                size={16}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <View
              style={
                styles.connectorLine
              }
            />
          </View>

          <ParticipantCard
            icon="business-outline"
            iconBackground={
              colors.success.light
            }
            iconColor={
              colors.success.default
            }
            role="RECRUTEUR"
            name={
              recruiterName
            }
            subtitle="Besoin de conducteur"
          />
        </Card>


        {/* ==================================================
         * MISSION
         * ================================================== */}

        <SectionHeader
          icon="people-outline"
          title="Besoin de conducteur"
          subtitle="Informations liées à la mission"
        />

        <Card
          style={
            styles.infoCard
          }
        >
          <InfoItem
            icon="people-outline"
            label="Conducteurs recherchés"
            value={`${driversNeeded} conducteur${
              driversNeeded > 1
                ? 's'
                : ''
            }`}
          />

          <View
            style={
              styles.infoDivider
            }
          />

          <InfoItem
            icon="location-outline"
            label="Villes"
            value={
              missionLocation
            }
          />

          <View
            style={
              styles.infoDivider
            }
          />

          <InfoItem
            icon="map-outline"
            label="Quartier / zone "
            value={
              match.driver_request
                ?.neighborhood
            }
          />

          <View
            style={
              styles.infoDivider
            }
          />

          <InfoItem
            icon="globe-outline"
            label="Pays"
            value={
              match.driver_request
                ?.country
            }
          />

          {match.driver_request
            ?.description ? (
            <>
              <View
                style={
                  styles.infoDivider
                }
              />

              <InfoItem
                icon="document-text-outline"
                label="Description"
                value={
                  match.driver_request
                    ?.description
                }
                multiline
              />
            </>
          ) : null}
        </Card>


        {/* ==================================================
         * CANDIDAT
         * ================================================== */}

        <SectionHeader
          icon="person-outline"
          title="Profil candidat"
          subtitle="Informations prises en compte dans le matching"
        />

        <Card
          style={
            styles.infoCard
          }
        >
          <InfoItem
            icon="person-outline"
            label="Nom"
            value={
              candidateName
            }
          />

          <View
            style={
              styles.infoDivider
            }
          />

          <InfoItem
            icon="briefcase-outline"
            label="Poste recherché"
            value={
              candidateTitle
            }
          />

          <View
            style={
              styles.infoDivider
            }
          />

          <InfoItem
            icon="location-outline"
            label="Ville"
            value={
              candidateCity
            }
          />

          <View
            style={
              styles.infoDivider
            }
          />

          <InfoItem
            icon="navigate-outline"
            label="Mobilité"
            value={
              candidateMobility
            }
          />

          <View
            style={
              styles.infoDivider
            }
          />

          <InfoItem
            icon="globe-outline"
            label="Pays"
            value={
              candidateCountry
            }
          />
        </Card>


        {/* ==================================================
         * SYNTHÈSE
         * ================================================== */}

        <SectionHeader
          icon="analytics-outline"
          title="État de la correspondance"
          subtitle="Situation actuelle du matching"
        />

        <Card
          style={
            styles.summaryCard
          }
        >
          <View
            style={
              styles.summaryScore
            }
          >
            <Text
              style={
                styles.summaryScoreValue
              }
            >
              {score}
            </Text>

            <Text
              style={
                styles.summaryScorePercent
              }
            >
              %
            </Text>
          </View>

          <View
            style={
              styles.summaryBody
            }
          >
            <Text
              style={
                styles.summaryTitle
              }
            >
              {statusLabel}
            </Text>

            <Text
              style={
                styles.summaryText
              }
            >
              {isContactInitiated
                ? 'La prise de contact a déjà été enregistrée pour cette correspondance.'
                : `Cette correspondance présente un score de compatibilité de ${score} %.`
              }
            </Text>
          </View>
        </Card>


        {/* ==================================================
         * CONTACT
         * ================================================== */}

        <SectionHeader
          icon="chatbubbles-outline"
          title="Mise en relation"
          subtitle="Contacter les parties concernées"
        />

        <Card
          style={
            styles.contactCard
          }
        >
          <View
            style={
              styles.contactHeader
            }
          >
            <View
              style={[
                styles.contactIcon,
                isContactInitiated &&
                  styles.contactIconSuccess,
              ]}
            >
              <Ionicons
                name={
                  isContactInitiated
                    ? 'checkmark-circle-outline'
                    : 'chatbubbles-outline'
                }
                size={24}
                color={
                  isContactInitiated
                    ? colors.success.default
                    : colors.brand.primary
                }
              />
            </View>

            <View
              style={
                styles.contactHeaderText
              }
            >
              <Text
                style={
                  styles.contactTitle
                }
              >
                {isContactInitiated
                  ? 'Correspondance prise en charge'
                  : 'Prise en charge KMA'}
              </Text>

              <Text
                style={
                  styles.contactText
                }
              >
                {isContactInitiated
                  ? 'Le premier contact a déjà été enregistré.'
                  : 'KmAdministrateur peut contacter les parties et organiser leur mise en relation.'
                }
              </Text>
            </View>
          </View>


          {/* CANDIDAT */}
          {candidatePhone ? (
            <View
              style={
                styles.actionBlock
              }
            >
              <View
                style={
                  styles.actionIdentity
                }
              >
                <View
                  style={
                    styles.actionIdentityIcon
                  }
                >
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color={
                      colors.brand.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.actionIdentityText
                  }
                >
                  <Text
                    style={
                      styles.actionLabel
                    }
                  >
                    Candidat
                  </Text>

                  <Text
                    style={
                      styles.actionName
                    }
                    numberOfLines={1}
                  >
                    {candidateName}
                  </Text>
                </View>
              </View>

              <Button
                title="Contacter sur WhatsApp"
                onPress={() =>
                  openWhatsApp(
                    candidatePhone,
                    'candidat'
                  )
                }
                disabled={
                  busy
                }
                style={
                  styles.actionButton
                }
              />
            </View>
          ) : null}


          {/* RECRUTEUR */}
          {recruiterPhone ? (
            <View
              style={[
                styles.actionBlock,
                candidatePhone &&
                  styles.actionBorder,
              ]}
            >
              <View
                style={
                  styles.actionIdentity
                }
              >
                <View
                  style={[
                    styles.actionIdentityIcon,
                    styles.recruiterActionIcon,
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={17}
                    color={
                      colors.success.default
                    }
                  />
                </View>

                <View
                  style={
                    styles.actionIdentityText
                  }
                >
                  <Text
                    style={
                      styles.actionLabel
                    }
                  >
                    Recruteur
                  </Text>

                  <Text
                    style={
                      styles.actionName
                    }
                    numberOfLines={1}
                  >
                    {recruiterName}
                  </Text>
                </View>
              </View>

              <Button
                title="Contacter sur WhatsApp"
                variant="outline"
                onPress={() =>
                  openWhatsApp(
                    recruiterPhone,
                    'recruteur'
                  )
                }
                disabled={
                  busy
                }
                style={
                  styles.actionButton
                }
              />
            </View>
          ) : null}


          {/* PRISE EN CHARGE */}
          {!isContactInitiated ? (
            <View
              style={[
                styles.actionBlock,
                (candidatePhone ||
                  recruiterPhone) &&
                  styles.actionBorder,
              ]}
            >
              <View
                style={
                  styles.takeoverHeader
                }
              >
                <View
                  style={
                    styles.takeoverIcon
                  }
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={18}
                    color={
                      colors.brand.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.takeoverText
                  }
                >
                  <Text
                    style={
                      styles.takeoverTitle
                    }
                  >
                    Déjà en contact ?
                  </Text>

                  <Text
                    style={
                      styles.takeoverSubtitle
                    }
                  >
                    Enregistrez la prise en charge manuellement.
                  </Text>
                </View>
              </View>

              <Button
                title="Marquer comme pris en charge"
                variant="outline"
                loading={
                  busy
                }
                onPress={
                  markContact
                }
                style={
                  styles.actionButton
                }
              />
            </View>
          ) : (
            <View
              style={
                styles.successNotice
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={
                  colors.success.default
                }
              />

              <Text
                style={
                  styles.successNoticeText
                }
              >
                La prise en charge a déjà été enregistrée.
              </Text>
            </View>
          )}


          {!candidatePhone &&
          !recruiterPhone ? (
            <View
              style={
                styles.warningNotice
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={
                  colors.warning.default
                }
              />

              <Text
                style={
                  styles.warningText
                }
              >
                Aucun numéro de contact n’est disponible pour
                cette correspondance.
              </Text>
            </View>
          ) : null}
        </Card>


        {/* ==================================================
         * FOOTER
         * ================================================== */}

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
            Correspondance KmerDiaspora sécurisée
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
     * STATES
     * ======================================================== */

    stateScreen: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        spacing.screenHorizontal,
    },

    stateCard: {
      width: '100%',

      maxWidth: 420,

      alignItems:
        'center',

      padding:
        spacing.xl,

      borderRadius:
        radii.xl,

      backgroundColor:
        'rgba(255,255,255,0.96)',

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      ...shadows.card,
    },

    stateIcon: {
      width: 66,

      height: 66,

      borderRadius:
        33,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginBottom:
        spacing.md,
    },

    stateIconError: {
      backgroundColor:
        colors.error.light,
    },

    stateTitle: {
      ...typography.h3,

      color:
        colors.text.primary,

      textAlign:
        'center',
    },

    stateText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,

      textAlign:
        'center',
    },

    backButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        spacing.xs,

      minHeight:
        46,

      marginTop:
        spacing.lg,

      paddingHorizontal:
        spacing.lg,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.brand.primary,
    },

    backButtonText: {
      color:
        colors.text.inverse,

      fontSize:
        fontSizes.sm,

      fontWeight:
        '700',
    },


    /* ========================================================
     * SCORE
     * ======================================================== */

    scoreCard: {
      marginBottom:
        spacing.lg,

      padding:
        spacing.lg,

      borderRadius:
        radii.xl,

      overflow:
        'hidden',

      ...shadows.button,
    },

    scoreHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap:
        spacing.sm,
    },

    scoreHeaderText: {
      flex: 1,

      minWidth: 0,
    },

    scoreEyebrow: {
      color:
        'rgba(255,255,255,0.68)',

      fontSize:
        10,

      fontWeight:
        '700',

      letterSpacing:
        1,
    },

    scoreTitle: {
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

    scoreSubtitle: {
      marginTop:
        3,

      color:
        'rgba(255,255,255,0.76)',

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },

    statusContainer: {
      flexShrink:
        0,
    },

    scoreMain: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.xl,

      gap:
        spacing.lg,
    },

    scoreRingOuter: {
      width: 108,

      height: 108,

      borderRadius:
        54,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        6,

      borderColor:
        'rgba(255,255,255,0.12)',
    },

    scoreRingInner: {
      width: 88,

      height: 88,

      borderRadius:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',

      borderWidth:
        2,
    },

    scoreValue: {
      color:
        colors.text.inverse,

      fontFamily:
        typography.h1.fontFamily,

      fontWeight:
        typography.h1.fontWeight,

      fontSize:
        32,

      lineHeight:
        36,
    },

    scorePercent: {
      marginTop:
        9,

      marginLeft:
        2,

      color:
        'rgba(255,255,255,0.78)',

      fontSize:
        10,

      fontWeight:
        '800',
    },

    scoreSummary: {
      flex: 1,

      minWidth: 0,
    },

    scoreSummaryLabel: {
      color:
        'rgba(255,255,255,0.64)',

      fontSize:
        fontSizes.xs,
    },

    scoreSummaryTitle: {
      marginTop:
        3,

      color:
        colors.text.inverse,

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,
    },

    scoreProgressTrack: {
      height: 7,

      marginTop:
        spacing.sm,

      borderRadius:
        radii.pill,

      overflow:
        'hidden',

      backgroundColor:
        'rgba(255,255,255,0.14)',
    },

    scoreProgressFill: {
      height:
        '100%',

      borderRadius:
        radii.pill,
    },

    scoreSummaryText: {
      marginTop:
        spacing.xs,

      color:
        'rgba(255,255,255,0.62)',

      fontSize:
        11,

      lineHeight:
        16,
    },


    /* ========================================================
     * SECTION
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

    sectionHeaderIcon: {
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

    sectionHeaderText: {
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
     * PARTICIPANTS
     * ======================================================== */

    participantsCard: {
      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        'rgba(255,255,255,0.95)',
    },

    participantCard: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    participantIcon: {
      width: 44,

      height: 44,

      borderRadius:
        radii.md,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing.sm,
    },

    participantBody: {
      flex: 1,

      minWidth: 0,
    },

    participantRole: {
      color:
        colors.text.tertiary,

      fontSize:
        10,

      fontWeight:
        '700',

      letterSpacing:
        0.6,
    },

    participantName: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,
    },

    participantSubtitle: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },

    connector: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginVertical:
        spacing.md,
    },

    connectorLine: {
      flex: 1,

      height:
        StyleSheet.hairlineWidth,

      backgroundColor:
        colors.border.light,
    },

    connectorIcon: {
      width: 30,

      height: 30,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginHorizontal:
        spacing.sm,

      backgroundColor:
        colors.brand.primaryLight,
    },


    /* ========================================================
     * INFO
     * ======================================================== */

    infoCard: {
      padding:
        spacing.sm,

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

      marginRight:
        spacing.sm,

      backgroundColor:
        colors.brand.primaryLight,
    },

    infoBody: {
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

      textTransform:
        'uppercase',

      letterSpacing:
        0.5,
    },

    infoValue: {
      marginTop:
        3,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },

    infoValueMultiline: {
      lineHeight:
        21,
    },

    infoDivider: {
      height:
        StyleSheet.hairlineWidth,

      backgroundColor:
        colors.border.light,

      marginHorizontal:
        spacing.sm,
    },


    /* ========================================================
     * SUMMARY
     * ======================================================== */

    summaryCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        'rgba(255,255,255,0.95)',
    },

    summaryScore: {
      width: 64,

      height: 64,

      borderRadius:
        32,

      alignItems:
        'center',

      justifyContent:
        'center',

      flexDirection:
        'row',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.md,
    },

    summaryScoreValue: {
      color:
        colors.brand.primaryDark,

      fontFamily:
        typography.h2.fontFamily,

      fontWeight:
        typography.h2.fontWeight,

      fontSize:
        fontSizes.lg,
    },

    summaryScorePercent: {
      marginTop:
        6,

      marginLeft:
        1,

      color:
        colors.brand.primary,

      fontSize:
        9,

      fontWeight:
        '800',
    },

    summaryBody: {
      flex: 1,

      minWidth: 0,
    },

    summaryTitle: {
      color:
        colors.text.primary,

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.sm,
    },

    summaryText: {
      marginTop:
        3,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,
    },


    /* ========================================================
     * CONTACT
     * ======================================================== */

    contactCard: {
      padding:
        spacing.md,

      marginBottom:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        'rgba(255,255,255,0.96)',
    },

    contactHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    contactIcon: {
      width: 44,

      height: 44,

      borderRadius:
        radii.md,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing.sm,

      backgroundColor:
        colors.brand.primaryLight,
    },

    contactIconSuccess: {
      backgroundColor:
        colors.success.light,
    },

    contactHeaderText: {
      flex: 1,

      minWidth: 0,
    },

    contactTitle: {
      color:
        colors.text.primary,

      fontFamily:
        typography.h3.fontFamily,

      fontWeight:
        typography.h3.fontWeight,

      fontSize:
        fontSizes.sm,
    },

    contactText: {
      marginTop:
        3,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,
    },

    actionBlock: {
      paddingTop:
        spacing.md,
    },

    actionBorder: {
      marginTop:
        spacing.md,

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        colors.border.light,
    },

    actionIdentity: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        spacing.sm,
    },

    actionIdentityIcon: {
      width: 36,

      height: 36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing.sm,

      backgroundColor:
        colors.brand.primaryLight,
    },

    recruiterActionIcon: {
      backgroundColor:
        colors.success.light,
    },

    actionIdentityText: {
      flex: 1,

      minWidth: 0,
    },

    actionLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        10,

      fontWeight:
        '600',

      textTransform:
        'uppercase',

      letterSpacing:
        0.5,
    },

    actionName: {
      marginTop:
        1,

      color:
        colors.text.primary,

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.sm,
    },

    actionButton: {
      marginTop:
        2,
    },

    takeoverHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        spacing.sm,
    },

    takeoverIcon: {
      width: 36,

      height: 36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing.sm,

      backgroundColor:
        colors.brand.primaryLight,
    },

    takeoverText: {
      flex: 1,

      minWidth: 0,
    },

    takeoverTitle: {
      color:
        colors.text.primary,

      fontFamily:
        typography.bodyBold.fontFamily,

      fontWeight:
        typography.bodyBold.fontWeight,

      fontSize:
        fontSizes.sm,
    },

    takeoverSubtitle: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },

    successNotice: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.md,

      padding:
        spacing.sm,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.success.light,
    },

    successNoticeText: {
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

    warningNotice: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginTop:
        spacing.md,

      padding:
        spacing.sm,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.warning.light,
    },

    warningText: {
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
