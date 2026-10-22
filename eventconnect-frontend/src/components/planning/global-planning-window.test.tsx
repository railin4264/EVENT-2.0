// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GlobalPlanningWindow } from './global-planning-window'
import { GlobalPlanningResults } from './global-planning-results'
const mocks=vi.hoisted(()=>({ get:vi.fn(), print:vi.fn(), calendar:vi.fn() }))
vi.mock('@/lib/api/client',()=>({apiClient:{get:mocks.get}}))
vi.mock('@/lib/global-planning-export',()=>({openPlanningPrint:mocks.print,downloadPlanningCalendar:mocks.calendar}))
const events=[{_id:'aaaaaaaaaaaaaaaaaaaaaaaa',title:'Música nocturna',date:'2027-01-02T22:00:00Z',endDate:'2027-01-03T00:00:00Z',timeZone:'America/Santo_Domingo'}, {_id:'bbbbbbbbbbbbbbbbbbbbbbbb',title:'Paseo breve',date:'2027-01-02T23:00:00Z',endDate:'2027-01-02T23:30:00Z'}]
beforeEach(()=>{vi.stubGlobal('React',React);vi.clearAllMocks();mocks.get.mockResolvedValue({data:{success:true,data:events}})})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
function fill(){fireEvent.change(screen.getByLabelText('Disponible desde'),{target:{value:'2027-01-02T10:00'}});fireEvent.change(screen.getByLabelText('Debo regresar antes de'),{target:{value:'2027-01-03T10:00'}})}
it('offers usable presets without fetching or enrolling anyone',()=>{render(<GlobalPlanningWindow/>);fireEvent.click(screen.getByText('Tengo 2 horas'));expect((screen.getByLabelText('Disponible desde')as HTMLInputElement).value).toMatch(/^\d{4}-/);expect(mocks.get).not.toHaveBeenCalled()})
it('locks fields while searching and hides old results after city or travel changes',async()=>{
 let finish!: (v:any)=>void;mocks.get.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));render(<GlobalPlanningWindow/>);fill();fireEvent.click(screen.getByRole('button',{name:'Buscar planes que encajan'}));
 expect((screen.getByLabelText('Ciudad (opcional)')as HTMLInputElement).disabled).toBe(true)
 await act(async()=>{finish({data:{success:true,data:events}})})
 expect(screen.getByRole('link',{name:'Música nocturna'})).toBeTruthy()
 fireEvent.change(screen.getByLabelText('Ciudad (opcional)'),{target:{value:'Madrid'}})
 expect(screen.queryByRole('link',{name:'Música nocturna'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Buscar planes que encajan'}));await screen.findByRole('link',{name:'Música nocturna'})
 fireEvent.change(screen.getByLabelText('Minutos por trayecto'),{target:{value:'45'}})
 expect(screen.queryByRole('link',{name:'Música nocturna'})).toBeNull()
})
it('filters and sorts loaded events; exports only explicit selections',()=>{
 render(<GlobalPlanningResults results={events} visitorZone="UTC"/>);expect(mocks.print).not.toHaveBeenCalled();expect(mocks.calendar).not.toHaveBeenCalled()
 fireEvent.change(screen.getByLabelText('Ordenar resultados'),{target:{value:'duration'}});expect(screen.getAllByRole('article')[0].textContent).toContain('Paseo breve')
 fireEvent.change(screen.getByLabelText('Filtrar resultados por título'),{target:{value:'musica'}});expect(screen.queryByRole('link',{name:'Paseo breve'})).toBeNull()
 fireEvent.click(screen.getByLabelText('Seleccionar Música nocturna'));fireEvent.click(screen.getByText('Preparar resumen para imprimir'))
 expect(mocks.print).toHaveBeenCalledWith([events[0]],'UTC','UTC')
 fireEvent.click(screen.getByText('Descargar calendario .ics'));expect(mocks.calendar).toHaveBeenCalledWith(events[0])
})
it('rejects an invalid comparison zone and reports explicit export failures',()=>{
 render(<GlobalPlanningResults results={events} visitorZone="UTC"/>);fireEvent.click(screen.getByLabelText('Seleccionar Música nocturna'))
 fireEvent.change(screen.getByLabelText('Zona de comparación elegida'),{target:{value:'not-a-zone'}});expect((screen.getByText('Preparar resumen para imprimir')as HTMLButtonElement).disabled).toBe(true)
 mocks.calendar.mockImplementationOnce(()=>{throw Error('Archivo no disponible')});fireEvent.click(screen.getAllByText('Descargar calendario .ics')[0]);expect(screen.getByText('Archivo no disponible')).toBeTruthy()
})
