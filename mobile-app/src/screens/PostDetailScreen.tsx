import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, ActivityIndicator, RefreshControl, TextInput, Dimensions, Animated, StatusBar, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
const PINK='#ec4899',VIOLET='#8b5cf6',BLUE='#3b82f6',BG='#0C0B10',SURF='rgba(255,255,255,0.05)',BORDER='rgba(255,255,255,0.08)',TXT='#ffffff',TXTS='rgba(255,255,255,0.5)';

import { feedService } from '@/services';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
export default function PostDetailScreen(){
  const router=useRouter(),insets=useSafeAreaInsets(),{id:postId}=useLocalSearchParams<{id:string}>(),{user}=useAuth();
  const [post,setPost]=useState<any>(null),[comments,setComments]=useState<any[]>([]),[loading,setLoading]=useState(true),[text,setText]=useState(''),[sending,setSending]=useState(false),[liked,setLiked]=useState(false),[likes,setLikes]=useState(0);
  useEffect(()=>{(async()=>{try{const[p,c]=await Promise.all([feedService.getPostById(postId),feedService.getPostComments(postId)]);setPost(p);setComments(c?.data||c||[]);setLiked(p?.liked||false);setLikes(p?.stats?.likes||0);}catch{}setLoading(false);})();},[postId]);
  const toggleLike=async()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);setLiked(l=>!l);setLikes(l=>liked?l-1:l+1);try{await feedService.toggleLike(postId);}catch{}};
  const sendComment=async()=>{if(!text.trim())return;const t=text.trim();setText('');setSending(true);try{const c=await feedService.addComment(postId,{text:t});setComments(prev=>[...prev,c?.data||c]);Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);}catch{setText(t);}finally{setSending(false);}};
  if(loading)return<View style={{flex:1,backgroundColor:BG,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" color={PINK}/></View>;
  if(!post)return<View style={{flex:1,backgroundColor:BG,justifyContent:'center',alignItems:'center'}}><Text style={{color:TXTS}}>Post no encontrado</Text></View>;
  const timeAgo=post.createdAt?formatDistanceToNow(new Date(post.createdAt),{addSuffix:true,locale:es}):'';
  return(
    <KeyboardAvoidingView style={{flex:1,backgroundColor:BG}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <StatusBar barStyle="light-content"/>
      <View style={[pd.header,{paddingTop:insets.top+8}]}>
        <TouchableOpacity style={pd.backBtn} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={TXT}/></TouchableOpacity>
        <Text style={pd.title}>Publicación</Text>
        <TouchableOpacity style={pd.backBtn}><Ionicons name="share-outline" size={20} color={TXT}/></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{paddingBottom:100}}>
        <View style={pd.postCard}>
          <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:14}}>
            <Image source={{uri:post.user?.avatar||'https://via.placeholder.com/40'}} style={pd.avatar}/>
            <View style={{flex:1}}><View style={{flexDirection:'row',alignItems:'center',gap:4}}><Text style={pd.userName}>{post.user?.firstName||post.user?.username||'Usuario'}</Text>{post.user?.verified&&<Ionicons name="checkmark-circle" size={15} color={BLUE}/>}</View><Text style={pd.time}>{timeAgo}</Text></View>
          </View>
          <Text style={pd.content}>{post.content}</Text>
          {post.image&&<Image source={{uri:post.image}} style={pd.postImg}/>}
          <View style={pd.actions}>
            <TouchableOpacity style={pd.actionBtn} onPress={toggleLike}><Ionicons name={liked?'heart':'heart-outline'} size={24} color={liked?PINK:TXTS}/><Text style={[pd.actionTxt,liked&&{color:PINK}]}>{likes}</Text></TouchableOpacity>
            <TouchableOpacity style={pd.actionBtn}><Ionicons name="chatbubble-outline" size={22} color={TXTS}/><Text style={pd.actionTxt}>{comments.length}</Text></TouchableOpacity>
            <TouchableOpacity style={pd.actionBtn}><Ionicons name="share-outline" size={22} color={TXTS}/></TouchableOpacity>
            <TouchableOpacity style={pd.actionBtn}><Ionicons name="bookmark-outline" size={22} color={TXTS}/></TouchableOpacity>
          </View>
        </View>
        <Text style={pd.commentsTitle}>Comentarios ({comments.length})</Text>
        {comments.map((c,i)=>(
          <View key={c._id||i} style={pd.commentCard}>
            <View style={pd.commentAvatar}><Text style={{fontSize:14,fontWeight:'700',color:TXT}}>{(c.user?.firstName||c.user?.username||'?').charAt(0)}</Text></View>
            <View style={{flex:1}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}><Text style={pd.commentUser}>{c.user?.firstName||c.user?.username||'Usuario'}</Text><Text style={{fontSize:11,color:TXTS}}>{c.createdAt?formatDistanceToNow(new Date(c.createdAt),{addSuffix:true,locale:es}):''}</Text></View>
              <Text style={pd.commentContent}>{c.content}</Text>
            </View>
          </View>
        ))}
        {comments.length===0&&<View style={{alignItems:'center',paddingVertical:32,gap:8}}><Ionicons name="chatbubble-outline" size={40} color={TXTS}/><Text style={{color:TXTS}}>Sin comentarios aún</Text></View>}
      </ScrollView>
      <View style={[pd.inputRow,{paddingBottom:Math.max(insets.bottom,12)}]}>
        <View style={pd.inputWrap}><TextInput style={pd.input} placeholder="Escribe un comentario..." placeholderTextColor={TXTS} value={text} onChangeText={setText} multiline maxLength={500}/></View>
        <TouchableOpacity style={[pd.sendBtn,!text.trim()&&{opacity:0.4}]} onPress={sendComment} disabled={!text.trim()||sending}>
          <LinearGradient colors={[PINK,VIOLET] as any} style={pd.sendBtnInner} start={{x:0,y:0}} end={{x:1,y:0}}>
            {sending?<ActivityIndicator size="small" color="#fff"/>:<Ionicons name="send" size={16} color="#fff"/>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
const pd=StyleSheet.create({
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,paddingBottom:12,borderBottomWidth:1,borderBottomColor:BORDER},
  backBtn:{width:40,height:40,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:SURF,borderWidth:1,borderColor:BORDER},
  title:{flex:1,fontSize:18,fontWeight:'800',color:TXT,textAlign:'center'},
  postCard:{margin:16,backgroundColor:SURF,borderRadius:18,padding:16,borderWidth:1,borderColor:BORDER},
  avatar:{width:44,height:44,borderRadius:14},
  userName:{fontSize:15,fontWeight:'700',color:TXT},time:{fontSize:12,color:TXTS,marginTop:1},
  content:{fontSize:16,color:TXT,lineHeight:24,marginBottom:12},
  postImg:{width:'100%',height:220,borderRadius:14,marginBottom:12},
  actions:{flexDirection:'row',justifyContent:'space-between',paddingTop:12,borderTopWidth:1,borderTopColor:BORDER},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:6,paddingHorizontal:8},
  actionTxt:{fontSize:14,fontWeight:'500',color:TXTS},
  commentsTitle:{fontSize:16,fontWeight:'700',color:TXT,paddingHorizontal:16,paddingVertical:12},
  commentCard:{flexDirection:'row',gap:12,paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:BORDER},
  commentAvatar:{width:38,height:38,borderRadius:12,backgroundColor:'rgba(236,72,153,0.12)',justifyContent:'center',alignItems:'center',flexShrink:0},
  commentUser:{fontSize:14,fontWeight:'700',color:TXT},
  commentContent:{fontSize:14,color:TXT,lineHeight:20},
  inputRow:{flexDirection:'row',alignItems:'flex-end',gap:10,paddingHorizontal:16,paddingTop:10,borderTopWidth:1,borderTopColor:BORDER,backgroundColor:BG},
  inputWrap:{flex:1,backgroundColor:SURF,borderRadius:14,borderWidth:1,borderColor:BORDER,paddingHorizontal:14,paddingVertical:10,minHeight:44,maxHeight:100},
  input:{color:TXT,fontSize:14},sendBtn:{},
  sendBtnInner:{width:42,height:42,borderRadius:12,justifyContent:'center',alignItems:'center'},
});
