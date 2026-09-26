import React, { useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import Checkbox from '../../../components/Checkbox';
import Card from '../../../components/Card';
import { updatePartner } from '../../../services/adminService';
import { Screen, styles } from '../AdminUI';

export default function EditPartnerScreen({ route, navigation }) {
  const p = route.params.partner;
  const [fullName, setFullName] = useState(p.full_name || '');
  const [phone, setPhone] = useState(p.phone_number || '');
  const [whatsapp, setWhatsapp] = useState(p.whatsapp_number || '');
  const [notes, setNotes] = useState(p.notes || '');
  const [active, setActive] = useState(p.active !== false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      await updatePartner({
        partnerId: p.id,
        updates: { full_name: fullName, phone_number: phone, whatsapp_number: whatsapp, notes, active },
      });
      Alert.alert('Enregistré', 'Le partenaire a été mis à jour.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Modifier le partenaire">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Input label="Nom complet" value={fullName} onChangeText={setFullName} placeholder="Nom" autoCapitalize="words" />
          <Input label="Téléphone" value={phone} onChangeText={setPhone} placeholder="Numéro" keyboardType="phone-pad" />
          <Input label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="WhatsApp" keyboardType="phone-pad" />
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes" autoCapitalize="sentences" />
          <Checkbox checked={active} onToggle={() => setActive(v => !v)}>Partenaire actif</Checkbox>
          <Button title="Enregistrer" loading={loading} onPress={submit} style={{ marginTop: 16 }} />
        </Card>
      </ScrollView>
    </Screen>
  );
}