import React, {
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  colors,
  typography,
  spacing,
  radii,
} from '../../theme/theme';

import SegmentedControl
  from '../../components/SegmentedControl';

import EmptyState
  from '../../components/EmptyState';

import {
  useNotifications,
} from '../../context/NotificationContext';

import {
  formatDateTime,
} from '../../utils/formatters';


const TABS = [
  {
    value: 'all',
    label: 'Toutes',
  },
  {
    value: 'unread',
    label: 'Non lues',
  },
];


const ICONS = {

  transaction:
    'swap-horizontal-outline',

  loan_request:
    'cash-outline',

  profile:
    'person-circle-outline',

  push:
    'notifications-outline',

};


const EVENT_ICONS = {

  transaction_created:
    'add-circle-outline',

  transaction_confirmed:
    'checkmark-circle-outline',

  transaction_rejected:
    'close-circle-outline',

  transaction_cancelled:
    'close-circle-outline',

  transaction_updated:
    'refresh-outline',

  transaction_under_review:
    'search-outline',

  loan_submitted:
    'document-text-outline',

  loan_contacted:
    'logo-whatsapp',

  loan_processing:
    'time-outline',

  loan_approved:
    'checkmark-circle-outline',

  loan_rejected:
    'close-circle-outline',

  loan_cancelled:
    'close-circle-outline',

  loan_disbursed:
    'wallet-outline',

  loan_repayment:
    'card-outline',

  loan_paid:
    'checkmark-done-circle-outline',

  loan_defaulted:
    'warning-outline',

  loan_updated:
    'refresh-outline',

  profile_updated:
    'person-outline',

  profile_rank_updated:
    'trophy-outline',

};


function getIcon(
  item
) {

  return (
    EVENT_ICONS[
      item?.event_type
    ]
    ||
    ICONS[
      item?.resource_type
    ]
    ||
    ICONS[
      item?.channel
    ]
    ||
    'notifications-outline'
  );
}


function getTitle(
  item
) {

  if (
    item?.title
  ) {

    return item.title;

  }


  switch (
    item?.resource_type
  ) {

    case 'transaction':
      return 'Transaction';

    case 'loan_request':
      return 'Prêt';

    case 'profile':
      return 'Profil';

    default:
      return 'Notification';

  }
}


export default function NotificationsScreen({
  navigation,
}) {

  const {
    items,
    loading,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
  } =
    useNotifications();


  const [
    tab,
    setTab,
  ] = useState(
    'all'
  );


  const [
    refreshing,
    setRefreshing,
  ] = useState(false);


  const filtered =
    useMemo(
      () =>

        tab === 'unread'

          ? items.filter(
              item =>
                !item.read_at
            )

          : items,

      [
        items,
        tab,
      ]
    );


  const onRefresh =
    async () => {

      setRefreshing(
        true
      );


      try {

        await refresh();

      } finally {

        setRefreshing(
          false
        );

      }

    };


  const openNotification =
    async (
      item
    ) => {

      try {

        await markRead(
          item.id
        );

      } catch (
        error
      ) {

        console.warn(
          '[NotificationsScreen] mark read failed:',
          error
        );

      }


      if (
        item.resource_type ===
          'transaction'
        &&
        item.resource_id
      ) {

        navigation.navigate(
          'TransactionDetail',
          {
            transactionId:
              item.resource_id,
          }
        );

        return;
      }


      if (
        item.resource_type ===
          'loan_request'
        &&
        item.resource_id
      ) {

        navigation.navigate(
          'LoanDetail',
          {
            requestId:
              item.resource_id,
          }
        );

        return;
      }


      if (
        item.resource_type ===
        'profile'
      ) {

        navigation.navigate(
          'Profile'
        );

      }

    };


  return (

    <View style={styles.wrapper}>

      <View
        style={
          styles.headerRow
        }
      >

        <View
          style={{
            flex: 1,
          }}
        >

          <Text
            style={
              typography.h2
            }
          >
            Notifications
          </Text>

          <Text
            style={[
              typography.caption,
              styles.subtitle,
            ]}
          >

            {
              unreadCount > 0

                ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`

                : 'Tout est à jour'
            }

          </Text>

        </View>


        {
          unreadCount > 0

          ? (

            <Pressable
              onPress={
                markAllRead
              }
              style={
                styles.readAllButton
              }
              hitSlop={8}
            >

              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color={
                  colors.brand.primary
                }
              />

            </Pressable>

          )

          : null
        }

      </View>


      <SegmentedControl
        options={TABS}
        value={tab}
        onChange={setTab}
      />


      {
        loading &&
        !items.length

          ? (

            <View
              style={
                styles.loading
              }
            >

              <ActivityIndicator
                color={
                  colors.brand.primary
                }
              />

            </View>

          )

          : (

            <FlatList

              data={filtered}

              keyExtractor={
                item =>
                  item.id
              }

              contentContainerStyle={
                filtered.length
                  ? styles.listContent
                  : styles.emptyContent
              }

              showsVerticalScrollIndicator={
                false
              }

              refreshControl={

                <RefreshControl

                  refreshing={
                    refreshing
                  }

                  onRefresh={
                    onRefresh
                  }

                  tintColor={
                    colors.brand.primary
                  }

                />

              }

              renderItem={
                ({
                  item,
                }) => (

                  <Pressable

                    onPress={() =>
                      openNotification(
                        item
                      )
                    }

                    style={[
                      styles.row,

                      !item.read_at
                        &&
                        styles.unreadRow,
                    ]}
                  >

                    <View
                      style={[
                        styles.iconWrap,

                        !item.read_at
                          &&
                          styles.unreadIconWrap,
                      ]}
                    >

                      <Ionicons

                        name={
                          getIcon(
                            item
                          )
                        }

                        size={19}

                        color={
                          colors.brand.primary
                        }

                      />

                    </View>


                    <View
                      style={
                        styles.content
                      }
                    >

                      <View
                        style={
                          styles.titleRow
                        }
                      >

                        <Text
                          style={[
                            typography.bodyBold,
                            styles.title,
                          ]}
                          numberOfLines={
                            1
                          }
                        >

                          {
                            getTitle(
                              item
                            )
                          }

                        </Text>


                        {
                          !item.read_at

                            ? (
                              <View
                                style={
                                  styles.unreadDot
                                }
                              />
                            )

                            : null
                        }

                      </View>


                      <Text

                        style={[
                          typography.caption,
                          styles.message,
                        ]}

                        numberOfLines={
                          3
                        }

                      >

                        {
                          item.message
                        }

                      </Text>


                      <Text

                        style={[
                          typography.caption,
                          styles.date,
                        ]}

                      >

                        {
                          formatDateTime(
                            item.sent_at
                          )
                        }

                      </Text>

                    </View>


                    {
                      item.resource_type

                        ? (

                          <Ionicons

                            name="chevron-forward"

                            size={18}

                            color={
                              colors.text.tertiary
                            }

                          />

                        )

                        : null
                    }

                  </Pressable>

                )
              }


              ListEmptyComponent={

                <EmptyState

                  icon={
                    tab === 'unread'
                      ? 'checkmark-done-outline'
                      : 'notifications-outline'
                  }

                  title={
                    tab === 'unread'
                      ? 'Aucune notification non lue'
                      : 'Aucune notification'
                  }

                  subtitle={
                    tab === 'unread'
                      ? 'Vous êtes à jour.'
                      : 'Les mises à jour de votre compte apparaîtront ici.'
                  }

                />

              }

            />

          )
      }

    </View>

  );
}


const styles =
  StyleSheet.create({

    wrapper: {

      flex: 1,

      backgroundColor:
        colors.background.default,

      paddingHorizontal:
        spacing.screenHorizontal,

      paddingTop:
        60,

    },


    headerRow: {

      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        spacing.lg,

    },


    subtitle: {

      color:
        colors.text.secondary,

      marginTop:
        3,

    },


    readAllButton: {

      width: 42,

      height: 42,

      borderRadius:
        14,

      backgroundColor:
        colors.brand.primaryLight,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft:
        spacing.md,

    },


    loading: {

      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    listContent: {

      paddingTop:
        spacing.md,

      paddingBottom:
        spacing.huge,

    },


    emptyContent: {

      flexGrow:
        1,

      paddingBottom:
        spacing.huge,

    },


    row: {

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.md,

      paddingVertical:
        spacing.md,

      paddingHorizontal:
        spacing.sm,

      borderBottomWidth:
        1,

      borderBottomColor:
        colors.border.light,

      borderRadius:
        radii.md,

    },


    unreadRow: {

      backgroundColor:
        colors.background.surface,

    },


    iconWrap: {

      width: 42,

      height: 42,

      borderRadius:
        14,

      backgroundColor:
        colors.background.surfaceAlt,

      alignItems:
        'center',

      justifyContent:
        'center',

    },


    unreadIconWrap: {

      backgroundColor:
        colors.brand.primaryLight,

    },


    content: {

      flex: 1,

      minWidth: 0,

    },


    titleRow: {

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,

    },


    title: {

      flex: 1,

    },


    message: {

      color:
        colors.text.secondary,

      marginTop:
        4,

      lineHeight:
        20,

    },


    date: {

      color:
        colors.text.tertiary,

      marginTop:
        5,

    },


    unreadDot: {

      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        colors.brand.primary,

    },

  });