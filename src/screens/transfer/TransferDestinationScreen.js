import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
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
  colors,
  typography,
  spacing,
  countries,
  paymentMethods,
  radii,
} from '../../theme/theme';

import Header from '../../components/Header';
import Button from '../../components/Button';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  verifySelectedCountry,
} from '../../services/locationService';


/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

const METHOD_ORDER =
  Object.keys(
    paymentMethods
  );


const SUPPORTED_COUNTRIES = [
  'cameroun',
  'guinee',
  'mali',
];


/**
 * Étape 1 du transfert.
 *
 * Le pays n'est plus déterminé au chargement de l'écran.
 *
 * Nouveau parcours :
 *
 *     Je suis au...
 *          ↓
 *     Pays destination
 *          ↓
 *       Continuer
 *          ↓
 *      Vérification GPS
 *          ↓
 *        Succès
 *          ↓
 *     Destinataire
 */
export default function TransferDestinationScreen({
  navigation,
}) {
  const {
    user,
    profile,
  } = useAuth();


  /*
   * ----------------------------------------------------------
   * PAYS DU PROFIL
   * ----------------------------------------------------------
   *
   * Il sert uniquement de valeur proposée.
   * Il n'est PAS considéré comme vérifié.
   */

  const profileCountry =
    profile?.country &&
    countries[
      profile.country
    ]
      ? profile.country
      : null;


  /*
   * ----------------------------------------------------------
   * ÉTAT
   * ----------------------------------------------------------
   */

  const [
    senderCountry,
    setSenderCountry,
  ] = useState(
    profileCountry
  );


  const [
    countryPickerOpen,
    setCountryPickerOpen,
  ] = useState(false);


  const [
    country,
    setCountry,
  ] = useState(null);


  const [
    method,
    setMethod,
  ] = useState(
    METHOD_ORDER[1] ||
      METHOD_ORDER[0]
  );


  const [
    verifying,
    setVerifying,
  ] = useState(false);


  const [
    verificationError,
    setVerificationError,
  ] = useState(null);


  const [
    mismatch,
    setMismatch,
  ] = useState(null);


  /*
   * ----------------------------------------------------------
   * PAYS INITIAL DU PROFIL
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (
      profileCountry &&
      !senderCountry
    ) {
      setSenderCountry(
        profileCountry
      );
    }
  }, [
    profileCountry,
  ]);


  /*
   * ----------------------------------------------------------
   * DESTINATION PAR DÉFAUT
   * ----------------------------------------------------------
   *
   * On prend simplement le premier pays
   * qui n'est pas le pays de départ.
   */

  useEffect(() => {
    if (
      !senderCountry
    ) {
      setCountry(null);
      return;
    }


    const firstDestination =
      SUPPORTED_COUNTRIES.find(
        (item) =>
          item !==
          senderCountry
      ) ||
      null;


    setCountry(
      (current) => {
        if (
          current &&
          current !==
            senderCountry
        ) {
          return current;
        }

        return firstDestination;
      }
    );
  }, [
    senderCountry,
  ]);


  /*
   * ----------------------------------------------------------
   * OBJETS PAYS
   * ----------------------------------------------------------
   */

  const selectedSender =
    useMemo(
      () =>
        senderCountry
          ? countries[
              senderCountry
            ]
          : null,
      [
        senderCountry,
      ]
    );


  const selectedDestination =
    useMemo(
      () =>
        country
          ? countries[
              country
            ]
          : null,
      [
        country,
      ]
    );


  /*
   * ----------------------------------------------------------
   * CHOIX DU PAYS DE DÉPART
   * ----------------------------------------------------------
   */

  const selectSenderCountry =
    (value) => {
      setSenderCountry(
        value
      );

      setVerificationError(
        null
      );

      setMismatch(
        null
      );

      setCountryPickerOpen(
        false
      );
    };


  /*
   * ----------------------------------------------------------
   * CHOIX DU PAYS D'ARRIVÉE
   * ----------------------------------------------------------
   */

  const selectDestination =
    (value) => {
      if (
        value ===
        senderCountry
      ) {
        return;
      }

      setCountry(
        value
      );
    };


  /*
   * ----------------------------------------------------------
   * MÉTHODE
   * ----------------------------------------------------------
   */

  const cycleMethod =
    () => {
      if (
        METHOD_ORDER.length <
        2
      ) {
        return;
      }

      const index =
        METHOD_ORDER.indexOf(
          method
        );

      const nextIndex =
        (
          index + 1
        ) %
        METHOD_ORDER.length;

      setMethod(
        METHOD_ORDER[
          nextIndex
        ]
      );
    };


  /*
   * ==========================================================
   * CONTINUER
   * ==========================================================
   */

  const continueToTransfer =
    async () => {
      setVerificationError(
        null
      );

      setMismatch(
        null
      );


      /*
       * Utilisateur
       */

      if (
        !user?.id
      ) {
        setVerificationError(
          'Votre session est terminée. Reconnectez-vous.'
        );

        return;
      }


      /*
       * Pays départ
       */

      if (
        !senderCountry
      ) {
        setVerificationError(
          'Choisissez le pays où vous êtes.'
        );

        return;
      }


      /*
       * Pays destination
       */

      if (
        !country
      ) {
        setVerificationError(
          'Choisissez le pays du destinataire.'
        );

        return;
      }


      /*
       * Même pays
       */

      if (
        senderCountry ===
        country
      ) {
        setVerificationError(
          'Le pays de départ et le pays d’arrivée doivent être différents.'
        );

        return;
      }


      /*
       * ------------------------------------------------------
       * GPS
       * ------------------------------------------------------
       *
       * Le loader n'occupe plus tout l'écran.
       * Il n'apparait qu'après le clic sur Continuer.
       */

      setVerifying(
        true
      );


      try {
        const result =
          await verifySelectedCountry({
            userId:
              user.id,

            selectedCountry:
              senderCountry,
          });


        /*
         * Pays différent
         */

        if (
          !result?.verified
        ) {
          setMismatch(
            result
          );

          return;
        }


        /*
         * Pays confirmé
         *
         * On continue le parcours.
         */

        navigation.navigate(
          'TransferRecipient',
          {
            country,

            method,

            fromCountry:
              result.selectedCountry,
          }
        );
      } catch (
        error
      ) {
        setVerificationError(
          error?.message ||
            'La position n’a pas pu être vérifiée. Réessayez.'
        );
      } finally {
        setVerifying(
          false
        );
      }
    };


  /*
   * ==========================================================
   * INTERFACE
   * ==========================================================
   */

  return (
    <>
      <ScrollView
        style={
          styles.wrapper
        }
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <Header
          title="Nouveau transfert"
        />


        {/* -------------------------------------------------- */}
        {/* TITRE */}
        {/* -------------------------------------------------- */}

        <Text
          style={[
            typography.h2,
            styles.title,
          ]}
        >
          Où êtes-vous ?
        </Text>


        <Text
          style={[
            typography.caption,
            styles.subtitle,
          ]}
        >
          Choisissez votre pays. Votre téléphone va ensuite le vérifier.
        </Text>


        {/* -------------------------------------------------- */}
        {/* PAYS DE DÉPART */}
        {/* -------------------------------------------------- */}

        <Pressable
          onPress={() =>
            setCountryPickerOpen(
              true
            )
          }
          style={
            styles.countrySelector
          }
        >
          <View
            style={
              styles.countrySelectorIcon
            }
          >
            <Ionicons
              name="location-outline"
              size={22}
              color={
                colors.brand
                  .primary
              }
            />
          </View>


          <View
            style={
              styles.countrySelectorText
            }
          >
            <Text
              style={
                typography.caption
              }
            >
              Je suis au
            </Text>


            {selectedSender ? (
              <Text
                style={
                  styles.countryValue
                }
              >
                {
                  selectedSender.flag
                }{' '}
                {
                  selectedSender.label
                }
              </Text>
            ) : (
              <Text
                style={
                  styles.countryPlaceholder
                }
              >
                Choisir mon pays
              </Text>
            )}
          </View>


          <Ionicons
            name="chevron-down"
            size={20}
            color={
              colors.icon.muted
            }
          />
        </Pressable>


        {/* -------------------------------------------------- */}
        {/* DESTINATION */}
        {/* -------------------------------------------------- */}

        <Text
          style={
            styles.sectionLabel
          }
        >
          Pays du destinataire
        </Text>


        <View
          style={
            styles.destinationGrid
          }
        >
          {SUPPORTED_COUNTRIES.map(
            (destination) => {
              const item =
                countries[
                  destination
                ];

              const isCurrent =
                destination ===
                senderCountry;

              const selected =
                destination ===
                country;

              return (
                <Pressable
                  key={
                    destination
                  }
                  disabled={
                    isCurrent
                  }
                  onPress={() =>
                    selectDestination(
                      destination
                    )
                  }
                  style={[
                    styles.destinationCard,

                    selected &&
                      styles.destinationCardSelected,

                    isCurrent &&
                      styles.destinationCardDisabled,
                  ]}
                >
                  <Text
                    style={
                      styles.flag
                    }
                  >
                    {
                      item.flag
                    }
                  </Text>


                  <Text
                    style={[
                      typography.caption,
                      styles.destinationText,
                    ]}
                  >
                    {
                      item.label
                    }
                  </Text>


                  {selected ? (
                    <View
                      style={
                        styles.check
                      }
                    >
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={
                          colors.text.inverse
                        }
                      />
                    </View>
                  ) : null}
                </Pressable>
              );
            }
          )}
        </View>


        {/* -------------------------------------------------- */}
        {/* MOYEN DE PAIEMENT */}
        {/* -------------------------------------------------- */}

        <Pressable
          onPress={
            cycleMethod
          }
          style={
            styles.methodCard
          }
        >
          <View
            style={
              styles.methodIcon
            }
          >
            <Ionicons
              name="phone-portrait-outline"
              size={21}
              color={
                colors.brand
                  .primary
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
                typography.caption
              }
            >
              Paiement
            </Text>

            <Text
              style={
                styles.methodValue
              }
            >
              {
                paymentMethods[
                  method
                ]?.label ||
                'Mobile Money'
              }
            </Text>
          </View>


          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              colors.icon.muted
            }
          />
        </Pressable>


        {/* -------------------------------------------------- */}
        {/* ERREUR */}
        {/* -------------------------------------------------- */}

        {verificationError ? (
          <View
            style={
              styles.errorCard
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color={
                colors.error
                  .default
              }
            />


            <Text
              style={
                styles.errorText
              }
            >
              {
                verificationError
              }
            </Text>
          </View>
        ) : null}


        {/* -------------------------------------------------- */}
        {/* BOUTON */}
        {/* -------------------------------------------------- */}

        <Button
          title="Continuer"
          disabled={
            !senderCountry ||
            !country ||
            verifying
          }
          onPress={
            continueToTransfer
          }
          style={
            styles.button
          }
        />
      </ScrollView>


      {/* ==================================================== */}
      {/* MODAL CHOIX DU PAYS */}
      {/* ==================================================== */}

      <Modal
        visible={
          countryPickerOpen
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCountryPickerOpen(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setCountryPickerOpen(
              false
            )
          }
        >
          <Pressable
            style={
              styles.countryModal
            }
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <Text
              style={
                typography.h2
              }
            >
              Votre pays
            </Text>


            <Text
              style={[
                typography.caption,
                styles.modalSubtitle,
              ]}
            >
              Où êtes-vous maintenant ?
            </Text>


            {SUPPORTED_COUNTRIES.map(
              (
                itemKey
              ) => {
                const item =
                  countries[
                    itemKey
                  ];

                const selected =
                  itemKey ===
                  senderCountry;

                return (
                  <Pressable
                    key={
                      itemKey
                    }
                    onPress={() =>
                      selectSenderCountry(
                        itemKey
                      )
                    }
                    style={[
                      styles.countryOption,

                      selected &&
                        styles.countryOptionSelected,
                    ]}
                  >
                    <Text
                      style={
                        styles.flag
                      }
                    >
                      {
                        item.flag
                      }
                    </Text>


                    <Text
                      style={[
                        typography.body,
                        styles.countryOptionText,
                      ]}
                    >
                      {
                        item.label
                      }
                    </Text>


                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={23}
                        color={
                          colors.brand
                            .primary
                        }
                      />
                    ) : null}
                  </Pressable>
                );
              }
            )}
          </Pressable>
        </Pressable>
      </Modal>


      {/* ==================================================== */}
      {/* MODAL VÉRIFICATION GPS */}
      {/* ==================================================== */}

      <Modal
        visible={
          verifying
        }
        transparent
        animationType="fade"
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.verificationModal
            }
          >
            <View
              style={
                styles.verificationIcon
              }
            >
              <Ionicons
                name="location-outline"
                size={30}
                color={
                  colors.brand
                    .primary
                }
              />
            </View>


            <Text
              style={
                typography.h2
              }
            >
              Vérification
            </Text>


            <Text
              style={[
                typography.caption,
                styles.verificationText,
              ]}
            >
              Nous vérifions que vous êtes bien au{' '}
              {
                selectedSender?.label ||
                'pays choisi'
              }.
            </Text>


            <ActivityIndicator
              size="large"
              color={
                colors.brand
                  .primary
              }
              style={
                styles.spinner
              }
            />
          </View>
        </View>
      </Modal>


      {/* ==================================================== */}
      {/* MODAL PAYS DIFFÉRENT */}
      {/* ==================================================== */}

      <Modal
        visible={
          !!mismatch
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setMismatch(
            null
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.verificationModal
            }
          >
            <View
              style={
                styles.warningIcon
              }
            >
              <Ionicons
                name="location-outline"
                size={30}
                color={
                  colors.error
                    .default
                }
              />
            </View>


            <Text
              style={
                typography.h2
              }
            >
              Pays différent
            </Text>


            <Text
              style={[
                typography.caption,
                styles.verificationText,
              ]}
            >
              Vous avez choisi{' '}

              <Text
                style={
                  styles.bold
                }
              >
                {
                  countries[
                    mismatch?.selectedCountry
                  ]?.label
                }
              </Text>

              , mais le téléphone indique{' '}

              <Text
                style={
                  styles.bold
                }
              >
                {
                  mismatch?.detectedCountry
                    ? countries[
                        mismatch
                          .detectedCountry
                      ]?.label
                    : 'un pays non pris en charge'
                }
              </Text>
              .
            </Text>


            <Button
              title="Choisir le bon pays"
              onPress={() =>
                setMismatch(
                  null
                )
              }
              style={
                styles.modalButton
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}


/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    wrapper: {
      flex: 1,

      backgroundColor:
        colors
          .background
          .default,
    },


    content: {
      padding:
        spacing
          .screenHorizontal,

      paddingBottom:
        spacing
          .xxxl,
    },


    title: {
      marginTop:
        spacing.xl,
    },


    subtitle: {
      marginTop:
        spacing.xs,

      marginBottom:
        spacing.xl,

      lineHeight:
        20,
    },


    countrySelector: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      minHeight:
        70,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      borderWidth:
        1,

      borderColor:
        colors
          .border
          .light,

      backgroundColor:
        colors
          .background
          .surface,
    },


    countrySelectorIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors
          .brand
          .primaryLight,
    },


    countrySelectorText: {
      flex: 1,
    },


    countryValue: {
      ...typography.body,

      fontWeight:
        '700',

      color:
        colors
          .text
          .primary,

      marginTop: 2,
    },


    countryPlaceholder: {
      ...typography.body,

      color:
        colors
          .text
          .secondary,

      marginTop: 2,
    },


    sectionLabel: {
      ...typography.caption,

      marginTop:
        spacing.xl,

      marginBottom:
        spacing.sm,
    },


    destinationGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        spacing.sm,
    },


    destinationCard: {
      width:
        '31%',

      minHeight:
        94,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        spacing.xs,

      borderRadius:
        radii.md,

      borderWidth:
        1,

      borderColor:
        colors
          .border
          .light,

      backgroundColor:
        colors
          .background
          .surface,

      position:
        'relative',
    },


    destinationCardSelected: {
      borderColor:
        colors
          .brand
          .primary,

      borderWidth:
        2,
    },


    destinationCardDisabled: {
      opacity:
        0.38,
    },


    flag: {
      fontSize:
        28,
    },


    destinationText: {
      marginTop:
        spacing.xs,

      textAlign:
        'center',
    },


    check: {
      position:
        'absolute',

      top: 7,
      right: 7,

      width: 20,
      height: 20,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors
          .brand
          .primary,
    },


    methodCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      marginTop:
        spacing.xl,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      borderWidth:
        1,

      borderColor:
        colors
          .border
          .light,

      backgroundColor:
        colors
          .background
          .surface,
    },


    methodIcon: {
      width: 42,
      height: 42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors
          .brand
          .primaryLight,
    },


    methodValue: {
      ...typography.body,

      fontWeight:
        '700',

      color:
        colors
          .text
          .primary,

      marginTop: 2,
    },


    errorCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      marginTop:
        spacing.lg,

      padding:
        spacing.md,

      borderRadius:
        radii.md,

      backgroundColor:
        colors
          .error
          .light,

      borderWidth:
        1,

      borderColor:
        colors
          .error
          .default,
    },


    errorText: {
      ...typography.caption,

      flex: 1,

      color:
        colors
          .error
          .default,
    },


    button: {
      marginTop:
        spacing.xl,
    },


    /*
     * --------------------------------------------------------
     * MODALS
     * --------------------------------------------------------
     */

    modalOverlay: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        spacing.xl,

      backgroundColor:
        'rgba(0,0,0,0.45)',
    },


    countryModal: {
      width:
        '100%',

      maxWidth:
        430,

      padding:
        spacing.xl,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors
          .background
          .surface,
    },


    modalSubtitle: {
      marginTop:
        spacing.xs,

      marginBottom:
        spacing.lg,
    },


    countryOption: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.md,

      minHeight:
        58,

      paddingHorizontal:
        spacing.md,

      borderRadius:
        radii.md,

      borderWidth:
        1,

      borderColor:
        colors
          .border
          .light,

      backgroundColor:
        colors
          .background
          .surface,

      marginBottom:
        spacing.sm,
    },


    countryOptionSelected: {
      borderColor:
        colors
          .brand
          .primary,

      backgroundColor:
        colors
          .brand
          .primaryLight,
    },


    countryOptionText: {
      flex: 1,
    },


    verificationModal: {
      width:
        '100%',

      maxWidth:
        410,

      padding:
        spacing.xl,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors
          .background
          .surface,

      alignItems:
        'center',
    },


    verificationIcon: {
      width:
        68,

      height:
        68,

      borderRadius:
        34,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors
          .brand
          .primaryLight,

      marginBottom:
        spacing.md,
    },


    warningIcon: {
      width:
        68,

      height:
        68,

      borderRadius:
        34,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors
          .error
          .light,

      marginBottom:
        spacing.md,
    },


    verificationText: {
      textAlign:
        'center',

      lineHeight:
        20,

      marginTop:
        spacing.sm,
    },


    spinner: {
      marginTop:
        spacing.lg,
    },


    modalButton: {
      width:
        '100%',

      marginTop:
        spacing.xl,
    },


    bold: {
      fontWeight:
        '800',

      color:
        colors
          .text
          .primary,
    },
  });