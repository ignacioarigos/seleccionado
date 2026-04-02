'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { sb } from '@/lib/supabase'
import { fmtPesos } from '@/lib/utils'
import type { TipoMovCaja } from '@/lib/types'

export default function CajaPage() {
  const { caja, setCaja, showToast, setSyncState } = useStore()
  const [tipo, setTipo]     = useState<TipoMovCaja>('ingreso')
  const [fecha, setFecha]   = useState(new Date().toISOString().slice(0, 10))
  const [desc, setDesc]     = useState('')
  const [monto, setMonto]   = useState('')

  const totalIng   = caja.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
  const totalEgr   = caja.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0)
  const saldo      = totalIng - totalEgr
  const saldoCls   = saldo > 0 ? 'pos' : saldo < 0 ? 'neg' : 'cero'

  const ordenados = [...caja].sort((a, b) => a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : a.id - b.id)

  const agregar = async () => {
    if (!desc.trim()) { showToast('Ingresá una descripción', 'err'); return }
    const montoNum = parseFloat(monto)
    if (!montoNum || montoNum <= 0) { showToast('Ingresá un monto válido', 'err'); return }
    setSyncState('syncing')
    try {
      const { data, error } = await sb.from('caja').insert({ tipo, fecha, descripcion: desc.trim(), monto: montoNum }).select().single()
      if (error) throw error
      setCaja([...caja, data as any])
      setDesc(''); setMonto(''); setTipo('ingreso')
      showToast(tipo === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado')
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    setSyncState('syncing')
    try {
      const { error } = await sb.from('caja').delete().eq('id', id)
      if (error) throw error
      setCaja(caja.filter(m => m.id !== id))
      showToast('Eliminado'); setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  let acum = 0

  return (
    <>
      {/* Saldo */}
      <div className="caja-saldo">
        <div>
          <div className="caja-saldo-label">Saldo disponible</div>
          <div className={`caja-saldo-monto ${saldoCls}`}>{fmtPesos(saldo)}</div>
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '.6em', color: 'var(--suave)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Ingresos</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15em', color: 'var(--verde)' }}>{fmtPesos(totalIng)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '.6em', color: 'var(--suave)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Egresos</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15em', color: 'var(--rojo)' }}>{fmtPesos(totalEgr)}</div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div className="caja-form">
        <div style={{ gridColumn: '1/-1', fontFamily: "'Bebas Neue', sans-serif", fontSize: '.9em', color: 'var(--suave)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Nuevo movimiento
        </div>
        <div>
          <label>Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoMovCaja)}>
            <option value="ingreso">💚 Ingreso</option>
            <option value="egreso">🔴 Egreso</option>
          </select>
        </div>
        <div>
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label>Descripción *</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Remanente torneo anterior" onKeyDown={e => e.key === 'Enter' && agregar()} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label>Monto $ *</label>
          <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" min="0" step="100" onKeyDown={e => e.key === 'Enter' && agregar()} />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <button className="btn-primary" onClick={agregar}>+ Registrar</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="caja-table-wrap">
        <table className="caja-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
              <th style={{ textAlign: 'right' }}>Saldo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ordenados.length === 0
              ? <tr><td colSpan={6} style={{ color: 'var(--suave)', fontSize: '.82em', padding: '16px 10px', textAlign: 'center' }}>Sin movimientos. Registrá el primero arriba.</td></tr>
              : ordenados.map(m => {
                  acum += m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)
                  const [y, mo, di] = m.fecha.split('-')
                  const fechaCorta = `${di}/${mo}`
                  return (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--suave)', whiteSpace: 'nowrap' }}>{fechaCorta}</td>
                      <td style={{ maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.descripcion}</td>
                      <td><span className={m.tipo === 'ingreso' ? 'caja-tipo-ing' : 'caja-tipo-egr'}>{m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={m.tipo === 'ingreso' ? 'caja-monto-ing' : 'caja-monto-egr'}>
                          {m.tipo === 'ingreso' ? '+' : '-'}{fmtPesos(m.monto)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: acum >= 0 ? 'var(--verde)' : 'var(--rojo)', fontWeight: 600 }}>{fmtPesos(acum)}</td>
                      <td><span className="caja-del" onClick={() => eliminar(m.id)}>✕</span></td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </>
  )
}
