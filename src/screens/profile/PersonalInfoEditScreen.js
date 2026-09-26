import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { colors, typography, spacing, countries } from '../../theme/theme';
import Header from '../../components/Header';
import Input from '../../components/Input';
import SelectField from '../../components/SelectField';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { isValidUsername } from '../../utils/validators';

/** Écran 38 (Paramètres > Informations personnelles) — édition du profil. */
export default function PersonalInfoEditScreen({ navigation }) {
  const { profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [country, setCountry] = useState(profile?.country ?? 'cameroun');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!isValidUsername(username)) {
      setError("Nom d'utilisateur invalide (3-20 caractères).");
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username, country })
        .eq('id', profile.id);
      if (updateError) throw updateError;
      await refreshProfile();
      Toast.show({ type: 'success', text1: 'Profil mis à jour' });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={{ padding: spacing.screenHorizontal }}>
      <Header title="Informations personnelles" />
      <View style={{ marginTop: spacing.xl }}>
        <Input label="Numéro WhatsApp" value={profile?.whatsapp_number ?? ''} editable={false} />
        <Input
          label="Nom d'utilisateur"
          value={username}
          onChangeText={setUsername}
          error={error}
        />
        <SelectField
          label="Pays"
          valueLabel={`${countries[country]?.flag ?? ''} ${countries[country]?.label ?? ''}`}
          onPress={() => {
            const order = Object.keys(countries);
            const idx = order.indexOf(country);
            setCountry(order[(idx + 1) % order.length]);
          }}
        />
      </View>
      <Button title="Enregistrer" onPress={handleSave} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background.default },
});
