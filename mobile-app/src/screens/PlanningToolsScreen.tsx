import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import {GlobalPlanningWindowNative} from '../components/planning/global-planning-window';
import { apiClient } from '../services/apiClient';
type Fields = {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  timeZone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  amount?: number;
};
const labels: Record<string, string> = {
  title: 'Título',
  description: 'Descripción',
  date: 'Fecha AAAA-MM-DD',
  time: 'Hora HH:mm',
  timeZone: 'Zona horaria IANA',
  address: 'Dirección',
  city: 'Ciudad',
  country: 'País',
  currency: 'Moneda DOP/USD/EUR/MXN',
  amount: 'Precio',
};
export default function PlanningToolsScreen() {
  const { user } = useAuth();
  const owner = user?._id || user?.id || '';
  return <Tools key={owner} owner={owner} />;
}
function Tools({ owner }: { owner: string }) {
  const router = useRouter(),
    alive = useRef(true),
    lock = useRef(false);
  const [text, setText] = useState(''),
    [fields, setFields] = useState<Fields>({}),
    [drafts, setDrafts] = useState<any[]>([]),
    [selected, setSelected] = useState(''),
    [warnings, setWarnings] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    alive.current = true;
    if (owner)
      apiClient
        .get('/planning-tools/drafts')
        .then(r => {
          if (alive.current && r.data.success) setDrafts(r.data.data);
        })
        .catch(() => {
          if (alive.current) setError('No se pudieron cargar tus borradores.');
        });
    return () => {
      alive.current = false;
    };
  }, [owner]);
  async function run(action: () => Promise<void>) {
    if (!alive.current || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e: any) {
      if (alive.current)
        setError(
          e.response?.data?.message || e.message || 'No se pudo completar.'
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const confirm = (title: string, action: () => void) =>
    Alert.alert(
      title,
      'Se reemplazarán los campos de edición actuales; los borradores guardados permanecen.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: action },
      ]
    );
  function button(label: string, onPress: () => void) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        disabled={busy}
        onPress={onPress}
        style={[s.button, busy && { opacity: 0.5 }]}
      >
        <Text style={s.buttonText}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
    >
      {button('← Volver', () => router.back())}
      <Text style={s.heading}>Dale espacio al plan.</Text>
      <Text style={s.copy}>
        Dos maneras de pasar de una idea a un encuentro.
      </Text>
      <GlobalPlanningWindowNative />
      <View style={s.card}>
        <Text style={s.title}>De conversación a borrador</Text>
        <Text style={s.copy}>
          Pega voluntariamente un mensaje. No leemos chats ni portapapeles.
          Reconocemos etiquetas: Título:, Fecha: AAAA-MM-DD, Hora: HH:mm, Zona
          horaria: America/Santo_Domingo, Dirección:, Ciudad:, País:, Precio:
          DOP 500. El texto original no se guarda.
        </Text>
        {!owner ? (
          button('Entrar para guardar borradores', () =>
            router.push({pathname:'/(auth)/login',params:{returnTo:'/planning-tools'}} as any)
          )
        ) : (
          <>
            <TextInput
              accessibilityLabel="Mensaje para revisar"
              style={[s.input, { minHeight: 140, textAlignVertical: 'top' }]}
              multiline
              maxLength={6000}
              value={text}
              onChangeText={setText}
            />
            {button('Preparar campos para revisar', () => {
              const parse = () =>
                void run(async () => {
                  const r = await apiClient.post('/planning-tools/parse', {
                    text,
                  });
                  if (!r.data.success) throw Error('No se pudo preparar.');
                  if (alive.current) {
                    setFields(r.data.data.fields);
                    setWarnings(r.data.data.warnings);
                    setSelected('');
                    setText('');
                  }
                });
              if (Object.keys(fields).length) confirm('¿Reemplazar campos de edición?', parse); else parse();
            })}
            {warnings.map(w => (
              <Text key={w} style={s.warning}>
                {w}
              </Text>
            ))}
            {Object.entries(labels).map(([key, label]) => (
              <View key={key}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  accessibilityLabel={label}
                  style={s.input}
                  value={String((fields as any)[key] ?? '')}
                  onChangeText={v =>
                    setFields(old => ({
                      ...old,
                      [key]:
                        key === 'amount'
                          ? v === ''
                            ? undefined
                            : Number(v)
                          : v,
                    }))
                  }
                />
              </View>
            ))}
            {button(
              'Guardar borrador privado',
              () =>
                void run(async () => {
                  const r = selected
                    ? await apiClient.put(
                        `/planning-tools/drafts/${selected}`,
                        { fields }
                      )
                    : await apiClient.post('/planning-tools/drafts', {
                        fields,
                      });
                  if (!r.data.success) throw Error('No se guardó.');
                  if (alive.current) {
                    setSelected(r.data.data._id);
                    setDrafts(old => [
                      r.data.data,
                      ...old.filter(d => d._id !== r.data.data._id),
                    ]);
                    setNotice(
                      'Borrador privado guardado. No se publicó ningún evento.'
                    );
                  }
                })
            )}
            {selected &&
              button('Revisar en creación de evento →', () =>
                router.push({
                  pathname: '/create-event',
                  params: { draft: selected },
                } as any)
              )}
            <Text style={s.title}>Mis borradores</Text>
            {drafts.map(d => (
              <View key={d._id} style={s.result}>
                <Text style={s.label}>{d.fields.title || 'Sin título'}</Text>
                {button('Editar borrador', () => {
                  const apply = () => {
                    setFields(d.fields);
                    setSelected(d._id);
                    setWarnings([]);
                  };
                  if (Object.keys(fields).length) confirm('¿Abrir otro borrador?', apply); else apply();
                })}
                {button('Eliminar borrador', () =>
                  Alert.alert(
                    '¿Eliminar permanentemente este borrador?',
                    'No se elimina ningún evento.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: () =>
                          void run(async () => {
                            const r = await apiClient.delete(
                              `/planning-tools/drafts/${d._id}`
                            );
                            if (!r.data.success) throw Error('No se eliminó.');
                            if (alive.current) {
                              setDrafts(old =>
                                old.filter(v => v._id !== d._id)
                              );
                              if (selected === d._id) {
                                setSelected('');
                                setFields({});
                              }
                            }
                          }),
                      },
                    ]
                  )
                )}
              </View>
            ))}
          </>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={s.warning}>
          {error}
        </Text>
      ) : null}
      {notice ? <Text style={s.copy}>{notice}</Text> : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0C0B10' },
  heading: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    marginVertical: 20,
  },
  title: { fontSize: 23, fontWeight: '600', color: '#fff', marginBottom: 14 },
  copy: { fontSize: 15, lineHeight: 23, color: '#c5bfd2', marginBottom: 15 },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#393143',
    marginTop: 22,
  },
  label: { fontSize: 15, color: '#fff', marginBottom: 8, marginTop: 10 },
  input: {
    backgroundColor: '#201b29',
    borderRadius: 12,
    color: '#fff',
    padding: 14,
    minHeight: 48,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#6d28d9',
    padding: 15,
    borderRadius: 12,
    marginVertical: 8,
    minHeight: 48,
  },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  result: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#393143',
    borderRadius: 16,
    marginTop: 12,
  },
  warning: { color: '#fbbf24', marginVertical: 10, lineHeight: 22 },
});
