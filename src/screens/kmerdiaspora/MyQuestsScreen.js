import React,{useCallback,useEffect,useState} from 'react';
import {ScrollView,View,Pressable,Text,StyleSheet,Alert} from 'react-native';
import {colors,typography,spacing,radii} from '../../theme/theme';
import {listMyQuests,listQuests,respondQuestApproval} from '../../services/kmerDiasporaService';
import {KdScreen,Card,KdListRow,KdEmpty,KdLoading,SectionTitle,KdStatus,Button} from './components/KdUI';

export default function MyQuestsScreen({navigation}){
 const [tab,setTab]=useState('mine'); const [items,setItems]=useState(null);
 const load=useCallback(async()=>{const r=tab==='mine'?await listMyQuests({limit:50}):await listQuests({forApproval:true,limit:50});setItems(r.data||[])},[tab]);
 useEffect(()=>{setItems(null);load().catch(console.error)},[load]);
 const approve=async(id,ok)=>{try{await respondQuestApproval(id,ok);await load()}catch(e){Alert.alert('Erreur', e.message || 'Impossible de traiter la demande.')}};
 return <KdScreen title="Mes quêtes" scrollView={ScrollView}>
  <View style={styles.tabs}>{[['mine','Créées'],['approval','Pour approbation']].map(([v,l])=><Pressable key={v} onPress={()=>setTab(v)} style={[styles.tab,tab===v&&styles.tabActive]}><Text style={[typography.caption,tab===v&&styles.tabText]}>{l}</Text></Pressable>)}</View>
  <SectionTitle title={tab==='mine'?'Quêtes que j’ai créées':'Demandes en mon nom'} subtitle={tab==='approval'?'Acceptez ou refusez une quête créée pour vous par un autre utilisateur.':undefined}/>
  <Card>{items===null?<KdLoading/>:!items.length?<KdEmpty icon={tab==='mine'?'heart-outline':'person-add-outline'} title="Aucune quête" subtitle={tab==='mine'?'Vous n’avez pas encore créé de quête.':'Aucune demande d’approbation.'}/>:items.map((q,i)=><View key={q.id}><KdListRow icon="heart-outline" title={q.title} subtitle={`${Number(q.current_amount||0).toLocaleString('fr-FR')} / ${q.target_amount?Number(q.target_amount).toLocaleString('fr-FR'):'—'} ${q.currency||'XAF'}`} right={<KdStatus status={q.status}/>} onPress={()=>navigation.navigate('QuestDetail',{questId:q.id})}/>{tab==='approval'&&<View style={styles.approvalButtons}><Button title="Accepter" onPress={()=>approve(q.id,true)} style={{flex:1}}/><Button title="Refuser" variant="outline" onPress={()=>approve(q.id,false)} style={{flex:1}}/></View>}{i<items.length-1&&<View style={styles.divider}/>}</View>)}</Card>
 </KdScreen>;
}
const styles=StyleSheet.create({tabs:{flexDirection:'row',gap:spacing.xs,marginTop:spacing.sm},tab:{flex:1,paddingVertical:spacing.sm,alignItems:'center',borderRadius:radii.md,borderWidth:1,borderColor:colors.border.light,backgroundColor:colors.background.surface},tabActive:{backgroundColor:colors.brand.primaryLight,borderColor:colors.brand.primary},tabText:{color:colors.brand.primary,fontWeight:'800'},approvalButtons:{flexDirection:'row',gap:spacing.sm,marginBottom:spacing.sm},divider:{height:1,backgroundColor:colors.border.light}});
