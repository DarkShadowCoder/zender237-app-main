import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  createJobRequest,
  updateMyJobRequest,
  loadKmerDiasporaCities,
} from '../../services/kmerDiasporaService';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  Input,
  ChoiceGroup,
  Button,
  KdScreen,
  KdFormSection,
  InfoBanner,
} from './components/KdUI';

import SelectField from '../../components/SelectField';

import {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  lineHeights,
  typography,
  countries,
} from '../../theme/theme';


const RESIDENCE_COUNTRIES = [
  'cameroun',
  'mali',
  'guinee',
];


function CountryDropdown({
  label,
  value,
  options,
  onChange,
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const selectedCountry =
    countries[value];

  return (
    <View
      style={
        styles.countryDropdownContainer
      }
    >
      <SelectField
        label={label}
        valueLabel={
          selectedCountry
            ? `${selectedCountry.flag} ${selectedCountry.label}`
            : undefined
        }
        placeholder="Sélectionner"
        onPress={() =>
          setOpen(
            (current) =>
              !current
          )
        }
      />

      {open ? (
        <View
          style={
            styles.countryDropdown
          }
        >
          {options.map(
            (countryKey) => {
              const item =
                countries[
                  countryKey
                ];

              const selected =
                countryKey ===
                value;

              return (
                <Pressable
                  key={
                    countryKey
                  }
                  onPress={() => {
                    onChange(
                      countryKey
                    );

                    setOpen(
                      false
                    );
                  }}
                  style={[
                    styles.countryDropdownOption,

                    selected &&
                      styles.countryDropdownOptionSelected,
                  ]}
                >
                  <Text
                    style={
                      styles.countryDropdownFlag
                    }
                  >
                    {
                      item.flag
                    }
                  </Text>

                  <Text
                    style={[
                      typography.caption,
                      styles.countryDropdownText,

                      selected &&
                        styles.countryDropdownTextSelected,
                    ]}
                  >
                    {
                      item.label
                    }
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>
      ) : null}
    </View>
  );
}


export default function CreateJobRequestScreen({
  route,
  navigation,
}) {
  const {
    profile,
  } = useAuth();

  const existing =
    route.params?.item;

  const [
    country,
    setCountry,
  ] = useState(
    existing?.country ||
      profile?.country ||
      'cameroun'
  );

  const [
    fullName,
    setFullName,
  ] = useState(
    existing?.full_name ||
      profile?.username ||
      ''
  );

  const [
    city,
    setCity,
  ] = useState(
    existing?.city || ''
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

    const loadCities =
      async () => {
        try {
          const cities =
            await loadKmerDiasporaCities({
              forceRefresh:
                true,
            });

          if (!mounted) {
            return;
          }

          const merged =
            existing?.city &&
            !cities.includes(
              existing.city
            )
              ? [
                  existing.city,
                  ...cities,
                ]
              : cities;

          setAvailableCities(
            merged
          );

          if (
            !city &&
            merged.length ===
              1
          ) {
            setCity(
              merged[0]
            );
          }
        } catch (
          error
        ) {
          if (mounted) {
            Alert.alert(
              'Villes indisponibles',
              error?.message ||
                'Impossible de charger les villes disponibles.'
            );
          }
        } finally {
          if (mounted) {
            setCitiesLoading(
              false
            );
          }
        }
      };

    loadCities();

    return () => {
      mounted = false;
    };
  }, [
    existing?.city,
  ]);


  const [
    mobilityArea,
    setMobilityArea,
  ] = useState(
    existing?.mobility_area ||
      ''
  );

  const [
    title,
    setTitle,
  ] = useState(
    existing?.title || ''
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


  /* ==========================================================
   * SUBMIT
   * ========================================================== */

  const submit =
    async () => {
      if (
        !country ||
        !fullName.trim() ||
        !city ||
        !mobilityArea.trim()
      ) {
        Alert.alert(
          'Informations manquantes',
          'Le pays, le nom, la ville et la zone de mobilité sont obligatoires.'
        );

        return;
      }

      setLoading(
        true
      );

      try {
        if (existing) {
          await updateMyJobRequest({
            requestId:
              existing.id,

            updates: {
              country,

              full_name:
                fullName.trim(),

              city,

              mobility_area:
                mobilityArea,

              title,

              description,
            },
          });

          navigation.goBack();
        } else {
          const item =
            await createJobRequest({
              country,

              fullName,

              city,

              mobilityArea,

              title,

              description,
            });

          navigation.replace(
            'JobRequestDetail',
            {
              requestId:
                item.id,
            }
          );
        }
      } catch (
        e
      ) {
        Alert.alert(
          'Impossible d’enregistrer',
          e.message
        );
      } finally {
        setLoading(
          false
        );
      }
    };


  /* ==========================================================
   * PREVIEW
   * ========================================================== */

  const previewTitle =
    title.trim() ||
    'Poste recherché';

  const previewName =
    fullName.trim() ||
    'Votre nom';

  const previewMobility =
    mobilityArea.trim();


  return (
    <KdScreen
      title={
        existing
          ? 'Modifier la demande'
          : 'Créer un besoin de position'
      }
      scrollView={
        ScrollView
      }
    >
      {/* ======================================================
          LOCALISATION & IDENTITE
          ====================================================== */}

      <KdFormSection
        title="Localisation & identité"
      >
        <CountryDropdown
          label="Pays de résidence"
          value={
            country
          }
          options={
            RESIDENCE_COUNTRIES
          }
          onChange={
            setCountry
          }
        />

        <Input
          label="Nom complet"
          value={
            fullName
          }
          onChangeText={
            setFullName
          }
          placeholder="Jean Dupont"
          autoCapitalize="words"
        />

        <ChoiceGroup
          label="Ville"
          value={
            city
          }
          options={
            citiesLoading
              ? []
              : availableCities
          }
          onChange={
            setCity
          }
        />

        <Input
          label="Zone de mobilité"
          value={
            mobilityArea
          }
          onChangeText={
            setMobilityArea
          }
          placeholder="Siguiri, Kokoyo..."
        />
      </KdFormSection>


      {/* ======================================================
          POSTE RECHERCHE
          ====================================================== */}

      <KdFormSection
        title="Poste recherché"
      >
        <Input
          label="Intitulé"
          value={
            title
          }
          onChangeText={
            setTitle
          }
          placeholder="Chauffeur poids lourd"
        />

        <Input
          label="Description"
          value={
            description
          }
          onChangeText={
            setDescription
          }
          placeholder="Décrivez votre expérience et disponibilité…"
          multiline
          numberOfLines={
            5
          }
          textAlignVertical="top"
          style={
            styles.descriptionInput
          }
        />
      </KdFormSection>


      {/* ======================================================
          APERCU DU PROFIL
          ====================================================== */}

      <View
        style={
          styles.previewCard
        }
      >
        {/* ----------------------------------------------------
            HEADER
            ---------------------------------------------------- */}

        <View
          style={
            styles.previewHeader
          }
        >
          <View
            style={
              styles.previewHeaderLeft
            }
          >
            <View
              style={
                styles.previewIcon
              }
            >
              <Ionicons
                name="eye-outline"
                size={
                  17
                }
                color={
                  colors.brand.primary
                }
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
                  typography.caption,
                  styles.previewTitleLabel,
                ]}
              >
                Votre demande
              </Text>
            </View>
          </View>

          <View
            style={
              styles.previewBadge
            }
          >
            <Text
              style={[
                typography.caption,
                styles.previewBadgeText,
              ]}
            >
              {
                existing
                  ? 'Modification'
                  : 'Brouillon'
              }
            </Text>
          </View>
        </View>


        {/* ----------------------------------------------------
            HERO POSTE
            ---------------------------------------------------- */}

        <View
          style={
            styles.previewHero
          }
        >
          <Text
            style={[
              typography.caption,
              styles.previewHeroEyebrow,
            ]}
          >
            POSTE RECHERCHÉ
          </Text>

          <Text
            style={[
              typography.caption,
              styles.previewJobTitle,
            ]}
            numberOfLines={
              2
            }
          >
            {
              previewTitle
            }
          </Text>

          <View
            style={
              styles.previewCandidate
            }
          >
            <View
              style={
                styles.previewAvatar
              }
            >
              <Ionicons
                name="person-outline"
                size={
                  18
                }
                color={
                  colors.brand.primary
                }
              />
            </View>

            <View
              style={
                styles.previewCandidateText
              }
            >
              <Text
                style={[
                  typography.body,
                  styles.previewCandidateName,
                ]}
                numberOfLines={
                  1
                }
              >
                {
                  previewName
                }
              </Text>

              <Text
                style={[
                  typography.caption,
                  styles.previewCandidateRole,
                ]}
              >
                Candidat KmerDiaspora
              </Text>
            </View>
          </View>
        </View>


        {/* ----------------------------------------------------
            LOCALISATION
            ---------------------------------------------------- */}

        <View
          style={
            styles.previewBlock
          }
        >
          <View
            style={
              styles.previewSectionLabel
            }
          >
            <Ionicons
              name="location-outline"
              size={
                15
              }
              color={
                colors.brand.primary
              }
            />

            <Text
              style={[
                typography.caption,
                styles.previewLabelText,
              ]}
            >
              Localisation
            </Text>
          </View>

          <View
            style={
              styles.previewLocationGrid
            }
          >
            <View
              style={
                styles.previewLocationItem
              }
            >
              <Text
                style={[
                  typography.caption,
                  styles.previewItemLabel,
                ]}
              >
                Ville
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.previewItemValue,
                ]}
              >
                {
                  city ||
                  'Non sélectionnée'
                }
              </Text>
            </View>
          </View>
        </View>


        {/* ----------------------------------------------------
            MOBILITE
            ---------------------------------------------------- */}

        {
          previewMobility ? (
            <View
              style={
                styles.previewInfoRow
              }
            >
              <View
                style={
                  styles.previewInfoIcon
                }
              >
                <Ionicons
                  name="navigate-outline"
                  size={
                    14
                  }
                  color={
                    colors.brand.primary
                  }
                />
              </View>

              <View
                style={
                  styles.previewInfoContent
                }
              >
                <Text
                  style={[
                    typography.caption,
                    styles.previewInfoLabel,
                  ]}
                >
                  Zone de mobilité
                </Text>

                <Text
                  style={[
                    typography.body,
                    styles.previewInfoValue,
                  ]}
                  numberOfLines={
                    2
                  }
                >
                  {
                    previewMobility
                  }
                </Text>
              </View>
            </View>
          ) : null
        }


        {/* ----------------------------------------------------
            DESCRIPTION
            ---------------------------------------------------- */}

        {
          description.trim() ? (
            <View
              style={
                styles.previewDescription
              }
            >
              <Text
                style={[
                  typography.caption,
                  styles.previewDescriptionLabel,
                ]}
              >
                À propos du profil
              </Text>

              <Text
                style={[
                  typography.body,
                  styles.previewDescriptionText,
                ]}
                numberOfLines={
                  4
                }
              >
                {
                  description.trim()
                }
              </Text>
            </View>
          ) : null
        }


        {/* ----------------------------------------------------
            FOOTER
            ---------------------------------------------------- */}

        <View
          style={
            styles.previewFooter
          }
        >
          <Ionicons
            name="sparkles-outline"
            size={
              14
            }
            color={
              colors.brand.primary
            }
          />

          <Text
            style={[
              typography.caption,
              styles.previewFooterText,
            ]}
          >
            Votre profil pourra être proposé aux recruteurs dont les besoins correspondent le mieux à votre profil.
          </Text>
        </View>
      </View>


      {/* ======================================================
          ACTION
          ====================================================== */}

      <Button
        title={
          existing
            ? 'Enregistrer les modifications'
            : 'Publier ma demande'
        }
        onPress={
          submit
        }
        loading={
          loading
        }
        style={
          styles.button
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

    button: {
      marginTop:
        spacing.lg,
    },


    descriptionInput: {
      minHeight:
        110,

      paddingTop:
        spacing.sm,
    },


    /* ========================================================
       DROPDOWN PAYS
       ======================================================== */

    countryDropdownContainer: {
      position:
        'relative',

      zIndex:
        50,
    },


    countryDropdown: {
      position:
        'absolute',

      top:
        70,

      left:
        0,

      right:
        0,

      zIndex:
        100,

      backgroundColor:
        colors.background.surface,

      borderRadius:
        radii.md,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      overflow:
        'hidden',

      elevation:
        4,

      shadowColor:
        '#000',

      shadowOpacity:
        0.08,

      shadowRadius:
        8,

      shadowOffset: {
        width:
          0,

        height:
          3,
      },
    },


    countryDropdownOption: {
      flexDirection:
        'row',

      alignItems:
        'center',

      minHeight:
        50,

      paddingHorizontal:
        spacing.md,

      paddingVertical:
        spacing.sm,

      borderBottomWidth:
        1,

      borderBottomColor:
        colors.border.light,

      backgroundColor:
        colors.background.surface,
    },


    countryDropdownOptionSelected: {
      backgroundColor:
        colors.brand.primaryLight,
    },


    countryDropdownFlag: {
      fontSize:
        20,

      marginRight:
        spacing.sm,
    },


    countryDropdownText: {
      color:
        colors.text.primary,

      flex:
        1,
    },


    countryDropdownTextSelected: {
      color:
        colors.brand.primaryDark,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       PREVIEW
       ======================================================== */

    previewCard: {
      marginTop:
        spacing.lg,

      overflow:
        'hidden',

      backgroundColor:
        colors.background.surface,

      borderRadius:
        radii.xl,

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
        width:
          0,

        height:
          5,
      },

      elevation:
        3,
    },


    previewHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal:
        spacing.md,

      paddingTop:
        spacing.md,

      paddingBottom:
        spacing.sm,
    },


    previewHeaderLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flex:
        1,
    },


    previewIcon: {
      width:
        36,

      height:
        36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    previewEyebrow: {
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


    previewTitleLabel: {
      marginTop:
        1,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.md,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.semiBold,
    },


    previewBadge: {
      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        4,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.background.default,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    previewBadgeText: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.md,

      fontWeight:
        fontWeights.medium,
    },


    /* ========================================================
       HERO
       ======================================================== */

    previewHero: {
      marginHorizontal:
        spacing.sm,

      padding:
        spacing.md,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.brand.primaryLight,
    },


    previewHeroEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.6,
    },


    previewJobTitle: {
      fontSize:
        fontSizes.lg,

      lineHeight:
        lineHeights.lg,

      fontWeight:
        fontWeights.semiBold,
    },


    previewCandidate: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.md,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        'rgba(0,0,0,0.06)',
    },


    previewAvatar: {
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
        colors.background.surface,

      marginRight:
        spacing.sm,
    },


    previewCandidateText: {
      flex:
        1,
    },


    previewCandidateName: {
      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    previewCandidateRole: {
      marginTop:
        1,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },


    /* ========================================================
       LOCALISATION
       ======================================================== */

    previewBlock: {
      paddingHorizontal:
        spacing.md,

      paddingTop:
        spacing.md,
    },


    previewSectionLabel: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        spacing.xs,
    },


    previewLabelText: {
      marginLeft:
        4,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    previewLocationGrid: {
      flexDirection:
        'row',

      gap:
        spacing.sm,
    },


    previewLocationItem: {
      flex:
        1,

      padding:
        spacing.sm,

      borderRadius:
        radii.md,

      backgroundColor:
        colors.background.default,

      borderWidth:
        1,

      borderColor:
        colors.border.light,
    },


    previewItemLabel: {
      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,
    },


    previewItemValue: {
      marginTop:
        3,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       INFO
       ======================================================== */

    previewInfoRow: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginHorizontal:
        spacing.md,

      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    previewInfoIcon: {
      width:
        28,

      height:
        28,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,

      marginRight:
        spacing.sm,
    },


    previewInfoContent: {
      flex:
        1,
    },


    previewInfoLabel: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.medium,
    },


    previewInfoValue: {
      marginTop:
        2,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    /* ========================================================
       DESCRIPTION
       ======================================================== */

    previewDescription: {
      marginHorizontal:
        spacing.md,

      marginTop:
        spacing.md,

      paddingTop:
        spacing.md,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    previewDescriptionLabel: {
      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.xs,

      fontWeight:
        fontWeights.semiBold,
    },


    previewDescriptionText: {
      marginTop:
        spacing.xs,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      lineHeight:
        lineHeights.md,
    },


    /* ========================================================
       FOOTER
       ======================================================== */

    previewFooter: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.md,

      padding:
        spacing.sm,

      backgroundColor:
        colors.background.default,
    },


    previewFooterText: {
      flex:
        1,

      marginLeft:
        spacing.xs,

      color:
        colors.text.secondary,

      fontSize:
        fontSizes.xs,

      lineHeight:
        lineHeights.sm,
    },

  });