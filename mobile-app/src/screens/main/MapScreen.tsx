import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView, Animated, Image } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eventService } from '@/services';
import { Event } from '@/types';
import * as Haptics from 'expo-haptics';
const PINK='#ec4899',VIOLET='#8b5cf6',BLUE='#3b82f6',BG='#0C0B10',SURF='rgba(255,255,255,0.05)',BORDER='rgba(255,255,255,0.08)',TXT='#ffffff',TXTS='rgba(255,255,255,0.5)';
const DARK_MAP=[{elementType:'geometry',stylers:[{color:'#0c0b10'}]},{elementType:'labels.text.fill',stylers:[{color:'#9ca3af'}]},{elementType:'labels.text.stroke',stylers:[{color:'#0c0b10'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#1f1d2b'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#0d1b2a'}]},{featureType:'poi',elementType:'geometry',stylers:[{color:'#131220'}]}];
const FILTERS=[{id:'all',label:'Todos',icon:'apps',colors:[PINK,VIOLET]},{id:'music',label:'Música',icon:'musical-notes',colors:['#f97316','#ef4444']},{id:'tech',label:'Tech',icon:'code-slash',colors:[BLUE,VIOLET]},{id:'food',label:'Food',icon:'restaurant',colors:['#10b981','#059669']}];
function PulseMarker({color=PINK}:{color?:string}){
  const p=useRef(new Animated.Value(1)).current;
  useEffect(()=>{Animated.loop(Animated.sequence([Animated.timing(p,{toValue:1.7,duration:1000,useNativeDriver:true}),Animated.timing(p,{toValue:1,duration:1000,useNativeDriver:true})])).start();},[]);
  return(<View style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Animated.View style={{position:'absolute',width:34,height:34,borderRadius:17,backgroundColor:color+'28',transform:[{scale:p}]}}/><LinearGradient colors={[color,VIOLET] as any} style={ms.pin}><Ionicons name="flash" size={13} color="#fff"/></LinearGradient></View>);
}
export default function MapScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),mapRef=useRef<MapView>(null);
  const [events,setEvents]=useState<Event[]>([]),[loading,setLoading]=useState(true),[selected,setSelected]=useState<Event|null>(null),[filter,setFilter]=useState('all');
  const cardY=useRef(new Animated.Value(220)).current,cardO=useRef(new Animated.Value(0)).current;
  useEffect(()=>{(async()=>{const{status}=await Location.requestForegroundPermissionsAsync();if(status==='granted'){const loc=await Location.getCurrentPositionAsync({});mapRef.current?.animateToRegion({latitude:loc.coords.latitude,longitude:loc.coords.longitude,latitudeDelta:0.05,longitudeDelta:0.05},800);}try{const r=await eventService.getEvents({limit:40});setEvents((r?.data||[]).filter((e:Event)=>typeof e.location !== 'string' && e.location?.coordinates));}catch{}setLoading(false);})();},[]);
  const show=(e:Event)=>{setSelected(e);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);Animated.parallel([Animated.spring(cardY,{toValue:0,useNativeDriver:true,tension:70}),Animated.timing(cardO,{toValue:1,duration:220,useNativeDriver:true})]).start();};
  const hide=()=>{Animated.parallel([Animated.timing(cardY,{toValue:220,duration:230,useNativeDriver:true}),Animated.timing(cardO,{toValue:0,duration:200,useNativeDriver:true})]).start(()=>setSelected(null));};
  const filtered=filter==='all'?events:events.filter(e=>e.category===filter);
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFillObject} provider={Platform.OS==='android'?PROVIDER_GOOGLE:undefined} customMapStyle={DARK_MAP} initialRegion={{latitude:4.711,longitude:-74.072,latitudeDelta:0.08,longitudeDelta:0.08}} showsUserLocation showsMyLocationButton={false} onPress={hide}>
        {filtered.map(ev=>{const c=typeof ev.location !== 'string' ? ev.location?.coordinates : undefined;if(!c||c.length<2)return null;return <Marker key={ev._id} coordinate={{latitude:c[1],longitude:c[0]}} onPress={()=>show(ev)}><PulseMarker color={ev.category==='music'?'#f97316':ev.category==='food'?'#10b981':PINK}/></Marker>;})}
      </MapView>
      <View style={[ms.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={ms.hBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color="#fff"/></TouchableOpacity>
        <View style={{flex:1}}><Text style={ms.hTitle}>Mapa de eventos</Text>{!loading&&<Text style={ms.hSub}>{filtered.length} cerca de ti</Text>}</View>
        <TouchableOpacity style={ms.hBtn} onPress={()=>router.push('/(tabs)/discover' as any)}><Ionicons name="list" size={20} color="#fff"/></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{position:'absolute',left:0,right:0,zIndex:10},{ top:insets.top+68}]} contentContainerStyle={{paddingHorizontal:16,gap:8}}>
        {FILTERS.map(f=>{const a=filter===f.id;return a
          ?<TouchableOpacity key={f.id} onPress={()=>{setFilter(f.id);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}><LinearGradient colors={f.colors as any} style={ms.chipA} start={{x:0,y:0}} end={{x:1,y:0}}><Ionicons name={f.icon as any} size={13} color="#fff"/><Text style={[ms.chipTxt,{color:'#fff'}]}>{f.label}</Text></LinearGradient></TouchableOpacity>
          :<TouchableOpacity key={f.id} onPress={()=>{setFilter(f.id);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}}><View style={ms.chip}><Ionicons name={f.icon as any} size={13} color={TXTS}/><Text style={ms.chipTxt}>{f.label}</Text></View></TouchableOpacity>;})}
      </ScrollView>
      <View style={[{position:'absolute',right:16,zIndex:10,gap:10},{bottom:selected?210:90}]}>
        <TouchableOpacity style={ms.ctrl} onPress={async()=>{const l=await Location.getCurrentPositionAsync({});mapRef.current?.animateToRegion({latitude:l.coords.latitude,longitude:l.coords.longitude,latitudeDelta:0.03,longitudeDelta:0.03},600);}}><Ionicons name="locate" size={22} color="#fff"/></TouchableOpacity>
      </View>
      {loading&&<View style={{...StyleSheet.absoluteFillObject,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(12,11,16,0.7)'}}><ActivityIndicator size="large" color={PINK}/></View>}
      {selected&&(
        <Animated.View style={[ms.card,{bottom:insets.bottom+72,opacity:cardO,transform:[{translateY:cardY}]}]}>
          <LinearGradient colors={['rgba(26,24,37,0.99)','rgba(12,11,16,0.99)']} style={ms.cardInner}>
            <View style={ms.cardHandle}/><TouchableOpacity style={{position:'absolute',top:16,right:16,zIndex:1}} onPress={hide}><Ionicons name="close" size={18} color={TXTS}/></TouchableOpacity>
            <View style={{flexDirection:'row',gap:14}}>
              {selected.image&&<Image source={{uri:selected.image}} style={ms.cardImg}/>}
              <View style={{flex:1}}>
                <View style={ms.cardBadge}><Text style={ms.cardBadgeTxt}>{selected.category||'Evento'}</Text></View>
                <Text style={ms.cardTitle} numberOfLines={2}>{selected.title}</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:4,marginBottom:10}}><Ionicons name="location-outline" size={12} color={TXTS}/><Text style={{fontSize:12,color:TXTS,flex:1}} numberOfLines={1}>{(selected.location as any)?.address||'Ver ubicación'}</Text></View>
                <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                  <Text style={{fontSize:16,fontWeight:'800',color:TXT}}>{selected.price?'$'+selected.price.toLocaleString():'GRATIS'}</Text>
                  <TouchableOpacity onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);router.push('/event/'+selected._id as any);}}><LinearGradient colors={[PINK,VIOLET]} style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:14,paddingVertical:8,borderRadius:10}} start={{x:0,y:0}} end={{x:1,y:0}}><Text style={{fontSize:13,fontWeight:'700',color:'#fff'}}>Ver evento</Text><Ionicons name="arrow-forward" size={13} color="#fff"/></LinearGradient></TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
      {!loading&&!selected&&<View style={{position:'absolute',bottom:insets.bottom+80,alignSelf:'center',zIndex:5}}><LinearGradient colors={[PINK,VIOLET]} style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:18,paddingVertical:10,borderRadius:24}} start={{x:0,y:0}} end={{x:1,y:0}}><Ionicons name="flash" size={14} color="#fff"/><Text style={{fontSize:14,fontWeight:'700',color:'#fff'}}>{filtered.length} eventos</Text></LinearGradient></View>}
    </View>
  );
}
const ms=StyleSheet.create({
  pin:{width:30,height:30,borderRadius:10,justifyContent:'center',alignItems:'center'},
  header:{position:'absolute',top:0,left:0,right:0,zIndex:10,flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingBottom:12,gap:12},
  hBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(12,11,16,0.88)',borderWidth:1,borderColor:'rgba(255,255,255,0.1)'},
  hTitle:{fontSize:16,fontWeight:'700',color:'#fff'},hSub:{fontSize:12,color:'rgba(255,255,255,0.45)',marginTop:1},
  chip:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(12,11,16,0.88)',borderRadius:12,paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:'rgba(255,255,255,0.1)'},
  chipA:{flexDirection:'row',alignItems:'center',gap:5,borderRadius:12,paddingHorizontal:12,paddingVertical:8},
  chipTxt:{fontSize:13,color:TXTS,fontWeight:'600'},
  ctrl:{width:44,height:44,borderRadius:14,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(12,11,16,0.9)',borderWidth:1,borderColor:'rgba(255,255,255,0.1)'},
  card:{position:'absolute',left:16,right:16,borderRadius:24,overflow:'hidden',borderWidth:1,borderColor:BORDER,elevation:20},
  cardInner:{padding:16},cardHandle:{width:40,height:4,borderRadius:2,backgroundColor:'rgba(255,255,255,0.15)',alignSelf:'center',marginBottom:14},
  cardImg:{width:76,height:76,borderRadius:14},cardBadge:{backgroundColor:'rgba(236,72,153,0.15)',borderRadius:8,paddingHorizontal:8,paddingVertical:3,alignSelf:'flex-start',marginBottom:6},
  cardBadgeTxt:{fontSize:11,color:PINK,fontWeight:'700'},cardTitle:{fontSize:16,fontWeight:'700',color:TXT,marginBottom:5,lineHeight:21},
});
