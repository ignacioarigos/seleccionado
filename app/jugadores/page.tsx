'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { sb } from '@/lib/supabase'
import { soloJugadores, soloComitiva, fmtFecha, fmtTomoFolio } from '@/lib/utils'
import type { Jugador } from '@/lib/types'

const TIPOS_PAGO = ['inscripcion', 'hotel', 'viaje'] as const

const EMPTY: Partial<Jugador> = {
  nombre: '', apellido: '', dni: '', fnac: null, tomo: '', folio: '',
  titulo: '', rol: 'jugador', transporte: 'none', doc_dni: false, doc_titulo: false,
}

export default function JugadoresPage() {
  const { jugadores, setJugadores, pagos, setPagos, showToast, setSyncState } = useStore()
  const [modal, setModal]   = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm]     = useState<Partial<Jugador>>(EMPTY)
  const [open, setOpen]     = useState<number | null>(null)

  const jugs = soloJugadores(jugadores)
  const com  = soloComitiva(jugadores)

  const abrirModal = (j?: Jugador) => {
    setForm(j ? { ...j } : { ...EMPTY })
    setEditId(j?.id ?? null)
    setModal(true)
  }

  const guardar = async () => {
  if (!form.nombre?.trim() || !form.apellido?.trim()) { alert('Nombre y apellido son obligatorios'); return }
  setSyncState('syncing')
  try {
    if (editId !== null) {
      const datosUpdate: Record<string, any> = {
        nombre:   form.nombre?.trim() || '',
        apellido: form.apellido?.trim() || '',
        dni:      form.dni?.trim() || '',
        fnac:     form.fnac || null,
        tomo:     form.tomo?.trim() || '',
        folio:    form.folio?.trim() || '',
        titulo:   form.titulo?.trim() || '',
        rol:      form.rol || 'jugador',
      }
      const { error } = await sb.from('jugadores').update(datosUpdate).eq('id', editId)
      if (error) throw error
      setJugadores(jugadores.map(j => j.id === editId ? { ...j, ...datosUpdate } as Jugador : j))
      showToast('Jugador actualizado')
    } else {
      const datos: Record<string, any> = {
        nombre:     form.nombre?.trim() || '',
        apellido:   form.apellido?.trim() || '',
        dni:        form.dni?.trim() || '',
        fnac:       form.fnac || null,
        tomo:       form.tomo?.trim() || '',
        folio:      form.folio?.trim() || '',
        titulo:     form.titulo?.trim() || '',
        rol:        form.rol || 'jugador',
        transporte: 'none',
        doc_dni:    false,
        doc_titulo: false,
      }
      const { data: inserted, error } = await sb.from('jugadores').insert(datos).select().single()
      if (error) throw error
      const nuevoId = inserted.id
      await sb.from('pagos').upsert(
        TIPOS_PAGO.map(t => ({ jugador_id: nuevoId, tipo: t, estado: 'debe' })),
        { onConflict: 'jugador_id,tipo' }
      )
      setJugadores([...jugadores, inserted as Jugador])
      setPagos([...pagos, ...TIPOS_PAGO.map(t => ({ jugador_id: nuevoId, tipo: t as any, estado: 'debe' as any }))])
      showToast('Jugador agregado')
    }
    setSyncState('ok')
    setModal(false)
  } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
}

  const eliminar = async (j: Jugador) => {
    if (!confirm(`¿Eliminar a ${j.nombre} ${j.apellido}?`)) return
    setSyncState('syncing')
    try {
      const { error } = await sb.from('jugadores').delete().eq('id', j.id)
      if (error) throw error
      setJugadores(jugadores.filter(x => x.id !== j.id))
      setPagos(pagos.filter(p => p.jugador_id !== j.id))
      showToast('Eliminado')
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const toggleDoc = async (j: Jugador, doc: 'dni' | 'titulo') => {
    const campo = `doc_${doc}` as 'doc_dni' | 'doc_titulo'
    const nuevo = !j[campo]
    setSyncState('syncing')
    try {
      const { error } = await sb.from('jugadores').update({ [campo]: nuevo }).eq('id', j.id)
      if (error) throw error
      setJugadores(jugadores.map(x => x.id === j.id ? { ...x, [campo]: nuevo } : x))
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const CardJugador = ({ j }: { j: Jugador }) => {
    const isOpen = open === j.id
    const dOk = j.doc_dni, tOk = j.doc_titulo
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-nombre">
              {j.apellido}, {j.nombre}
              {(!dOk || !tOk) && <span style={{ color: 'var(--amarillo)', fontSize: '.68em' }}> ⚠</span>}
            </div>
            <div className="card-sub">{j.rol}{j.dni ? ' · ' + j.dni : ''}</div>
          </div>
          <div className="card-actions">
            <button className="btn-icon" onClick={() => setOpen(isOpen ? null : j.id)}>
              {isOpen ? 'Ocultar' : 'Ver'}
            </button>
            <button className="btn-icon" onClick={() => abrirModal(j)}>✏</button>
            <button className="btn-icon red" onClick={() => eliminar(j)}>✕</button>
          </div>
        </div>
        <div className="doc-badges">
          <span className={`doc-badge ${dOk ? 'ok' : 'falta'}`} onClick={() => toggleDoc(j, 'dni')}>
            {dOk ? '✓' : '✗'} DNI
          </span>
          <span className={`doc-badge ${tOk ? 'ok' : 'falta'}`} onClick={() => toggleDoc(j, 'titulo')}>
            {tOk ? '✓' : '✗'} Título/Matr.
          </span>
        </div>
        {isOpen && (
          <div className="card-detail open">
            <div className="detail-grid">
              <div className="detail-item"><label>F. Nac.</label><span>{fmtFecha(j.fnac)}</span></div>
              <div className="detail-item"><label>DNI</label><span>{j.dni || '—'}</span></div>
              <div className="detail-item full"><label>T° y F°</label><span>{fmtTomoFolio(j)}</span></div>
              {j.titulo && <div className="detail-item full"><label>Profesión</label><span>{j.titulo}</span></div>}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {jugs.length > 0 && (
        <>
          <div className="sec-title">Jugadores ({jugs.length})</div>
          {jugs.map(j => <CardJugador key={j.id} j={j} />)}
        </>
      )}
      {com.length > 0 && (
        <>
          <div className="sec-title">Comitiva ({com.length})</div>
          {com.map(j => <CardJugador key={j.id} j={j} />)}
        </>
      )}
      <button className="btn-add" onClick={() => abrirModal()}>+ Agregar jugador</button>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div className="modal">
            <div className="modal-title">{editId !== null ? 'Editar jugador' : 'Nuevo jugador'}</div>
            <div className="modal-grid">
              {(['nombre', 'apellido'] as const).map(f => (
                <div className="modal-field" key={f}>
                  <label>{f.charAt(0).toUpperCase() + f.slice(1)} *</label>
                  <input value={form[f] || ''} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                </div>
              ))}
              <div className="modal-field"><label>DNI</label>
                <input value={form.dni || ''} onChange={e => setForm(p => ({ ...p, dni: e.target.value }))} />
              </div>
              <div className="modal-field"><label>F. Nacimiento</label>
                <input type="date" value={form.fnac || ''} onChange={e => setForm(p => ({ ...p, fnac: e.target.value || null }))} />
              </div>
              <div className="modal-field"><label>Tomo</label>
                <input value={form.tomo || ''} onChange={e => setForm(p => ({ ...p, tomo: e.target.value }))} />
              </div>
              <div className="modal-field"><label>Folio</label>
                <input value={form.folio || ''} onChange={e => setForm(p => ({ ...p, folio: e.target.value }))} />
              </div>
              <div className="modal-field full"><label>Profesión / Título / Matrícula</label>
                <input value={form.titulo || ''} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
              </div>
              <div className="modal-field full"><label>Rol</label>
                <select value={form.rol || 'jugador'} onChange={e => setForm(p => ({ ...p, rol: e.target.value as any }))}>
                  <option value="jugador">Jugador</option>
                  <option value="comitiva">Comitiva</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={guardar}>Guardar</button>
              <button className="btn-cancel" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
