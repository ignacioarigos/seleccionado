export type Rol = 'jugador' | 'comitiva'
export type Transporte = 'avion' | 'propio' | 'none'
export type EstadoPago = 'debe' | 'parcial' | 'pagado' | 'noaplica'
export type TipoPago = 'inscripcion' | 'hotel' | 'viaje'
export type TipoMovCaja = 'ingreso' | 'egreso'
export type ContextoExtra = 'hotel' | 'viaje'

export interface Jugador {
  id: number
  nombre: string
  apellido: string
  dni: string
  fnac: string | null
  tomo: string
  folio: string
  titulo: string
  rol: Rol
  transporte: Transporte
  doc_dni: boolean
  doc_titulo: boolean
  doc_apto: boolean
  cargado: boolean
}

export interface Pago {
  id?: number
  jugador_id: number | string
  tipo: TipoPago
  estado: EstadoPago
}

export interface Habitacion {
  id: number
  nombre: string
  capacidad: number
  nro: string
  ocupantes: number[]
}

export interface FilaIndumentaria {
  id: number | string
  jugador_id: number | null
  es_extra: boolean
  nombre_extra: string | null
  apellido_extra: string | null
  nro_remera: number | null
  talle_remera: string | null
  talle_pantalon: string | null
  nombre_camiseta: string | null
}

export interface MovCaja {
  id: number
  fecha: string
  descripcion: string
  monto: number
  tipo: TipoMovCaja
}

export interface PersonaExtra {
  id: string
  nombre: string
  apellido: string
  contexto: ContextoExtra
  transporte?: Transporte
}

// Constantes
export const HOTEL_TOTAL = 100_000
export const HOTEL_SENIA = 50_000
export const TALLES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const
export const LABELS: Record<EstadoPago, string> = {
  debe: 'Debe', parcial: 'Seña', pagado: 'Pagado', noaplica: 'No aplica',
}
export const TLABELS: Record<TipoPago, string> = {
  inscripcion: 'Inscripción', hotel: 'Hotel', viaje: 'Transporte',
}
