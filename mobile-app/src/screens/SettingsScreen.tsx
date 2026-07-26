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

export default function SettingsScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),{user,logout}=useAuth();
  const [pushNotif,setPushNotif]=useState(true),[emailNotif,setEmailNotif]=useState(true),[locationSvc,setLocationSvc]=useState(false);
  const SECS=[
    {title:'Cuenta',items:[{label:'Editar perfil',icon:'person-outline',type:'arrow',onPress:()=>router.push('/(tabs)/profile' as any)},{label:'Cambiar contraseña',icon:'lock-closed-outline',type:'arrow',onPress:()=>{}},{label:'Verificar cuenta',icon:'checkmark-circle-outline',type:'arrow',onPress:()=>{}}]},
    {title:'Notificaciones',items:[{label:'Push',icon:'notifications-outline',type:'toggle',value:pushNotif,onPress:()=>setPushNotif(v=>!v)},{label:'Email',icon:'mail-outline',type:'toggle',value:emailNotif,onPress:()=>setEmailNotif(v=>!v)}]},
    {title:'Privacidad',items:[{label:'Ubicación',icon:'location-outline',type:'toggle',value:locationSvc,onPress:()=>setLocationSvc(v=>!v)},{label:'Perfil público',icon:'eye-outline',type:'arrow',onPress:()=>{}},{label:'Mis datos',icon:'shield-outline',type:'arrow',onPress:()=>{}}]},
    {title:'Soporte',items:[{label:'Centro de ayuda',icon:'help-circle-outline',type:'arrow',onPress:()=>{}},{label:'Reportar bug',icon:'bug-outline',type:'arrow',onPress:()=>{}},{label:'Acerca de',icon:'information-circle-outline',type:'arrow',onPress:()=>{}}]},
  ];
  const doLogout=()=>Alert.alert('Cerrar sesión','¿Estás seguro?',[{text:'Cancelar',style:'cancel'},{text:'Salir',style:'destructive',onPress:()=>{Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);logout();}}]);
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[st.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={st.backBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={TXT}/></TouchableOpacity>
        <Text style={st.title}>Configuración</Text>
      </View>
      <ScrollView contentContainerStyle={{paddingBottom:100}}>
        <View style={st.profileCard}>
          <LinearGradient colors={[PINK,VIOLET] as any} style={st.avatarRing}><View style={st.avatarInner}><Text style={st.avatarInit}>{user?.firstName?.charAt(0)||user?.username?.charAt(0)||'?'}</Text></View></LinearGradient>
          <View style={{flex:1}}><Text style={st.profName}>{user?.firstName?`${user.firstName} ${user.lastName||''}`.trim():user?.username}</Text><Text style={st.profEmail}>{user?.email}</Text></View>
          <TouchableOpacity style={st.editBtn} onPress={()=>router.push('/(tabs)/profile' as any)}><Text style={{color:PINK,fontSize:13,fontWeight:'600'}}>Editar</Text></TouchableOpacity>
        </View>
        {SECS.map((sec,si)=>(
          <View key={si} style={{marginBottom:6}}>
            <Text style={st.secTitle}>{sec.title}</Text>
            <View style={st.secCard}>
              {(sec.items as any[]).map((item,ii)=>(
                <TouchableOpacity key={ii} style={[st.item,ii<sec.items.length-1&&st.itemBorder]} onPress={item.onPress} activeOpacity={item.type==='toggle'?1:0.7}>
                  <View style={[st.itemIcon,{backgroundColor:PINK+'18'}]}><Ionicons name={item.icon} size={18} color={PINK}/></View>
                  <Text style={st.itemLabel}>{item.label}</Text>
                  {item.type==='arrow'&&<Ionicons name="chevron-forward" size={18} color={TXTS}/>}
                  {item.type==='toggle'&&<Switch value={item.value} onValueChange={item.onPress} trackColor={{false:BORDER,true:PINK+'80'}} thumbColor={item.value?PINK:TXTS}/>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{paddingHorizontal:16,marginTop:8}}>
          <TouchableOpacity style={st.logoutBtn} onPress={doLogout}><Ionicons name="log-out-outline" size={20} color="#ef4444"/><Text style={st.logoutTxt}>Cerrar sesión</Text></TouchableOpacity>
        </View>
        <Text style={{textAlign:'center',color:TXTS,fontSize:12,paddingVertical:20}}>EventNow v2.0.0</Text>
      </ScrollView>
    </View>
  );
}
const st=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:BORDER},
  backBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  title:{fontSize:20,fontWeight:'800',color:TXT},
  profileCard:{flexDirection:'row',alignItems:'center',gap:14,margin:16,padding:16,backgroundColor:SURF,borderRadius:18,borderWidth:1,borderColor:BORDER},
  avatarRing:{width:52,height:52,borderRadius:16,padding:2},
  avatarInner:{flex:1,borderRadius:14,backgroundColor:'#1a1825',justifyContent:'center',alignItems:'center'},
  avatarInit:{fontSize:20,fontWeight:'800',color:TXT},
  profName:{fontSize:16,fontWeight:'700',color:TXT},profEmail:{fontSize:13,color:TXTS,marginTop:2},
  editBtn:{paddingHorizontal:12,paddingVertical:6,backgroundColor:'rgba(236,72,153,0.1)',borderRadius:10,borderWidth:1,borderColor:'rgba(236,72,153,0.2)'},
  secTitle:{fontSize:13,fontWeight:'600',color:TXTS,paddingHorizontal:16,paddingBottom:8,letterSpacing:0.5,textTransform:'uppercase'},
  secCard:{marginHorizontal:16,backgroundColor:SURF,borderRadius:18,borderWidth:1,borderColor:BORDER,overflow:'hidden'},
  item:{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:16,paddingVertical:16},
  itemBorder:{borderBottomWidth:1,borderBottomColor:BORDER},
  itemIcon:{width:36,height:36,borderRadius:10,justifyContent:'center',alignItems:'center'},
  itemLabel:{flex:1,fontSize:15,color:TXT,fontWeight:'500'},
  logoutBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,padding:16,backgroundColor:'rgba(239,68,68,0.08)',borderRadius:16,borderWidth:1,borderColor:'rgba(239,68,68,0.2)'},
  logoutTxt:{fontSize:16,fontWeight:'700',color:'#ef4444'},
});
