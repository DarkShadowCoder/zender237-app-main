import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  getJobRequest,
  closeJobRequest,
  deleteMyJobRequest,
} from '../../services/kmerDiasporaService';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  colors,
  typography,
  spacing,
  radii,
  fontSizes,
} from '../../theme/theme';

import {
  KdScreen,
  KdLoading,
  SectionTitle,
  Button,
  InfoBanner,
  KdStatus,
} from './components/KdUI';


export default function JobRequestDetailScreen({
  route,
  navigation,
}) {
  const {
    requestId,
    id,
  } = route.params || {};

  const rid =
    requestId || id;


  const {
    profile,
  } = useAuth();


  const [
    item,
    setItem,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    busy,
    setBusy,
  ] = useState(false);


  const load =
    useCallback(
      async () => {

        const data =
          await getJobRequest(
            rid
          );

        setItem(
          data
        );

      },
      [rid]
    );


  useEffect(() => {
    let mounted =
      true;

    load()
      .catch(
        (error) => {

          console.error(
            '[JobRequestDetail]',
            error
          );

          if (
            mounted
          ) {

            Alert.alert(
              'Erreur',
              error?.message ||
                'Impossible de charger cette demande.'
            );
          }

        }
      )
      .finally(() => {

        if (
          mounted
        ) {
          setLoading(
            false
          );
        }

      });

    return () => {
      mounted =
        false;
    };

  }, [
    load,
  ]);


  /* ==========================================================
   * PROPRIETAIRE
   * ========================================================== */

  const isOwner =
    !!item &&
    !!profile?.id &&
    item?.profile?.user_id ===
      profile.id;


  /* ==========================================================
   * CLOTURE
   * ========================================================== */

  const close =
    async () => {

      if (!isOwner) {
        return;
      }

      Alert.alert(
        'Clôturer la demande',
        'Voulez-vous vraiment clôturer cette demande de poste ?',
        [
          {
            text:
              'Annuler',

            style:
              'cancel',
          },

          {
            text:
              'Clôturer',

            style:
              'destructive',

            onPress:
              async () => {

                setBusy(
                  true
                );

                try {

                  await closeJobRequest(
                    rid
                  );

                  await load();

                } catch (
                  error
                ) {

                  Alert.alert(
                    'Erreur',
                    error?.message ||
                      'Impossible de clôturer la demande.'
                  );

                } finally {

                  setBusy(
                    false
                  );

                }
              },
          },
        ]
      );
    };


  /* ==========================================================
   * SUPPRIMER
   * ========================================================== */

  const remove =
    async () => {

      if (!isOwner) {
        return;
      }

      Alert.alert(
        'Supprimer la demande',
        'Cette action est définitive. Continuer ?',
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

                setBusy(
                  true
                );

                try {

                  await deleteMyJobRequest(
                    rid
                  );

                  navigation.goBack();

                } catch (
                  error
                ) {

                  Alert.alert(
                    'Erreur',
                    error?.message ||
                      'Impossible de supprimer la demande.'
                  );

                } finally {

                  setBusy(
                    false
                  );

                }
              },
          },
        ]
      );
    };


  if (loading) {
    return (
      <KdLoading
        label="Chargement de la demande…"
      />
    );
  }


  if (!item) {
    return (
      <KdScreen
        title="Détail de la demande"
        scrollView={ScrollView}
      >

        <View
          style={
            styles.empty
          }
        >

          <Ionicons
            name="alert-circle-outline"
            size={34}
            color={
              colors.icon.muted
            }
          />

          <Text
            style={
              styles.emptyTitle
            }
          >
            Demande introuvable
          </Text>

        </View>

      </KdScreen>
    );
  }


  return (
    <KdScreen
      title="Détail de la demande"
      scrollView={ScrollView}
    >

      <View
        style={
          styles.hero
        }
      >

        <View
          style={
            styles.icon
          }
        >

          <Ionicons
            name="briefcase-outline"
            size={23}
            color={
              colors.brand.primary
            }
          />

        </View>


        <View
          style={
            styles.heroContent
          }
        >

          <Text
            style={
              styles.eyebrow
            }
          >
            DEMANDE DE POSTE
          </Text>


          <Text
            style={
              styles.title
            }
          >
            {item.title ||
              'Poste recherché'}
          </Text>


          <View
            style={
              styles.status
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


      <SectionTitle
        title="Informations"
      />


      <View
        style={
          styles.card
        }
      >

        <Row
          icon="person-outline"
          label="Nom"
          value={
            item.full_name ||
              item.profile?.username ||
              '—'
          }
        />


        <Row
          icon="location-outline"
          label="Ville"
          value={
            item.city ||
              '—'
          }
        />


        <Row
          icon="map-outline"
          label="Région"
          value={
            item.region ||
              '—'
          }
        />


        <Row
          icon="navigate-outline"
          label="Zone de mobilité"
          value={
            item.mobility_area ||
              '—'
          }
        />


        <Row
          icon="globe-outline"
          label="Pays"
          value={
            item.country ||
              '—'
          }
        />

      </View>


      <InfoBanner
        icon={
          isOwner
            ? 'person-circle-outline'
            : 'eye-outline'
        }
        text={
          isOwner
            ? 'Vous êtes le créateur de cette demande. Vous seul pouvez la modifier, la clôturer ou la supprimer.'
            : 'Vous consultez cette demande. Seul son créateur peut la modifier, la clôturer ou la supprimer.'
        }
      />


      {isOwner ? (

        <View
          style={
            styles.actions
          }
        >

          <Button
            title="Modifier la demande"
            variant="outline"
            disabled={
              busy
            }
            onPress={() =>
              navigation.navigate(
                'CreateJobRequest',
                {
                  item,
                }
              )
            }
          />


          {item.status !==
          'closed' ? (

            <Button
              title="Clôturer la demande"
              variant="outline"
              loading={
                busy
              }
              onPress={
                close
              }
              style={
                styles.actionGap
              }
            />

          ) : null}


          <Button
            title="Supprimer la demande"
            variant="danger"
            loading={
              busy
            }
            onPress={
              remove
            }
            style={
              styles.actionGap
            }
          />

        </View>

      ) : null}


      <View
        style={
          styles.bottom
        }
      />

    </KdScreen>
  );
}


function Row({
  icon,
  label,
  value,
}) {
  return (
    <View
      style={
        styles.row
      }
    >

      <Ionicons
        name={
          icon
        }
        size={17}
        color={
          colors.brand.primary
        }
      />


      <View
        style={
          styles.rowContent
        }
      >

        <Text
          style={
            styles.rowLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.rowValue
          }
        >
          {value}
        </Text>

      </View>

    </View>
  );
}


/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({

    hero: {
      flexDirection:
        'row',

      padding:
        spacing.md,

      marginTop:
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


    icon: {
      width:
        46,

      height:
        46,

      borderRadius:
        23,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    heroContent: {
      flex:
        1,
    },


    eyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        10,

      fontWeight:
        '800',

      letterSpacing:
        0.7,
    },


    title: {
      marginTop:
        3,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      fontWeight:
        '800',
    },


    status: {
      marginTop:
        spacing.xs,

      alignSelf:
        'flex-start',
    },


    card: {
      marginTop:
        spacing.xs,

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


    row: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      paddingVertical:
        spacing.sm,

      borderBottomWidth:
        1,

      borderBottomColor:
        colors.border.light,
    },


    rowContent: {
      flex:
        1,

      marginLeft:
        spacing.sm,
    },


    rowLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        10,
    },


    rowValue: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        '600',
    },


    actions: {
      marginTop:
        spacing.md,

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


    actionGap: {
      marginTop:
        spacing.sm,
    },


    bottom: {
      height:
        spacing.xl * 2,
    },


    empty: {
      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        spacing.xl,
    },


    emptyTitle: {
      marginTop:
        spacing.sm,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      fontWeight:
        '700',
    },

  });