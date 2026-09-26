import React, {
  useState,
} from 'react';

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Header from '../../../../src/components/Header';
import Button from '../../../../src/components/Button';

import {
  colors,
  fontSizes,
  radii,
  spacing,
  typography,
} from '../../../../src/theme/theme';

import {
  moderateContent,
} from '../../../../src/services/kmerDiasporaService';


export default function KmaModerationActionScreen({
  navigation,
  route,
}) {
  const {
    contentType,
    contentId,
    action = 'suspend',
    oldStatus,
  } = route.params || {};


  const [
    reason,
    setReason,
  ] = useState('');


  const [
    loading,
    setLoading,
  ] = useState(false);


  const save =
    async () => {
      if (
        !reason.trim()
      ) {
        Alert.alert(
          'Motif requis',
          'Indiquez clairement la raison de la décision.'
        );

        return;
      }


      setLoading(
        true
      );


      try {
        await moderateContent({
          contentType,
          contentId,
          action,
          reason:
            reason.trim(),
          oldStatus,
          newStatus:
            action ===
            'suspend'
              ? 'suspended'
              : action ===
                  'reject'
                ? 'rejected'
                : 'published',
        });


        Alert.alert(
          'Décision enregistrée',
          'La décision de modération a été enregistrée avec succès.',
          [
            {
              text:
                'OK',
              onPress:
                () =>
                  navigation.goBack(),
            },
          ]
        );
      } catch (e) {
        Alert.alert(
          'Erreur',
          e?.message ||
            'Impossible d’enregistrer la décision.'
        );
      } finally {
        setLoading(
          false
        );
      }
    };


  const actionTitle =
    action ===
    'suspend'
      ? 'Suspendre'
      : action ===
          'reject'
        ? 'Rejeter'
        : 'Approuver';


  return (
    <View
      style={
        styles.screen
      }
    >

      <Header
        title="Décision de modération"
      />


      <KeyboardAvoidingView
        style={
          styles.keyboard
        }
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          contentContainerStyle={
            styles.content
          }
        >

          <Text
            style={
              styles.title
            }
          >
            {actionTitle}
          </Text>


          <Text
            style={
              styles.description
            }
          >
            Le motif sera conservé dans l'historique de modération.
          </Text>


          <TextInput
            value={
              reason
            }
            onChangeText={
              setReason
            }
            placeholder="Motif de la décision"
            placeholderTextColor={
              colors.text.tertiary
            }
            multiline
            textAlignVertical="top"
            style={
              styles.input
            }
          />


          <Button
            title={
              `Enregistrer : ${actionTitle}`
            }
            onPress={
              save
            }
            loading={
              loading
            }
          />

        </ScrollView>

      </KeyboardAvoidingView>
    </View>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background.default,
    },

    keyboard: {
      flex: 1,
    },

    content: {
      padding:
        spacing.screenHorizontal,
      paddingTop:
        spacing.lg,
      paddingBottom:
        spacing.huge,
    },

    title: {
      ...typography.h2,
      color:
        colors.brand.primaryDark,
    },

    description: {
      marginTop:
        spacing.xs,
      marginBottom:
        spacing.lg,
      color:
        colors.text.secondary,
      fontSize:
        fontSizes.sm,
      lineHeight: 20,
    },

    input: {
      minHeight: 160,
      borderWidth: 1,
      borderColor:
        colors.border.light,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.background.surface,
      padding:
        spacing.md,
      color:
        colors.text.primary,
      fontSize:
        fontSizes.sm,
      marginBottom:
        spacing.md,
    },
  });