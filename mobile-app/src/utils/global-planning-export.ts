import {Platform,Share} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {planningCalendar,planningItinerary,type GlobalPlanningEvent} from './global-planning';
// Only public search-result fields enter these files; no ticket QR, account or guest list.
export async function exportPlanningCalendar(event:GlobalPlanningEvent) {
  const content=planningCalendar(event);
  if(Platform.OS==='android') {
    const permissions=await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if(!permissions.granted) return 'cancelled';
    const uri=await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri,`eventnow-${event._id}.ics`,'text/calendar');
    await FileSystem.writeAsStringAsync(uri,content,{encoding:FileSystem.EncodingType.UTF8});
    return 'saved';
  }
  if(Platform.OS==='ios') {
    if(!FileSystem.cacheDirectory) throw Error('No hay una carpeta temporal disponible para preparar el calendario.');
    const uri=`${FileSystem.cacheDirectory}eventnow-${event._id}.ics`;
    await FileSystem.writeAsStringAsync(uri,content,{encoding:FileSystem.EncodingType.UTF8});
    const result=await Share.share({url:uri,title:'Calendario del evento'});
    return result.action===Share.dismissedAction?'cancelled':'shared';
  }
  throw Error('Guarda el calendario desde Android, iOS o la página web de EventNow.');
}
export async function sharePlanningSummary(events:GlobalPlanningEvent[],visitorZone:string,comparisonZone:string) {
  const lines=planningItinerary(events,visitorZone,comparisonZone);
  const result=await Share.share({title:'Mis opciones en EventNow',message:lines.join('\n')});
  return result.action===Share.dismissedAction?'cancelled':'shared';
}
