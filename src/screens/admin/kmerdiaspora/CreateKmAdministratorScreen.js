import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import Input from '../../../components/Input';
import SecretCodeInput from '../../../components/SecretCodeInput';
import Checkbox from '../../../components/Checkbox';
import Button from '../../../components/Button';
import Card from '../../../components/Card';

import {
  colors,
  typography,
  spacing,
} from '../../../theme/theme';

import {
  createKmAdministrator,
  configureKmAdministratorWhatsApp,
} from '../../../services/adminService';

import {
  Screen,
  styles,
} from '../AdminUI';

export default function CreateKmAdministratorScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Code saisi par l'administrateur.
  // Il ne doit jamais être sauvegardé directement dans Supabase.
  const [secretCode, setSecretCode] = useState('');
  const [confirmSecretCode, setConfirmSecretCode] = useState('');

  const [notes, setNotes] = useState('');
  const [configureContact, setConfigureContact] = useState(true);

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const cleanFullName = String(fullName || '').trim();

    const cleanWhatsapp = String(whatsapp || '')
      .replace(/[\s-]/g, '')
      .trim();

    const cleanSecretCode = String(secretCode || '')
      .replace(/\D/g, '')
      .trim();

    const cleanConfirmSecretCode = String(
      confirmSecretCode || ''
    )
      .replace(/\D/g, '')
      .trim();

    /*
     * =========================================================
     * VALIDATION IDENTITÉ
     * =========================================================
     */

    if (!cleanFullName) {
      Alert.alert(
        'Champ requis',
        'Le nom complet du KmAdministrateur est obligatoire.'
      );
      return;
    }

    /*
     * =========================================================
     * VALIDATION WHATSAPP
     * =========================================================
     */

    if (!/^\+\d{10,15}$/.test(cleanWhatsapp)) {
      Alert.alert(
        'WhatsApp invalide',
        'Le numéro doit être au format international.\n\nExemple : +237650658852'
      );
      return;
    }

    /*
     * =========================================================
     * VALIDATION CODE SECRET
     * =========================================================
     *
     * Le code secret est défini par l'administrateur au moment
     * de la création.
     *
     * Important :
     * - 6 chiffres exactement
     * - jamais écrit directement dans la table
     * - envoyé à l'Edge Function
     * - hashé en SHA-256 côté serveur
     */

    if (!/^\d{6}$/.test(cleanSecretCode)) {
      Alert.alert(
        'Code secret invalide',
        'Le code secret doit contenir exactement 6 chiffres.'
      );
      return;
    }

    if (!/^\d{6}$/.test(cleanConfirmSecretCode)) {
      Alert.alert(
        'Confirmation invalide',
        'Veuillez confirmer le code secret avec 6 chiffres.'
      );
      return;
    }

    if (cleanSecretCode !== cleanConfirmSecretCode) {
      Alert.alert(
        'Confirmation invalide',
        'Les deux codes secrets ne correspondent pas.'
      );
      return;
    }

    /*
     * =========================================================
     * CRÉATION
     * =========================================================
     */

    try {
      setLoading(true);

      /*
       * createKmAdministrator() transmet le code secret
       * à l'Edge Function "provision-backoffice-account".
       *
       * Le hash SHA-256 est effectué côté serveur avant
       * l'écriture dans kmerdiaspora_admins.secret_code_hash.
       */
      await createKmAdministrator({
        fullName: cleanFullName,
        whatsappNumber: cleanWhatsapp,
        secretCode: cleanSecretCode,
        notes: String(notes || '').trim() || null,
      });

      /*
       * =======================================================
       * CONTACT WHATSAPP PRINCIPAL KMERDIASPORA
       * =======================================================
       */

      if (configureContact) {
        await configureKmAdministratorWhatsApp({
          fullName: cleanFullName,
          whatsappNumber: cleanWhatsapp,
        });
      }

      /*
       * Nettoyage local du code secret.
       * Il n'est plus nécessaire une fois la création terminée.
       */
      setSecretCode('');
      setConfirmSecretCode('');

      Alert.alert(
        'Compte créé',
        configureContact
          ? 'Le compte KmAdministrateur a été créé et configuré comme contact WhatsApp principal de KmerDiaspora.'
          : 'Le compte KmAdministrateur a été créé avec succès.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error(
        '[CreateKmAdministratorScreen] create error:',
        error
      );

      Alert.alert(
        'Erreur',
        error?.message ||
          'Impossible de créer le KmAdministrateur.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Créer KmAdministrateur">
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text style={typography.h3}>
            Informations
          </Text>

          <Input
            label="Nom complet"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nom du KmAdministrateur"
            autoCapitalize="words"
            editable={!loading}
          />

          <Input
            label="Numéro WhatsApp"
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="+237650658852"
            keyboardType="phone-pad"
            format="phone"
            editable={!loading}
          />

          <Text
            style={[
              typography.h3,
              {
                marginTop: spacing.sm,
              },
            ]}
          >
            Sécurité
          </Text>

          <SecretCodeInput
            label="Code secret"
            value={secretCode}
            onChangeText={setSecretCode}
            maxLength={6}
          />

          <SecretCodeInput
            label="Confirmer le code secret"
            value={confirmSecretCode}
            onChangeText={setConfirmSecretCode}
            maxLength={6}
          />

          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes internes facultatives"
            autoCapitalize="sentences"
            multiline
            editable={!loading}
          />

          <Checkbox
            checked={configureContact}
            onToggle={() =>
              setConfigureContact((value) => !value)
            }
          >
            Utiliser ce compte comme contact WhatsApp
            principal de KmerDiaspora
          </Checkbox>
        </Card>

        <Button
          title="Créer le compte"
          loading={loading}
          disabled={loading}
          onPress={submit}
          style={{
            marginTop: spacing.md,
          }}
        />
      </ScrollView>
    </Screen>
  );
}