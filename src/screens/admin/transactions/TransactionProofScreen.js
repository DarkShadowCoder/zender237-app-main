import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  Text,
  View,
  Linking,
  RefreshControl,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';

import {
  colors,
  typography,
  spacing,
} from '../../../theme/theme';

import Card from '../../../components/Card';
import Button from '../../../components/Button';

import {
  getTransaction,
  uploadTransactionExecutionProof,
} from '../../../services/adminService';

import {
  Screen,
  Loading,
  Row,
  Divider,
  InfoBanner,
  ErrorBox,
  styles,
} from '../AdminUI';


export default function TransactionProofScreen({
  route,
  navigation,
}) {
  const { transactionId } =
    route.params;

  const [d, setD] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState(null);


  const load = useCallback(
    async () => {
      try {
        setError(null);

        const result =
          await getTransaction(
            transactionId
          );

        setD(result);
      } catch (e) {
        setError(
          e?.message ||
            'Impossible de charger les preuves.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [transactionId]
  );


  useEffect(() => {
    load();
  }, [load]);


  const selectProof =
    async () => {
      try {
        const result =
          await DocumentPicker.getDocumentAsync({
            type: [
              'image/*',
              'application/pdf',
            ],
            multiple: false,
            copyToCacheDirectory:
              true,
          });

        if (result.canceled) {
          return;
        }

        const asset =
          result.assets?.[0];

        if (!asset?.uri) {
          throw new Error(
            'Le fichier sélectionné est invalide.'
          );
        }

        setUploading(true);

        await uploadTransactionExecutionProof(
          {
            transactionId,
            file: asset,
            description:
              'Preuve de réussite de la transaction',
          }
        );

        await load();

        Alert.alert(
          'Preuve enregistrée',
          'La preuve de réussite a été enregistrée. Elle reste facultative pour la confirmation.'
        );
      } catch (e) {
        Alert.alert(
          'Erreur',
          e?.message ||
            'Impossible d’enregistrer la preuve.'
        );
      } finally {
        setUploading(false);
      }
    };


  if (loading) {
    return (
      <Screen title="Preuves">
        <Loading
          label="Chargement des preuves…"
        />
      </Screen>
    );
  }


  if (error) {
    return (
      <Screen title="Preuves">
        <ErrorBox
          message={error}
          onRetry={load}
        />
      </Screen>
    );
  }


  const proofs =
    d?.proofs || [];

  const executionProofs =
    d?.executionProofs || [];


  return (
    <Screen title="Preuves">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={
              colors.brand.primary
            }
            colors={[
              colors.brand.primary,
            ]}
          />
        }
        contentContainerStyle={
          styles.scroll
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* =====================================================
         * PREUVE DE RÉUSSITE
         * ===================================================== */}

        <Card>
          <InfoBanner
            tone={
              executionProofs.length
                ? 'success'
                : 'info'
            }
            icon={
              executionProofs.length
                ? 'checkmark-circle-outline'
                : 'information-circle-outline'
            }
            text={
              executionProofs.length
                ? 'La transaction possède une preuve de réussite. Vous pouvez la confirmer.'
                : 'Aucune preuve de réussite n’est enregistrée. La transaction peut néanmoins être confirmée.'
            }
          />

          <View
            style={{
              marginTop:
                spacing.md,
            }}
          >
            <Button
              title={
                uploading
                  ? 'Téléversement…'
                  : 'Ajouter la preuve de réussite'
              }
              loading={uploading}
              disabled={uploading}
              onPress={
                selectProof
              }
            />
          </View>
        </Card>


        <Text
          style={[
            typography.caption,
            styles.muted,
            {
              marginTop:
                spacing.lg,
              marginBottom:
                spacing.sm,
            },
          ]}
        >
          {executionProofs.length}{' '}
          preuve
          {executionProofs.length >
          1
            ? 's'
            : ''}{' '}
          de réussite
          {executionProofs.length >
          1
            ? 's'
            : ''}{' '}
          enregistrée
          {executionProofs.length >
          1
            ? 's'
            : ''}
        </Text>


        <Card>
          {executionProofs.length ? (
            executionProofs.map(
              (p, i) => (
                <React.Fragment
                  key={p.id}
                >
                  <Row
                    icon="shield-checkmark-outline"
                    iconColor={
                      colors.success.default
                    }
                    iconBg={
                      colors.success.light
                    }
                    title={
                      p.file_name ||
                      'Preuve de réussite'
                    }
                    subtitle={
                      `${
                        new Date(
                          p.uploaded_at
                        ).toLocaleString(
                          'fr-FR'
                        )
                      }`
                    }
                    onPress={
                      p.file_url
                        ? () =>
                            Linking.openURL(
                              p.file_url
                            )
                        : undefined
                    }
                  />

                  {i <
                    executionProofs.length -
                      1 && (
                    <Divider />
                  )}
                </React.Fragment>
              )
            )
          ) : (
            <Row
              icon="document-outline"
              title="Aucune preuve de réussite"
              subtitle="Téléversez la capture, le reçu ou le justificatif confirmant la réussite de la transaction."
            />
          )}
        </Card>


        {/* =====================================================
         * PREUVES UTILISATEUR
         * ===================================================== */}

        <Text
          style={[
            typography.caption,
            styles.muted,
            {
              marginTop:
                spacing.lg,
              marginBottom:
                spacing.sm,
            },
          ]}
        >
          {proofs.length}{' '}
          preuve
          {proofs.length > 1
            ? 's'
            : ''}{' '}
          fournie
          {proofs.length > 1
            ? 's'
            : ''}{' '}
          par l'utilisateur
        </Text>


        <Card>
          {proofs.length ? (
            proofs.map(
              (p, i) => (
                <React.Fragment
                  key={p.id}
                >
                  <Row
                    icon="image-outline"
                    iconColor={
                      p.file_url
                        ? colors.brand.primary
                        : colors.text.tertiary
                    }
                    iconBg={
                      p.file_url
                        ? colors.brand.primaryLight
                        : colors.background.surfaceAlt
                    }
                    title="Preuve utilisateur"
                    subtitle={
                      p.file_url
                        ? new Date(
                            p.uploaded_at
                          ).toLocaleString(
                            'fr-FR'
                          )
                        : 'Fichier indisponible'
                    }
                    onPress={
                      p.file_url
                        ? () =>
                            Linking.openURL(
                              p.file_url
                            )
                        : undefined
                    }
                  />

                  {i <
                    proofs.length -
                      1 && (
                    <Divider />
                  )}
                </React.Fragment>
              )
            )
          ) : (
            <Row
              icon="image-outline"
              title="Aucune preuve utilisateur"
              subtitle="Aucune preuve n'est attachée à cette transaction."
            />
          )}
        </Card>


        <Card
          style={{
            marginTop:
              spacing.lg,
          }}
        >
          <InfoBanner
            tone="info"
            icon="shield-checkmark-outline"
            text="La preuve de réussite est facultative. Vous pouvez confirmer la transaction même si aucune preuve n’est téléversée."
          />
        </Card>

      </ScrollView>
    </Screen>
  );
}