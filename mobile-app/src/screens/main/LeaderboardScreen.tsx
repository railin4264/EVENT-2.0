import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, RefreshControl, TextInput, Dimensions, Animated, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
const PINK='#ec4899',VIOLET='#8b5cf6',BLUE='#3b82f6',BG='#0C0B10',SURF='rgba(255,255,255,0.05)',BORDER='rgba(255,255,255,0.08)',TXT='#ffffff',TXTS='rgba(255,255,255,0.5)';

import { gamificationService } from '@/services';
const MEDALS = ['#f59e0b','#9ca3af','#b45309'];
const RANK_G:Record<number,[string,string]>={1:[PINK,VIOLET],2:[BLUE,VIOLET],3:['#10b981','#059669']};
export default function LeaderboardScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),{user}=useAuth();
  const [data,setData]=useState<any[]>([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[tab,setTab]=useState<'weekly'|'monthly'|'all-time'>('weekly');
  const load=useCallback(async()=>{try{const r=await gamificationService.getLeaderboard(tab);setData(r||[]);}catch{}finally{setLoading(false);setRefreshing(false);}},[ tab]);
  useEffect(()=>{setLoading(true);load();},[tab]);
  const myRank=data.findIndex(d=>d.user?._id===user?._id||d.userId===user?._id)+1;
  const top3=data.slice(0,3),rest=data.slice(3);
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[lb.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={lb.backBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={TXT}/></TouchableOpacity>
        <Text style={lb.title}>Clasificación</Text>
        <View style={{width:40}}/>
      </View>
      {/* Tabs */}
      <View style={lb.tabs}>{(['weekly','monthly','all-time'] as const).map(t=><TouchableOpacity key={t} style={lb.tabItem} onPress={()=>setTab(t)}><Text style={[lb.tabTxt,tab===t&&{color:TXT,fontWeight:'700'}]}>{t==='weekly'?'Semana':t==='monthly'?'Mes':'Total'}</Text>{tab===t&&<LinearGradient colors={[PINK,VIOLET] as any} style={lb.tabLine}/>}</TouchableOpacity>)}</View>
      {loading?<ActivityIndicator size="large" color={PINK} style={{marginTop:60}}/>:(
        <ScrollView contentContainerStyle={{paddingBottom:100}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={PINK}/>}>
          {/* Top 3 podium */}
          {top3.length>0&&(
            <LinearGradient colors={[PINK+'15',VIOLET+'15',BG]} style={lb.podium}>
              <View style={lb.podiumRow}>
                {[top3[1],top3[0],top3[2]].filter(Boolean).map((p,i)=>{
                  const realIdx=i===0?2:i===1?1:3;
                  const isFirst=realIdx===1;
                  return(
                    <View key={p.user?._id||i} style={[lb.podiumItem,isFirst&&{marginTop:-20}]}>
                      {isFirst&&<LinearGradient colors={['#f59e0b','#b45309']} style={lb.crown}><Ionicons name="trophy" size={16} color="#fff"/></LinearGradient>}
                      <LinearGradient colors={(RANK_G[realIdx]||[SURF,SURF]) as any} style={[lb.podiumAvatar,{width:isFirst?64:52,height:isFirst?64:52,borderRadius:isFirst?20:16}]}>
                        <Text style={{fontSize:isFirst?24:18,fontWeight:'800',color:'#fff'}}>{(p.user?.firstName||p.user?.username||'?').charAt(0)}</Text>
                      </LinearGradient>
                      <Text style={lb.podiumName} numberOfLines={1}>{p.user?.firstName||p.user?.username||'Usuario'}</Text>
                      <Text style={lb.podiumXP}>{(p.xp||p.points||0).toLocaleString()} XP</Text>
                      <View style={[lb.podiumRank,{backgroundColor:MEDALS[realIdx-1]+'30'}]}><Text style={[lb.podiumRankTxt,{color:MEDALS[realIdx-1]}]}>#{realIdx}</Text></View>
                    </View>
                  );
                })}
              </View>
            </LinearGradient>
          )}
          {/* My rank if not in top */}
          {myRank>3&&<View style={lb.myRankCard}><LinearGradient colors={[PINK+'20',VIOLET+'20']} style={lb.myRankInner}><Ionicons name="person" size={20} color={PINK}/><Text style={lb.myRankTxt}>Tu posición: #{myRank}</Text></LinearGradient></View>}
          {/* Rest */}
          <View style={{paddingHorizontal:16,gap:8,paddingTop:8}}>
            {rest.map((p,i)=>(
              <View key={p.user?._id||i} style={lb.row}>
                <Text style={lb.rowRank}>#{i+4}</Text>
                <View style={lb.rowAvatar}><Text style={{fontSize:16,fontWeight:'700',color:TXT}}>{(p.user?.firstName||p.user?.username||'?').charAt(0)}</Text></View>
                <View style={{flex:1}}><Text style={lb.rowName} numberOfLines={1}>{p.user?.firstName||p.user?.username||'Usuario'}</Text><Text style={lb.rowSub}>Nivel {p.level||1}</Text></View>
                <Text style={lb.rowXP}>{(p.xp||p.points||0).toLocaleString()} XP</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
const lb=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:BORDER},
  backBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  title:{flex:1,fontSize:20,fontWeight:'800',color:TXT,textAlign:'center'},
  tabs:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:BORDER,marginHorizontal:16},
  tabItem:{flex:1,alignItems:'center',paddingVertical:12},
  tabTxt:{fontSize:14,color:TXTS,fontWeight:'500'},
  tabLine:{position:'absolute',bottom:0,left:'20%',right:'20%',height:2,borderRadius:1},
  podium:{padding:24,paddingBottom:32},
  podiumRow:{flexDirection:'row',justifyContent:'center',alignItems:'flex-end',gap:20},
  podiumItem:{alignItems:'center',gap:6,flex:1},
  crown:{width:32,height:32,borderRadius:10,justifyContent:'center',alignItems:'center',marginBottom:4},
  podiumAvatar:{justifyContent:'center',alignItems:'center'},
  podiumName:{fontSize:13,fontWeight:'700',color:TXT,textAlign:'center'},
  podiumXP:{fontSize:11,color:TXTS,textAlign:'center'},
  podiumRank:{paddingHorizontal:8,paddingVertical:3,borderRadius:8},
  podiumRankTxt:{fontSize:12,fontWeight:'800'},
  myRankCard:{marginHorizontal:16,marginBottom:8,borderRadius:14,overflow:'hidden'},
  myRankInner:{flexDirection:'row',alignItems:'center',gap:10,padding:14},
  myRankTxt:{fontSize:15,fontWeight:'700',color:TXT},
  row:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:SURF,borderRadius:14,padding:14,borderWidth:1,borderColor:BORDER},
  rowRank:{fontSize:16,fontWeight:'800',color:TXTS,width:30,textAlign:'center'},
  rowAvatar:{width:42,height:42,borderRadius:13,backgroundColor:'rgba(236,72,153,0.15)',justifyContent:'center',alignItems:'center'},
  rowName:{fontSize:15,fontWeight:'700',color:TXT},
  rowSub:{fontSize:12,color:TXTS,marginTop:1},
  rowXP:{fontSize:14,fontWeight:'700',color:PINK},
});
