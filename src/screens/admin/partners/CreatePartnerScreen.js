
import React, {
  useState,
} from 'react';

import {
  ScrollView,
  Alert,
} from 'react-native';

import Input from '../../../components/Input';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import SecretCodeInput from '../../../components/SecretCodeInput';

import {
  createPartner,
} from '../../../services/adminService';

import {
  Screen,
  styles,
} from '../AdminUI';

export default function CreatePartnerScreen({
  navigation,
}) {
  const [
    fullName,
    setFullName,
  ] = useState('');

  const [
    phone,
    setPhone,
  ] = useState('');

  const [
    whatsapp,
    setWhatsapp,
  ] = useState('');

  const [
    secretCode,
    setSecretCode,
  ] = useState('');

  const [
    confirmSecretCode,
    setConfirmSecretCode,
  ] = useState('');

  const [
    notes,
    setNotes,
  ] = useState('');

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    loading,
    setLoading,
  ] = useState(false);

  const clearError =
    (field) => {
      if (
        errors[field]
      ) {
        setErrors(
          (prev) => ({
            ...prev,
            [field]: null,
          })
        );
      }
    };

  const validate =
    () => {
      const nextErrors =
        {};

      if (
        !fullName.trim() ||
        fullName.trim().length <
          2
      ) {
        nextErrors.fullName =
          'Le nom complet est obligatoire.';
      }

      const cleanWhatsapp =
        String(
          whatsapp || ''
        ).replace(
          /[\s-]/g,
          ''
        );

      if (
        !/^\+\d{8,15}$/.test(
          cleanWhatsapp
        )
      ) {
        nextErrors.whatsapp =
          'Numéro WhatsApp invalide. Exemple : +237650658852';
      }

      const cleanPhone =
        String(
          phone || ''
        ).replace(
          /\D/g,
          ''
        );

      if (
        phone.trim() &&
        cleanPhone.length <
          8
      ) {
        nextErrors.phone =
          'Numéro de téléphone invalide.';
      }

      if (
        !/^\d{6}$/.test(
          secretCode
        )
      ) {
        nextErrors.secretCode =
          'Le code secret doit contenir exactement 6 chiffres.';
      }

      if (
        secretCode !==
        confirmSecretCode
      ) {
        nextErrors.confirmSecretCode =
          'Les deux codes secrets ne correspondent pas.';
      }

      setErrors(
        nextErrors
      );

      return (
        Object.keys(
          nextErrors
        ).length === 0
      );
    };

  const submit =
    async () => {
      if (!validate()) {
        return;
      }

      try {
        setLoading(
          true
        );

        const cleanWhatsapp =
          String(
            whatsapp || ''
          ).replace(
            /[\s-]/g,
            ''
          );

        const cleanPhone =
          String(
            phone || ''
          ).replace(
            /\D/g,
            ''
          );

        await createPartner({
          fullName:
            fullName.trim(),

          phoneNumber:
            cleanPhone ||
            null,

          whatsappNumber:
            cleanWhatsapp,

          secretCode,

          notes:
            notes.trim() ||
            null,
        });

        Alert.alert(
          'Partenaire créé',
          'Le partenaire a été créé avec succès. Le code secret défini est maintenant associé à son compte.',
          [
            {
              text: 'OK',
              onPress:
                () =>
                  navigation.goBack(),
            },
          ]
        );

      } catch (e) {
        Alert.alert(
          'Erreur',
          e.message ||
            'Impossible de créer le partenaire.'
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  return (
    <Screen
      title="Ajouter un partenaire"
    >
      <ScrollView
        contentContainerStyle={
          styles.scroll
        }
        keyboardShouldPersistTaps="handled"
      >
        <Card>

          {/* ==================================================
              IDENTITÉ
              ================================================== */}

          <Input
            label="Nom complet"
            value={
              fullName
            }
            onChangeText={(text) => {
              setFullName(
                text
              );
              clearError(
                'fullName'
              );
            }}
            placeholder="Nom du partenaire"
            autoCapitalize="words"
            error={
              errors.fullName
            }
          />

          {/* ==================================================
              TÉLÉPHONE
              ================================================== */}

          <Input
            label="Téléphone"
            value={
              phone
            }
            onChangeText={(text) => {
              setPhone(
                text
              );
              clearError(
                'phone'
              );
            }}
            placeholder="+237 6 50 65 88 52"
            keyboardType="phone-pad"
            error={
              errors.phone
            }
          />

          {/* ==================================================
              WHATSAPP
              ================================================== */}

          <Input
            label="WhatsApp"
            value={
              whatsapp
            }
            onChangeText={(text) => {
              setWhatsapp(
                text
              );
              clearError(
                'whatsapp'
              );
            }}
            placeholder="+237 6 50 65 88 52"
            keyboardType="phone-pad"
            error={
              errors.whatsapp
            }
          />

          {/* ==================================================
              CODE SECRET
              ================================================== */}

          <SecretCodeInput
            label="Code secret du partenaire"
            value={
              secretCode
            }
            onChangeText={(text) => {
              setSecretCode(
                text
              );
              clearError(
                'secretCode'
              );
              clearError(
                'confirmSecretCode'
              );
            }}
            error={
              errors.secretCode
            }
            maxLength={6}
            placeholder="••••••"
          />

          {/* ==================================================
              CONFIRMATION CODE SECRET
              ================================================== */}

          <SecretCodeInput
            label="Confirmer le code secret"
            value={
              confirmSecretCode
            }
            onChangeText={(text) => {
              setConfirmSecretCode(
                text
              );
              clearError(
                'confirmSecretCode'
              );
            }}
            error={
              errors.confirmSecretCode
            }
            maxLength={6}
            placeholder="••••••"
          />

          {/* ==================================================
              NOTES
              ================================================== */}

          <Input
            label="Notes"
            value={
              notes
            }
            onChangeText={
              setNotes
            }
            placeholder="Notes internes"
            autoCapitalize="sentences"
          />

          {/* ==================================================
              SUBMIT
              ================================================== */}

          <Button
            title="Créer le partenaire"
            loading={
              loading
            }
            onPress={
              submit
            }
          />

        </Card>
      </ScrollView>
    </Screen>
  );
}
