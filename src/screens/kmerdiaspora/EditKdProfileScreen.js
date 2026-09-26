import React, {
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import {
  createKdProfile,
  loadKmerDiasporaCities,
  updateKdProfile,
} from '../../services/kmerDiasporaService';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  Button,
  ChoiceGroup,
  Input,
  InfoBanner,
  KdFormSection,
  KdScreen,
} from './components/KdUI';

import {
  colors,
  spacing,
  typography,
} from '../../theme/theme';

export default function EditKdProfileScreen({
  route,
  navigation,
}) {
  const {
    profile: accountProfile,
  } = useAuth();

  const item =
    route.params?.profile;

  const [
    profileType,
    setProfileType,
  ] =
    useState(
      item?.profile_type ||
      'driver'
    );

  const [
    fullName,
    setFullName,
  ] =
    useState(
      item?.full_name ||
      accountProfile?.username ||
      ''
    );

  const [
    country,
    setCountry,
  ] =
    useState(
      item?.residence_country ||
      accountProfile?.country ||
      'cameroun'
    );

  const [
    region,
    setRegion,
  ] =
    useState(
      item?.region ||
      ''
    );

  const [
    city,
    setCity,
  ] =
    useState(
      item?.city ||
      ''
    );

  const [
    neighborhood,
    setNeighborhood,
  ] =
    useState(
      item?.neighborhood ||
      ''
    );

  const [
    mobilityArea,
    setMobilityArea,
  ] =
    useState(
      item?.mobility_area ||
      ''
    );

  const [
    bio,
    setBio,
  ] =
    useState(
      item?.bio ||
      ''
    );

  const [
    availableCities,
    setAvailableCities,
  ] =
    useState([]);

  const [
    citiesLoading,
    setCitiesLoading,
  ] =
    useState(true);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  useEffect(
    () => {
      let mounted =
        true;

      const loadCities =
        async () => {
          try {
            const cities =
              await loadKmerDiasporaCities(
                {
                  forceRefresh:
                    true,
                }
              );

            if (!mounted) {
              return;
            }

            const merged =
              item?.city &&
              !cities.includes(
                item.city
              )
                ? [
                    item.city,
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
                  'Impossible de charger les villes depuis la base de données.'
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
      },
      [item?.city]
    );

  const save =
    async () => {
      if (
        !fullName.trim() ||
        !country ||
        !city
      ) {
        Alert.alert(
          'Informations manquantes',
          'Le nom, le pays et une ville doivent être renseignés.'
        );

        return;
      }

      if (
        !availableCities.includes(
          city
        )
      ) {
        Alert.alert(
          'Ville invalide',
          'Sélectionnez une ville proposée par la base de données.'
        );

        return;
      }

      setLoading(
        true
      );

      try {
        const payload = {
          profile_type:
            profileType,

          full_name:
            fullName.trim(),

          residence_country:
            country,

          region:
            region.trim() ||
            null,

          city,

          neighborhood:
            neighborhood.trim() ||
            null,

          mobility_area:
            mobilityArea.trim() ||
            null,

          bio:
            bio.trim() ||
            null,
        };

        if (item) {
          await updateKdProfile(
            payload
          );
        } else {
          await createKdProfile(
            {
              profileType,

              fullName,

              residenceCountry:
                country,

              region:
                region.trim() ||
                null,

              city,

              neighborhood:
                neighborhood.trim() ||
                null,

              mobilityArea:
                mobilityArea.trim() ||
                null,

              bio:
                bio.trim() ||
                null,
            }
          );
        }

        navigation.goBack();
      } catch (
        error
      ) {
        Alert.alert(
          'Erreur',
          error?.message ||
            'Impossible d’enregistrer le profil.'
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
        item
          ? 'Modifier mon profil'
          : 'Créer mon profil'
      }
      scrollView={
        ScrollView
      }
    >
      <InfoBanner
        icon="shield-checkmark-outline"
        text="Votre numéro de téléphone est récupéré automatiquement depuis votre compte Zender237. Il n’est pas modifiable ici."
      />

      <KdFormSection
        title="Identité professionnelle"
      >
        <ChoiceGroup
          label="Type de profil"
          value={
            profileType
          }
          options={[
            'driver',
            'recruiter',
            'both',
          ]}
          onChange={
            setProfileType
          }
        />

        <Text
          style={
            styles.helper
          }
        >
          driver = Conducteur · recruiter = Recruteur · both = Les deux
        </Text>

        <Input
          label="Nom complet"
          value={
            fullName
          }
          onChangeText={
            setFullName
          }
          placeholder="Nom complet"
          autoCapitalize="words"
        />

        <Input
          label="Pays de résidence"
          value={
            country
          }
          onChangeText={
            setCountry
          }
          placeholder="cameroun"
          autoCapitalize="words"
        />

        <Input
          label="Région"
          value={
            region
          }
          onChangeText={
            setRegion
          }
          placeholder="Région"
          autoCapitalize="words"
        />

        <ChoiceGroup
          label="Ville principale"
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

        {citiesLoading ? (
          <Text
            style={
              styles.helper
            }
          >
            Chargement des villes depuis la base de données…
          </Text>
        ) : null}

        <Input
          label="Quartier"
          value={
            neighborhood
          }
          onChangeText={
            setNeighborhood
          }
          placeholder="Quartier"
          autoCapitalize="words"
        />
      </KdFormSection>

      <KdFormSection
        title="Mobilité & présentation"
      >
        <Input
          label="Zone de mobilité"
          value={
            mobilityArea
          }
          onChangeText={
            setMobilityArea
          }
          placeholder="Ex. Siguiri, Kokoyo…"
        />

        <Input
          label="Présentation"
          value={
            bio
          }
          onChangeText={
            setBio
          }
          placeholder="Expérience, disponibilité, langues…"
          multiline
        />
      </KdFormSection>

      <Text
        style={
          styles.phone
        }
      >
        Téléphone lié au compte :{' '}
        {
          accountProfile?.whatsapp_number ||
          item?.phone_number ||
          '—'
        }
      </Text>

      <Button
        title="Enregistrer"
        onPress={
          save
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

const styles =
  StyleSheet.create({
    helper: {
      ...typography.caption,

      color:
        colors.text.tertiary,

      marginBottom:
        spacing.md,
    },

    phone: {
      ...typography.caption,

      marginTop:
        spacing.xs,

      color:
        colors.text.secondary,
    },

    button: {
      marginTop:
        spacing.md,
    },
  });