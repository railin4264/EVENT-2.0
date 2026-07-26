import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  Image, ActivityIndicator, RefreshControl, TextInput, Dimensions,
  Animated, StatusBar, Alert, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
const PINK='#ec4899',VIOLET='#8b5cf6',BLUE='#3b82f6',BG='#0C0B10',SURF='rgba(255,255,255,0.05)',BORDER='rgba(255,255,255,0.08)',TXT='#ffffff',TXTS='rgba(255,255,255,0.5)';

import { transactionService } from '@/services/TransactionService';
import type { WalletBalance, Transaction } from '@/types';
const fmtCOP=(v:number)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(v||0);
export default function WalletScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),{user}=useAuth();
  const [balance,setBalance]=useState<WalletBalance|null>(null),[txs,setTxs]=useState<Transaction[]>([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false);
  const load=useCallback(async()=>{try{const[b,t]=await Promise.all([transactionService.getBalance(),transactionService.getTransactions({})]);setBalance(b);setTxs(t?.data||[]);}catch{}finally{setLoading(false);setRefreshing(false);}},[ ]);
  useEffect(()=>{load();},[]);
  const TX_IC:Record<string,string>={purchase:'bag-handle',refund:'arrow-undo',deposit:'add-circle',withdrawal:'arrow-up-circle'};
  const TX_CL:Record<string,string>={purchase:PINK,refund:'#10b981',deposit:BLUE,withdrawal:'#f59e0b'};
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[ws.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={ws.backBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={TXT}/></TouchableOpacity>
        <Text style={ws.title}>Mi billetera</Text>
      </View>
      <ScrollView contentContainerStyle={{paddingBottom:100}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={PINK}/>}>
        <LinearGradient colors={[PINK,VIOLET,'#3b82f6'] as any} style={ws.balCard} start={{x:0,y:0}} end={{x:1,y:1}}>
          <View style={ws.orb1}/><View style={ws.orb2}/>
          <Text style={ws.balLabel}>Saldo disponible</Text>
          <Text style={ws.balAmt}>{loading?'---':fmtCOP(balance?.available||0)}</Text>
          {balance&&<Text style={ws.balPend}>Pendiente: {fmtCOP(balance.pending||0)}</Text>}
          <View style={{flexDirection:'row',gap:12,marginTop:20}}>
            <TouchableOpacity style={ws.balBtn}><Ionicons name="add" size={18} color="#fff"/><Text style={ws.balBtnTxt}>Recargar</Text></TouchableOpacity>
            <TouchableOpacity style={ws.balBtn}><Ionicons name="arrow-up" size={18} color="#fff"/><Text style={ws.balBtnTxt}>Retirar</Text></TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={ws.statsRow}>
          {[{label:'Gastado',v:balance?.totalSpent||0,icon:'bag-handle',color:PINK},{label:'Tickets',v:balance?.ticketsPurchased||0,icon:'ticket',color:VIOLET,isCount:true},{label:'Ahorrado',v:balance?.totalSaved||0,icon:'shield-checkmark',color:'#10b981'}].map((s,i)=>(
            <View key={i} style={ws.statCard}><View style={[ws.statIcon,{backgroundColor:s.color+'18'}]}><Ionicons name={s.icon as any} size={18} color={s.color}/></View><Text style={ws.statVal}>{s.isCount?s.v:fmtCOP(s.v)}</Text><Text style={ws.statLbl}>{s.label}</Text></View>
          ))}
        </View>
        <View style={{paddingHorizontal:16}}><Text style={ws.txTitle}>Historial</Text>
          {loading?<ActivityIndicator color={PINK} style={{marginTop:20}}/>:txs.length===0
            ?<View style={{alignItems:'center',paddingVertical:40,gap:12}}><Ionicons name="receipt-outline" size={48} color={TXTS}/><Text style={{color:TXTS,fontSize:15}}>Sin transacciones aún</Text></View>
            :txs.map(tx=>{
              const ic=TX_IC[tx.type]||'swap-horizontal',color=TX_CL[tx.type]||TXTS,isCredit=['refund','deposit'].includes(tx.type);
              return(<View key={tx._id} style={ws.txItem}><View style={[ws.txIcon,{backgroundColor:color+'18'}]}><Ionicons name={ic as any} size={20} color={color}/></View><View style={{flex:1}}><Text style={ws.txDesc} numberOfLines={1}>{tx.description||tx.type}</Text><Text style={ws.txDate}>{tx.createdAt?new Date(tx.createdAt).toLocaleDateString('es'):''}</Text></View><Text style={[ws.txAmt,{color:isCredit?'#10b981':'#ef4444'}]}>{isCredit?'+':'-'}{fmtCOP(tx.amount)}</Text></View>);
            })
          }
        </View>
      </ScrollView>
    </View>
  );
}
const ws=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:BORDER},
  backBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  title:{fontSize:20,fontWeight:'800',color:TXT},
  balCard:{margin:16,borderRadius:24,padding:24,overflow:'hidden',minHeight:200},
  orb1:{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:90,backgroundColor:'rgba(255,255,255,0.08)'},
  orb2:{position:'absolute',bottom:-20,left:-20,width:120,height:120,borderRadius:60,backgroundColor:'rgba(255,255,255,0.06)'},
  balLabel:{fontSize:13,color:'rgba(255,255,255,0.7)',marginBottom:8,fontWeight:'500'},
  balAmt:{fontSize:36,fontWeight:'900',color:'#fff',marginBottom:4},
  balPend:{fontSize:13,color:'rgba(255,255,255,0.6)'},
  balBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:12,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:14,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
  balBtnTxt:{color:'#fff',fontWeight:'700',fontSize:14},
  statsRow:{flexDirection:'row',gap:10,paddingHorizontal:16,marginBottom:16},
  statCard:{flex:1,backgroundColor:SURF,borderRadius:16,padding:14,borderWidth:1,borderColor:BORDER,alignItems:'center',gap:6},
  statIcon:{width:40,height:40,borderRadius:12,justifyContent:'center',alignItems:'center'},
  statVal:{fontSize:13,fontWeight:'800',color:TXT,textAlign:'center'},
  statLbl:{fontSize:11,color:TXTS,textAlign:'center'},
  txTitle:{fontSize:18,fontWeight:'700',color:TXT,marginBottom:12},
  txItem:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:14,borderBottomWidth:1,borderBottomColor:BORDER},
  txIcon:{width:44,height:44,borderRadius:14,justifyContent:'center',alignItems:'center',flexShrink:0},
  txDesc:{fontSize:15,fontWeight:'600',color:TXT,marginBottom:3},
  txDate:{fontSize:12,color:TXTS},txAmt:{fontSize:16,fontWeight:'800'},
});
