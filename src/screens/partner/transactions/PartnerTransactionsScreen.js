import React,{useCallback,useEffect,useState} from 'react';
import {FlatList,RefreshControl,View,Text,Pressable} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors,typography,spacing,transactionTypeColors} from '../../../theme/theme';
import {listAssignedTransactions} from '../../../services/partnerService';
import TransactionListItem from '../../../components/TransactionListItem';
import EmptyState from '../../../components/EmptyState';
import SegmentedControl from '../../../components/SegmentedControl';

const FILTERS=[['all','Toutes'],['pending','À traiter'],['review','À vérifier']];
export default function PartnerTransactionsScreen({navigation}){
 const [rows,setRows]=useState([]),[filter,setFilter]=useState('all'),[refreshing,setRefreshing]=useState(false),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{try{setLoading(true);const r=await listAssignedTransactions({limit:100,offset:0});setRows(r?.data??[]);}catch(e){}finally{setLoading(false);setRefreshing(false);}},[]);
 useEffect(()=>{load()},[load]);
 const filtered=rows.filter(x=>{if(filter==='all')return true;if(filter==='pending')return ['pending_proof','under_review','pending'].includes(x.status);return x.workflow_stage==='review'||x.status==='under_review';});
 return <View style={{flex:1,backgroundColor:colors.background.default,paddingHorizontal:spacing.screenHorizontal,paddingTop:spacing.screenVertical}}><Text style={typography.h1}>Transactions</Text><Text style={[typography.caption,{marginTop:4}]}>Opérations qui vous sont affectées</Text><View style={{marginVertical:16}}><SegmentedControl value={filter} onChange={setFilter} options={FILTERS.map(([value,label])=>({value,label}))}/></View><FlatList data={filtered} keyExtractor={x=>x.id} renderItem={({item})=><TransactionListItem transaction={item} onPress={()=>navigation.navigate('PartnerTransactionDetail',{transactionId:item.id})}/>} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load()}} tintColor={colors.brand.primary}/>} ListEmptyComponent={<EmptyState icon="swap-horizontal-outline" title="Aucune transaction" subtitle="Aucune opération ne correspond au filtre sélectionné."/>} contentContainerStyle={{paddingBottom:80}}/></View>
}
