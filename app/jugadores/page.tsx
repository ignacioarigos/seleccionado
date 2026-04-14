'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { sb } from '@/lib/supabase'
import { soloJugadores, soloComitiva, fmtFecha, fmtTomoFolio, paymentState } from '@/lib/utils'
import type { Jugador } from '@/lib/types'

const TIPOS_PAGO = ['inscripcion', 'hotel', 'viaje'] as const

const EMPTY: Partial<Jugador> = {
  nombre: '', apellido: '', dni: '', fnac: null, tomo: '', folio: '',
  titulo: '', rol: 'jugador', transporte: 'none',
  doc_dni: false, doc_titulo: false, doc_apto: false, cargado: false,
}

export default function JugadoresPage() {
  const { jugadores, setJugadores, pagos, setPagos, showToast, setSyncState } = useStore()
  const [modal, setModal]   = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm]     = useState<Partial<Jugador>>(EMPTY)
  const [open, setOpen]     = useState<number | null>(null)
  const [printModal, setPrintModal] = useState(false)
  const [printFormato, setPrintFormato] = useState<'tabla' | 'lista'>('tabla')
  const [printFiltro, setPrintFiltro]   = useState<'todos' | 'falta' | 'completos'>('falta')

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
          doc_apto:   false,
          cargado:    false,
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

  const toggleDoc = async (j: Jugador, doc: 'dni' | 'titulo' | 'apto') => {
    // Si está cargado, los badges de docs están bloqueados
    if (j.cargado) return
    const campo = `doc_${doc}` as 'doc_dni' | 'doc_titulo' | 'doc_apto'
    const nuevo = !j[campo]
    setSyncState('syncing')
    try {
      const { error } = await sb.from('jugadores').update({ [campo]: nuevo }).eq('id', j.id)
      if (error) throw error
      setJugadores(jugadores.map(x => x.id === j.id ? { ...x, [campo]: nuevo } : x))
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const toggleCargado = async (j: Jugador) => {
    const nuevo = !j.cargado
    setSyncState('syncing')
    try {
      const { error } = await sb.from('jugadores').update({ cargado: nuevo }).eq('id', j.id)
      if (error) throw error
      setJugadores(jugadores.map(x => x.id === j.id ? { ...x, cargado: nuevo } : x))
      showToast(nuevo ? 'Marcado como cargado' : 'Desmarcado')
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const CardJugador = ({ j }: { j: Jugador }) => {
    const isOpen = open === j.id
    const dOk = j.doc_dni, tOk = j.doc_titulo, aOk = j.doc_apto
    const bloqueado = j.cargado

    // Estado de inscripción desde pagos (solo lectura)
    const estInscripcion = paymentState(pagos, j.id, 'inscripcion')
    const inscripcionPagada = estInscripcion === 'pagado'
    const inscripcionParcial = estInscripcion === 'parcial'

    return (
      <div className="card" style={bloqueado ? { opacity: 0.92, borderColor: 'var(--verde)' } : {}}>
        <div className="card-header">
          <div style={{ minWidth: 0 }}>
            <div className="card-nombre">
              {j.apellido}, {j.nombre}
              {(!dOk || !tOk || !aOk) && !bloqueado && (
                <span style={{ color: 'var(--amarillo)', fontSize: '.68em' }}> ⚠</span>
              )}
              {bloqueado && (
                <span style={{ color: 'var(--verde)', fontSize: '.62em', marginLeft: '5px', fontWeight: 700, letterSpacing: '.5px' }}>
                  ✓ CARGADO
                </span>
              )}
            </div>
            <div className="card-sub">
              {j.rol}{j.dni ? ' · ' + j.dni : ''}
            </div>
            {/* Estado de inscripción — solo lectura */}
            {inscripcionPagada && (
              <div style={{ fontSize: '.65em', color: 'var(--verde)', fontWeight: 600, marginTop: '2px' }}>
                ✓ Inscripción pagada
              </div>
            )}
            {inscripcionParcial && (
              <div style={{ fontSize: '.65em', color: 'var(--amarillo)', fontWeight: 600, marginTop: '2px' }}>
                ◑ Inscripción parcial
              </div>
            )}
            {!inscripcionPagada && !inscripcionParcial && (
              <div style={{ fontSize: '.65em', color: 'var(--rojo)', fontWeight: 600, marginTop: '2px' }}>
                ✗ Sin inscripción
              </div>
            )}
          </div>
          <div className="card-actions">
            <button className="btn-icon" onClick={() => setOpen(isOpen ? null : j.id)}>
              {isOpen ? 'Ocultar' : 'Ver'}
            </button>
            <button className="btn-icon" onClick={() => abrirModal(j)}>✏</button>
            <button className="btn-icon red" onClick={() => eliminar(j)}>✕</button>
          </div>
        </div>

        {/* Badges de docs */}
        <div className="doc-badges">
          <span
            className={`doc-badge ${dOk ? 'ok' : 'falta'}`}
            onClick={() => toggleDoc(j, 'dni')}
            style={bloqueado ? { cursor: 'default', opacity: 0.7 } : {}}
            title={bloqueado ? 'Bloqueado — jugador ya cargado en el torneo' : ''}
          >
            {dOk ? '✓' : '✗'} DNI
          </span>
          <span
            className={`doc-badge ${tOk ? 'ok' : 'falta'}`}
            onClick={() => toggleDoc(j, 'titulo')}
            style={bloqueado ? { cursor: 'default', opacity: 0.7 } : {}}
            title={bloqueado ? 'Bloqueado — jugador ya cargado en el torneo' : ''}
          >
            {tOk ? '✓' : '✗'} Título/Matr.
          </span>
          <span
            className={`doc-badge ${aOk ? 'ok' : 'falta'}`}
            onClick={() => toggleDoc(j, 'apto')}
            style={bloqueado ? { cursor: 'default', opacity: 0.7 } : {}}
            title={bloqueado ? 'Bloqueado — jugador ya cargado en el torneo' : ''}
          >
            {aOk ? '✓' : '✗'} Apto Méd.
          </span>

          {/* Toggle Cargado — siempre editable */}
          <span
            className={`doc-badge ${bloqueado ? 'ok' : 'falta'}`}
            onClick={() => toggleCargado(j)}
            style={{
              cursor: 'pointer',
              borderStyle: bloqueado ? 'solid' : 'dashed',
              opacity: 1,
              marginLeft: 'auto',
            }}
            title={bloqueado ? 'Cargado en el torneo — click para desmarcar' : 'Marcar como cargado en el torneo'}
          >
            {bloqueado ? '✓' : '○'} Cargado
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
