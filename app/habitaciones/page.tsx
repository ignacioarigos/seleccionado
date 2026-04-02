'use client'
import { useStore } from '@/lib/store'
import { sb } from '@/lib/supabase'
import type { Habitacion } from '@/lib/types'

export default function HabitacionesPage() {
  const { jugadores, habitaciones, setHabitaciones, showToast, setSyncState } = useStore()

  const agregar = async () => {
    setSyncState('syncing')
    try {
      const nombre = `Hab. ${habitaciones.length + 1}`
      const { data, error } = await sb.from('habitaciones').insert({ nombre, capacidad: 3, nro: '' }).select().single()
      if (error) throw error
      setHabitaciones([...habitaciones, { ...data, ocupantes: [] }])
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const eliminar = async (h: Habitacion) => {
    if (!confirm(`¿Eliminar ${h.nombre}?`)) return
    setSyncState('syncing')
    try {
      const { error } = await sb.from('habitaciones').delete().eq('id', h.id)
      if (error) throw error
      setHabitaciones(habitaciones.filter(x => x.id !== h.id))
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const cambiarCapacidad = async (h: Habitacion, cap: number) => {
    setSyncState('syncing')
    try {
      const { error } = await sb.from('habitaciones').update({ capacidad: cap }).eq('id', h.id)
      if (error) throw error
      let ocupantes = h.ocupantes
      if (ocupantes.length > cap) {
        const sobran = ocupantes.slice(cap)
        for (const jId of sobran) {
          await sb.from('hab_ocupantes').delete().eq('habitacion_id', h.id).eq('jugador_id', jId)
        }
        ocupantes = ocupantes.slice(0, cap)
      }
      setHabitaciones(habitaciones.map(x => x.id === h.id ? { ...x, capacidad: cap, ocupantes } : x))
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const cambiarNro = async (h: Habitacion, nro: string) => {
    setHabitaciones(habitaciones.map(x => x.id === h.id ? { ...x, nro } : x))
    try { await sb.from('habitaciones').update({ nro }).eq('id', h.id) } catch {}
  }

  const asignar = async (h: Habitacion, jId: number) => {
    if (!jId) return
    if (h.ocupantes.length >= h.capacidad) { alert(`Habitación llena (${h.capacidad} personas).`); return }
    setSyncState('syncing')
    try {
      // quitar de otras
      const updated = habitaciones.map(x => ({ ...x, ocupantes: [...x.ocupantes] }))
      for (const hab of updated) {
        if (hab.ocupantes.includes(jId) && hab.id !== h.id) {
          await sb.from('hab_ocupantes').delete().eq('habitacion_id', hab.id).eq('jugador_id', jId)
          hab.ocupantes = hab.ocupantes.filter(id => id !== jId)
        }
      }
      const { error } = await sb.from('hab_ocupantes').insert({ habitacion_id: h.id, jugador_id: jId })
      if (error) throw error
      const target = updated.find(x => x.id === h.id)
      if (target) target.ocupantes.push(jId)
      setHabitaciones(updated)
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const quitar = async (h: Habitacion, jId: number) => {
    setSyncState('syncing')
    try {
      const { error } = await sb.from('hab_ocupantes').delete().eq('habitacion_id', h.id).eq('jugador_id', jId)
      if (error) throw error
      setHabitaciones(habitaciones.map(x => x.id === h.id ? { ...x, ocupantes: x.ocupantes.filter(id => id !== jId) } : x))
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const asignados = new Set(habitaciones.flatMap(h => h.ocupantes))

  return (
    <>
      <div className="sec-title">Habitaciones</div>
      <div className="hab-list">
        {habitaciones.length === 0 && (
          <div style={{ color: 'var(--suave)', fontSize: '.82em', padding: '14px 0' }}>Agregá habitaciones abajo.</div>
        )}
        {habitaciones.map(h => {
          const cap = h.capacidad || 3
          const llena = h.ocupantes.length >= cap
          const libres = jugadores.filter(j => !asignados.has(j.id) || h.ocupantes.includes(j.id)).filter(j => !h.ocupantes.includes(j.id))
          return (
            <div className="hab-card" key={h.id}>
              <div className="hab-header">
                <div className="hab-nombre">🚪 {h.nombre}</div>
                <span className="hab-cap-badge">{h.ocupantes.length}/{cap}</span>
                <select className="hab-cap-select" value={cap} onChange={e => cambiarCapacidad(h, Number(e.target.value))}>
                  {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} pers.</option>)}
                </select>
                <input className="hab-num-input" type="text" placeholder="N° hab." value={h.nro || ''} onChange={e => cambiarNro(h, e.target.value)} />
                <button className="hab-delete" onClick={() => eliminar(h)}>✕</button>
              </div>
              <ul className="hab-ocupantes">
                {h.ocupantes.length === 0
                  ? <li className="hab-empty">Sin asignar</li>
                  : h.ocupantes.map(id => {
                      const j = jugadores.find(x => x.id === id)
                      if (!j) return null
                      return (
                        <li className="hab-ocupante" key={id}>
                          👤 {j.apellido}, {j.nombre}
                          {j.rol === 'comitiva' && <span style={{ color: 'var(--suave)', fontSize: '.8em' }}> · comitiva</span>}
                          <span className="hab-remove" onClick={() => quitar(h, id)}>✕</span>
                        </li>
                      )
                    })
                }
              </ul>
              {llena
                ? <div className="hab-llena">⚠ Habitación completa</div>
                : libres.length > 0 && (
                  <select className="hab-select" value="" onChange={e => asignar(h, Number(e.target.value))}>
                    <option value="">+ Agregar persona…</option>
                    {libres.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.apellido}, {j.nombre}{j.rol === 'comitiva' ? ' · comitiva' : ''}
                      </option>
                    ))}
                  </select>
                )
              }
            </div>
          )
        })}
      </div>
      <button className="btn-add" onClick={agregar}>+ Nueva habitación</button>
    </>
  )
}
