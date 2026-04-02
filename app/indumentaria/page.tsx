'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { sb } from '@/lib/supabase'
import { soloJugadores } from '@/lib/utils'
import { TALLES, type FilaIndumentaria } from '@/lib/types'

const NUMS = Array.from({ length: 39 }, (_, i) => i + 1)

export default function IndumentariaPage() {
  const { jugadores, indumentaria, setIndumentaria, showToast, setSyncState } = useStore()
  const jugs    = soloJugadores(jugadores)
  const extras  = indumentaria.filter(r => r.es_extra)
  const debRef  = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Form extras
  const [enombre, setEnombre] = useState('')
  const [eapellido, setEapellido] = useState('')
  const [enro, setEnro]       = useState('')
  const [etalleR, setEtalleR] = useState('')
  const [etalleP, setEtalleP] = useState('')
  const [ecamiseta, setEcamiseta] = useState('')

  const getRow = (jId: number) => indumentaria.find(r => r.jugador_id === jId && !r.es_extra)

  const nrosUsados = (excluirId: number | string | null) =>
    new Set(indumentaria.filter(r => r.nro_remera && String(r.id) !== String(excluirId)).map(r => String(r.nro_remera)))

  const saveField = async (rowId: number | string, campo: string, valor: string | number | null) => {
    setSyncState('syncing')
    try {
      const { error } = await sb.from('indumentaria').update({ [campo]: valor || null }).eq('id', rowId)
      if (error) throw error
      setIndumentaria(indumentaria.map(r => String(r.id) === String(rowId) ? { ...r, [campo]: valor || null } : r))
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const debounce = (rowId: number | string, campo: string, valor: string) => {
    const key = `${rowId}_${campo}`
    clearTimeout(debRef.current[key])
    debRef.current[key] = setTimeout(() => saveField(rowId, campo, valor), 900)
  }

  const handleChange = async (rowId: number | string | null, jId: number | null, campo: string, valor: string) => {
    if (!rowId && jId) {
      // Create row first
      setSyncState('syncing')
      try {
        const { data, error } = await sb.from('indumentaria').insert({
          jugador_id: jId, es_extra: false, [campo]: valor || null,
          nombre_extra: null, apellido_extra: null, nro_remera: null,
          talle_remera: null, talle_pantalon: null, nombre_camiseta: null,
        }).select().single()
        if (error) throw error
        setIndumentaria([...indumentaria, data as FilaIndumentaria])
        setSyncState('ok')
      } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
      return
    }
    if (!rowId) return
    // Update local immediately for text fields
    setIndumentaria(indumentaria.map(r => String(r.id) === String(rowId) ? { ...r, [campo]: valor || null } : r))
    if (campo === 'nombre_camiseta') debounce(rowId, campo, valor)
    else saveField(rowId, campo, valor)
  }

  const agregarExtra = async () => {
    if (!enombre && !eapellido) { showToast('Ingresá al menos nombre o apellido', 'err'); return }
    setSyncState('syncing')
    try {
      const { data, error } = await sb.from('indumentaria').insert({
        es_extra: true,
        nombre_extra: enombre || null,
        apellido_extra: eapellido || null,
        nro_remera: enro ? Number(enro) : null,
        talle_remera: etalleR || null,
        talle_pantalon: etalleP || null,
        nombre_camiseta: ecamiseta || null,
        jugador_id: null,
      }).select().single()
      if (error) throw error
      setIndumentaria([...indumentaria, data as FilaIndumentaria])
      setEnombre(''); setEapellido(''); setEnro(''); setEtalleR(''); setEtalleP(''); setEcamiseta('')
      showToast('Persona agregada')
      setSyncState('ok')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const eliminarExtra = async (rowId: number | string) => {
    if (!confirm('¿Quitar esta persona?')) return
    setSyncState('syncing')
    try {
      await sb.from('indumentaria').delete().eq('id', rowId)
      setIndumentaria(indumentaria.filter(r => String(r.id) !== String(rowId)))
      setSyncState('ok'); showToast('Eliminado')
    } catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const imprimir = () => {
    const todas = [
      ...jugs.map((j, i) => {
        const r = getRow(j.id)
        return { num: i + 1, apellido: j.apellido, nombre: j.nombre, nro: r?.nro_remera || '', talleR: r?.talle_remera || '', talleP: r?.talle_pantalon || '', camiseta: r?.nombre_camiseta || '', extra: false }
      }),
      ...extras.map((r, ei) => ({ num: jugs.length + ei + 1, apellido: r.apellido_extra || '', nombre: r.nombre_extra || '', nro: r.nro_remera || '', talleR: r.talle_remera || '', talleP: r.talle_pantalon || '', camiseta: r.nombre_camiseta || '', extra: true }))
    ]
    const filas = todas.map(p => `<tr${p.extra ? ' style="background:#fff8ee"' : ''}><td>${p.num}</td><td><strong>${p.apellido}</strong></td><td>${p.nombre}</td><td style="text-align:center">${p.nro || '—'}</td><td style="text-align:center">${p.talleR || '—'}</td><td style="text-align:center">${p.talleP || '—'}</td><td>${p.camiseta || '—'}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Indumentaria</title><style>body{font-family:Arial;font-size:11px;margin:20px}table{width:100%;border-collapse:collapse}th{background:#222;color:#fff;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase}td{padding:5px 8px;border-bottom:1px solid #ddd}</style></head><body><h2>⚽ Catamarca 2026 — Indumentaria</h2><p style="font-size:10px;color:#666;margin-bottom:12px">29 Abr – 3 May 2026 · ${todas.length} personas</p><table><thead><tr><th>#</th><th>Apellido</th><th>Nombre</th><th>N° Remera</th><th>T. Remera</th><th>T. Pantalón</th><th>Nombre camiseta</th></tr></thead><tbody>${filas}</tbody></table></body></html>`
    const win = window.open('', '_blank')!
    win.document.write(html); win.document.close(); win.focus()
    setTimeout(() => win.print(), 400)
  }

  const conNro    = indumentaria.filter(r => r.nro_remera).length
  const conTalle  = indumentaria.filter(r => r.talle_remera).length
  const total     = jugs.length + extras.length

  return (
    <>
      <div className="indu-header">
        <div className="sec-title" style={{ margin: 0 }}>👕 Indumentaria</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="indu-stats">
            <div className="indu-stat">N° asignados: <b>{conNro}/{total}</b></div>
            <div className="indu-stat">Talles: <b>{conTalle}/{total}</b></div>
          </div>
          <button className="btn-primary" onClick={imprimir}>🖨 PDF</button>
        </div>
      </div>

      <div className="indu-table-wrap">
        <table className="indu-table">
          <thead>
            <tr><th>#</th><th>Jugador</th><th>N° Remera</th><th>Talle Remera</th><th>Talle Pantalón</th><th>Nombre camiseta</th></tr>
          </thead>
          <tbody>
            {jugs.length > 0 && (
              <>
                <tr><td colSpan={6} className="indu-extra-header">⚽ Jugadores ({jugs.length})</td></tr>
                {jugs.map((j, i) => {
                  const row  = getRow(j.id)
                  const rid  = row?.id ?? null
                  const usados = nrosUsados(rid)
                  return (
                    <tr key={j.id}>
                      <td className="num-col">{i + 1}</td>
                      <td className="indu-nombre-cell">{j.apellido}<span className="indu-sub">{j.nombre}</span></td>
                      <td>
                        <select className={`indu-select ${row?.nro_remera ? 'filled' : ''}`} value={row?.nro_remera || ''} onChange={e => handleChange(rid, j.id, 'nro_remera', e.target.value)}>
                          <option value="">—</option>
                          {NUMS.filter(n => !usados.has(String(n)) || String(n) === String(row?.nro_remera)).map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className={`indu-select ${row?.talle_remera ? 'filled' : ''}`} value={row?.talle_remera || ''} onChange={e => handleChange(rid, j.id, 'talle_remera', e.target.value)}>
                          <option value="">—</option>
                          {TALLES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className={`indu-select ${row?.talle_pantalon ? 'filled' : ''}`} value={row?.talle_pantalon || ''} onChange={e => handleChange(rid, j.id, 'talle_pantalon', e.target.value)}>
                          <option value="">—</option>
                          {TALLES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td>
                        <input className={`indu-text ${row?.nombre_camiseta ? 'filled' : ''}`} type="text" placeholder="APELLIDO" defaultValue={row?.nombre_camiseta || ''} onChange={e => handleChange(rid, j.id, 'nombre_camiseta', e.target.value)} />
                      </td>
                    </tr>
                  )
                })}
              </>
            )}
            {extras.length > 0 && (
              <>
                <tr><td colSpan={6} className="indu-extra-header" style={{ color: 'var(--naranja)' }}>➕ Extras ({extras.length})</td></tr>
                {extras.map((r, ei) => {
                  const usados = nrosUsados(r.id)
                  const nombre = [r.apellido_extra, r.nombre_extra].filter(Boolean).join(', ')
                  return (
                    <tr key={r.id} className="indu-extra-row">
                      <td className="num-col">{jugs.length + ei + 1}</td>
                      <td className="indu-nombre-cell">{nombre || <span style={{ color: 'var(--suave)', fontStyle: 'italic' }}>Sin nombre</span>}<span className="indu-sub" style={{ color: 'var(--naranja)' }}>extra</span></td>
                      <td>
                        <select className={`indu-select ${r.nro_remera ? 'filled' : ''}`} value={r.nro_remera || ''} onChange={e => handleChange(r.id, null, 'nro_remera', e.target.value)}>
                          <option value="">—</option>
                          {NUMS.filter(n => !usados.has(String(n)) || String(n) === String(r.nro_remera)).map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className={`indu-select ${r.talle_remera ? 'filled' : ''}`} value={r.talle_remera || ''} onChange={e => handleChange(r.id, null, 'talle_remera', e.target.value)}>
                          <option value="">—</option>
                          {TALLES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className={`indu-select ${r.talle_pantalon ? 'filled' : ''}`} value={r.talle_pantalon || ''} onChange={e => handleChange(r.id, null, 'talle_pantalon', e.target.value)}>
                          <option value="">—</option>
                          {TALLES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <input className={`indu-text ${r.nombre_camiseta ? 'filled' : ''}`} type="text" placeholder="APELLIDO" defaultValue={r.nombre_camiseta || ''} onChange={e => handleChange(r.id, null, 'nombre_camiseta', e.target.value)} style={{ flex: 1 }} />
                        <button className="hab-remove" onClick={() => eliminarExtra(r.id)}>✕</button>
                      </td>
                    </tr>
                  )
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Agregar extra */}
      <div className="indu-extra-add">
        <div className="indu-extra-add-title">+ Agregar persona a esta lista</div>
        <div style={{ fontSize: '.72em', color: 'var(--suave)', marginBottom: '10px' }}>Para árbitros, comitiva adicional, etc.</div>
        <div className="indu-add-form">
          <div><label className="indu-add-label">Nombre *</label><input className="indu-add-input" value={enombre} onChange={e => setEnombre(e.target.value)} placeholder="Juan" /></div>
          <div><label className="indu-add-label">Apellido *</label><input className="indu-add-input" value={eapellido} onChange={e => setEapellido(e.target.value)} placeholder="Pérez" /></div>
          <div>
            <label className="indu-add-label">N° Remera</label>
            <select className="indu-add-select" value={enro} onChange={e => setEnro(e.target.value)}>
              <option value="">Sin número</option>
              {NUMS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="indu-add-label">Talle Remera</label>
            <select className="indu-add-select" value={etalleR} onChange={e => setEtalleR(e.target.value)}>
              <option value="">Sin definir</option>
              {TALLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="indu-add-label">Talle Pantalón</label>
            <select className="indu-add-select" value={etalleP} onChange={e => setEtalleP(e.target.value)}>
              <option value="">Sin definir</option>
              {TALLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="indu-add-label">Nombre en camiseta</label><input className="indu-add-input" value={ecamiseta} onChange={e => setEcamiseta(e.target.value)} placeholder="PÉREZ" /></div>
          <div style={{ gridColumn: '1/-1' }}>
            <button className="btn-primary violeta" onClick={agregarExtra}>Agregar</button>
          </div>
        </div>
      </div>
    </>
  )
}
