'use client'
import { create } from 'zustand'
import { sb } from './supabase'
import type {
  Jugador, Pago, Habitacion, FilaIndumentaria,
  MovCaja, PersonaExtra, TipoPago, EstadoPago, Transporte,
} from './types'

interface AppState {
  // Data
  jugadores: Jugador[]
  pagos: Pago[]
  habitaciones: Habitacion[]
  indumentaria: FilaIndumentaria[]
  caja: MovCaja[]
  personasExtra: PersonaExtra[]

  // UI
  syncState: 'ok' | 'syncing' | 'err'
  toastMsg: string | null
  toastTipo: 'ok' | 'err'
  syncPaused: boolean

  // Setters
  setJugadores: (j: Jugador[]) => void
  setPagos: (p: Pago[]) => void
  setHabitaciones: (h: Habitacion[]) => void
  setIndumentaria: (i: FilaIndumentaria[]) => void
  setCaja: (c: MovCaja[]) => void
  setPersonasExtra: (p: PersonaExtra[]) => void
  setSyncState: (s: 'ok' | 'syncing' | 'err') => void
  showToast: (msg: string, tipo?: 'ok' | 'err') => void
  setSyncPaused: (v: boolean) => void

  // Actions
  loadAll: () => Promise<void>
  syncFromDB: () => Promise<void>
  upsertPago: (jugadorId: number | string, tipo: TipoPago, estado: EstadoPago) => Promise<void>
  setTransporte: (jugadorId: number, next: Transporte) => Promise<void>
  agregarPersonaExtra: (contexto: 'hotel' | 'viaje', nombre: string, apellido: string) => Promise<void>
  quitarPersonaExtra: (id: string) => void
}

export const useStore = create<AppState>((set, get) => ({
  jugadores: [],
  pagos: [],
  habitaciones: [],
  indumentaria: [],
  caja: [],
  personasExtra: [],
  syncState: 'ok',
  toastMsg: null,
  toastTipo: 'ok',
  syncPaused: false,

  setJugadores: (j) => set({ jugadores: j }),
  setPagos: (p) => set({ pagos: p }),
  setHabitaciones: (h) => set({ habitaciones: h }),
  setIndumentaria: (i) => set({ indumentaria: i }),
  setCaja: (c) => set({ caja: c }),
  setPersonasExtra: (p) => set({ personasExtra: p }),
  setSyncState: (s) => set({ syncState: s }),
  setSyncPaused: (v) => set({ syncPaused: v }),

  showToast: (msg, tipo = 'ok') => {
    set({ toastMsg: msg, toastTipo: tipo })
    setTimeout(() => set({ toastMsg: null }), 2400)
  },

  loadAll: async () => {
    set({ syncState: 'syncing' })
    try {
      const [jRes, pRes, hRes, ocRes, iRes, cRes] = await Promise.all([
        sb.from('jugadores').select('*').order('apellido'),
        sb.from('pagos').select('*'),
        sb.from('habitaciones').select('*').order('id'),
        sb.from('hab_ocupantes').select('*'),
        sb.from('indumentaria').select('*').order('id'),
        sb.from('caja').select('*').order('fecha,id'),
      ])
      if (jRes.error) throw jRes.error
      if (pRes.error) throw pRes.error

      const jugadores = (jRes.data || []) as Jugador[]
      const pagos = (pRes.data || []) as Pago[]
      const habitaciones = ((hRes.data || []) as any[]).map(h => ({
        ...h,
        ocupantes: ((ocRes.data || []) as any[])
          .filter(o => o.habitacion_id === h.id)
          .map(o => o.jugador_id),
      })) as Habitacion[]

      // Asegurar pagos de hotel/viaje para comitiva
      const comitiva = jugadores.filter(j => j.rol === 'comitiva')
      const pagosFaltantes: Pago[] = []
      for (const j of comitiva) {
        for (const tipo of ['hotel', 'viaje'] as TipoPago[]) {
          const existe = pagos.find(p => String(p.jugador_id) === String(j.id) && p.tipo === tipo)
          if (!existe) pagosFaltantes.push({ jugador_id: j.id, tipo, estado: 'debe' })
        }
      }
      if (pagosFaltantes.length > 0) {
        await sb.from('pagos').upsert(pagosFaltantes, { onConflict: 'jugador_id,tipo' })
        pagos.push(...pagosFaltantes)
      }

      set({
        jugadores,
        pagos,
        habitaciones,
        indumentaria: (iRes.data || []) as FilaIndumentaria[],
        caja: (cRes.data || []) as MovCaja[],
        syncState: 'ok',
      })
    } catch (e: any) {
      set({ syncState: 'err' })
      get().showToast('Error al conectar: ' + e.message, 'err')
    }
  },

  syncFromDB: async () => {
    if (get().syncPaused) return
    try {
      const [jRes, pRes, hRes, ocRes, iRes, cRes] = await Promise.all([
        sb.from('jugadores').select('*').order('apellido'),
        sb.from('pagos').select('*'),
        sb.from('habitaciones').select('*').order('id'),
        sb.from('hab_ocupantes').select('*'),
        sb.from('indumentaria').select('*').order('id'),
        sb.from('caja').select('*').order('fecha,id'),
      ])
      if (!jRes.data) return
      set({
        jugadores: jRes.data as Jugador[],
        pagos: (pRes.data || []) as Pago[],
        habitaciones: ((hRes.data || []) as any[]).map(h => ({
          ...h,
          ocupantes: ((ocRes.data || []) as any[])
            .filter(o => o.habitacion_id === h.id)
            .map(o => o.jugador_id),
        })) as Habitacion[],
        indumentaria: (iRes.data || []) as FilaIndumentaria[],
        caja: (cRes.data || []) as MovCaja[],
        syncState: 'ok',
      })
    } catch {
      set({ syncState: 'err' })
    }
  },

  upsertPago: async (jugadorId, tipo, estado) => {
    const esExtra = String(jugadorId).startsWith('ex_')
    const pagos = get().pagos
    const existente = pagos.find(
      p => String(p.jugador_id) === String(jugadorId) && p.tipo === tipo
    )
    // Update local immediately
    if (existente) {
      set({ pagos: pagos.map(p =>
        String(p.jugador_id) === String(jugadorId) && p.tipo === tipo
          ? { ...p, estado } : p
      )})
    } else {
      set({ pagos: [...pagos, { jugador_id: jugadorId, tipo, estado }] })
    }
    if (!esExtra) {
      const { error } = await sb.from('pagos')
        .upsert({ jugador_id: jugadorId, tipo, estado }, { onConflict: 'jugador_id,tipo' })
        .select()
      if (error) throw error
    }
  },

  setTransporte: async (jugadorId, next) => {
    const jugadores = get().jugadores
    const j = jugadores.find(x => x.id === jugadorId)
    if (!j) return

    let estadoViaje: EstadoPago = 'debe'
    if (next === 'avion')  estadoViaje = 'pagado'
    if (next === 'propio') estadoViaje = 'noaplica'

    // Update local immediately
    set({ jugadores: jugadores.map(x => x.id === jugadorId ? { ...x, transporte: next } : x) })
    set({ syncPaused: true })

    try {
      await sb.from('jugadores').update({ transporte: next }).eq('id', jugadorId)
      await get().upsertPago(jugadorId, 'viaje', estadoViaje)
    } catch (e: any) {
      // Revert
      set({ jugadores: jugadores })
      get().showToast('Error: ' + e.message, 'err')
    } finally {
      set({ syncPaused: false })
    }
  },

  agregarPersonaExtra: async (contexto, nombre, apellido) => {
    const id = 'ex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const p: PersonaExtra = {
      id, nombre: nombre.trim(), apellido: apellido.trim(), contexto,
      transporte: contexto === 'viaje' ? 'none' : undefined,
    }
    set(s => ({ personasExtra: [...s.personasExtra, p] }))
    const tipo = contexto === 'hotel' ? 'hotel' : 'viaje'
    await get().upsertPago(id, tipo, 'debe')
  },

  quitarPersonaExtra: (id) => {
    set(s => ({
      personasExtra: s.personasExtra.filter(p => p.id !== id),
      pagos: s.pagos.filter(p => String(p.jugador_id) !== id),
    }))
  },
}))

// Helpers (usable outside components)
export const getPaymentState = (
  pagos: Pago[], jugadorId: number | string, tipo: TipoPago
): EstadoPago =>
  pagos.find(p => String(p.jugador_id) === String(jugadorId) && p.tipo === tipo)?.estado ?? 'debe'
