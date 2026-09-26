
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

import {
  fr,
} from 'date-fns/locale';

import {
  createQuest,
  searchZenderUsers,
} from '../../services/kmerDiasporaService';

import {
  useAuth,
} from '../../context/AuthContext';

import SecretCodeInput from '../../components/SecretCodeInput';

import {
  Input,
  ChoiceGroup,
  Button,
  KdScreen,
  KdFormSection,
} from './components/KdUI';

import {
  colors,
  spacing,
  typography,
  radii,
  fontSizes,
  fontWeights,
} from '../../theme/theme';


/* ============================================================
 * UTILITAIRES
 * ============================================================ */

function digits(value) {
  return String(
    value || ''
  ).replace(
    /\D/g,
    ''
  );
}


function formatAmount(value) {
  const d =
    digits(value);

  return d
    ? d.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ' '
      )
    : '';
}


function isoDate(date) {
  if (!date) {
    return null;
  }

  const safeDate =
    new Date(date);

  if (
    Number.isNaN(
      safeDate.getTime()
    )
  ) {
    return null;
  }

  /*
   * La date choisie correspond à la fin de la journée locale.
   */
  safeDate.setHours(
    23,
    59,
    59,
    999
  );

  return safeDate.toISOString();
}


/* ============================================================
 * COMPOSANT CALENDRIER
 * ============================================================ */

function DatePickerCalendar({
  visible,
  value,
  onClose,
  onSelect,
}) {
  const today =
    startOfDay(
      new Date()
    );


  const [
    currentMonth,
    setCurrentMonth,
  ] = useState(
    startOfMonth(
      value ||
        today
    )
  );


  useEffect(() => {
    if (visible) {
      setCurrentMonth(
        startOfMonth(
          value ||
            today
        )
      );
    }
  }, [
    visible,
    value,
  ]);


  const monthDays =
    useMemo(() => {

      const start =
        startOfWeek(
          startOfMonth(
            currentMonth
          ),
          {
            weekStartsOn: 1,
          }
        );

      const end =
        endOfWeek(
          endOfMonth(
            currentMonth
          ),
          {
            weekStartsOn: 1,
          }
        );

      return eachDayOfInterval({
        start,
        end,
      });

    }, [
      currentMonth,
    ]);


  const weekdays = [
    'L',
    'M',
    'M',
    'J',
    'V',
    'S',
    'D',
  ];


  const handlePreviousMonth =
    () => {
      const previous =
        subMonths(
          currentMonth,
          1
        );

      /*
       * On ne permet pas de naviguer
       * avant le mois courant.
       */
      if (
        !isBefore(
          previous,
          startOfMonth(today)
        )
      ) {
        setCurrentMonth(
          previous
        );
      }
    };


  const handleNextMonth =
    () => {
      setCurrentMonth(
        addMonths(
          currentMonth,
          1
        )
      );
    };


  const handleSelect =
    (date) => {

      /*
       * Impossible de sélectionner
       * une date passée.
       */
      if (
        isBefore(
          date,
          today
        )
      ) {
        return;
      }

      onSelect(
        date
      );

      onClose();
    };


  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >

      <View
        style={
          styles.modalOverlay
        }
      >

        <View
          style={
            styles.calendarModal
          }
        >

          {/* ==================================================
              ENTETE
              ================================================== */}

          <View
            style={
              styles.calendarHeader
            }
          >

            <View>
              <Text
                style={
                  styles.calendarEyebrow
                }
              >
                DATE LIMITE
              </Text>

              <Text
                style={
                  styles.calendarTitle
                }
              >
                Choisissez un jour
              </Text>
            </View>


            <Pressable
              onPress={
                onClose
              }
              style={
                styles.closeButton
              }
              hitSlop={10}
            >
              <Ionicons
                name="close"
                size={21}
                color={
                  colors.text.secondary
                }
              />
            </Pressable>

          </View>


          {/* ==================================================
              MOIS
              ================================================== */}

          <View
            style={
              styles.monthNavigation
            }
          >

            <Pressable
              onPress={
                handlePreviousMonth
              }
              disabled={
                isSameMonth(
                  currentMonth,
                  today
                )
              }
              style={[
                styles.monthButton,
                isSameMonth(
                  currentMonth,
                  today
                ) &&
                  styles.monthButtonDisabled,
              ]}
              hitSlop={8}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={
                  isSameMonth(
                    currentMonth,
                    today
                  )
                    ? colors.icon.muted
                    : colors.brand.primary
                }
              />
            </Pressable>


            <Text
              style={
                styles.monthTitle
              }
            >
              {format(
                currentMonth,
                'MMMM yyyy',
                {
                  locale: fr,
                }
              )}
            </Text>


            <Pressable
              onPress={
                handleNextMonth
              }
              style={
                styles.monthButton
              }
              hitSlop={8}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={
                  colors.brand.primary
                }
              />
            </Pressable>

          </View>


          {/* ==================================================
              JOURS DE LA SEMAINE
              ================================================== */}

          <View
            style={
              styles.weekdaysRow
            }
          >

            {weekdays.map(
              (
                day,
                index
              ) => (

                <View
                  key={`${day}-${index}`}
                  style={
                    styles.weekdayCell
                  }
                >

                  <Text
                    style={
                      styles.weekdayText
                    }
                  >
                    {day}
                  </Text>

                </View>

              )
            )}

          </View>


          {/* ==================================================
              CALENDRIER
              ================================================== */}

          <View
            style={
              styles.calendarGrid
            }
          >

            {monthDays.map(
              (
                date
              ) => {

                const disabled =
                  isBefore(
                    date,
                    today
                  );

                const selected =
                  value &&
                  isSameDay(
                    date,
                    value
                  );

                const todayDate =
                  isSameDay(
                    date,
                    today
                  );

                const inCurrentMonth =
                  isSameMonth(
                    date,
                    currentMonth
                  );


                return (
                  <Pressable
                    key={
                      date.toISOString()
                    }
                    onPress={() =>
                      handleSelect(
                        date
                      )
                    }
                    disabled={
                      disabled
                    }
                    style={[
                      styles.dayCell,

                      !inCurrentMonth &&
                        styles.dayOutsideMonth,

                      disabled &&
                        styles.dayDisabled,

                      selected &&
                        styles.daySelected,

                      todayDate &&
                        !selected &&
                        styles.dayToday,
                    ]}
                  >

                    <Text
                      style={[
                        styles.dayText,

                        !inCurrentMonth &&
                          styles.dayOutsideText,

                        disabled &&
                          styles.dayDisabledText,

                        selected &&
                          styles.daySelectedText,

                        todayDate &&
                          !selected &&
                          styles.dayTodayText,
                      ]}
                    >
                      {format(
                        date,
                        'd'
                      )}
                    </Text>

                  </Pressable>
                );
              }
            )}

          </View>


          {/* ==================================================
              AIDE
              ================================================== */}

          <View
            style={
              styles.calendarHint
            }
          >

            <Ionicons
              name="information-circle-outline"
              size={16}
              color={
                colors.text.tertiary
              }
            />

            <Text
              style={
                styles.calendarHintText
              }
            >
              Les dates déjà passées ne peuvent pas être sélectionnées.
            </Text>

          </View>

        </View>

      </View>

    </Modal>
  );
}


/* ============================================================
 * PAGE
 * ============================================================ */

export default function CreateQuestScreen({
  navigation,
}) {

  const {
    profile,
  } = useAuth();


  const [
    beneficiaryMode,
    setBeneficiaryMode,
  ] = useState(
    'Moi'
  );


  const [
    beneficiaryUserId,
    setBeneficiaryUserId,
  ] = useState(
    profile?.id ||
      ''
  );


  const [
    beneficiaryQuery,
    setBeneficiaryQuery,
  ] = useState(
    ''
  );


  const [
    beneficiaryResults,
    setBeneficiaryResults,
  ] = useState(
    []
  );


  const [
    searchingBeneficiary,
    setSearchingBeneficiary,
  ] = useState(
    false
  );


  const [
    selectedBeneficiary,
    setSelectedBeneficiary,
  ] = useState(
    null
  );


  const [
    title,
    setTitle,
  ] = useState(
    ''
  );


  const [
    description,
    setDescription,
  ] = useState(
    ''
  );


  const [
    targetAmount,
    setTargetAmount,
  ] = useState(
    ''
  );


  /*
   * Date sélectionnée sous forme d'objet Date.
   */
  const [
    durationEndDate,
    setDurationEndDate,
  ] = useState(
    null
  );


  /*
   * Contrôle d'ouverture du calendrier.
   */
  const [
    calendarVisible,
    setCalendarVisible,
  ] = useState(
    false
  );


  const [
    initialContribution,
    setInitialContribution,
  ] = useState(
    ''
  );


  const [
    secretCode,
    setSecretCode,
  ] = useState(
    ''
  );


  const [
    loading,
    setLoading,
  ] = useState(
    false
  );


  /* ==========================================================
   * RECHERCHE BENEFICIAIRE
   * ========================================================== */

  useEffect(() => {

    let active =
      true;


    const run =
      async () => {

        if (
          beneficiaryMode !==
            'Autre utilisateur' ||
          beneficiaryQuery
            .trim()
            .length < 2
        ) {

          setBeneficiaryResults(
            []
          );

          return;
        }


        setSearchingBeneficiary(
          true
        );


        try {

          const results =
            await searchZenderUsers(
              beneficiaryQuery
                .trim(),
              8
            );


          if (
            active
          ) {
            setBeneficiaryResults(
              results
            );
          }

        } catch (
          e
        ) {

          if (
            active
          ) {
            setBeneficiaryResults(
              []
            );
          }

        } finally {

          if (
            active
          ) {
            setSearchingBeneficiary(
              false
            );
          }
        }
      };


    const timer =
      setTimeout(
        run,
        250
      );


    return () => {
      active =
        false;

      clearTimeout(
        timer
      );
    };

  }, [
    beneficiaryMode,
    beneficiaryQuery,
  ]);


  /* ==========================================================
   * DATE FORMATEE
   * ========================================================== */

  const formattedDeadline =
    useMemo(() => {

      if (
        !durationEndDate
      ) {
        return '';
      }


      return format(
        durationEndDate,
        'd MMMM yyyy',
        {
          locale: fr,
        }
      );

    }, [
      durationEndDate,
    ]);


  /* ==========================================================
   * SOUMISSION
   * ========================================================== */

  const submit =
    async () => {

      const deadline =
        isoDate(
          durationEndDate
        );


      if (
        !title.trim() ||
        !deadline ||
        Number(
          initialContribution
            .replace(
              /\s/g,
              ''
            )
        ) <= 0 ||
        secretCode.length !==
          6
      ) {

        Alert.alert(
          'Informations incomplètes',
          'Le titre, la date limite, la contribution initiale et le code secret à 6 chiffres sont obligatoires.'
        );

        return;
      }


      if (
        beneficiaryMode ===
          'Autre utilisateur' &&
        !beneficiaryUserId.trim()
      ) {

        Alert.alert(
          'Bénéficiaire',
          'Recherchez puis sélectionnez un utilisateur authentifié.'
        );

        return;
      }


      setLoading(
        true
      );


      try {

        const q =
          await createQuest({
            beneficiaryUserId:
              beneficiaryMode ===
              'Moi'
                ? profile?.id
                : beneficiaryUserId.trim(),

            title:
              title.trim(),

            description:
              description.trim() ||
              null,

            targetAmount:
              targetAmount
                ? Number(
                    targetAmount.replace(
                      /\s/g,
                      ''
                    )
                  )
                : null,

            durationEnd:
              deadline,

            initialContribution:
              Number(
                initialContribution.replace(
                  /\s/g,
                  ''
                )
              ),

            secretCode,
          });


        Alert.alert(
          'Quête créée',

          beneficiaryMode ===
            'Autre utilisateur'
            ? 'Le bénéficiaire doit maintenant accepter la quête depuis son application.'
            : 'Votre contribution initiale a été enregistrée.',

          [
            {
              text:
                'Voir la quête',

              onPress:
                () =>
                  navigation.replace(
                    'QuestDetail',
                    {
                      questId:
                        q?.id ||
                        q,
                    }
                  ),
            },
          ]
        );

      } catch (
        e
      ) {

        Alert.alert(
          'Impossible de créer la quête',
          e?.message ||
            'Une erreur est survenue.'
        );

      } finally {

        setLoading(
          false
        );
      }
    };


  /* ==========================================================
   * RENDU
   * ========================================================== */

  return (
    <KdScreen
      title="Proposer une quête"
      scrollView={
        ScrollView
      }
    >

      {/* ======================================================
          BENEFICIAIRE
          ====================================================== */}

      <KdFormSection
        title="Bénéficiaire"
      >

        <ChoiceGroup
          label="Cette quête est pour"
          value={
            beneficiaryMode
          }
          options={[
            'Moi',
            'Autre utilisateur',
          ]}
          onChange={
            setBeneficiaryMode
          }
        />


        {beneficiaryMode ===
        'Autre utilisateur' ? (
          <>

            <Input
              label="Rechercher le bénéficiaire"
              value={
                beneficiaryQuery
              }
              onChangeText={(
                value
              ) => {

                setBeneficiaryQuery(
                  value
                );

                setSelectedBeneficiary(
                  null
                );

                setBeneficiaryUserId(
                  ''
                );
              }}
              placeholder="Nom d'utilisateur"
              autoCapitalize="none"
            />


            {searchingBeneficiary ? (

              <Text
                style={
                  styles.helper
                }
              >
                Recherche…
              </Text>

            ) : null}


            {beneficiaryResults.map(
              (
                user
              ) => (

                <Pressable
                  key={
                    user.id
                  }
                  onPress={() => {

                    setSelectedBeneficiary(
                      user
                    );

                    setBeneficiaryUserId(
                      user.id
                    );

                    setBeneficiaryResults(
                      []
                    );

                    setBeneficiaryQuery(
                      user.username
                    );
                  }}

                  style={[
                    styles.beneficiaryRow,

                    selectedBeneficiary?.id ===
                      user.id &&
                      styles.beneficiarySelected,
                  ]}
                >

                  <View
                    style={
                      styles.avatar
                    }
                  >

                    <Text
                      style={
                        styles.avatarText
                      }
                    >
                      {user.username
                        ?.slice(
                          0,
                          1
                        )
                        ?.toUpperCase() ||
                        '?'}
                    </Text>

                  </View>


                  <View
                    style={
                      styles.beneficiaryContent
                    }
                  >

                    <Text
                      style={
                        styles.userName
                      }
                    >
                      {user.username}
                    </Text>


                    <Text
                      style={
                        styles.userMeta
                      }
                    >
                      {user.country ||
                        'Pays non renseigné'}
                    </Text>

                  </View>


                  {selectedBeneficiary?.id ===
                  user.id ? (

                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={
                        colors.brand.primary
                      }
                    />

                  ) : null}

                </Pressable>

              )
            )}


            {selectedBeneficiary ? (

              <Text
                style={
                  styles.helper
                }
              >
                Bénéficiaire sélectionné : @
                {selectedBeneficiary.username}
              </Text>

            ) : null}

          </>
        ) : null}

      </KdFormSection>


      {/* ======================================================
          COLLECTE
          ====================================================== */}

      <KdFormSection
        title="Collecte"
      >

        <Input
          label="Titre"
          value={
            title
          }
          onChangeText={
            setTitle
          }
          placeholder="Soutien à la famille"
        />


        <Input
          label="Description"
          value={
            description
          }
          onChangeText={
            setDescription
          }
          placeholder="Expliquez la situation…"
          multiline
        />


        <Input
          label="Somme maximale à collecter (facultatif)"
          value={
            targetAmount
          }
          onChangeText={(
            value
          ) =>
            setTargetAmount(
              formatAmount(
                value
              )
            )
          }
          placeholder="1 000 000"
          keyboardType="number-pad"
        />


        {/* ====================================================
            CALENDRIER
            ==================================================== */}

        <View
          style={
            styles.dateFieldContainer
          }
        >

          <Text
            style={
              styles.dateLabel
            }
          >
            Date limite de cotisation
          </Text>


          <Pressable
            onPress={() =>
              setCalendarVisible(
                true
              )
            }
            style={[
              styles.datePickerButton,

              !durationEndDate &&
                styles.datePickerPlaceholder,
            ]}
          >

            <View
              style={
                styles.datePickerIcon
              }
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color={
                  colors.brand.primary
                }
              />
            </View>


            <View
              style={
                styles.datePickerContent
              }
            >

              <Text
                style={[
                  styles.datePickerText,

                  !durationEndDate &&
                    styles.datePickerTextPlaceholder,
                ]}
              >
                {formattedDeadline ||
                  'Choisir une date'}
              </Text>


              <Text
                style={
                  styles.datePickerHint
                }
              >
                Appuyez pour ouvrir le calendrier
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

        </View>


        <Input
          label="Ma contribution initiale"
          value={
            initialContribution
          }
          onChangeText={(
            value
          ) =>
            setInitialContribution(
              formatAmount(
                value
              )
            )
          }
          placeholder="50 000"
          keyboardType="number-pad"
        />


        <SecretCodeInput
          label="Code secret"
          value={
            secretCode
          }
          onChangeText={
            setSecretCode
          }
          error={null}
        />

      </KdFormSection>


      <Button
        title="Créer et contribuer"
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


      {/* ======================================================
          CALENDRIER
          ====================================================== */}

      <DatePickerCalendar
        visible={
          calendarVisible
        }
        value={
          durationEndDate
        }
        onClose={() =>
          setCalendarVisible(
            false
          )
        }
        onSelect={(
          selectedDate
        ) => {

          setDurationEndDate(
            startOfDay(
              selectedDate
            )
          );

        }}
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
       GENERAL
       ======================================================== */

    button: {
      marginTop:
        spacing.sm,
    },


    helper: {
      ...typography.caption,

      color:
        colors.text.tertiary,

      marginBottom:
        spacing.sm,
    },


    /* ========================================================
       BENEFICIAIRE
       ======================================================== */

    beneficiaryRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      padding:
        spacing.sm,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      borderRadius:
        12,

      marginBottom:
        spacing.xs,

      backgroundColor:
        colors.background.surface,
    },


    beneficiarySelected: {
      borderColor:
        colors.brand.primary,

      backgroundColor:
        colors.brand.primaryLight,
    },


    beneficiaryContent: {
      flex:
        1,
    },


    avatar: {
      width:
        38,

      height:
        38,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        colors.brand.primaryLight,
    },


    avatarText: {
      color:
        colors.brand.primary,

      fontWeight:
        '800',
    },


    userName: {
      ...typography.bodyBold,
    },


    userMeta: {
      ...typography.caption,

      color:
        colors.text.tertiary,
    },


    /* ========================================================
       DATE PICKER
       ======================================================== */

    dateFieldContainer: {
      marginTop:
        spacing.md,
    },


    dateLabel: {
      marginBottom:
        spacing.xs,

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    datePickerButton: {
      minHeight:
        64,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        spacing.sm,

      paddingVertical:
        spacing.sm,

      borderWidth:
        1,

      borderColor:
        colors.border.light,

      borderRadius:
        radii.lg,

      backgroundColor:
        colors.background.surface,
    },


    datePickerPlaceholder: {
      borderColor:
        colors.border.light,
    },


    datePickerIcon: {
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

      marginRight:
        spacing.sm,
    },


    datePickerContent: {
      flex:
        1,
    },


    datePickerText: {
      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    datePickerTextPlaceholder: {
      color:
        colors.text.tertiary,
    },


    datePickerHint: {
      marginTop:
        2,

      color:
        colors.text.tertiary,

      fontSize:
        fontSizes.xs,
    },


    /* ========================================================
       MODAL CALENDRIER
       ======================================================== */

    modalOverlay: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      padding:
        spacing.md,

      backgroundColor:
        'rgba(0, 0, 0, 0.45)',
    },


    calendarModal: {
      width:
        '100%',

      maxWidth:
        430,

      padding:
        spacing.md,

      borderRadius:
        radii.xl,

      backgroundColor:
        colors.background.surface,

      shadowColor:
        '#000',

      shadowOpacity:
        0.18,

      shadowRadius:
        20,

      shadowOffset: {
        width:
          0,

        height:
          8,
      },

      elevation:
        8,
    },


    calendarHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.md,
    },


    calendarEyebrow: {
      color:
        colors.brand.primary,

      fontSize:
        fontSizes.xs,

      fontWeight:
        fontWeights.bold,

      letterSpacing:
        0.7,
    },


    calendarTitle: {
      marginTop:
        3,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.lg,

      fontWeight:
        fontWeights.bold,
    },


    closeButton: {
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
        colors.background.muted,
    },


    monthNavigation: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        spacing.sm,
    },


    monthButton: {
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
    },


    monthButtonDisabled: {
      backgroundColor:
        colors.background.muted,
    },


    monthTitle: {
      flex:
        1,

      color:
        colors.brand.primaryDark,

      fontSize:
        fontSizes.md,

      fontWeight:
        fontWeights.bold,

      textAlign:
        'center',

      textTransform:
        'capitalize',
    },


    /* ========================================================
       WEEKDAYS
       ======================================================== */

    weekdaysRow: {
      flexDirection:
        'row',

      marginBottom:
        4,
    },


    weekdayCell: {
      width:
        `${100 / 7}%`,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        4,
    },


    weekdayText: {
      color:
        colors.text.tertiary,

      fontSize:
        11,

      fontWeight:
        fontWeights.bold,
    },


    /* ========================================================
       JOURS
       ======================================================== */

    calendarGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',
    },


    dayCell: {
      width:
        `${100 / 7}%`,

      aspectRatio:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        2,
    },


    dayOutsideMonth: {
      opacity:
        0.4,
    },


    dayDisabled: {
      opacity:
        0.35,
    },


    daySelected: {
      borderRadius:
        22,

      backgroundColor:
        colors.brand.primary,
    },


    dayToday: {
      borderWidth:
        1.5,

      borderColor:
        colors.brand.primary,

      borderRadius:
        22,
    },


    dayText: {
      width:
        34,

      height:
        34,

      textAlign:
        'center',

      textAlignVertical:
        'center',

      color:
        colors.text.primary,

      fontSize:
        fontSizes.sm,

      fontWeight:
        fontWeights.semiBold,
    },


    dayOutsideText: {
      color:
        colors.text.tertiary,
    },


    dayDisabledText: {
      color:
        colors.text.tertiary,
    },


    daySelectedText: {
      color:
        '#FFFFFF',

      fontWeight:
        fontWeights.bold,
    },


    dayTodayText: {
      color:
        colors.brand.primary,

      fontWeight:
        fontWeights.bold,
    },


    /* ========================================================
       INFORMATION CALENDRIER
       ======================================================== */

    calendarHint: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        spacing.sm,

      paddingTop:
        spacing.sm,

      borderTopWidth:
        1,

      borderTopColor:
        colors.border.light,
    },


    calendarHintText: {
      flex:
        1,

      marginLeft:
        spacing.xs,

      color:
        colors.text.tertiary,

      fontSize:
        11,

      lineHeight:
        16,
    },

  });

