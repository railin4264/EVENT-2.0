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
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
const RAR_G:Record<string,[string,string]>={common:['#6b7280','#4b5563'],rare:[BLUE,'#1d4ed8'],epic:[VIOLET,'#6d28d9'],legendary:['#f59e0b','#b45309']};
const RAR_L:Record<string,string>={common:'Común',rare:'Raro',epic:'Épico',legendary:'Legendario'};
export default function AchievementsScreen(){
  const router=useRouter(),insets=useSafeAreaInsets();
  const [data,setData]=useState<any[]>([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[tab,setTab]=useState<'unlocked'|'locked'>('unlocked');
  const load=useCallback(async()=>{try{const r=await gamificationService.getAchievements();setData(r?.data||[]);}catch{}finally{setLoading(false);setRefreshing(false);}},[ ]);
  useEffect(()=>{load();},[]);
  const filtered=data.filter(a=>tab==='unlocked'?a.unlockedAt:!a.unlockedAt);
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[av.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={av.backBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={TXT}/></TouchableOpacity>
        <Text style={av.title}>Logros</Text>
        <View style={{width:40}}/>
      </View>
      <View style={{flexDirection:'row',paddingHorizontal:16,gap:12,marginBottom:16}}>
        {(['unlocked','locked'] as const).map(t=>{const a=tab===t;return(
          <TouchableOpacity key={t} style={{flex:1}} onPress={()=>setTab(t)}>
            {a?<LinearGradient colors={[PINK,VIOLET] as any} style={av.tabBtn} start={{x:0,y:0}} end={{x:1,y:0}}><Ionicons name={t==='unlocked'?'trophy':'lock-closed'} size={16} color="#fff"/><Text style={[av.tabBtnTxt,{color:'#fff'}]}>{t==='unlocked'?'Desbloqueados':'Bloqueados'}</Text></LinearGradient>
            :<View style={av.tabBtnInactive}><Ionicons name={t==='unlocked'?'trophy-outline':'lock-closed-outline'} size={16} color={TXTS}/><Text style={av.tabBtnTxt}>{t==='unlocked'?'Desbloqueados':'Bloqueados'}</Text></View>}
          </TouchableOpacity>
        );})}
      </View>
      {loading?<ActivityIndicator size="large" color={PINK} style={{marginTop:40}}/>:(
        <FlatList data={filtered} keyExtractor={i=>i._id||i.id} numColumns={2}
          contentContainerStyle={{padding:16,gap:12,paddingBottom:100}} columnWrapperStyle={{gap:12}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={PINK}/>}
          renderItem={({item})=>{
            const rar=item.rarity||'common';const[c1,c2]=RAR_G[rar]||RAR_G.common;const locked=!item.unlockedAt;
            return(
              <View style={[av.card,locked&&{opacity:0.5}]}>
                <LinearGradient colors={locked?['#1a1825','#131220'] as any:[c1,c2] as any} style={av.iconWrap}><Ionicons name={(item.icon||'trophy') as any} size={28} color={locked?TXTS:'#fff'}/></LinearGradient>
                <View style={[av.rarBadge,{backgroundColor:c1+'22',borderColor:c1+'40'}]}><Text style={[av.rarTxt,{color:c1}]}>{RAR_L[rar]}</Text></View>
                <Text style={av.cardTitle} numberOfLines={2}>{item.title||item.name}</Text>
                <Text style={av.cardDesc} numberOfLines={2}>{item.description}</Text>
                {item.xpReward&&<View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:6}}><Ionicons name="star" size={12} color="#f59e0b"/><Text style={{fontSize:11,color:'#f59e0b',fontWeight:'700'}}>{item.xpReward} XP</Text></View>}
                {!locked&&item.unlockedAt&&<Text style={av.unlockedAt}>{formatDistanceToNow(new Date(item.unlockedAt),{addSuffix:true,locale:es})}</Text>}
              </View>
            );
          }}
          ListEmptyComponent={<View style={{alignItems:'center',paddingTop:60,gap:12}}><Ionicons name="trophy-outline" size={56} color={TXTS}/><Text style={{fontSize:18,fontWeight:'700',color:TXT}}>Sin logros {tab==='unlocked'?'desbloqueados':'por desbloquear'}</Text></View>}
        />
      )}
    </View>
  );
}
const av=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:BORDER},
  backBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  title:{flex:1,fontSize:20,fontWeight:'800',color:TXT,textAlign:'center'},
  tabBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:12,borderRadius:14},
  tabBtnInactive:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:12,borderRadius:14,backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  tabBtnTxt:{fontSize:13,fontWeight:'600',color:TXTS},
  card:{flex:1,backgroundColor:SURF,borderRadius:18,padding:14,borderWidth:1,borderColor:BORDER,alignItems:'center',gap:6},
  iconWrap:{width:60,height:60,borderRadius:18,justifyContent:'center',alignItems:'center',marginBottom:4},
  rarBadge:{borderRadius:8,paddingHorizontal:8,paddingVertical:3,borderWidth:1,marginBottom:2},
  rarTxt:{fontSize:10,fontWeight:'800'},
  cardTitle:{fontSize:14,fontWeight:'700',color:TXT,textAlign:'center',lineHeight:18},
  cardDesc:{fontSize:11,color:TXTS,textAlign:'center',lineHeight:16},
  unlockedAt:{fontSize:11,color:TXTS,marginTop:2},
});
