import type { Jugador, Pago, TipoPago, EstadoPago } from './types'

export const fmtPesos = (n: number) =>
  '$\u202f' + Number(n).toLocaleString('es-AR')

export const fmtFecha = (fecha: string | null) =>
  fecha
    ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '—'

export const fmtTomoFolio = (j: Jugador) =>
  j.tomo ? (j.folio ? `T° ${j.tomo} - F° ${j.folio}` : j.tomo) : '—'

export const soloJugadores = (jugadores: Jugador[]) =>
  jugadores.filter(j => (j.rol || 'jugador') === 'jugador')

export const soloComitiva = (jugadores: Jugador[]) =>
  jugadores.filter(j => (j.rol || 'jugador') === 'comitiva')

export const paymentState = (
  pagos: Pago[], jId: number | string, tipo: TipoPago
): EstadoPago =>
  pagos.find(p => String(p.jugador_id) === String(jId) && p.tipo === tipo)?.estado ?? 'debe'

export const genExtraId = () =>
  'ex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
