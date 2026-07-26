import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, RefreshControl, TextInput, Dimensions, Animated, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
const PINK='#ec4899',VIOLET='#8b5cf6',BLUE='#3b82f6',BG='#0C0B10',SURF='rgba(255,255,255,0.05)',BORDER='rgba(255,255,255,0.08)',TXT='#ffffff',TXTS='rgba(255,255,255,0.5)';

import chatService from '@/services/ChatService';
import socketService from '@/services/socketService';
export default function ChatDetailScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),{id:chatId}=useLocalSearchParams<{id:string}>(),{user}=useAuth();
  const [messages,setMessages]=useState<any[]>([]),[loading,setLoading]=useState(true),[text,setText]=useState(''),[sending,setSending]=useState(false),[chatName,setChatName]=useState('Chat');
  const flatRef=useRef<any>(null);
  useEffect(()=>{
    (async()=>{try{const r=await chatService.getMessages(chatId);setMessages((r?.data||[]).reverse());const c=await chatService.getChatById(chatId);setChatName((c as any)?.name||(c as any)?.participants?.[0]?.firstName||'Chat');}catch{}setLoading(false);})();
    socketService.on('new-message',(msg:any)=>{if(msg.chat===chatId)setMessages(prev=>[...prev,msg]);});
    return()=>{socketService.off('new-message',()=>{});};
  },[chatId]);
  useEffect(()=>{if(messages.length)setTimeout(()=>flatRef.current?.scrollToEnd({animated:true}),100);},[messages.length]);
  const send=async()=>{
    if(!text.trim())return;const t=text.trim();setText('');setSending(true);
    try{await chatService.sendMessage({chatId: chatId, content: t});Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}
    catch{setText(t);}finally{setSending(false);}
  };
  const isMe=(msg:any)=>msg.sender?._id===user?._id||msg.senderId===user?._id;
  return(
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="light-content"/>
      <View style={[cd.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={cd.backBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={TXT}/></TouchableOpacity>
        <View style={cd.headerAvatar}><Text style={{fontSize:16,fontWeight:'800',color:TXT}}>{chatName.charAt(0)}</Text></View>
        <View style={{flex:1}}><Text style={cd.chatName}>{chatName}</Text><Text style={cd.chatSub}>En línea</Text></View>
        <TouchableOpacity style={cd.backBtn}><Ionicons name="call-outline" size={20} color={TXT}/></TouchableOpacity>
      </View>
      {loading?<ActivityIndicator size="large" color={PINK} style={{marginTop:40}}/>:(
        <FlatList ref={flatRef} data={messages} keyExtractor={i=>i._id||i.id||String(Math.random())} contentContainerStyle={{padding:16,gap:8,paddingBottom:20}}
          renderItem={({item})=>{const me=isMe(item);return(
            <View style={[cd.msgRow,me&&{alignSelf:'flex-end'}]}>
              {!me&&<View style={cd.msgAvatar}><Text style={{fontSize:12,fontWeight:'700',color:TXT}}>{(item.sender?.firstName||'?').charAt(0)}</Text></View>}
              <View style={[cd.bubble,me&&cd.bubbleMe]}>
                {me?<LinearGradient colors={[PINK,VIOLET] as any} style={cd.bubbleMeInner} start={{x:0,y:0}} end={{x:1,y:1}}><Text style={{color:'#fff',fontSize:15,lineHeight:20}}>{item.content}</Text></LinearGradient>
                :<Text style={{color:TXT,fontSize:15,lineHeight:20}}>{item.content}</Text>}
              </View>
            </View>
          );}}
          ListEmptyComponent={<View style={{alignItems:'center',paddingTop:60,gap:12}}><Ionicons name="chatbubbles-outline" size={56} color={TXTS}/><Text style={{fontSize:16,color:TXTS}}>Empieza la conversación</Text></View>}
        />
      )}
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?0:20}>
        <View style={[cd.inputRow,{paddingBottom:Math.max(insets.bottom,16)}]}>
          <TouchableOpacity style={cd.attachBtn}><Ionicons name="attach" size={22} color={TXTS}/></TouchableOpacity>
          <View style={cd.inputWrap}>
            <TextInput style={cd.input} placeholder="Escribe un mensaje..." placeholderTextColor={TXTS} value={text} onChangeText={setText} multiline maxLength={1000} returnKeyType="default"/>
          </View>
          <TouchableOpacity style={[cd.sendBtn,!text.trim()&&{opacity:0.4}]} onPress={send} disabled={!text.trim()||sending}>
            <LinearGradient colors={[PINK,VIOLET] as any} style={cd.sendBtnInner} start={{x:0,y:0}} end={{x:1,y:0}}>
              {sending?<ActivityIndicator size="small" color="#fff"/>:<Ionicons name="send" size={18} color="#fff"/>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
const cd=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:BORDER},
  backBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  headerAvatar:{width:40,height:40,borderRadius:13,backgroundColor:'rgba(236,72,153,0.15)',justifyContent:'center',alignItems:'center'},
  chatName:{fontSize:16,fontWeight:'700',color:TXT},chatSub:{fontSize:12,color:'#10b981',marginTop:1},
  msgRow:{flexDirection:'row',alignItems:'flex-end',gap:8,maxWidth:'85%'},
  msgAvatar:{width:32,height:32,borderRadius:10,backgroundColor:SURF,justifyContent:'center',alignItems:'center',flexShrink:0},
  bubble:{backgroundColor:SURF,borderRadius:16,borderTopLeftRadius:4,overflow:'hidden',borderWidth:1,borderColor:BORDER},
  bubbleMe:{borderTopLeftRadius:16,borderTopRightRadius:4,backgroundColor:'transparent',borderWidth:0},
  bubbleMeInner:{padding:12,borderRadius:16,borderTopRightRadius:4},
  inputRow:{flexDirection:'row',alignItems:'flex-end',gap:10,paddingHorizontal:16,paddingTop:10,borderTopWidth:1,borderTopColor:BORDER,backgroundColor:BG},
  attachBtn:{width:42,height:42,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  inputWrap:{flex:1,backgroundColor:SURF,borderRadius:14,borderWidth:1,borderColor:BORDER,paddingHorizontal:14,paddingVertical:10,minHeight:44,maxHeight:120},
  input:{color:TXT,fontSize:15},
  sendBtn:{},
  sendBtnInner:{width:44,height:44,borderRadius:13,justifyContent:'center',alignItems:'center'},
});
