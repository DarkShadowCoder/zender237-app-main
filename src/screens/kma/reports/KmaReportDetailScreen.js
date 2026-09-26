import React from 'react';

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Header from '../../../../src/components/Header';
import Card from '../../../../src/components/Card';
import InfoBanner from '../../../../src/components/InfoBanner';

import {
  colors,
  fontSizes,
  spacing,
  typography,
} from '../../../../src/theme/theme';


export default function KmaReportDetailScreen({
  route,
}) {
  const report =
    route.params?.report ||
    {};


  return (
    <View
      style={
        styles.screen
      }
    >

      <Header
        title="Détail du rapport"
      />


      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >

        <InfoBanner
          icon="document-text-outline"
          text="Ce rapport constitue une trace de supervision du KmAdministrateur."
        />


        <Card
          style={
            styles.card
          }
        >

          <Text
            style={
              styles.title
            }
          >
            {
              report.title ||
              'Rapport communautaire'
            }
          </Text>


          <Text
            style={
              styles.meta
            }
          >
            {report.report_type ||
              'community'}
            {report.report_date
              ? ` · ${report.report_date}`
              : ''}
          </Text>


          <View
            style={
              styles.divider
            }
          />


          <Text
            style={
              styles.contentText
            }
          >
            {
              report.content ||
              'Aucun contenu.'
            }
          </Text>


          {report.file_url ? (
            <View
              style={
                styles.fileBox
              }
            >
              <Text
                style={
                  styles.fileLabel
                }
              >
                Document associé
              </Text>

              <Text
                style={
                  styles.fileUrl
                }
              >
                {
                  report.file_url
                }
              </Text>
            </View>
          ) : null}

        </Card>

      </ScrollView>

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

    content: {
      padding:
        spacing.screenHorizontal,
      paddingTop:
        spacing.md,
      paddingBottom:
        spacing.huge,
    },

    card: {
      marginTop:
        spacing.md,
    },

    title: {
      ...typography.h2,
      color:
        colors.brand.primaryDark,
    },

    meta: {
      marginTop:
        spacing.xs,
      color:
        colors.text.tertiary,
      fontSize:
        fontSizes.xs,
    },

    divider: {
      height: 1,
      marginVertical:
        spacing.md,
      backgroundColor:
        colors.border.light,
    },

    contentText: {
      color:
        colors.text.primary,
      fontSize:
        fontSizes.sm,
      lineHeight: 22,
    },

    fileBox: {
      marginTop:
        spacing.lg,
      padding:
        spacing.sm,
      borderRadius:
        14,
      backgroundColor:
        colors.background.default,
    },

    fileLabel: {
      color:
        colors.text.tertiary,
      fontSize: 10,
      fontWeight:
        '700',
    },

    fileUrl: {
      marginTop: 3,
      color:
        colors.text.link,
      fontSize:
        fontSizes.xs,
    },
  });