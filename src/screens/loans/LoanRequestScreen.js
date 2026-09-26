import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '../../theme/theme';
import Header from '../../components/Header';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { getMyLoanEligibility, submitLoanRequest, uploadLoanIdentityImages, loanTypeLabel } from '../../services/loanService';
import { formatAmount } from '../../utils/formatters';

export default function LoanRequestScreen({ route, navigation }) {
  const { user, profile } = useAuth();
  const [loanType, setLoanType] = useState(route.params?.loanType || 'money');
  const [amount, setAmount] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(profile?.whatsapp_number || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp_number || '');
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [travelOrigin, setTravelOrigin] = useState('');
  const [travelDestination, setTravelDestination] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [accommodationRequested, setAccommodationRequested] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const numericAmount = useMemo(() => Number(String(amount).replace(/\s/g, '')) || 0, [amount]);

  const checkEligibility = async () => {
    if (!numericAmount) {
      Alert.alert('Montant requis', 'Saisissez d’abord le montant souhaité.');
      return;
    }
    setChecking(true);
    try {
      setEligibility(await getMyLoanEligibility({ loanType, amount: numericAmount }));
    } catch (e) {
      Alert.alert('Conditions indisponibles', e.message);
      setEligibility(null);
    } finally {
      setChecking(false);
    }
  };

  const takePicture = async (slot) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la caméra est nécessaire pour photographier la pièce d'identité.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    if (slot === 'front') setFront(result.assets[0]);
    else setBack(result.assets[0]);
  };

  const submit = async () => {
    if (!user?.id) return;
    if (!numericAmount || !fullName.trim() || !whatsapp.trim() || !front || !back) {
      Alert.alert('Informations manquantes', "Complétez le montant, l'identité et les deux faces de la pièce.");
      return;
    }
    if (loanType === 'flight' && (!travelOrigin.trim() || !travelDestination.trim() || !travelDate.trim() || !passengerName.trim())) {
      Alert.alert('Informations de voyage', 'Renseignez l’origine, la destination, la date du voyage et le nom du passager.');
      return;
    }
    if (!eligibility?.eligible) {
      Alert.alert('Montant non éligible', eligibility?.reason || 'Vérifiez les conditions de votre rang.');
      return;
    }

    setSubmitting(true);
    try {
      const images = await uploadLoanIdentityImages({ userId: user.id, frontUri: front.uri, backUri: back.uri });
      const requestId = await submitLoanRequest({
        loanType,
        amount: numericAmount,
        fullName,
        phoneNumber: phone,
        whatsappNumber: whatsapp,
        idFrontPath: images.frontPath,
        idBackPath: images.backPath,
        travelOrigin,
        travelDestination,
        travelDate: loanType === 'flight' ? travelDate : null,
        passengerName: loanType === 'flight' ? passengerName : null,
        accommodationRequested: loanType === 'flight' ? accommodationRequested : false,
      });
      Alert.alert('Demande envoyée', 'Votre dossier a été enregistré. L’équipe Zender237 vous contactera sur WhatsApp.', [
        { text: 'Voir mon dossier', onPress: () => navigation.replace('LoanDetail', { requestId }) },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Header title="Nouvelle demande" />

      <Text style={[typography.caption, styles.intro]}>Choisissez le financement et vérifiez les conditions de votre rang avant l’envoi.</Text>

      <View style={styles.typeRow}>
        <TypeCard active={loanType === 'money'} icon="cash-outline" title="Prêt d'argent" onPress={() => { setLoanType('money'); setEligibility(null); }} />
        <TypeCard active={loanType === 'flight'} icon="airplane-outline" title="Prêt billet" onPress={() => { setLoanType('flight'); setEligibility(null); }} />
      </View>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={typography.bodyBold}>{loanTypeLabel(loanType)}</Text>
        <Input label="Montant demandé" value={amount} onChangeText={(value) => { setAmount(value); setEligibility(null); }} format="price" placeholder="500 000" />
        <Button title="Vérifier mon éligibilité" variant="outline" onPress={checkEligibility} loading={checking} />
        {eligibility ? (
          <View style={[styles.eligibility, { backgroundColor: eligibility.eligible ? colors.success.light : colors.error.light }]}>
            <Ionicons name={eligibility.eligible ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={20} color={eligibility.eligible ? colors.success.default : colors.error.default} />
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold}>{eligibility.eligible ? 'Montant éligible' : 'Montant non éligible'}</Text>
              <Text style={[typography.caption, { marginTop: 3, color: colors.text.secondary }]}>
                {eligibility.eligible ? `${eligibility.repayment_months} mois de remboursement${eligibility.accommodation_months ? ` · ${eligibility.accommodation_months} mois d’hébergement` : ''}.` : eligibility.reason}
              </Text>
              {eligibility.max_amount != null && eligibility.eligible ? <Text style={[typography.caption, { marginTop: 3, color: colors.text.secondary }]}>Plafond : {formatAmount(eligibility.max_amount)}</Text> : null}
            </View>
          </View>
        ) : null}
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={[typography.bodyBold, { marginBottom: spacing.md }]}>Informations du demandeur</Text>
        <Input label="Nom complet" value={fullName} onChangeText={setFullName} format="name" placeholder="Votre nom et prénom(s)" />
        <Input label="Téléphone" value={phone} onChangeText={setPhone} format="phone" placeholder="+237 6 00 00 00 00" />
        <Input label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} format="phone" placeholder="+237 6 00 00 00 00" />
      </Card>

      {loanType === 'flight' ? (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={[typography.bodyBold, { marginBottom: spacing.md }]}>Informations de voyage</Text>
          <Input label="Origine" value={travelOrigin} onChangeText={setTravelOrigin} placeholder="Bamako" />
          <Input label="Destination" value={travelDestination} onChangeText={setTravelDestination} placeholder="Paris" />
          <Input label="Date du voyage" value={travelDate} onChangeText={setTravelDate} placeholder="YYYY-MM-DD" maxLength={10} />
          <Input label="Nom du passager" value={passengerName} onChangeText={setPassengerName} format="name" placeholder="Nom sur le billet" />
          <Pressable onPress={() => setAccommodationRequested((value) => !value)} style={styles.toggleRow}>
            <View style={[styles.check, accommodationRequested && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }]}>
              {accommodationRequested ? <Ionicons name="checkmark" size={15} color={colors.text.inverse} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.bodyBold}>Inclure l’hébergement</Text>
              <Text style={[typography.caption, { color: colors.text.secondary }]}>Disponible uniquement selon la règle de votre rang.</Text>
            </View>
          </Pressable>
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <Text style={[typography.bodyBold, { marginBottom: spacing.md }]}>Pièce d’identité</Text>
        <IdentityUploader title="Recto" image={front} onPress={() => takePicture('front')} />
        <IdentityUploader title="Verso" image={back} onPress={() => takePicture('back')} />
      </Card>

      <View style={{ marginTop: spacing.lg }}>
        <Button title="Soumettre la demande" onPress={submit} loading={submitting} />
      </View>
    </ScrollView>
  );
}

function TypeCard({ active, icon, title, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.typeCard, active && styles.typeCardActive]}>
      <Ionicons name={icon} size={24} color={active ? colors.brand.primary : colors.text.secondary} />
      <Text style={[typography.caption, { marginTop: 5, color: active ? colors.brand.primary : colors.text.secondary, fontWeight: active ? '700' : '500' }]}>{title}</Text>
    </Pressable>
  );
}

function IdentityUploader({ title, image, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.identityBox}>
      {image ? (
        <Image source={{ uri: image.uri }} style={styles.identityImage} />
      ) : (
        <>
          <View style={styles.identityIcon}><Ionicons name="camera-outline" size={23} color={colors.brand.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyBold}>{title}</Text>
            <Text style={[typography.caption, { color: colors.text.secondary }]}>Prendre une photo</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </>
      )}
      {image ? <View style={styles.imageLabel}><Text style={[typography.caption, { color: colors.text.inverse }]}>{title} · Reprendre</Text></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background.default },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.huge },
  intro: { color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.md },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeCard: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 90, backgroundColor: colors.background.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border.default },
  typeCardActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryLight },
  eligibility: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.sm, marginTop: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' },
  identityBox: { height: 94, borderWidth: 1, borderColor: colors.border.default, borderRadius: radii.md, marginBottom: spacing.sm, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: colors.background.surfaceAlt },
  identityIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brand.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  identityImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
});
