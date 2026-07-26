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
const {width}=Dimensions.get('window');
const CARD_W=(width-48)/2;
const CATS=[{id:'all',label:'Todo',icon:'apps',g:[PINK,VIOLET]},{id:'music',label:'Música',icon:'musical-notes',g:['#f97316','#ef4444']},{id:'social',label:'Social',icon:'people',g:[BLUE,VIOLET]},{id:'food',label:'Food',icon:'restaurant',g:['#10b981','#059669']},{id:'tech',label:'Tech',icon:'code-slash',g:['#06b6d4',BLUE]},{id:'art',label:'Arte',icon:'color-palette',g:['#f59e0b','#f97316']}];
export default function DiscoveryScreen(){
  const router=useRouter(),insets=useSafeAreaInsets();
  const [events,setEvents]=useState<Event[]>([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[search,setSearch]=useState(''),[cat,setCat]=useState('all'),[viewMode,setViewMode]=useState<'grid'|'list'>('grid');
  const load=useCallback(async()=>{try{const r=await eventService.getEvents({limit:30,category:(cat==='all'?undefined:cat) as any});setEvents(r?.data||[]);}catch{}finally{setLoading(false);setRefreshing(false);}},[ cat]);
  useEffect(()=>{setLoading(true);load();},[cat]);
  const filtered=events.filter(e=>!search||e.title?.toLowerCase().includes(search.toLowerCase()));
  const GridCard=({item}:{item:Event})=>(
    <TouchableOpacity style={[ds.gridCard,{width:CARD_W}]} onPress={()=>router.push('/event/'+item._id as any)} activeOpacity={0.85}>
      <Image source={{uri:item.image||'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400'}} style={ds.gridImg}/>
      <LinearGradient colors={['transparent','rgba(0,0,0,0.88)']} style={ds.gridOverlay}/>
      <View style={ds.gridBadge}><Text style={ds.gridBadgeTxt}>{item.price?'$'+Math.round((typeof item.price==='number'?item.price:item.price.amount)/1000)+'K':'GRATIS'}</Text></View>
      <View style={ds.gridInfo}><Text style={ds.gridTitle} numberOfLines={2}>{item.title}</Text><Text style={ds.gridLoc} numberOfLines={1}>{(item.location as any)?.address||'Ver ubicación'}</Text></View>
    </TouchableOpacity>
  );
  const ListCard=({item}:{item:Event})=>(
    <TouchableOpacity style={ds.listCard} onPress={()=>router.push('/event/'+item._id as any)} activeOpacity={0.85}>
      <Image source={{uri:item.image||'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200'}} style={ds.listImg}/>
      <View style={ds.listContent}>
        <Text style={ds.listTitle} numberOfLines={2}>{item.title}</Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:4,marginVertical:4}}><Ionicons name="location-outline" size={12} color={TXTS}/><Text style={ds.listLoc} numberOfLines={1}>{(item.location as any)?.address||'Ubicación'}</Text></View>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4}}>
          <Text style={ds.listPrice}>{item.price?'$'+(typeof item.price==='number'?item.price:item.price.amount).toLocaleString():'GRATIS'}</Text>
          <LinearGradient colors={[PINK,VIOLET] as any} style={ds.listBtn} start={{x:0,y:0}} end={{x:1,y:0}}><Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>Ver</Text></LinearGradient>
        </View>
      </View>
    </TouchableOpacity>
  );
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[ds.header,{paddingTop:insets.top+8}]}>
        <Text style={ds.headerTitle}>Explorar</Text>
        <TouchableOpacity style={ds.toggleBtn} onPress={()=>setViewMode(v=>v==='grid'?'list':'grid')}><Ionicons name={viewMode==='grid'?'list':'grid'} size={20} color={TXT}/></TouchableOpacity>
      </View>
      <View style={ds.searchWrap}><Ionicons name="search-outline" size={18} color={TXTS} style={{marginRight:8}}/><TextInput style={ds.searchInput} placeholder="Buscar eventos..." placeholderTextColor={TXTS} value={search} onChangeText={setSearch}/>{search.length>0&&<TouchableOpacity onPress={()=>setSearch('')}><Ionicons name="close-circle" size={18} color={TXTS}/></TouchableOpacity>}</View>
      <FlatList data={CATS} horizontal showsHorizontalScrollIndicator={false} keyExtractor={i=>i.id} contentContainerStyle={{paddingHorizontal:16,gap:8,paddingVertical:4}}
        renderItem={({item})=>{const a=cat===item.id;return a
          ?<TouchableOpacity onPress={()=>{setCat(item.id);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}><LinearGradient colors={item.g as any} style={ds.catA} start={{x:0,y:0}} end={{x:1,y:0}}><Ionicons name={item.icon as any} size={14} color="#fff"/><Text style={[ds.catTxt,{color:'#fff'}]}>{item.label}</Text></LinearGradient></TouchableOpacity>
          :<TouchableOpacity onPress={()=>{setCat(item.id);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}><View style={ds.cat}><Ionicons name={item.icon as any} size={14} color={TXTS}/><Text style={ds.catTxt}>{item.label}</Text></View></TouchableOpacity>;}}/>
      {loading?<View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" color={PINK}/></View>
      :viewMode==='grid'
        ?<FlatList data={filtered} numColumns={2} keyExtractor={i=>i._id} contentContainerStyle={{padding:16,gap:12}} columnWrapperStyle={{gap:12}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={PINK}/>} renderItem={({item})=><GridCard item={item}/>} ListEmptyComponent={<View style={ds.empty}><Ionicons name="calendar-outline" size={48} color={TXTS}/><Text style={ds.emptyTxt}>Sin eventos</Text></View>}/>
        :<FlatList data={filtered} keyExtractor={i=>i._id} contentContainerStyle={{padding:16,gap:12}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={PINK}/>} renderItem={({item})=><ListCard item={item}/>} ListEmptyComponent={<View style={ds.empty}><Ionicons name="calendar-outline" size={48} color={TXTS}/><Text style={ds.emptyTxt}>Sin eventos</Text></View>}/>}
    </View>
  );
}
const ds=StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingBottom:12},
  headerTitle:{fontSize:26,fontWeight:'800',color:TXT},
  toggleBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  searchWrap:{flexDirection:'row',alignItems:'center',marginHorizontal:16,marginBottom:12,backgroundColor:SURF,borderRadius:14,borderWidth:1,borderColor:BORDER,paddingHorizontal:14,height:48},
  searchInput:{flex:1,color:TXT,fontSize:15},
  cat:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:SURF,borderRadius:12,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:BORDER},
  catA:{flexDirection:'row',alignItems:'center',gap:5,borderRadius:12,paddingHorizontal:12,paddingVertical:8},
  catTxt:{fontSize:13,color:TXTS,fontWeight:'600'},
  gridCard:{borderRadius:18,overflow:'hidden',backgroundColor:'#1a1825'},
  gridImg:{width:'100%',height:160},
  gridOverlay:{position:'absolute',bottom:0,left:0,right:0,height:110},
  gridBadge:{position:'absolute',top:10,right:10,backgroundColor:'rgba(0,0,0,0.7)',borderRadius:8,paddingHorizontal:8,paddingVertical:3},
  gridBadgeTxt:{fontSize:10,fontWeight:'800',color:'#fff'},
  gridInfo:{position:'absolute',bottom:0,left:0,right:0,padding:10},
  gridTitle:{fontSize:14,fontWeight:'700',color:'#fff',marginBottom:3},
  gridLoc:{fontSize:11,color:'rgba(255,255,255,0.6)'},
  listCard:{flexDirection:'row',backgroundColor:SURF,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:BORDER},
  listImg:{width:90,height:100},listContent:{flex:1,padding:12},
  listTitle:{fontSize:15,fontWeight:'700',color:TXT,lineHeight:20},
  listLoc:{fontSize:12,color:TXTS,flex:1},listPrice:{fontSize:15,fontWeight:'800',color:TXT},
  listBtn:{paddingHorizontal:14,paddingVertical:6,borderRadius:10},
  empty:{alignItems:'center',paddingTop:60,gap:12},emptyTxt:{fontSize:16,color:TXTS},
});
