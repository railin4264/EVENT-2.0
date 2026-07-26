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

import { notificationsService } from '@/services/notificationsService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
const ICONS:Record<string,{icon:string,color:string}>={event:{icon:'calendar',color:BLUE},follow:{icon:'person-add',color:VIOLET},like:{icon:'heart',color:PINK},comment:{icon:'chatbubble',color:'#10b981'},message:{icon:'chatbubbles',color:'#f59e0b'},tribe:{icon:'shield',color:VIOLET},default:{icon:'notifications',color:TXTS}};
export default function NotificationsScreen(){
  const router=useRouter(),insets=useSafeAreaInsets();
  const [notifs,setNotifs]=useState<any[]>([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false);
  const load=useCallback(async()=>{try{const r=await notificationsService.getNotifications({});setNotifs(r?.notifications||[]);}catch{}finally{setLoading(false);setRefreshing(false);}},[ ]);
  useEffect(()=>{load();},[]);
  const markAll=async()=>{try{await notificationsService.markAllAsRead();setNotifs(n=>n.map(x=>({...x,read:true})));Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);}catch{}};
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[ns.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={ns.backBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={TXT}/></TouchableOpacity>
        <Text style={ns.title}>Notificaciones</Text>
        <TouchableOpacity onPress={markAll}><Text style={{color:PINK,fontSize:13,fontWeight:'600'}}>Leer todo</Text></TouchableOpacity>
      </View>
      {loading?<ActivityIndicator size="large" color={PINK} style={{marginTop:60}}/>:(
        <FlatList data={notifs} keyExtractor={i=>i._id||i.id} contentContainerStyle={{paddingBottom:100}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={PINK}/>}
          renderItem={({item})=>{
            const ic=ICONS[item.type]||ICONS.default;
            const ago=item.createdAt?formatDistanceToNow(new Date(item.createdAt),{addSuffix:true,locale:es}):'';
            return(
              <TouchableOpacity style={[ns.item,!item.read&&ns.unread]} activeOpacity={0.8}>
                <LinearGradient colors={[ic.color+'25',ic.color+'10'] as any} style={ns.iconWrap}><Ionicons name={ic.icon as any} size={20} color={ic.color}/></LinearGradient>
                <View style={{flex:1}}><Text style={ns.itemTitle} numberOfLines={2}>{item.title||item.message||'Notificación'}</Text>{item.body&&<Text style={ns.itemBody} numberOfLines={2}>{item.body}</Text>}<Text style={ns.itemTime}>{ago}</Text></View>
                {!item.read&&<View style={ns.dot}/>}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<View style={{alignItems:'center',paddingTop:80,gap:12}}><LinearGradient colors={[PINK+'20',VIOLET+'20'] as any} style={{width:80,height:80,borderRadius:24,justifyContent:'center',alignItems:'center'}}><Ionicons name="notifications-outline" size={40} color={PINK}/></LinearGradient><Text style={{fontSize:18,fontWeight:'700',color:TXT}}>Sin notificaciones</Text></View>}
        />
      )}
    </View>
  );
}
const ns=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:BORDER},
  backBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  title:{flex:1,fontSize:20,fontWeight:'800',color:TXT},
  item:{flexDirection:'row',alignItems:'flex-start',gap:14,paddingHorizontal:16,paddingVertical:16,borderBottomWidth:1,borderBottomColor:BORDER},
  unread:{backgroundColor:'rgba(236,72,153,0.04)'},
  iconWrap:{width:46,height:46,borderRadius:14,justifyContent:'center',alignItems:'center',flexShrink:0},
  itemTitle:{fontSize:15,fontWeight:'600',color:TXT,lineHeight:20,marginBottom:3},
  itemBody:{fontSize:13,color:TXTS,lineHeight:18,marginBottom:4},
  itemTime:{fontSize:12,color:TXTS},
  dot:{width:8,height:8,borderRadius:4,backgroundColor:PINK,marginTop:4,flexShrink:0},
});
