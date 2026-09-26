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
  createReport,
} from '../../../../src/services/kmerDiasporaService';


const REPORT_TYPES = [
  'community',
  'matching',
  'moderation',
  'quest',
  'activity',
];


export default function KmaCreateReportScreen({
  navigation,
}) {
  const [
    title,
    setTitle,
  ] = useState('');

  const [
    type,
    setType,
  ] = useState(
    'community'
  );

  const [
    content,
    setContent,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);


  const save =
    async () => {
      if (
        !title.trim() ||
        !content.trim()
      ) {
        Alert.alert(
          'Informations manquantes',
          'Le titre et le contenu sont obligatoires.'
        );

        return;
      }


      setLoading(
        true
      );


      try {
        await createReport({
          reportType:
            type,
          title:
            title.trim(),
          content:
            content.trim(),
        });


        Alert.alert(
          'Rapport créé',
          'Le rapport a été enregistré.',
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
            'Impossible de créer le rapport.'
        );
      } finally {
        setLoading(
          false
        );
      }
    };


  return (
    <View
      style={
        styles.screen
      }
    >

      <Header
        title="Nouveau rapport"
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
              styles.label
            }
          >
            Titre
          </Text>

          <TextInput
            value={
              title
            }
            onChangeText={
              setTitle
            }
            placeholder="Ex. Synthèse KmerDiaspora - Septembre"
            placeholderTextColor={
              colors.text.tertiary
            }
            style={
              styles.input
            }
          />


          <Text
            style={
              styles.label
            }
          >
            Type de rapport
          </Text>


          <View
            style={
              styles.typeRow
            }
          >
            {REPORT_TYPES.map(
              (item) => (
                <Button
                  key={
                    item
                  }
                  title={
                    item
                  }
                  variant={
                    type ===
                    item
                      ? undefined
                      : 'outline'
                  }
                  onPress={() =>
                    setType(
                      item
                    )
                  }
                  style={
                    styles.typeButton
                  }
                />
              )
            )}
          </View>


          <Text
            style={
              styles.label
            }
          >
            Contenu
          </Text>

          <TextInput
            value={
              content
            }
            onChangeText={
              setContent
            }
            placeholder="Synthèse, constats, anomalies, activité du matching, quêtes, modération..."
            placeholderTextColor={
              colors.text.tertiary
            }
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              styles.textarea,
            ]}
          />


          <Button
            title="Enregistrer le rapport"
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

    label: {
      marginBottom:
        spacing.xs,
      marginTop:
        spacing.md,
      color:
        colors.text.primary,
      fontSize:
        fontSizes.sm,
      fontWeight:
        '700',
    },

    input: {
      minHeight: 54,
      borderWidth: 1,
      borderColor:
        colors.border.light,
      borderRadius:
        radii.xl,
      backgroundColor:
        colors.background.surface,
      paddingHorizontal:
        spacing.md,
      color:
        colors.text.primary,
      fontSize:
        fontSizes.sm,
    },

    textarea: {
      minHeight: 210,
      paddingTop:
        spacing.md,
      marginBottom:
        spacing.lg,
    },

    typeRow: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap:
        spacing.xs,
    },

    typeButton: {
      minWidth: 105,
    },
  });