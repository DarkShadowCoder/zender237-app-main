import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
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
  createDriverRequest,
  updateMyDriverRequest,
  loadKmerDiasporaCities,
} from '../../services/kmerDiasporaService';

import {
  useAuth,
} from '../../context/AuthContext';

import Input from '../../components/Input';

import Button from '../../components/Button';

import {
  KdScreen,
  InfoBanner,
} from './components/KdUI';

import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
  typography,
} from '../../theme/theme';


/* ============================================================
 * PAGE
 * ============================================================ */

export default function CreateDriverRequestScreen({
  route,
  navigation,
}) {
  const {
    profile,
  } = useAuth();

  const existing =
    route.params?.item;

  const [
    cities,
    setCities,
  ] = useState(
    existing?.cities ||
    (
      existing?.city
        ? [existing.city]
        : []
    )
  );

  const [
    availableCities,
    setAvailableCities,
  ] = useState([]);

  const [
    citiesLoading,
    setCitiesLoading,
  ] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCities = async () => {
      try {
        const loadedCities =
          await loadKmerDiasporaCities({
            forceRefresh: true,
          });

        if (!mounted) {
          return;
        }

        const currentCities =
          Array.isArray(cities)
            ? cities
            : [];

        const merged = [
          ...currentCities,
          ...loadedCities,
        ];

        setAvailableCities(
          Array.from(
            new Set(merged)
          )
        );
      } catch (error) {
        if (mounted) {
          Alert.alert(
            'Villes indisponibles',
            error?.message ||
              'Impossible de charger les villes disponibles.'
          );
        }
      } finally {
        if (mounted) {
          setCitiesLoading(false);
        }
      }
    };

    loadCities();

    return () => {
      mounted = false;
    };
  }, [existing?.id]);

  const [
    neighborhood,
    setNeighborhood,
  ] = useState(
    existing?.neighborhood ||
      ''
  );

  const [
    driversNeeded,
    setDriversNeeded,
  ] = useState(
    String(
      existing?.drivers_needed ||
        1
    )
  );

  const [
    description,
    setDescription,
  ] = useState(
    existing?.description ||
      ''
  );

  const [
    loading,
    setLoading,
  ] = useState(false);


  /*
   * Le pays vient directement
   * du compte utilisateur.
   */
  const country =
    profile?.country ||
    'cameroun';


  /* ==========================================================
   * VILLES SELECTIONNEES
   * ========================================================== */

  const toggleCity = (
    city
  ) => {
    setCities((current) => {
      if (
        current.includes(city)
      ) {
        return current.filter(
          (item) =>
            item !== city
        );
      }

      return [
        ...current,
        city,
      ];
    });
  };


  /* ==========================================================
   * LABELS
   * ========================================================== */

  const selectedCitiesLabel =
    useMemo(() => {
      if (
        cities.length === 0
      ) {
        return 'Aucune ville sélectionnée';
      }

      return cities.join(
        ' • '
      );
    }, [cities]);


  /* ==========================================================
   * VALIDATION
   * ========================================================== */

  const validate = () => {
    const count =
      Number(
        driversNeeded
      );

    if (
      !cities.length
    ) {
      Alert.alert(
        'Ville manquante',
        'Sélectionnez au moins une ville.'
      );

      return false;
    }

    const invalidCity =
      cities.find(
        (city) =>
          !availableCities.includes(
            city
          )
      );

    if (invalidCity) {
      Alert.alert(
        'Ville indisponible',
        `La ville « ${invalidCity} » n’est pas disponible dans la base de données.`
      );

      return false;
    }


    if (
      !Number.isFinite(count) ||
      count < 1
    ) {
      Alert.alert(
        'Nombre invalide',
        'Le nombre de chauffeurs doit être supérieur ou égal à 1.'
      );

      return false;
    }


    return true;
  };


  /* ==========================================================
   * SUBMIT
   * ========================================================== */

const submit = async () => {
  if (!validate()) {
    return;
  }

  setLoading(true);

  try {
    if (existing) {
      await updateMyDriverRequest({
        requestId: existing.id,

        updates: {
          city:
            cities[0] ||
            null,

          cities,

          neighborhood:
            neighborhood.trim() ||
            null,

          drivers_needed:
            Number(
              driversNeeded
            ),

          description:
            description.trim() ||
            null,
        },
      });

      navigation.goBack();

      return;
    }

    const item =
      await createDriverRequest({
        country,

        cities,

        city:
          cities[0] ||
          null,

        neighborhood:
          neighborhood.trim() ||
          null,

        driversNeeded:
          Number(
            driversNeeded
          ),

        description:
          description.trim() ||
          null,
      });

    navigation.replace(
      'DriverRequestDetail',
      {
        requestId:
          item.id,
      }
    );

  } catch (error) {
    Alert.alert(
      'Impossible d’enregistrer',
      error?.message ||
        'Une erreur est survenue.'
    );
  } finally {
    setLoading(
      false
    );
  }
};


  return (
    <KdScreen
      title={
        existing
          ? 'Modifier la mission'
          : 'Créer une mission'
      }
      scrollView={ScrollView}
    >

      {/* ======================================================
          INTRODUCTION
          ====================================================== */}

      {/* ======================================================
          ZONE DE RECHERCHE
          ====================================================== */}

      <View
        style={
          styles.section
        }
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Zone de recherche
        </Text>

        <Text
          style={
            [typography.caption, styles.sectionSubtitle]
          }
        >
          Sélectionnez une ou plusieurs villes.
        </Text>

        {/* ----------------------------------------------------
            VILLES
            ---------------------------------------------------- */}

        <View
          style={
            styles.fieldBlock
          }
        >

          <View
            style={
              styles.cityGrid
            }
          >
            {(citiesLoading
              ? []
              : availableCities
            ).map(
              (city) => {
                const selected =
                  cities.includes(
                    city
                  );

                return (
                  <Pressable
                    key={city}
                    onPress={() =>
                      toggleCity(
                        city
                      )
                    }
                    style={[
                      styles.cityOption,

                      selected &&
                        styles.cityOptionSelected,
                    ]}
                  >

                    <View
                      style={[
                        styles.cityIcon,

                        selected &&
                          styles.cityIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          selected
                            ? 'checkmark'
                            : 'location-outline'
                        }
                        size={17}
                        color={
                          selected
                            ? colors.text.inverse
                            : colors.brand.primary
                        }
                      />
                    </View>

                    <Text
                      style={[typography.caption,
                        styles.cityText,

                        selected &&
                          styles.cityTextSelected,
                          
                      ]}
                    >
                      {city}
                    </Text>

                  </Pressable>
                );
              }
            )}
          </View>


          {/* --------------------------------------------------
              RESUME
              -------------------------------------------------- */}

          <View
            style={
              styles.selectionSummary
            }
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={
                cities.length
                  ? colors.success.default
                  : colors.icon.muted
              }
            />

            <Text
              style={[
                styles.selectionSummaryText,

                cities.length >
                  0 &&
                  styles.selectionSummaryActive,
              ]}
            >
              {selectedCitiesLabel}
            </Text>
          </View>
        </View>


        {/* ----------------------------------------------------
            QUARTIER
            ---------------------------------------------------- 

        <Input
          label="Quartier / zone"
          value={
            neighborhood
          }
          onChangeText={
            setNeighborhood
          }
          placeholder="Bonamoussadi, Akwa…"
          autoCapitalize="words"
        /> */}
      </View>


      {/* ======================================================
          BESOIN
          ====================================================== */}

      <View
        style={
          styles.section
        }
      >

        <Text
          style={
            styles.sectionTitle
          }
        >
          Besoin
        </Text>

        <Text
          style={
            [typography.caption,styles.sectionSubtitle]
          }
        >
          Indiquez le nombre de chauffeurs et les critères importants.
        </Text>


        {/* ----------------------------------------------------
            NOMBRE DE CHAUFFEURS
            ---------------------------------------------------- */}

        <View style={styles.driverCounter}>

          <View style={styles.driverCounterHeader}>
            <View style={styles.driverCounterIcon}>
              <Ionicons
                name="people-outline"
                size={18}
                color={colors.brand.primary}
              />
            </View>

            <View style={styles.driverCounterInfo}>
              <Text
                style={[
                  typography.body,
                  styles.driverCounterTitle,
                ]}
              >
                Nombre de chauffeurs
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.driverCounterSubtitle,
                ]}
              >
                Indiquez le nombre de postes à pourvoir
              </Text>
            </View>
          </View>


          <View style={styles.stepper}>

            <Pressable
              onPress={() => {
                const current =
                  Number(driversNeeded) || 1;

                setDriversNeeded(
                  String(
                    Math.max(
                      1,
                      current - 1
                    )
                  )
                );
              }}
              disabled={
                Number(driversNeeded) <= 1
              }
              style={[
                styles.stepperButton,
                Number(driversNeeded) <= 1 &&
                  styles.stepperButtonDisabled,
              ]}
            >
              <Ionicons
                name="remove"
                size={22}
                color={
                  Number(driversNeeded) <= 1
                    ? colors.icon.muted
                    : colors.brand.primary
                }
              />
            </Pressable>
            <View style={styles.stepperValueContainer}>
              <Text
                style={[
                  typography.h2,
                  styles.stepperValue,
                ]}
              >
                {Number(driversNeeded) || 1}
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.stepperUnit,
                ]}
              >
                {Number(driversNeeded) === 1
                  ? 'chauffeur'
                  : 'chauffeurs'}
              </Text>
            </View>


            <Pressable
              onPress={() => {
                const current =
                  Number(driversNeeded) || 1;

                setDriversNeeded(
                  String(
                    current + 1
                  )
                );
              }}
              style={
                styles.stepperButton
              }
            >
              <Ionicons
                name="add"
                size={20}
                color={colors.brand.primary}
              />
            </Pressable>

          </View>

        </View>




        {/* ----------------------------------------------------
            DESCRIPTION
            ---------------------------------------------------- */}

        <Input
          label="Description"
          value={
            description
          }
          onChangeText={
            setDescription
          }
          placeholder="Type de véhicule, expérience souhaitée, disponibilité…"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={
            styles.descriptionInput
          }
        />

      </View>


      {/* ======================================================
          RESUME AVANT PUBLICATION
          ====================================================== */}

      <View style={styles.previewCard}>
        {/* HEADER */}
        <View style={styles.previewHeader}>

          <View style={styles.previewHeaderLeft}>

            <View style={styles.previewIcon}>
              <Ionicons
                name="eye-outline"
                size={17}
                color={colors.brand.primary}
              />
            </View>

            <View>
              <Text
                style={[
                  typography.caption,
                  styles.previewEyebrow,
                ]}
              >
                APERÇU
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.previewTitle,
                ]}
              >
                Votre mission
              </Text>
            </View>

          </View>


          <View style={styles.previewBadge}>
            <Text
              style={[
                typography.caption,
                styles.previewBadgeText,
              ]}
            >
              Brouillon
            </Text>
          </View>

        </View>


        {/* HIGHLIGHT */}
        <View style={styles.previewHighlight}>

          <Text
            style={[
              typography.caption,
              styles.previewHighlightLabel,
            ]}
          >
            BESOIN EN CHAUFFEURS
          </Text>

          <View style={styles.previewHighlightRow}>

            <Text
              style={[
                typography.h1,
                styles.previewNumber,
              ]}
            >
              {Number(driversNeeded) || 1}
            </Text>

            <View style={styles.previewNumberInfo}>

              <Text
                style={[
                  typography.body,
                  styles.previewNumberUnit,
                ]}
              >
                {Number(driversNeeded) === 1
                  ? 'chauffeur'
                  : 'chauffeurs'}
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.previewNumberHint,
                ]}
              >
                à recruter
              </Text>

            </View>

          </View>

        </View>


        {/* VILLES */}
        <View style={styles.previewBlock}>

          <View style={styles.previewLabelRow}>

            <Ionicons
              name="location-outline"
              size={15}
              color={colors.brand.primary}
            />

            <Text
              style={[
                typography.caption,
                styles.previewLabel,
              ]}
            >
              Villes recherchées
            </Text>

          </View>


          {cities.length > 0 ? (

            <View style={styles.previewChips}>

              {cities.map((city) => (
                <View
                  key={city}
                  style={styles.previewChip}
                >

                  <Ionicons
                    name="location"
                    size={12}
                    color={colors.brand.primary}
                  />

                  <Text
                    style={[
                      typography.caption,
                      styles.previewChipText,
                    ]}
                  >
                    {city}
                  </Text>

                </View>
              ))}

            </View>

          ) : (

            <Text
              style={[
                typography.caption,
                styles.previewEmpty,
              ]}
            >
              Aucune ville sélectionnée
            </Text>

          )}

        </View>


        {/* ZONE */}
        {neighborhood.trim() ? (

          <View style={styles.previewInfoRow}>

            <View style={styles.previewInfoIcon}>
              <Ionicons
                name="navigate-outline"
                size={14}
                color={colors.brand.primary}
              />
            </View>

            <View style={styles.previewInfoContent}>

              <Text
                style={[
                  typography.caption,
                  styles.previewInfoLabel,
                ]}
              >
                Zone / quartier
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.previewInfoValue,
                ]}
                numberOfLines={2}
              >
                {neighborhood.trim()}
              </Text>

            </View>

          </View>

        ) : null}


        {/* DESCRIPTION */}
        {description.trim() ? (

          <View style={styles.previewDescription}>

            <Text
              style={[
                typography.caption,
                styles.previewDescriptionLabel,
              ]}
            >
              Description
            </Text>

            <Text
              style={[
                typography.body,
                styles.previewDescriptionText,
              ]}
              numberOfLines={4}
            >
              {description.trim()}
            </Text>

          </View>

        ) : null}


        {/* FOOTER */}
        <View style={styles.previewFooter}>

          <Ionicons
            name="information-circle-outline"
            size={14}
            color={colors.brand.primary}
          />

          <Text
            style={[
              typography.caption,
              styles.previewFooterText,
            ]}
          >
            Les profils les plus pertinents seront proposés automatiquement après la publication.
          </Text>

        </View>

      </View>


      {/* ======================================================
          ACTION
          ====================================================== */}

      <Button
        title="Publier la mission"
        onPress={
          submit
        }
        loading={
          loading
        }
        style={
          styles.submitButton
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

    section: {
      marginTop:
        spacing.lg,
      marginBottom:
        spacing.xs,
    },


    sectionTitle: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,

      marginBottom:
        spacing.xs,
    },


    sectionSubtitle: {
      lineHeight:
        lineHeights.md,

      marginBottom:
        spacing.md,
    },


    fieldBlock: {
      flex: 1,
      marginBottom:
        spacing.md,
    },


    fieldLabel: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,

      marginBottom:
        3,
    },


    fieldHint: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,

      marginBottom:
        spacing.sm,
    },


    cityLoading: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,

      marginBottom:
        spacing.sm,
    },


    /* --------------------------------------------------------
       VILLES
       -------------------------------------------------------- */

    cityGrid: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
    },


    cityOption: {
      minHeight:
        50,
      width: '32%',
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.xs,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.background.surface,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    cityOptionSelected: {
      backgroundColor:
        colors.brand.primaryLight,

      borderColor:
        colors.brand.primary,
    },


    cityIcon: {
      width:
        25,

      height:
        25,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.xs,
    },


    cityIconSelected: {
      backgroundColor:
        colors.brand.primary,
    },


    cityText: {
      flex: 1,

      color:
        colors.text.primary,
    },


    cityTextSelected: {
      color:
        colors.brand.primaryDark,
    },


    selectionSummary: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.sm,

      paddingHorizontal:
        spacing.xs,
    },


    selectionSummaryText: {
      marginLeft:
        spacing.xs,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    selectionSummaryActive: {
      color:
        colors.success.text,
    },


    /* --------------------------------------------------------
       INFO COMPTE
       -------------------------------------------------------- */

    accountInfo: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      padding:
        spacing.sm,

      marginBottom:
        spacing.md,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.info.light,

      borderWidth:
        1,

      borderColor:
        colors.info.border,
    },


    accountInfoIcon: {
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
        colors.background.surface,

      marginRight:
        spacing.sm,
    },


    accountInfoBody: {
      flex:
        1,
    },


    accountInfoTitle: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,

      lineHeight:
        lineHeights.sm,
    },


    accountInfoText: {
      marginTop:
        2,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* --------------------------------------------------------
       DESCRIPTION
       -------------------------------------------------------- */

    descriptionInput: {
      minHeight:
        110,

      paddingTop:
        spacing.sm,
    },


    /* --------------------------------------------------------
       RESUME
       -------------------------------------------------------- */

    summaryCard: {
      marginTop:
        spacing.md,

      padding:
        spacing.md,

      backgroundColor:
        colors.background.surface,

      borderRadius:
        radii.xl,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    summaryHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.sm,
    },


    summaryTitle: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    summarySubtitle: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    summaryIcon: {
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
    },


    summaryRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      paddingVertical:
        spacing.xs,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    summaryLabel: {
      flex:
        0.9,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    summaryValue: {
      flex:
        1.5,

      marginLeft:
        spacing.sm,

      textAlign:
        'right',

      color:
        colors.text.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },

      driverCounter: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.light,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  driverCounterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  driverCounterIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primaryLight,
    marginRight: spacing.sm,
  },

  driverCounterInfo: {
    flex: 1,
  },

  driverCounterTitle: {
    color: colors.text.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.sm,
  },

  driverCounterSubtitle: {
    marginTop: 2,
    color: colors.text.tertiary,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.sm,
  },


  /* ============================================================
    STEPPER
    ============================================================ */

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',

    padding: 3,
    borderRadius: radii.lg,

    backgroundColor: colors.background.default,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background.surface,
  },

  stepperButtonDisabled: {
    opacity: 0.45,
  },

  stepperValueContainer: {
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },

  stepperValue: {
    color: colors.brand.primaryDark,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.bold,
  },

  stepperUnit: {
    marginTop: -2,
    color: colors.text.tertiary,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
  },


  /* ============================================================
    MISSION PREVIEW
    ============================================================ */

  previewCard: {
    marginTop: spacing.lg,
    overflow: 'hidden',

    backgroundColor: colors.background.surface,

    borderRadius: radii.xl,

    borderWidth: 1,
    borderColor: colors.border.light,

    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.brand.primaryLight,

    marginRight: spacing.sm,
  },

  previewEyebrow: {
    color: colors.brand.primary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.xs,
    letterSpacing: 0.7,
  },

  previewTitle: {
    marginTop: 1,
    color: colors.text.primary,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.md,
  },

  previewBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,

    borderRadius: radii.md,

    backgroundColor: colors.background.default,

    borderWidth: 1,
    borderColor: colors.border.light,
  },

  previewBadgeText: {
    color: colors.text.secondary,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    borderRadius: radii.lg
  },


  /* ============================================================
    PREVIEW HIGHLIGHT
    ============================================================ */

  previewHighlight: {
    marginHorizontal: spacing.sm,
    padding: spacing.md,

    borderRadius: radii.lg,

    backgroundColor: colors.background.surfaceAlt,
  },

  previewHighlightLabel: {
    color: colors.brand.primary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },

  previewHighlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  previewNumber: {
    color: colors.brand.primaryDark,
    fontSize: fontSizes.xxl,
    lineHeight: lineHeights.xxl,
    fontWeight: fontWeights.bold,
  },

  previewNumberInfo: {
    marginLeft: spacing.sm,
  },

  previewNumberUnit: {
    color: colors.brand.primaryDark,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.sm,
  },

  previewNumberHint: {
    marginTop: 1,
    color: colors.text.secondary,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.sm,
  },


  /* ============================================================
    PREVIEW BLOCK
    ============================================================ */

  previewBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },

  previewLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  previewLabel: {
    marginLeft: 4,
    color: colors.text.secondary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semiBold,
  },

  previewChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,

    backgroundColor: colors.brand.primaryLight,
  },

  previewChipText: {
    marginLeft: 4,
    color: colors.brand.primaryDark,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semiBold,
  },

  previewEmpty: {
    color: colors.text.tertiary,
    fontSize: fontSizes.xs,
  },


  /* ============================================================
    PREVIEW INFO
    ============================================================ */

  previewInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,

    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  previewInfoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.brand.primaryLight,

    marginRight: spacing.sm,
  },

  previewInfoContent: {
    flex: 1,
  },

  previewInfoLabel: {
    color: colors.text.secondary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },

  previewInfoValue: {
    marginTop: 2,
    color: colors.text.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.sm,
  },


  /* ============================================================
    PREVIEW DESCRIPTION
    ============================================================ */

  previewDescription: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,

    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  previewDescriptionLabel: {
    color: colors.text.secondary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semiBold,
  },

  previewDescriptionText: {
    marginTop: spacing.xs,
    color: colors.text.primary,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.md,
  },


  /* ============================================================
    PREVIEW FOOTER
    ============================================================ */

  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: spacing.md,
    padding: spacing.sm,

    backgroundColor: colors.background.default,
  },

  previewFooterText: {
    flex: 1,

    marginLeft: spacing.xs,

    color: colors.text.secondary,

    fontSize: fontSizes.xs,
    lineHeight: lineHeights.sm,
  },
    /* --------------------------------------------------------
       BOUTON
       -------------------------------------------------------- */

    submitButton: {
      marginTop:
        spacing.lg,
    },


    footerHint: {
      marginTop:
        spacing.sm,

      marginHorizontal:
        spacing.md,

      textAlign:
        'center',

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },

  });