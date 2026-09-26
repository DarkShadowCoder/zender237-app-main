import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import Input from '../../../components/Input';
import Checkbox from '../../../components/Checkbox';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { colors, typography, spacing } from '../../../theme/theme';
import { configureKmAdministratorWhatsApp, updateKmAdministrator } from '../../../services/adminService';
import { Screen, styles } from '../AdminUI';

export default function EditKmAdministratorScreen({ route, navigation }) {
  const administrator = route.params?.administrator;
  const [fullName, setFullName] = useState(administrator?.full_name || '');
  const [whatsapp, setWhatsapp] = useState(administrator?.whatsapp_number || '');
  const [notes, setNotes] = useState(administrator?.notes || '');
  const [active, setActive] = useState(administrator?.active !== false);
  const [configureContact, setConfigureContact] = useState(administrator?.is_whatsapp_contact === true);
  const [loading, setLoading] = useState(false);

  if (!administrator) {
    return (
      <Screen title="Modifier KmAdministrateur">
        <Card>
          <Text style={typography.body}>Compte KmAdministrateur introuvable.</Text>
        </Card>
      </Screen>
    );
  }

  const submit = async () => {
    const cleanWhatsapp = String(whatsapp || '').replace(/[\s-]/g, '').trim();
    if (!fullName.trim()) {
      Alert.alert('Champ requis', 'Le nom complet est obligatoire.');
      return;
    }
    if (!/^\+\d{10,15}$/.test(cleanWhatsapp)) {
      Alert.alert('WhatsApp invalide', 'Exemple attendu : +237650658852');
      return;
    }

    try {
      setLoading(true);

      await updateKmAdministrator({
        kmAdministratorId: administrator.id,
        updates: {
          full_name: fullName.trim(),
          whatsapp_number: cleanWhatsapp,
          notes: notes.trim() || null,
          active,
        },
      });

      if (configureContact && active) {
        await configureKmAdministratorWhatsApp({
          fullName: fullName.trim(),
          whatsappNumber: cleanWhatsapp,
        });
      }

      Alert.alert('Enregistré', 'Le compte KmAdministrateur a été mis à jour.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour le compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Modifier KmAdministrateur">
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={typography.h3}>Informations du compte</Text>
          <Input label="Nom complet" value={fullName} onChangeText={setFullName} placeholder="Nom" autoCapitalize="words" />
          <Input label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="+237650658852" keyboardType="phone-pad" format="phone" />
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes internes" autoCapitalize="sentences" multiline />

          <Checkbox checked={active} onToggle={() => setActive((v) => !v)}>
            Compte KmAdministrateur actif
          </Checkbox>
          <Checkbox checked={configureContact} onToggle={() => setConfigureContact((v) => !v)}>
            Utiliser ce compte comme contact WhatsApp principal
          </Checkbox>

          {!active && configureContact ? (
            <Text style={[typography.caption, { color: colors.warning.default, marginTop: spacing.sm }]}>
              Un compte inactif ne sera pas utilisé comme contact principal.
            </Text>
          ) : null}
        </Card>

        <Button title="Enregistrer les modifications" loading={loading} onPress={submit} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </Screen>
  );
}
