// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest'
import {populatePlanningPrintDocument,openPlanningPrint} from './global-planning-export'
afterEach(()=>vi.restoreAllMocks())
it('prepara documento con texto inerte y sólo imprime después de tocar su botón',()=>{const doc=document.implementation.createHTMLDocument(),print=vi.fn();populatePlanningPrintDocument(doc,['<img src=x onerror=alert(1)>','Datos de horario públicos'],print);expect(doc.querySelector('img')).toBeNull();expect(doc.body.textContent).toContain('<img');expect(doc.title).toContain('EventNow');expect(print).not.toHaveBeenCalled();doc.querySelector('button')!.click();expect(print).toHaveBeenCalledTimes(1)})
it('informa popup bloqueado sin imprimir ni redirigir',()=>{const open=vi.spyOn(window,'open').mockReturnValue(null);expect(()=>openPlanningPrint([{_id:'aaaaaaaaaaaaaaaaaaaaaaaa',title:'Evento',date:'2026-11-21T22:00Z',endDate:'2026-11-21T23:00Z'}],'UTC','UTC')).toThrow(/bloqueó/);expect(open).toHaveBeenCalledWith('about:blank','_blank')})
