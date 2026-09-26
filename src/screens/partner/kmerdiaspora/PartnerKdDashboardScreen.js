
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ScrollView,
  View,
  Text,
  Pressable,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
} from '../../../theme/theme';

import Card from '../../../components/Card';

import {
  listKdJobRequests,
  listKdDriverRequests,
  listQuests,
  listMatches,
} from '../../../services/partnerService';

import PartnerKmerDiasporaGuard
  from './PartnerKmerDiasporaGuard';


export default function PartnerKdDashboardScreen({
  navigation,
}) {

  const [
    data,
    setData,
  ] =
    useState({
      jobs: 0,
      drivers: 0,
      quests: 0,
      matches: 0,
    });


  const load =
    useCallback(
      async () => {

        const [
          jobs,
          drivers,
          quests,
          matches,
        ] =
          await Promise.all([
            listKdJobRequests({
              limit:
                1,
            }),

            listKdDriverRequests({
              limit:
                1,
            }),

            listQuests({
              status:
                'published',

              limit:
                1,
            }),

            listMatches({
              limit:
                1,
            }),
          ]);


        setData({
          jobs:
            jobs.count ??
            jobs.data?.length ??
            0,

          drivers:
            drivers.count ??
            drivers.data?.length ??
            0,

          quests:
            quests.count ??
            quests.data?.length ??
            0,

          matches:
            matches.count ??
            matches.data?.length ??
            0,
        });
      },
      []
    );


  useEffect(
    () => {
      load().catch(
        () => {}
      );
    },
    [load]
  );


  return (
    <PartnerKmerDiasporaGuard>

      <ScrollView
        style={{
          flex: 1,

          backgroundColor:
            colors
              .background
              .default,
        }}

        contentContainerStyle={{
          padding:
            spacing
              .screenHorizontal,

          paddingTop:
            spacing
              .screenVertical,

          paddingBottom:
            80,
        }}
      >

        <Text
          style={
            typography.h1
          }
        >
          KmerDiaspora
        </Text>

        <Text
          style={
            typography.caption
          }
        >
          Consultation des informations communautaires
        </Text>


        <View
          style={{
            flexDirection:
              'row',

            flexWrap:
              'wrap',

            gap:
              12,

            marginTop:
              20,
          }}
        >

          <Metric
            title="Postes"
            value={
              data.jobs
            }
            icon="briefcase-outline"
            onPress={() =>
              navigation.navigate(
                'PartnerJobRequests'
              )
            }
          />

          <Metric
            title="Chauffeurs"
            value={
              data.drivers
            }
            icon="people-outline"
            onPress={() =>
              navigation.navigate(
                'PartnerDriverRequests'
              )
            }
          />

          <Metric
            title="Quêtes"
            value={
              data.quests
            }
            icon="heart-outline"
            onPress={() =>
              navigation.navigate(
                'PartnerQuests'
              )
            }
          />

          <Metric
            title="Matching"
            value={
              data.matches
            }
            icon="git-network-outline"
            onPress={() =>
              navigation.navigate(
                'PartnerMatching'
              )
            }
          />

        </View>


        <Card
          style={{
            marginTop:
              20,
          }}
        >

          <Action
            icon="briefcase-outline"
            title="Demandes de poste"
            subtitle="Consulter les besoins de recrutement"
            onPress={() =>
              navigation.navigate(
                'PartnerJobRequests'
              )
            }
          />

          <Action
            icon="people-outline"
            title="Besoins de conducteur"
            subtitle="Consulter les recherches de chauffeurs"
            onPress={() =>
              navigation.navigate(
                'PartnerDriverRequests'
              )
            }
          />

          <Action
            icon="git-network-outline"
            title="Matching"
            subtitle="Consulter les correspondances"
            onPress={() =>
              navigation.navigate(
                'PartnerMatching'
              )
            }
          />

          <Action
            icon="heart-outline"
            title="Quêtes"
            subtitle="Consulter les collectes communautaires"
            onPress={() =>
              navigation.navigate(
                'PartnerQuests'
              )
            }
          />

        </Card>

      </ScrollView>

    </PartnerKmerDiasporaGuard>
  );
}


function Metric({
  title,
  value,
  icon,
  onPress,
}) {

  return (
    <Pressable
      style={{
        width:
          '47%',
      }}
      onPress={
        onPress
      }
    >

      <Card>

        <Ionicons
          name={
            icon
          }
          size={24}
          color={
            colors
              .brand
              .primary
          }
        />

        <Text
          style={[
            typography.h2,
            {
              marginTop:
                8,
            },
          ]}
        >
          {value}
        </Text>

        <Text
          style={
            typography.caption
          }
        >
          {title}
        </Text>

      </Card>

    </Pressable>
  );
}


function Action({
  icon,
  title,
  subtitle,
  onPress,
}) {

  return (
    <Pressable
      onPress={
        onPress
      }
      style={{
        flexDirection:
          'row',

        alignItems:
          'center',

        paddingVertical:
          14,

        borderBottomWidth:
          1,

        borderBottomColor:
          colors
            .border
            .light,
      }}
    >

      <Ionicons
        name={
          icon
        }
        size={24}
        color={
          colors
            .brand
            .primary
        }
      />

      <View
        style={{
          flex: 1,

          marginLeft:
            12,
        }}
      >

        <Text
          style={
            typography.bodyBold
          }
        >
          {title}
        </Text>

        <Text
          style={
            typography.caption
          }
        >
          {subtitle}
        </Text>

      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={
          colors
            .text
            .tertiary
        }
      />

    </Pressable>
  );
}
