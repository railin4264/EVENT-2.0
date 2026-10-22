import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {TextInput,TouchableOpacity,View,Text,Alert} from 'react-native';
import CreateEventScreen from '../CreateEventScreen';
import {api} from '@/services/api';
let mockUser:any={id:'account-a'};
jest.mock('expo-router',()=>({useLocalSearchParams:()=>({draft:'aaaaaaaaaaaaaaaaaaaaaaaa'}),useRouter:()=>({back:jest.fn()})}));
jest.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:mockUser})}));
jest.mock('@/services/api',()=>({api:{get:jest.fn(),post:jest.fn()}}));
jest.mock('expo-linear-gradient',()=>({LinearGradient:({children}:any)=>{const {View}=require('react-native');return <View>{children}</View>}}));
jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('expo-location',()=>({}));
jest.mock('expo-image-picker',()=>({}));
jest.mock('@/components/ui',()=>{const React=require('react'),{View,Text,TextInput,TouchableOpacity}=require('react-native');return{Card:({children}:any)=><View>{children}</View>,Badge:({children}:any)=><Text>{children}</Text>,Input:({label,...props}:any)=><TextInput accessibilityLabel={label} {...props}/>,Button:({children,onPress,disabled}:any)=><TouchableOpacity onPress={onPress} disabled={disabled}><Text>{children}</Text></TouchableOpacity>}});
const get=api.get as jest.Mock,post=api.post as jest.Mock;
let tree:TestRenderer.ReactTestRenderer;
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;jest.clearAllMocks();mockUser={id:'account-a'};get.mockResolvedValue({data:{success:true,data:{fields:{title:'Borrador musical',date:'2026-11-22',time:'18:30',timeZone:'America/Santo_Domingo'}}}})});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());jest.restoreAllMocks()});
const create=async()=>{await act(async()=>{tree=TestRenderer.create(<CreateEventScreen/>);});};
const apply=()=>tree.root.findAllByType(TouchableOpacity).find(b=>b.findAllByType(Text).some(t=>t.props.children==='Aplicar borrador revisado'))!;
test('opening private draft does not fill form or publish',async()=>{await create();expect(get).toHaveBeenCalledWith('/planning-tools/drafts/aaaaaaaaaaaaaaaaaaaaaaaa');expect(post).not.toHaveBeenCalled();expect(tree.root.findAllByType(TextInput).find(i=>i.props.accessibilityLabel==='Título del Evento')!.props.value).toBe('')});
test('draft fills only after visible apply and native confirmation',async()=>{const alert=jest.spyOn(Alert,'alert').mockImplementation(()=>{});await create();await act(async()=>{apply().props.onPress()});expect(tree.root.findAllByType(TextInput).find(i=>i.props.accessibilityLabel==='Título del Evento')!.props.value).toBe('');await act(async()=>{const buttons=alert.mock.calls.at(-1)![2]!;buttons.find(b=>b.text==='Aplicar')!.onPress!();});expect(tree.root.findAllByType(TextInput).find(i=>i.props.accessibilityLabel==='Título del Evento')!.props.value).toBe('Borrador musical');expect(post).not.toHaveBeenCalled()});
test('late draft from prior account is ignored',async()=>{let resolve:any;get.mockImplementationOnce(()=>new Promise(r=>{resolve=r}));await create();mockUser=null;await act(async()=>{tree.update(<CreateEventScreen/>);});await act(async()=>{resolve({data:{success:true,data:{fields:{title:'Private old account'}}}})});expect(JSON.stringify(tree.toJSON())).not.toContain('Private old account');expect(post).not.toHaveBeenCalled()});


const field = (label: string) => tree.root.findAllByType(TextInput).find(i => i.props.accessibilityLabel === label)!;
const textButton = (text: string) => tree.root.findAllByType(TouchableOpacity).find(b => b.findAllByType(Text).some(t => t.props.children === text))!;
const explicitDraft = { title: 'Club de lectura en Tokio', description: 'Lectura en Tokio en un lugar por confirmar.', category: 'literature', localDate: '2026-11-28', localTime: '15:00', timeZone: null, venue: null, estimatedBudget: null };

test('text extraction sends the API contract and asks before applying local date and time', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  post.mockResolvedValue({ data: { success: true, draft: explicitDraft } });
  await create();
  await act(async () => field('Texto del Anuncio o Coro').props.onChangeText('Lectura en Tokio el 28 de noviembre de 2026 a las 15:00'));
  await act(async () => textButton('Preparar borrador').props.onPress());
  expect(post).toHaveBeenCalledWith('/sources/friend-draft', { text: 'Lectura en Tokio el 28 de noviembre de 2026 a las 15:00' });
  expect(field('Título del Evento').props.value).toBe('');
  expect(alert.mock.calls.at(-1)![1]).toContain('Zona horaria: por confirmar');
  await act(async () => alert.mock.calls.at(-1)![2]!.find(b => b.text === 'Aplicar')!.onPress!());
  expect(field('Fecha').props.value).toBe('2026-11-28'); expect(field('Hora').props.value).toBe('15:00');
  expect(field('Zona horaria (ej. America/Santo_Domingo)').props.value).toBe('');
  expect(field('Precio').props.value).toBe(''); expect(field('Moneda (ej. DOP, USD, EUR, JPY)').props.value).toBe('');
  expect(tree.root.findByProps({ accessibilityLabel: 'Plan privado' }).props.accessibilityState.checked).toBe(true);
  expect(post.mock.calls.every(([path]) => path !== '/events')).toBe(true);
});

test('editing the source text invalidates an extraction still in flight', async () => {
  let resolve: any; post.mockImplementationOnce(() => new Promise(r => { resolve = r }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); await create();
  await act(async () => field('Texto del Anuncio o Coro').props.onChangeText('Primer anuncio de lectura'));
  let pending: any; await act(async () => { pending = textButton('Preparar borrador').props.onPress(); });
  await act(async () => field('Texto del Anuncio o Coro').props.onChangeText('Otro anuncio distinto'));
  await act(async () => { resolve({ data: { success: true, draft: explicitDraft } }); await pending; });
  expect(alert.mock.calls.some(([title]) => title === 'Revisa el borrador')).toBe(false);
  expect(field('Título del Evento').props.value).toBe('');
});


test('a text plan needs an explicit price and preserves privacy and JPY on submission', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  post.mockResolvedValue({ data: { success: true, draft: explicitDraft } });
  await create();
  await act(async () => field('Texto del Anuncio o Coro').props.onChangeText('Club de lectura en Tokio'));
  await act(async () => textButton('Preparar borrador').props.onPress());
  await act(async () => alert.mock.calls.at(-1)![2]!.find(b => b.text === 'Aplicar')!.onPress!());
  await act(async () => field('Dirección').props.onChangeText('Parque Ueno'));
  await act(async () => textButton('Crear Evento').props.onPress());
  expect(alert.mock.calls.at(-1)![1]).toContain('Confirma el precio');
  expect(post.mock.calls.some(([path]) => path === '/events')).toBe(false);
  for (const [label, value] of Object.entries({
    'Zona horaria (ej. America/Santo_Domingo)': 'Asia/Tokyo', 'Latitud real': '35.68', 'Longitud real': '139.76',
    'Ciudad': 'Tokyo', 'País': 'Japan', 'Moneda (ej. DOP, USD, EUR, JPY)': 'JPY', 'Precio': '2500'
  })) await act(async () => field(label).props.onChangeText(value));
  await act(async () => textButton('Crear Evento').props.onPress());
  expect(post).toHaveBeenLastCalledWith('/events', expect.objectContaining({ isPrivate: true, price: { amount: 2500, currency: 'JPY' }, timeZone: 'Asia/Tokyo', date: '2026-11-28T06:00:00.000Z' }));
});
