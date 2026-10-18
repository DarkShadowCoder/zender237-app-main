import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import {
  colors,
  countries,
  fontWeights,
  lineHeights,
  paymentMethods,
  radii,
  spacing,
  typography,
} from '../../theme/theme';

import Header from '../../components/Header';
import Button from '../../components/Button';

import { useAuth } from '../../context/AuthContext';

import {
  createDeposit,
  listMomoNumbers,
  submitDepositProof,
  uploadProofImage,
} from '../../services/transactionService';

import {
} from '../../utils/phone';

function operatorKey(holderName = '') {
  const key = String(holderName)
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  if (key.includes('mtn')) {
    return 'mtn';
  }

  if (key.includes('orange')) {
    return 'orange_money';
  }

  if (key.includes('moov')) {
    return 'moov_money';
  }

  return null;
}

function formatAmount(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} U`;
}

export default function DepositProofScreen({
  route,
  navigation,
}) {
  const {
    amount,
    country,
    countryCode,
  } = route.params || {};

  const {
    user,
  } = useAuth();

  const [
    numbers,
    setNumbers,
  ] = useState([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState(null);

  const [
    loadingNumbers,
    setLoadingNumbers,
  ] = useState(true);

  const [
    image,
    setImage,
  ] = useState(null);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    done,
    setDone,
  ] = useState(false);

  const [
    doneText,
    setDoneText,
  ] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoadingNumbers(true);

        const available =
          await listMomoNumbers({
            amount: Number(amount),
            countryCode: countryCode || null,
          });

        if (!active) {
          return;
        }

        setNumbers(
          available || []
        );

        if (
          available?.length === 1
        ) {
          setSelectedId(
            available[0].id
          );
        }
      } catch (error) {
        if (active) {
          Toast.show({
            type: 'error',
            text1:
              'Impossible de charger les numéros',
            text2:
              error?.message ||
              'Réessayez.',
          });
        }
      } finally {
        if (active) {
          setLoadingNumbers(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [
    amount,
    countryCode,
  ]);

  const pickImage = async () => {
    const permission =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (
      permission.status !==
      'granted'
    ) {
      Toast.show({
        type: 'error',
        text1:
          'Accès aux photos refusé',
        text2:
          'Autorisez les photos pour ajouter une preuve.',
      });

      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

    if (
      !result.canceled
    ) {
      setImage(
        result.assets[0]
      );
    }
  };

  const submit = async () => {
    if (!selectedId) {
      Toast.show({
        type: 'error',
        text1:
          'Choisissez le numéro',
        text2:
          'Touchez le numéro auquel envoyer l’argent.',
      });

      return;
    }

    if (!user?.id) {
      Toast.show({
        type: 'error',
        text1:
          'Session expirée',
        text2:
          'Reconnectez-vous.',
      });

      return;
    }

    setSubmitting(true);

    try {
      const transaction =
        await createDeposit({
          userId: user.id,
          amount: Number(amount),
          momoDepositNumberId:
            selectedId,
        });

      let proofSent = false;

      if (image) {
        try {
          const fileUrl =
            await uploadProofImage({
              uri: image.uri,
              fileName:
                `proof-${Date.now()}.jpg`,
              contentType:
                'image/jpeg',
              transactionId:
                transaction.id,
            });

          await submitDepositProof({
            transactionId:
              transaction.id,
            userId:
              user.id,
            fileUrl,
            referenceNote:
              null,
          });

          proofSent = true;
        } catch (proofError) {
          // Le dépôt reste créé.
          // La preuve est facultative.
          setDoneText(
            'Votre demande est envoyée. La preuve n’a pas pu être ajoutée.'
          );

          setDone(true);

          return;
        }
      }

      setDoneText(
        proofSent
          ? 'Votre demande est envoyée avec la preuve.'
          : 'Votre demande est envoyée.'
      );

      setDone(true);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1:
          'Dépôt impossible',
        text2:
          error?.message ||
          'Réessayez.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const closeDone = () => {
    setDone(false);

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
        },
      ],
    });
  };

  return (
    <>
      <ScrollView
        style={styles.wrapper}
        contentContainerStyle={
          styles.content
        }
      >
        <Header title="Déposer" />

        <View style={styles.stepRow}>
          <View style={styles.stepDone}>
            <Text style={styles.stepNumber}>
              1
            </Text>
          </View>

          <View style={styles.line} />

          <View style={styles.stepActive}>
            <Text style={styles.stepNumber}>
              2
            </Text>
          </View>

          <Text style={typography.caption}>
            Paiement
          </Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={typography.caption}>
            Montant
          </Text>

          <Text style={typography.amountMd}>
            {formatAmount(amount)}
          </Text>
        </View>

        <Text
          style={[
            typography.h2,
            styles.sectionTitle,
          ]}
        >
          Envoie l’argent à
        </Text>

        <Text
          style={[
            typography.caption,
            styles.simpleHint,
            {lineHeight : lineHeights.sm * 1.2}
          ]}
        >
          Choisie le numero de telephone qui correspond a ton reseau (Orange Money, MTN Mobile Money, Moov)
        </Text>

        <Text
          style={[
            typography.caption,
            styles.countryHint,
          ]}
        >
          Filtre par localisation :{' '}
          {countries[country]?.label || 'aucun (tous les pays)'}
        </Text>

        {loadingNumbers ? (
          <ActivityIndicator
            color={
              colors.brand.primary
            }
            style={{
              marginVertical:
                spacing.xl,
            }}
          />
        ) : numbers.length ===
          0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={
                colors.error.default
              }
            />

            <Text
              style={[
                typography.bodyBold,
                { flex: 1 },
              ]}
            >
              Aucun numéro disponible
            </Text>
          </View>
        ) : (
          numbers.map((item) => {
            const key =
              operatorKey(
                item.holder_name
              );

            const brand =
              key
                ? paymentMethods[key]
                : null;

            const selected =
              selectedId ===
              item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  setSelectedId(
                    item.id
                  )
                }
                style={[
                  styles.numberCard,
                  selected &&
                    styles.numberCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.brandCircle,
                    {
                      backgroundColor:
                        brand?.background ||
                        colors
                          .background
                          .surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.overline,
                      {
                        color:
                          brand?.text ||
                          colors.text
                            .secondary,
                      },
                    ]}
                  >
                    {(
                      brand?.label ||
                      item.holder_name ||
                      'MM'
                    )
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <Text
                    style={
                      typography.bodyBold
                    }
                  >
                    {brand?.label ||
                      item.holder_name}
                  </Text>

                  <Text
                    style={
                      styles.phoneText
                    }
                  >
                    {item.phone_number}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    selected &&
                      styles.radioSelected,
                  ]}
                >
                  {selected ? (
                    <View
                      style={
                        styles.dot
                      }
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}

        <View style={styles.stepsCard}>
          <Step
            number="1"
            text={`Envoie ${formatAmount(
              amount
            )} au numero choisi`}
          />

          <Step
            number="2"
            text="Envoie la capture du message de confirmation OM, MOMO ou Moov"
          />

          <Step
            number="3"
            text="Appuie sur « J’ai payé »"
          />
        </View>

        <Pressable
          style={styles.proofButton}
          onPress={pickImage}
        >
          <Ionicons
            name={
              image
                ? 'checkmark-circle'
                : 'camera-outline'
            }
            size={24}
            color={
              colors.brand.primary
            }
          />

          <View
            style={{
              flex: 1,
            }}
          >
            <Text
              style={
                [typography.caption,
                  {fontWeight : fontWeights.semiBold}
                ]
              }
            >
              {image
                ? 'Preuve ajoutée'
                : 'Ajouter le screenshot du depot'}
            </Text>

            <Text
              style={
                typography.caption
              }
            >
              Preuve de depot
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

        {image ? (
          <Image
            source={{
              uri: image.uri,
            }}
            style={
              styles.preview
            }
          />
        ) : null}

        <Button
          title="J’ai payé"
          onPress={submit}
          loading={submitting}
          disabled={
            loadingNumbers ||
            numbers.length === 0
          }
          style={
            styles.mainButton
          }
        />
      </ScrollView>

      <Modal
        visible={done}
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
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalIcon
              }
            >
              <Ionicons
                name="checkmark"
                size={34}
                color={
                  colors.brand.primary
                }
              />
            </View>

            <Text style={typography.h2}>
              C’est envoyé
            </Text>

            <Text
              style={[
                typography.caption,
                styles.modalText,
              ]}
            >
              {doneText}
            </Text>

            <Button
              title="Retour à l’accueil"
              onPress={closeDone}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function Step({
  number,
  text,
}) {
  return (
    <View
      style={
        styles.stepItem
      }
    >
      <View
        style={
          styles.smallStep
        }
      >
        <Text
          style={
            styles.smallStepText
          }
        >
          {number}
        </Text>
      </View>

      <Text
        style={
          typography.body
        }
      >
        {text}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor:
        colors.background.default,
    },

    content: {
      padding:
        spacing.screenHorizontal,
      paddingBottom:
        spacing.xxxl,
    },

    stepRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.xs,
      marginTop:
        spacing.lg,
    },

    stepActive: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor:
        colors.brand.primary,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    stepDone: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor:
        colors.brand
          .primaryLight,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    stepNumber: {
      color:
        colors.brand.primary,
      fontWeight:
        '800',
    },

    line: {
      width: 24,
      height: 1,
      backgroundColor:
        colors.border.default,
    },

    amountCard: {
      marginTop:
        spacing.xl,
      padding:
        spacing.lg,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.background
          .surface,
      borderWidth: 1,
      borderColor:
        colors.border.light,
    },

    sectionTitle: {
      marginTop:
        spacing.xl,
    },

    simpleHint: {
      marginTop:
        spacing.xs,
      marginBottom:
        spacing.lg,
    },

    countryHint: {
      marginBottom:
        spacing.md,
    },

    numberCard: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.md,
      padding:
        spacing.md,
      marginBottom:
        spacing.sm,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.background
          .surface,
      borderWidth: 1,
      borderColor:
        colors.border.light,
    },

    numberCardSelected: {
      borderColor:
        colors.brand.primary,
      borderWidth: 2,
    },

    brandCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    phoneText: {
      ...typography.caption,
      color:
        colors.brand.primary,
      marginTop: 2,
    },

    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor:
        colors.border.default,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    radioSelected: {
      borderColor:
        colors.brand.primary,
    },

    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        colors.brand.primary,
    },

    stepsCard: {
      marginTop:
        spacing.lg,
      padding:
        spacing.md,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.background
          .surfaceAlt,
      gap:
        spacing.sm,
    },

    stepItem: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
    },

    smallStep: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor:
        colors.brand.primary,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    smallStepText: {
      color:
        colors.text.inverse,
      fontWeight:
        '800',
    },

    proofButton: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      marginTop:
        spacing.md,
      marginBottom:
        spacing.sm,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.background
          .surface,
      borderWidth: 1,
      borderColor:
        colors.border.light,
    },

    preview: {
      width: '100%',
      height: 160,
      borderRadius:
        radii.md,
      marginBottom:
        spacing.md,
    },

    mainButton: {
      marginTop:
        spacing.xl,
    },

    emptyCard: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.md,
      backgroundColor:
        colors.background
          .surface,
      borderWidth: 1,
      borderColor:
        colors.border.light,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.45)',
      alignItems:
        'center',
      justifyContent:
        'center',
      padding:
        spacing.xl,
    },

    modalCard: {
      width: '100%',
      maxWidth: 420,
      padding:
        spacing.xl,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.background
          .surface,
      alignItems:
        'center',
      gap:
        spacing.sm,
    },

    modalIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor:
        colors.brand
          .primaryLight,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginBottom:
        spacing.xs,
    },

    modalText: {
      textAlign:
        'center',
      marginBottom:
        spacing.md,
    },
  });