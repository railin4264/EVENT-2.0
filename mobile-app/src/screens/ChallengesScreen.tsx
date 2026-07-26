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

import { gamificationService } from '@/services';
const RARITY_G:Record<string,[string,string]>={common:['#6b7280','#4b5563'],rare:[BLUE,'#1d4ed8'],epic:[VIOLET,'#6d28d9'],legendary:['#f59e0b','#b45309']};
const RARITY_L:Record<string,string>={common:'Común',rare:'Raro',epic:'Épico',legendary:'Legendario'};
export default function ChallengesScreen(){
  const router=useRouter(),insets=useSafeAreaInsets();
  const [challenges,setChallenges]=useState<any[]>([]),[loading,setLoading]=useState(true),[tab,setTab]=useState<'active'|'completed'>('active');
  useEffect(()=>{(async()=>{try{const r=await gamificationService.getChallenges();setChallenges((r as any)?.data||r||[]);}catch{}finally{setLoading(false);}})();},[]);
  const filtered=challenges.filter(c=>tab==='active'?c.status!=='completed':c.status==='completed');
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[ch.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={ch.backBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={TXT}/></TouchableOpacity>
        <Text style={ch.title}>Desafíos</Text>
        <TouchableOpacity style={ch.backBtn}><Ionicons name="trophy" size={20} color={TXT}/></TouchableOpacity>
      </View>
      <View style={ch.tabs}>{(['active','completed'] as const).map(t=><TouchableOpacity key={t} style={ch.tabItem} onPress={()=>setTab(t)}><Text style={[ch.tabTxt,tab===t&&{color:TXT,fontWeight:'700'}]}>{t==='active'?'Activos':'Completados'}</Text>{tab===t&&<LinearGradient colors={[PINK,VIOLET] as any} style={ch.tabLine}/>}</TouchableOpacity>)}</View>
      {loading?<ActivityIndicator size="large" color={PINK} style={{marginTop:60}}/>:(
        <FlatList data={filtered} keyExtractor={i=>i._id||i.id} contentContainerStyle={{padding:16,gap:12,paddingBottom:100}}
          renderItem={({item})=>{
            const prog=item.progress||0,tgt=item.target||1,pct=Math.min(1,prog/tgt),rar=item.rarity||'common';
            const [c1,c2]=RARITY_G[rar]||RARITY_G.common;
            return(
              <View style={ch.card}>
                <View style={{flexDirection:'row',gap:14,marginBottom:14}}>
                  <LinearGradient colors={[c1,c2] as any} style={ch.iconWrap}><Ionicons name={(item.icon||'flash') as any} size={24} color="#fff"/></LinearGradient>
                  <View style={{flex:1}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4}}>
                      <Text style={ch.cardTitle}>{item.title}</Text>
                      <View style={[ch.rar,{backgroundColor:c1+'22',borderColor:c1+'40'}]}><Text style={[ch.rarTxt,{color:c1}]}>{RARITY_L[rar]}</Text></View>
                    </View>
                    <Text style={ch.cardDesc}>{item.description}</Text>
                  </View>
                </View>
                <View style={ch.progRow}><View style={ch.progTrack}><LinearGradient colors={[c1,c2] as any} style={[ch.progFill,{width:`${pct*100}%` as any}]} start={{x:0,y:0}} end={{x:1,y:0}}/></View><Text style={ch.progTxt}>{prog}/{tgt}</Text></View>
                {item.xpReward&&<View style={{flexDirection:'row',alignItems:'center',gap:5,marginTop:8}}><Ionicons name="star" size={14} color="#f59e0b"/><Text style={{fontSize:12,color:'#f59e0b',fontWeight:'600'}}>+{item.xpReward} XP al completar</Text></View>}
              </View>
            );
          }}
          ListEmptyComponent={<View style={{alignItems:'center',paddingTop:60,gap:12}}><Ionicons name="trophy-outline" size={56} color={TXTS}/><Text style={{fontSize:18,fontWeight:'700',color:TXT}}>Sin desafíos {tab==='active'?'activos':'completados'}</Text></View>}
        />
      )}
    </View>
  );
}
const ch=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:BORDER},
  backBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  title:{flex:1,fontSize:20,fontWeight:'800',color:TXT,textAlign:'center'},
  tabs:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:BORDER,marginHorizontal:16},
  tabItem:{flex:1,alignItems:'center',paddingVertical:12},
  tabTxt:{fontSize:15,color:TXTS,fontWeight:'500'},
  tabLine:{position:'absolute',bottom:0,left:'15%',right:'15%',height:2,borderRadius:1},
  card:{backgroundColor:SURF,borderRadius:18,padding:16,borderWidth:1,borderColor:BORDER},
  iconWrap:{width:52,height:52,borderRadius:16,justifyContent:'center',alignItems:'center',flexShrink:0},
  cardTitle:{fontSize:16,fontWeight:'700',color:TXT,flex:1},
  cardDesc:{fontSize:13,color:TXTS,lineHeight:18},
  rar:{borderRadius:8,paddingHorizontal:7,paddingVertical:3,borderWidth:1},rarTxt:{fontSize:10,fontWeight:'800'},
  progRow:{flexDirection:'row',alignItems:'center',gap:10},
  progTrack:{flex:1,height:6,borderRadius:3,backgroundColor:'rgba(255,255,255,0.08)',overflow:'hidden'},
  progFill:{height:'100%',borderRadius:3},
  progTxt:{fontSize:12,color:TXTS,fontWeight:'600',width:45,textAlign:'right'},
});
