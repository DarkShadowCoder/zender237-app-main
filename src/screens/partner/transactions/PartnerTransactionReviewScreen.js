
import React, {
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  Text,
} from 'react-native';

import {
  typography,
  spacing,
} from '../../../theme/theme';

import Input from '../../../components/Input';
import Button from '../../../components/Button';
import InfoBanner from '../../../components/InfoBanner';

import {
  approveTransaction,
  rejectTransaction,
  confirmTransaction,
  executeTransaction,
} from '../../../services/partnerService';

import {
  useAuthorization,
} from '../../../context/AuthorizationContext';


export default function PartnerTransactionReviewScreen({
  route,
  navigation,
}) {

  const id =
    route?.params?.transactionId;

  const forced =
    route?.params?.decision;

  const [
    reason,
    setReason,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const {
    isPartnerAdmin,
    isPartnerOperator,

    canApproveTransaction,
    canRejectTransaction,
    canConfirmTransaction,
    canExecuteTransaction,
  } =
    useAuthorization();


  const isAdmin =
    isPartnerAdmin();

  const isOperator =
    isPartnerOperator();


  const allowApprove =
    canApproveTransaction();

  const allowReject =
    canRejectTransaction();

  const allowConfirm =
    canConfirmTransaction();

  const allowExecute =
    canExecuteTransaction();


  const title =
    useMemo(
      () => {

        if (
          forced ===
          'reject'
        ) {
          return 'Rejet de la transaction';
        }

        if (
          forced ===
          'confirm'
        ) {
          return 'Confirmation de la transaction';
        }

        return 'Vérification';
      },
      [forced]
    );


  const act =
    async (
      decision
    ) => {

      if (!id) {
        Alert.alert(
          'Erreur',
          'Transaction introuvable.'
        );

        return;
      }


      if (
        decision ===
          'reject' &&
        !allowReject
      ) {
        Alert.alert(
          'Action non autorisée',
          'Votre rôle ne permet pas de rejeter une transaction.'
        );

        return;
      }


      if (
        decision ===
          'confirm' &&
        !allowConfirm
      ) {
        Alert.alert(
          'Action non autorisée',
          'Votre rôle ne permet pas de confirmer cette transaction.'
        );

        return;
      }


      if (
        decision ===
          'approve' &&
        !allowApprove
      ) {
        Alert.alert(
          'Action non autorisée',
          'Seul le rôle Admin partenaire peut approuver une transaction.'
        );

        return;
      }


      if (
        decision ===
          'execute' &&
        !allowExecute
      ) {
        Alert.alert(
          'Action non autorisée',
          'Seul le rôle Admin partenaire peut exécuter une transaction.'
        );

        return;
      }


      try {

        setLoading(true);


        if (
          decision ===
          'approve'
        ) {

          await approveTransaction({
            transactionId:
              id,

            reason:
              reason.trim() ||
              null,
          });

        } else if (
          decision ===
          'reject'
        ) {

          if (
            !reason.trim()
          ) {
            Alert.alert(
              'Motif requis',
              'Un motif de rejet est obligatoire.'
            );

            return;
          }

          await rejectTransaction({
            transactionId:
              id,

            reason:
              reason.trim(),
          });

        } else if (
          decision ===
          'confirm'
        ) {

          await confirmTransaction({
            transactionId:
              id,

            reason:
              reason.trim() ||
              null,
          });

        } else {

          await executeTransaction({
            transactionId:
              id,

            reason:
              reason.trim() ||
              null,
          });
        }


        navigation.goBack();

      } catch (e) {

        Alert.alert(
          'Erreur',
          e?.message ||
            'Impossible d’appliquer cette action.'
        );

      } finally {
        setLoading(false);
      }
    };


  return (
    <ScrollView
      contentContainerStyle={{
        padding:
          spacing.screenHorizontal,

        paddingTop:
          spacing.screenVertical,

        paddingBottom:
          60,
      }}
    >

      <Text
        style={
          typography.h1
        }
      >
        {title}
      </Text>


      <InfoBanner
        text={
          isOperator &&
          !isAdmin

            ? 'Le rôle Partner peut confirmer une transaction, mais ne peut pas la rejeter ni exécuter les opérations.'

            : 'Vérifiez la preuve et appliquez uniquement une action autorisée par votre rôle.'
        }
      />


      <Input
        label={
          forced ===
          'reject'

            ? 'Motif du rejet'

            : 'Motif / commentaire'
        }

        value={
          reason
        }

        onChangeText={
          setReason
        }

        placeholder={
          forced ===
          'reject'

            ? 'Expliquez précisément la raison du rejet…'

            : 'Ex. preuve vérifiée, numéro conforme…'
        }

        multiline={
          forced ===
          'reject'
        }
      />


      {forced ===
      'reject' ? (

        <Button
          title="Rejeter"
          loading={
            loading
          }
          variant="danger"
          disabled={
            !allowReject
          }
          onPress={() =>
            act(
              'reject'
            )
          }
        />

      ) : null}


      {forced ===
      'confirm' ? (

        <Button
          title="Confirmer"
          loading={
            loading
          }
          variant="success"
          disabled={
            !allowConfirm
          }
          onPress={() =>
            act(
              'confirm'
            )
          }
        />

      ) : null}


      {forced == null ? (
        <>

          {allowConfirm ? (
            <Button
              title="Confirmer"
              loading={
                loading
              }
              variant="success"
              onPress={() =>
                act(
                  'confirm'
                )
              }
            />
          ) : null}


          {allowApprove ? (
            <Button
              title="Approuver"
              loading={
                loading
              }
              variant="primary"
              onPress={() =>
                act(
                  'approve'
                )
              }
              style={{
                marginTop:
                  10,
              }}
            />
          ) : null}


          {allowReject ? (
            <Button
              title="Rejeter"
              loading={
                loading
              }
              variant="danger"
              onPress={() =>
                act(
                  'reject'
                )
              }
              style={{
                marginTop:
                  10,
              }}
            />
          ) : null}


          {allowExecute ? (
            <Button
              title="Exécuter"
              loading={
                loading
              }
              variant="outline"
              onPress={() =>
                act(
                  'execute'
                )
              }
              style={{
                marginTop:
                  10,
              }}
            />
          ) : null}

        </>
      ) : null}

    </ScrollView>
  );
}

