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

import { eventService } from '@/services';
import { Event } from '@/types';
const TABS=['Eventos','Personas','Tribus'];
const TRENDING=['Festival de música','Tech Summit 2026','Street Food Fiesta','Arte urbano','Running 5K'];
export default function SearchScreen(){
  const router=useRouter(),insets=useSafeAreaInsets();
  const [q,setQ]=useState(''),[tab,setTab]=useState(0),[results,setResults]=useState<Event[]>([]),[loading,setLoading]=useState(false);
  const inputRef=useRef<any>(null);
  useEffect(()=>{setTimeout(()=>inputRef.current?.focus(),250);},[]);
  useEffect(()=>{
    const t=setTimeout(async()=>{
      if(!q.trim()){setResults([]);return;}
      setLoading(true);
      try{const r=await eventService.getEvents({search:q,limit:20});setResults(r?.data||[]);}catch{}finally{setLoading(false);}
    },400);
    return()=>clearTimeout(t);
  },[q]);
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[ss.header,{paddingTop:insets.top+8}]}>
        <View style={ss.bar}><Ionicons name="search-outline" size={20} color={q?PINK:TXTS}/><TextInput ref={inputRef} style={ss.input} placeholder="Buscar eventos, personas..." placeholderTextColor={TXTS} value={q} onChangeText={setQ} autoCapitalize="none"/>{q.length>0&&<TouchableOpacity onPress={()=>setQ('')}><Ionicons name="close-circle" size={20} color={TXTS}/></TouchableOpacity>}</View>
        <TouchableOpacity onPress={()=>router.back()}><Text style={{color:PINK,fontSize:15,fontWeight:'600'}}>Cancelar</Text></TouchableOpacity>
      </View>
      <View style={ss.tabs}>{TABS.map((t,i)=><TouchableOpacity key={i} style={ss.tabItem} onPress={()=>setTab(i)}><Text style={[ss.tabTxt,tab===i&&{color:TXT,fontWeight:'700'}]}>{t}</Text>{tab===i&&<LinearGradient colors={[PINK,VIOLET] as any} style={ss.tabLine}/>}</TouchableOpacity>)}</View>
      <ScrollView contentContainerStyle={{paddingHorizontal:16,paddingBottom:100}}>
        {!q?(<>
          <Text style={ss.secTitle}>🔥 Trending</Text>
          {TRENDING.map((t,i)=><TouchableOpacity key={i} style={ss.trendItem} onPress={()=>setQ(t)}><View style={ss.trendIcon}><Ionicons name="trending-up" size={16} color={PINK}/></View><Text style={ss.trendTxt}>{t}</Text><Ionicons name="arrow-forward" size={16} color={TXTS}/></TouchableOpacity>)}
        </>)
        :loading?<ActivityIndicator size="large" color={PINK} style={{marginTop:40}}/>
        :results.length===0?(<View style={{alignItems:'center',paddingTop:60,gap:12}}><Ionicons name="search-outline" size={48} color={TXTS}/><Text style={{fontSize:18,fontWeight:'700',color:TXT}}>Sin resultados</Text><Text style={{fontSize:14,color:TXTS}}>Intenta con otros términos</Text></View>)
        :(<>{results.map(item=><TouchableOpacity key={item._id} style={ss.resultCard} onPress={()=>router.push('/event/'+item._id as any)}>
            <Image source={{uri:item.image||'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200'}} style={ss.resultImg}/>
            <View style={{flex:1}}><Text style={ss.resultTitle} numberOfLines={2}>{item.title}</Text><Text style={ss.resultLoc} numberOfLines={1}>{(item.location as any)?.address||'Ubicación'}</Text><Text style={ss.resultPrice}>{item.price?'$'+item.price.toLocaleString():'GRATIS'}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={TXTS}/>
          </TouchableOpacity>)}</>)
        }
      </ScrollView>
    </View>
  );
}
const ss=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingBottom:12},
  bar:{flex:1,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:SURF,borderRadius:14,borderWidth:1,borderColor:BORDER,paddingHorizontal:14,height:48},
  input:{flex:1,color:TXT,fontSize:15},
  tabs:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:BORDER,marginHorizontal:16},
  tabItem:{flex:1,alignItems:'center',paddingVertical:12},
  tabTxt:{fontSize:14,color:TXTS,fontWeight:'500'},
  tabLine:{position:'absolute',bottom:0,left:'15%',right:'15%',height:2,borderRadius:1},
  secTitle:{fontSize:16,fontWeight:'700',color:TXT,marginVertical:14},
  trendItem:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:BORDER},
  trendIcon:{width:36,height:36,borderRadius:10,backgroundColor:'rgba(236,72,153,0.1)',justifyContent:'center',alignItems:'center'},
  trendTxt:{flex:1,fontSize:15,color:TXT,fontWeight:'500'},
  resultCard:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:BORDER},
  resultImg:{width:66,height:66,borderRadius:14},
  resultTitle:{fontSize:15,fontWeight:'700',color:TXT,marginBottom:3,lineHeight:20},
  resultLoc:{fontSize:12,color:TXTS,marginBottom:4},
  resultPrice:{fontSize:14,fontWeight:'700',color:PINK},
});
