
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  colors,
  typography,
  spacing,
} from '../../../theme/theme';

import {
  listMatches,
} from '../../../services/partnerService';

import Card from '../../../components/Card';
import StatusBadge from '../../../components/StatusBadge';

import PartnerKmerDiasporaGuard
  from './PartnerKmerDiasporaGuard';


export default function PartnerMatchingScreen() {

  const [
    rows,
    setRows,
  ] =
    useState([]);


  const load =
    useCallback(
      async () => {

        const r =
          await listMatches({
            limit:
              100,
          });

        setRows(
          r.data ??
          []
        );
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
          Matching
        </Text>

        <Text
          style={
            typography.caption
          }
        >
          Correspondances chauffeur / recruteur · lecture seule
        </Text>


        <Card
          style={{
            marginTop:
              20,
          }}
        >

          {rows.length ? (

            rows.map(
              (match) => (

                <View
                  key={
                    match.id
                  }
                  style={{
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

                  <View
                    style={{
                      flexDirection:
                        'row',

                      justifyContent:
                        'space-between',
                    }}
                  >

                    <Text
                      style={
                        typography
                          .bodyBold
                      }
                    >
                      Score :{' '}
                      {
                        match.match_score ??
                        '—'
                      }
                    </Text>

                    <StatusBadge
                      status={
                        match.status ===
                          'matched' ||
                        match.status ===
                          'notified'
                          ? 'confirmed'
                          : match.status ===
                              'rejected'
                            ? 'rejected'
                            : 'under_review'
                      }
                    />

                  </View>


                  <Text
                    style={[
                      typography.caption,
                      {
                        marginTop:
                          6,
                      },
                    ]}
                  >
                    Chauffeur :{' '}
                    {
                      match.driver_request_id
                    }
                  </Text>


                  <Text
                    style={
                      typography.caption
                    }
                  >
                    Poste :{' '}
                    {
                      match.job_request_id
                    }
                  </Text>

                </View>
              )
            )

          ) : (

            <Text
              style={
                typography.caption
              }
            >
              Aucune correspondance disponible.
            </Text>

          )}

        </Card>

      </ScrollView>

    </PartnerKmerDiasporaGuard>
  );
}
