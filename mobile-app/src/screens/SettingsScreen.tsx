import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  StatusBar, Alert, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePrivacyPreferences } from '@/hooks/usePrivacyPreferences';
const PINK='#ec4899',VIOLET='#8b5cf6',BG='#0C0B10',SURF='rgba(255,255,255,0.05)',BORDER='rgba(255,255,255,0.08)',TXT='#ffffff',TXTS='rgba(255,255,255,0.5)';

export default function SettingsScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),{user,logout}=useAuth();
  const privacy=usePrivacyPreferences();
  const tool=(kind:string)=>router.push({pathname:'/account-tools',params:{kind}} as any);
  const notifications=useNotificationPreferences();
  const SECS=[
    {title:'Cuenta',items:[{label:'Mi perfil',icon:'person-outline',type:'arrow',onPress:()=>router.push('/(tabs)/profile' as any)},{label:'Recuperar contraseña',icon:'lock-closed-outline',type:'arrow',onPress:()=>tool('password')},{label:'Ayuda con verificación',icon:'checkmark-circle-outline',type:'arrow',onPress:()=>tool('verification')}]},
    {title:'Notificaciones',items:[{label:'Preferencia push',icon:'notifications-outline',type:'toggle',value:notifications.values.push,disabled:!notifications.ready||notifications.saving,onPress:()=>void notifications.save('push',!notifications.values.push)},{label:'Email',icon:'mail-outline',type:'toggle',value:notifications.values.email,disabled:!notifications.ready||notifications.saving,onPress:()=>void notifications.save('email',!notifications.values.email)},{label:'Planes de mis amigos',icon:'people-outline',type:'toggle',value:notifications.values.friendPlans,disabled:!notifications.ready||notifications.saving,onPress:()=>void notifications.save('friendPlans',!notifications.values.friendPlans)},{label:'Compartir mi asistencia con amigos',icon:'heart-outline',type:'toggle',value:notifications.values.shareAttendance,disabled:!notifications.ready||notifications.saving,onPress:()=>void notifications.save('shareAttendance',!notifications.values.shareAttendance)}]},
    {title:'Privacidad',items:[{label:'Mostrar ubicación en mi perfil',icon:'location-outline',type:'toggle',value:privacy.values.showLocation,disabled:!privacy.ready||privacy.saving,onPress:()=>void privacy.save('showLocation',!privacy.values.showLocation)},{label:'Mostrar mi perfil',icon:'eye-outline',type:'toggle',value:privacy.values.showProfile,disabled:!privacy.ready||privacy.saving,onPress:()=>void privacy.save('showProfile',!privacy.values.showProfile)},{label:'Mostrar eventos a los que asisto',icon:'calendar-outline',type:'toggle',value:privacy.values.showAttendedEvents,disabled:!privacy.ready||privacy.saving,onPress:()=>void privacy.save('showAttendedEvents',!privacy.values.showAttendedEvents)},{label:'Mis datos',icon:'shield-outline',type:'arrow',onPress:()=>tool('data')}]},
    {title:'Soporte',items:[{label:'Centro de ayuda',icon:'help-circle-outline',type:'arrow',onPress:()=>tool('help')},{label:'Reportar un problema',icon:'bug-outline',type:'arrow',onPress:()=>tool('support')},{label:'Acerca de',icon:'information-circle-outline',type:'arrow',onPress:()=>tool('about')}]},
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
                <TouchableOpacity key={ii} disabled={item.disabled} accessibilityRole={item.type==='toggle'?'switch':'button'} accessibilityLabel={item.label} accessibilityState={item.type==='toggle'?{checked:item.value,disabled:item.disabled}:undefined} style={[st.item,ii<sec.items.length-1&&st.itemBorder]} onPress={item.onPress} activeOpacity={item.type==='toggle'?1:0.7}>
                  <View style={[st.itemIcon,{backgroundColor:PINK+'18'}]}><Ionicons name={item.icon} size={18} color={PINK}/></View>
                  <Text style={st.itemLabel}>{item.label}</Text>
                  {item.type==='arrow'&&<Ionicons name="chevron-forward" size={18} color={TXTS}/>}
                  {item.type==='toggle'&&<Switch accessibilityLabel={item.label} disabled={item.disabled} value={item.value} onValueChange={item.onPress} trackColor={{false:BORDER,true:PINK+'80'}} thumbColor={item.value?PINK:TXTS}/>}
                </TouchableOpacity>
              ))}
            </View>
            {sec.title==='Notificaciones'&&<View style={{paddingHorizontal:20,paddingTop:10,paddingBottom:14}}>
              <Text style={{color:TXTS,fontSize:12,lineHeight:18}}>Planes y asistencia se comparten solo entre amigos mutuos, en eventos públicos. Los eventos secretos quedan excluidos. Activar una preferencia no concede permisos de notificación a este dispositivo.</Text>
              {!notifications.ready&&!notifications.error&&<ActivityIndicator color={PINK} accessibilityLabel="Cargando preferencias"/>}
              {notifications.saving&&<Text style={{color:TXTS,fontSize:12,marginTop:6}}>Guardando preferencia…</Text>}
              {notifications.error&&<><Text accessibilityRole="alert" style={{color:'#fca5a5',fontSize:13,marginTop:8}}>{notifications.error}</Text>{!notifications.ready&&<TouchableOpacity accessibilityRole="button" onPress={()=>void notifications.load()}><Text style={{color:PINK,marginTop:8}}>Reintentar carga</Text></TouchableOpacity>}</>}
            </View>}
            {sec.title==='Privacidad'&&<View style={{paddingHorizontal:20,paddingTop:10,paddingBottom:14}}><Text style={{color:TXTS,fontSize:12,lineHeight:18}}>Estas opciones controlan la visibilidad de tu información. Mostrar ubicación en el perfil no activa ni solicita GPS.</Text>{!privacy.ready&&!privacy.error&&<ActivityIndicator color={PINK} accessibilityLabel="Cargando privacidad"/>}{privacy.saving&&<Text style={{color:TXTS,marginTop:6}}>Guardando privacidad…</Text>}{privacy.error&&<><Text accessibilityRole="alert" style={{color:'#fca5a5',marginTop:8}}>{privacy.error}</Text>{!privacy.ready&&<TouchableOpacity accessibilityRole="button" onPress={()=>void privacy.load()}><Text style={{color:PINK,marginTop:8}}>Reintentar carga de privacidad</Text></TouchableOpacity>}</>}</View>}
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
