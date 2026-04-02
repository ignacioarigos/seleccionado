'use client'
import type { EstadoPago, TipoPago } from '@/lib/types'

interface Option { val: EstadoPago; label: string }

interface Props {
  tipo: TipoPago
  personaId: number | string
  estadoActual: EstadoPago
  opciones: Option[]
  onSelect: (tipo: TipoPago, personaId: number | string, estado: EstadoPago) => void
}

export default function ChipGroup({ tipo, personaId, estadoActual, opciones, onSelect }: Props) {
  return (
    <div className="chip-group" onClick={e => e.stopPropagation()}>
      {opciones.map(op => (
        <div
          key={op.val}
          className={`chip ${estadoActual === op.val ? `active-${op.val}` : ''}`}
          onClick={e => {
            e.stopPropagation()
            if (estadoActual !== op.val) onSelect(tipo, personaId, op.val)
          }}
        >
          {op.label}
        </div>
      ))}
    </div>
  )
}

export const opcionesChip = (tipo: TipoPago): Option[] => {
  if (tipo === 'inscripcion') return [{ val: 'debe', label: 'Debe' }, { val: 'pagado', label: 'Pagado' }]
  if (tipo === 'hotel')       return [{ val: 'debe', label: 'Debe' }, { val: 'parcial', label: 'Seña' }, { val: 'pagado', label: 'Pagado' }]
  return [{ val: 'debe', label: 'Debe' }, { val: 'pagado', label: 'Pagado' }, { val: 'noaplica', label: 'No aplica' }]
}
