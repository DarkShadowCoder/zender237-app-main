import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
} from '../../theme/theme';

import {
  getQuest,
  joinQuest,
  contributeToQuest,
  respondQuestApproval,
} from '../../services/kmerDiasporaService';

import {
  getMyKdProfile,
  listQuestContributions,
} from '../../services/kmerDiasporaService';

import {
  KdScreen,
  SectionTitle,
  KdProgress,
  KdStatus,
  Button,
  KdLoading,
  InfoBanner,
} from './components/KdUI';

import {
  useAuth,
} from '../../context/AuthContext';


export default function QuestDetailScreen({
  route,
  navigation,
}) {
  const {
    profile,
  } = useAuth();

  const {
    questId,
  } = route.params || {};


  const [
    item,
    setItem,
  ] = useState(null);


  const [
    profileData,
    setProfileData,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    busy,
    setBusy,
  ] = useState(false);


  /* ==========================================================
   * CHARGEMENT
   * ========================================================== */

  const load =
    useCallback(
      async () => {
        const [
          quest,
          kdProfile,
        ] = await Promise.all([
          getQuest(
            questId
          ),
          getMyKdProfile()
            .catch(
              () => null
            ),
        ]);

        setItem(
          quest
        );

        setProfileData(
          kdProfile
        );
      },
      [questId]
    );


  useEffect(() => {
    let mounted = true;

    load()
      .catch((error) => {
        console.error(
          '[QuestDetail] Erreur de chargement:',
          error
        );

        if (mounted) {
          Alert.alert(
            'Erreur de chargement',
            error?.message ||
              'Impossible de charger les détails de cette quête.'
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [load]);


  /* ==========================================================
   * PROGRESSION
   * ========================================================== */

  const progress =
    useMemo(() => {
      const current =
        Number(
          item?.current_amount ||
            0
        );

      const target =
        Number(
          item?.target_amount ||
            0
        );

      return target
        ? Math.min(
            100,
            Math.round(
              (
                current /
                target
              ) *
              100
            )
          )
        : 0;
    }, [item]);


  /* ==========================================================
   * IDENTITE
   * ========================================================== */

  const isBeneficiary =
    item?.beneficiary_user_id ===
    profile?.id;


  const isCreator =
    item?.creator_user_id ===
    profile?.id;


  /*
   * Le créateur est automatiquement membre de sa quête.
   *
   * On conserve la vérification dans members pour les autres
   * utilisateurs, tout en considérant le créateur comme membre
   * même si une ancienne quête n'a pas encore été corrigée.
   */
  const isMember =
    isCreator ||
    (item?.members || [])
      .some(
        (member) =>
          member.user_id ===
            profile?.id &&
          member.status ===
            'active'
      );


  /*
   * Un membre ou le créateur peut contribuer.
   *
   * Il n'existe aucune limite de nombre de contributions.
   */
  const canDonate =
    [
      'published',
      'active',
    ].includes(
      item?.status
    ) &&
    (
      isMember ||
      isCreator
    );


  const contributorCount =
    new Set(
      (item?.contributions || [])
        .map(
          (contribution) =>
            contribution.contributor_user_id
        )
    ).size;


  const memberCount =
    item?.members?.length ||
    0;


  const currency =
    item?.currency ||
    'XAF';


  const currentAmount =
    Number(
      item?.current_amount ||
        0
    );


  const targetAmount =
    Number(
      item?.target_amount ||
        0
    );


  const beneficiaryName =
    item?.beneficiary?.username ||
    item?.beneficiary_user_id ||
    'Bénéficiaire';


  const creatorName =
    item?.creator?.username ||
    item?.creator_user_id ||
    'Utilisateur';


  /* ==========================================================
   * FORMATAGE
   * ========================================================== */

  const formatAmount =
    (value) =>
      Number(
        value || 0
      ).toLocaleString(
        'fr-FR'
      );


  const formatDate =
    (value) => {
      if (!value) {
        return '—';
      }

      const date =
        new Date(
          value
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return String(
          value
        ).slice(
          0,
          10
        );
      }

      return date.toLocaleDateString(
        'fr-FR',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }
      );
    };


  /* ==========================================================
   * ACTIONS
   * ========================================================== */

  const action =
    async (
      fn,
      success
    ) => {
      setBusy(true);

      try {
        await fn();

        await load();

        if (success) {
          Alert.alert(
            'Succès',
            success
          );
        }
      } catch (e) {
        Alert.alert(
          'Action impossible',
          e?.message ||
            'Une erreur est survenue.'
        );
      } finally {
        setBusy(false);
      }
    };


  /* ==========================================================
   * LOADING
   * ========================================================== */

  if (loading) {
    return (
      <KdLoading
        label="Chargement de la quête…"
      />
    );
  }


  if (!item) {
    return (
      <KdScreen
        title="Détails de la quête"
        scrollView={ScrollView}
      >
        <View
          style={
            styles.notFound
          }
        >

          <View
            style={
              styles.notFoundIcon
            }
          >
            <Ionicons
              name="heart-dislike-outline"
              size={28}
              color={
                colors.icon.muted
              }
            />
          </View>

          <Text
            style={[
              typography.body,
              styles.notFoundTitle,
            ]}
          >
            Quête introuvable
          </Text>

          <Text
            style={[
              typography.caption,
              styles.notFoundText,
            ]}
          >
            Cette Quête n'est plus disponible.
          </Text>

        </View>
      </KdScreen>
    );
  }


  return (
    <KdScreen
      title="Détails de la quête"
      scrollView={ScrollView}
    >

      {/* ======================================================
          HERO PRINCIPAL
          ====================================================== */}

      <View
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
            style={
              styles.heroIcon
            }
          >
            <Ionicons
              name="heart-outline"
              size={24}
              color={
                colors.brand.primary
              }
            />
          </View>


          <View
            style={
              styles.heroIdentity
            }
          >

            <Text
              style={[
                typography.caption,
                styles.heroEyebrow,
              ]}
            >
              QUÊTE SOLIDAIRE
            </Text>

            <Text
              style={[
                typography.h1,
                styles.heroTitle,
              ]}
              numberOfLines={4}
            >
              {item.title}
            </Text>

            <View
              style={
                styles.heroStatus
              }
            >
              <KdStatus
                status={
                  item.status
                }
              />
            </View>

          </View>

        </View>


        {/* DESCRIPTION */}

        <Text
          style={[
            typography.body,
            styles.heroDescription,
          ]}
        >
          {item.description ||
            'Aucune description.'}
        </Text>


        {/* BENEFICIAIRE */}

        <View
          style={
            styles.beneficiaryRow
          }
        >

          <View
            style={
              styles.beneficiaryIcon
            }
          >
            <Ionicons
              name="person-outline"
              size={14}
              color={
                colors.brand.primary
              }
            />
          </View>


          <View
            style={
              styles.beneficiaryContent
            }
          >

            <Text
              style={[
                typography.caption,
                styles.beneficiaryLabel,
              ]}
            >
              Bénéficiaire
            </Text>

            <Text
              style={[
                typography.body,
                styles.beneficiaryName,
              ]}
              numberOfLines={2}
            >
              {beneficiaryName}
            </Text>

          </View>

        </View>


        {/* MONTANT */}

        <View
          style={
            styles.amountSection
          }
        >

          <View
            style={
              styles.amountLeft
            }
          >

            <Text
              style={[
                typography.caption,
                styles.amountLabel,
              ]}
            >
              COLLECTÉ
            </Text>

            <View
              style={
                styles.amountRow
              }
            >

              <Text
                style={[
                  typography.h1,
                  styles.amountValue,
                ]}
              >
                {formatAmount(
                  currentAmount
                )}
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.amountCurrency,
                ]}
              >
                {currency}
              </Text>

            </View>


            {targetAmount > 0 ? (
              <Text
                style={[
                  typography.caption,
                  styles.amountTarget,
                ]}
              >
                sur {formatAmount(
                  targetAmount
                )}{' '}
                {currency}
              </Text>
            ) : (
              <Text
                style={[
                  typography.caption,
                  styles.amountTarget,
                ]}
              >
                Aucun plafond défini
              </Text>
            )}

          </View>


          <View
            style={
              styles.percentBox
            }
          >

            <Text
              style={
                styles.percentValue
              }
            >
              {targetAmount
                ? `${progress}%`
                : '—'}
            </Text>

            <Text
              style={
                styles.percentLabel
              }
            >
              objectif
            </Text>

          </View>

        </View>


        {/* PROGRESS */}

        {targetAmount > 0 ? (
          <View
            style={
              styles.progressContainer
            }
          >
            <KdProgress
              value={
                progress
              }
            />
          </View>
        ) : null}

      </View>


      {/* ======================================================
          STATS
          ====================================================== */}

      <View
        style={
          styles.statsCard
        }
      >

        <View
          style={
            styles.stat
          }
        >

          <View
            style={
              styles.statIcon
            }
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={
                colors.brand.primary
              }
            />
          </View>

          <Text
            style={[
              typography.caption,
              styles.statLabel,
            ]}
          >
            Date limite
          </Text>

          <Text
            style={[
              typography.body,
              styles.statValue,
            ]}
            numberOfLines={2}
          >
            {formatDate(
              item.duration_end
            )}
          </Text>

        </View>


        <View
          style={
            styles.statDivider
          }
        />


        <View
          style={
            styles.stat
          }
        >

          <View
            style={
              styles.statIcon
            }
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={
                colors.brand.primary
              }
            />
          </View>

          <Text
            style={[
              typography.caption,
              styles.statLabel,
            ]}
          >
            Membres
          </Text>

          <Text
            style={[
              typography.body,
              styles.statValue,
            ]}
          >
            {memberCount}
          </Text>

        </View>


        <View
          style={
            styles.statDivider
          }
        />


        <View
          style={
            styles.stat
          }
        >

          <View
            style={
              styles.statIcon
            }
          >
            <Ionicons
              name="wallet-outline"
              size={16}
              color={
                colors.brand.primary
              }
            />
          </View>

          <Text
            style={[
              typography.caption,
              styles.statLabel,
            ]}
          >
            Contributeurs
          </Text>

          <Text
            style={[
              typography.body,
              styles.statValue,
            ]}
          >
            {contributorCount}
          </Text>

        </View>

      </View>


      {/* ======================================================
          APPROBATION
          ====================================================== */}

      {item.status ===
        'pending_beneficiary_approval' &&
      isBeneficiary ? (

        <View
          style={
            styles.approvalCard
          }
        >

          <View
            style={
              styles.approvalIcon
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={
                colors.brand.primary
              }
            />
          </View>


          <Text
            style={[
              typography.h3,
              styles.approvalTitle,
            ]}
          >
            Une Quête a été créée pour vous
          </Text>


          <Text
            style={[
              typography.caption,
              styles.approvalText,
            ]}
          >
            Vous devez accepter cette Quête avant qu’elle puisse être publiée.
          </Text>


          <View
            style={
              styles.approvalActions
            }
          >

            <Button
              title="Accepter"
              onPress={() =>
                action(
                  () =>
                    respondQuestApproval(
                      item.id,
                      true
                    ),
                  'La Quête a été acceptée.'
                )
              }
              loading={
                busy
              }
              style={
                styles.approveButton
              }
            />


            <Button
              title="Refuser"
              variant="outline"
              onPress={() =>
                action(
                  () =>
                    respondQuestApproval(
                      item.id,
                      false
                    ),
                  'La Quête a été refusée.'
                )
              }
              disabled={
                busy
              }
              style={
                styles.rejectButton
              }
            />

          </View>

        </View>

      ) : null}


      {/* ======================================================
          INFORMATIONS
          ====================================================== */}

      <SectionTitle
        title="Informations"
      />


      <View
        style={
          styles.infoCard
        }
      >

        <View
          style={
            styles.infoRow
          }
        >

          <View
            style={
              styles.infoIcon
            }
          >
            <Ionicons
              name="person-outline"
              size={15}
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
              Créée par
            </Text>

            <Text
              style={
                styles.infoValue
              }
            >
              {creatorName}
            </Text>

          </View>

        </View>


        <View
          style={
            styles.rowDivider
          }
        />


        <View
          style={
            styles.infoRow
          }
        >

          <View
            style={
              styles.infoIcon
            }
          >
            <Ionicons
              name="cash-outline"
              size={15}
              color={
                colors.brand.primary
              }
            />
          </View>

          <View
            style={
              styles.infoContent
            }>

            <Text
              style={
                styles.infoLabel
              }
            >
              Montant maximal
            </Text>

            <Text
              style={
                styles.infoValue
              }
            >
              {targetAmount
                ? `${formatAmount(targetAmount)} ${currency}`
                : 'Aucun plafond'}
            </Text>

          </View>

        </View>


        <View
          style={
            styles.rowDivider
          }
        />


        <View
          style={
            styles.infoRow
          }>

          <View
            style={
              styles.infoIcon
            }
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={
                colors.brand.primary
              }
            />
          </View>

          <View
            style={
              styles.infoContent
            }>

            <Text
              style={
                styles.infoLabel
              }
            >
              Règle des 7 jours
            </Text>

            <Text
              style={
                styles.infoValueSmall
              }
            >
              Si aucun autre utilisateur ne contribue dans les 7 jours, le créateur récupère sa contribution et la Quête est fermée.
            </Text>

          </View>

        </View>

      </View>


      {/* ======================================================
          CONTRIBUTEURS
          ====================================================== */}

      <SectionTitle
        title="Contributeurs récents"
        actionLabel="Voir tout"
        onAction={() =>
          navigation.navigate(
            'MyContributions',
            {
              questId:
                item.id,
            }
          )
        }
      />


      <View
        style={
          styles.contributorsCard
        }
      >

        {(item.contributions || [])
          .slice(0, 4)
          .length ? (

          item.contributions
            .slice(0, 4)
            .map(
              (contribution) => {

                const contributorName =
                  contribution
                    ?.contributor
                    ?.username ||
                  'Utilisateur';


                return (
                  <View
                    key={
                      contribution.id
                    }
                    style={
                      styles.contributorRow
                    }
                  >

                    <View
                      style={
                        styles.contributorAvatar
                      }
                    >
                      <Ionicons
                        name="person-outline"
                        size={15}
                        color={
                          colors.brand.primary
                        }
                      />
                    </View>


                    <View
                      style={
                        styles.contributorContent
                      }
                    >

                      <Text
                        style={[
                          typography.body,
                          styles.contributorName,
                        ]}
                        numberOfLines={1}
                      >
                        {contributorName}
                      </Text>

                      <Text
                        style={[
                          typography.caption,
                          styles.contributorDate,
                        ]}
                      >
                        {contribution.contributed_at
                          ? formatDate(
                              contribution.contributed_at
                            )
                          : ''}
                      </Text>

                    </View>


                    <View
                      style={
                        styles.contributorAmount
                      }
                    >

                      <Text
                        style={
                          styles.contributorAmountValue
                        }
                      >
                        +{formatAmount(
                          contribution.amount
                        )}
                      </Text>

                      <Text
                        style={
                          styles.contributorAmountCurrency
                        }
                      >
                        {currency}
                      </Text>

                    </View>

                  </View>
                );
              }
            )

        ) : (

          <View
            style={
              styles.noContribution
            }
          >

            <Ionicons
              name="heart-outline"
              size={22}
              color={
                colors.icon.muted
              }
            />

            <Text
              style={[
                typography.caption,
                styles.noContributionText,
              ]}
            >
              Aucune contribution confirmée.
            </Text>

          </View>

        )}

      </View>


      {/* ======================================================
          ACTIONS
          ====================================================== */}

      {[
        'published',
        'active',
      ].includes(item?.status) &&
      !isMember &&
      !isCreator ? (

        <Button
          title="S’inscrire à la quête"
          onPress={() =>
            action(
              () =>
                joinQuest(
                  item.id
                ),
              'Vous êtes maintenant membre de cette quête.'
            )
          }
          loading={
            busy
          }
          style={
            styles.mainButton
          }
        />

      ) : null}


      {canDonate ? (

        <Button
          title="Faire un don"
          onPress={() =>
            navigation.navigate(
              'QuestContribution',
              {
                questId:
                  item.id,
              }
            )
          }
          disabled={
            busy
          }
          style={
            styles.mainButton
          }
        />

      ) : null}


      {/* ======================================================
          CONTEXTUAL INFO
          ====================================================== */}

      {isCreator &&
      item.status ===
        'pending_beneficiary_approval' ? (

        <InfoBanner
          icon="time-outline"
          text="Le bénéficiaire doit accepter cette Quête avant sa publication."
        />

      ) : null}


      {isMember ? (

        <InfoBanner
          icon="checkmark-circle-outline"
          text={
            isCreator
              ? 'Vous êtes le créateur et un membre automatique de cette Quête.'
              : 'Vous êtes membre de cette Quête.'
          }
        />

      ) : null}


      <View
        style={
          styles.bottomSpace
        }
      />

    </KdScreen>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    /* ========================================================
       HERO
       ======================================================== */

    heroCard: {
      marginTop:
        spacing.sm,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      shadowColor:
        '#000',

      shadowOpacity:
        0.07,

      shadowRadius:
        12,

      shadowOffset: {
        width: 0,
        height: 5,
      },

      elevation:
        3,
    },


    heroTop: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },


    heroIcon: {
      width:
        48,

      height:
        48,

      borderRadius:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    heroIdentity: {
      flex:
        1,
    },


    heroEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.7,
    },


    heroTitle: {
      marginTop:
        3,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      lineHeight:
        lineHeights.lg,

      fontWeight:
        fontWeights.bold,
    },


    heroStatus: {
      marginTop:
        spacing.xs,

      alignSelf:
        'flex-start',
    },


    heroDescription: {
      marginTop:
        spacing.md,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },


    beneficiaryRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    beneficiaryIcon: {
      width:
        30,

      height:
        30,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    beneficiaryContent: {
      flex:
        1,
    },


    beneficiaryLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    beneficiaryName: {
      marginTop:
        2,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       AMOUNT
       ======================================================== */

    amountSection: {
      flexDirection:
        'row',

      alignItems:
        'flex-end',

      justifyContent:
        'space-between',

      marginTop:
        spacing.lg,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    amountLeft: {
      flex:
        1,
    },


    amountLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        9,

      lineHeight:
        11,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.5,
    },


    amountRow: {
      flexDirection:
        'row',

      alignItems:
        'baseline',

      marginTop:
        2,
    },


    amountValue: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.xl,

      lineHeight:
        lineHeights.xl,

      fontWeight:
        fontWeights.bold,
    },


    amountCurrency: {
      marginLeft:
        5,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,
    },


    amountTarget: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    percentBox: {
      alignItems:
        'center',

      justifyContent:
        'center',

      minWidth:
        58,

      paddingHorizontal:
        spacing.xs,

      paddingVertical:
        6,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.brand.primaryLight,
    },


    percentValue: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.bold,
    },


    percentLabel: {
      marginTop:
        1,

      color:
        colors.text.tertiary,

      fontSize:
        9,
    },


    progressContainer: {
      marginTop:
        spacing.sm,
    },


    /* ========================================================
       STATS
       ======================================================== */

    statsCard: {
      flexDirection:
        'row',

      alignItems:
        'stretch',

      marginTop:
        spacing.sm,

      paddingVertical:
        spacing.sm,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    stat: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        spacing.xs,
    },


    statIcon: {
      width:
        30,

      height:
        30,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginBottom:
        spacing.xs,
    },


    statLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      textAlign:
        'center',
    },


    statValue: {
      marginTop:
        2,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,

      textAlign:
        'center',
    },


    statDivider: {
      width:
        1,

      marginVertical:
        spacing.sm,

      backgroundColor:
        colors.border.light,
    },


    /* ========================================================
       APPROVAL
       ======================================================== */

    approvalCard: {
      marginTop:
        spacing.sm,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    approvalIcon: {
      width:
        40,

      height:
        40,

      borderRadius:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginBottom:
        spacing.sm,
    },


    approvalTitle: {
      color:
        colors.brand.primaryDark,
    },


    approvalText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.secondary,

      lineHeight:
        lineHeights.md,
    },


    approvalActions: {
      flexDirection:
        'row',

      gap:
        spacing.sm,

      marginTop:
        spacing.md,
    },


    approveButton: {
      flex:
        1,
    },


    rejectButton: {
      flex:
        1,
    },


    /* ========================================================
       INFORMATIONS
       ======================================================== */

    infoCard: {
      marginTop:
        spacing.sm,

      paddingHorizontal:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    infoRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      paddingVertical:
        spacing.md,
    },


    infoIcon: {
      width:
        30,

      height:
        30,

      borderRadius:
        15,

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
      flex:
        1,
    },


    infoLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    infoValue: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,
    },


    infoValueSmall: {
      marginTop:
        3,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,
    },


    rowDivider: {
      height:
        1,

      backgroundColor:
        colors.border.light,
    },


    /* ========================================================
       CONTRIBUTORS
       ======================================================== */

    contributorsCard: {
      marginTop:
        spacing.sm,

      paddingHorizontal:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    contributorRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingVertical:
        spacing.sm,

      borderBottomWidth:
        1,

      borderBottomColor:
        colors.border.light,
    },


    contributorAvatar: {
      width:
        34,

      height:
        34,

      borderRadius:
        17,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    contributorContent: {
      flex:
        1,
    },


    contributorName: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    contributorDate: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    contributorAmount: {
      alignItems:
        'flex-end',

      marginLeft:
        spacing.sm,
    },


    contributorAmountValue: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.bold,
    },


    contributorAmountCurrency: {
      marginTop:
        1,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    noContribution: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        spacing.lg,
    },


    noContributionText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.tertiary,

      textAlign:
        'center',
    },


    /* ========================================================
       ACTIONS
       ======================================================== */

    mainButton: {
      marginTop:
        spacing.sm,
        marginBottom:
        spacing.sm,
    },


    /* ========================================================
       NOT FOUND
       ======================================================== */

    notFound: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        80,

      paddingHorizontal:
        spacing.xl,
    },


    notFoundIcon: {
      width:
        58,

      height:
        58,

      borderRadius:
        29,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.background.muted,

      marginBottom:
        spacing.md,
    },


    notFoundTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      fontWeight:
        fontWeights.semiBold,

      textAlign:
        'center',
    },


    notFoundText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.tertiary,

      textAlign:
        'center',
    },


    /* ========================================================
       BOTTOM
       ======================================================== */

    bottomSpace: {
      height:
        spacing.xl * 2,
    },

  });