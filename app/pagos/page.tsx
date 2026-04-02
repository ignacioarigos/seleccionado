'use client'
import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import ChipGroup, { opcionesChip } from '@/components/ChipGroup'
import { soloJugadores, soloComitiva, paymentState, fmtPesos } from '@/lib/utils'
import { HOTEL_TOTAL, HOTEL_SENIA, LABELS, type TipoPago, type EstadoPago } from '@/lib/types'

type Filtro = 'todos' | TipoPago

export default function PagosPage() {
  const { jugadores, pagos, personasExtra, upsertPago, agregarPersonaExtra, quitarPersonaExtra, showToast, setSyncState } = useStore()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const setPagoLock = useRef(false)

  const jugs   = soloJugadores(jugadores)
  const com    = soloComitiva(jugadores)
  const extras = (ctx: 'hotel' | 'viaje') => personasExtra.filter(p => p.contexto === ctx)

  const handleSetPago = async (tipo: TipoPago, personaId: number | string, estado: EstadoPago) => {
    if (setPagoLock.current) return
    setPagoLock.current = true
    setTimeout(() => { setPagoLock.current = false }, 600)
    setSyncState('syncing')
    try { await upsertPago(personaId, tipo, estado); setSyncState('ok') }
    catch (e: any) { setSyncState('err'); showToast('Error: ' + e.message, 'err') }
  }

  const handleCycleTodos = (tipo: TipoPago, jId: number | string) => {
    const ops = opcionesChip(tipo)
    const cur = paymentState(pagos, jId, tipo)
    const next = ops[(ops.findIndex(o => o.val === cur) + 1) % ops.length].val
    handleSetPago(tipo, jId, next)
  }

  const imprimirPDF = () => {
    if (filtro === 'todos') return
    const titulo = filtro === 'inscripcion' ? 'Inscripción' : filtro === 'hotel' ? 'Hotel' : 'Transporte'
    const extras_list = filtro === 'hotel' ? extras('hotel') : filtro === 'viaje' ? extras('viaje') : []
    const personas = [
      ...jugs.map((j, i) => ({ num: i + 1, apellido: j.apellido, nombre: j.nombre, id: j.id, extra: false })),
      ...extras_list.map((p, ei) => ({ num: jugs.length + ei + 1, apellido: p.apellido, nombre: p.nombre, id: p.id, extra: true })),
    ]
    let totalRecaudado = 0
    const filas = personas.map(p => {
      const est = paymentState(pagos, p.id, filtro as TipoPago)
      const monto = filtro === 'hotel' ? (est === 'pagado' ? HOTEL_TOTAL : est === 'parcial' ? HOTEL_SENIA : 0) : null
      if (monto) totalRecaudado += monto
      const bg = est === 'pagado' ? '#dcfce7' : est === 'parcial' ? '#fef9c3' : est === 'noaplica' ? '#ffedd5' : '#fee2e2'
      const color = est === 'pagado' ? '#166534' : est === 'parcial' ? '#854d0e' : est === 'noaplica' ? '#7c2d12' : '#991b1b'
      return `<tr${p.extra ? ' style="background:#fffbeb"' : ''}>
        <td style="color:#9ca3af;width:24px">${p.num}</td>
        <td><strong>${p.apellido}</strong></td><td>${p.nombre}</td>
        <td><span style="background:${bg};color:${color};padding:2px 8px;border-radius:10px;font-weight:700;font-size:10px">${LABELS[est]}</span></td>
        ${filtro === 'hotel' ? `<td style="text-align:right">${monto ? '$' + monto.toLocaleString('es-AR') : ''}</td>` : ''}
      </tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Pagos ${titulo}</title>
      <style>body{font-family:Arial;font-size:11px;margin:20px}table{width:100%;border-collapse:collapse}
      th{background:#1a1a1a;color:#fff;padding:7px;text-align:left;font-size:10px;text-transform:uppercase}
      td{padding:6px 8px;border-bottom:1px solid #e5e7eb}</style></head>
      <body><h2>⚽ Catamarca 2026 — ${titulo}</h2>
      <p style="font-size:10px;color:#666;margin-bottom:14px">29 Abr – 3 May 2026 · ${personas.length} personas</p>
      <table><thead><tr><th>#</th><th>Apellido</th><th>Nombre</th><th>Estado</th>
      ${filtro === 'hotel' ? '<th style="text-align:right">Monto</th>' : ''}</tr></thead>
      <tbody>${filas}</tbody>
      ${filtro === 'hotel' ? `<tfoot><tr style="background:#f0fdf4"><td colspan="4" style="text-align:right;font-weight:700;padding:7px">Total recaudado</td>
      <td style="text-align:right;font-weight:700;padding:7px">$${totalRecaudado.toLocaleString('es-AR')}</td></tr></tfoot>` : ''}
      </table></body></html>`
    const win = window.open('', '_blank')!
    win.document.write(html); win.document.close(); win.focus()
    setTimeout(() => win.print(), 400)
  }

  const PagoRow = ({ j, tipo, badge }: { j: { id: number | string; apellido: string; nombre: string }, tipo: TipoPago, badge?: React.ReactNode }) => (
    <div className="pago-row">
      <div className="pago-nombre">
        {j.apellido}, {j.nombre}{badge}
      </div>
      <ChipGroup tipo={tipo} personaId={j.id} estadoActual={paymentState(pagos, j.id, tipo)} opciones={opcionesChip(tipo)} onSelect={handleSetPago} />
    </div>
  )

  const ExtraRow = ({ p, tipo }: { p: { id: string; apellido: string; nombre: string }, tipo: 'hotel' | 'viaje' }) => (
    <div className="pago-row">
      <div className="pago-nombre">
        {p.apellido}, {p.nombre}
        <span className="pago-sub" style={{ color: 'var(--naranja)' }}>extra</span>
      </div>
      <ChipGroup tipo={tipo} personaId={p.id} estadoActual={paymentState(pagos, p.id, tipo)} opciones={opcionesChip(tipo)} onSelect={handleSetPago} />
      <span onClick={() => quitarPersonaExtra(p.id)} style={{ color: 'var(--rojo)', cursor: 'pointer', fontSize: '.75em', padding: '2px 5px', border: '1px solid var(--rojo)', borderRadius: '4px', flexShrink: 0 }}>✕</span>
    </div>
  )

  const InlineAdd = ({ ctx }: { ctx: 'hotel' | 'viaje' }) => {
    const [nom, setNom] = useState(''); const [ape, setApe] = useState('')
    const add = async () => {
      if (!nom && !ape) { showToast('Ingresá al menos un nombre', 'err'); return }
      await agregarPersonaExtra(ctx, nom, ape)
      setNom(''); setApe('')
    }
    return (
      <div className="inline-add">
        <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nombre" />
        <input value={ape} onChange={e => setApe(e.target.value)} placeholder="Apellido" />
        <button className="btn-inline" onClick={add}>+ Agregar</button>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '11px', flexWrap: 'wrap', gap: '7px' }}>
        <div className="pago-tipos">
          {(['todos', 'inscripcion', 'hotel', 'viaje'] as Filtro[]).map(f => (
            <button key={f} className={`pago-tipo-btn ${filtro === f ? 'active' : ''}`} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : f === 'inscripcion' ? 'Inscripción' : f === 'hotel' ? 'Hotel' : 'Transporte'}
            </button>
          ))}
        </div>
        {filtro !== 'todos' && <button className="btn-primary" onClick={imprimirPDF}>🖨 PDF</button>}
      </div>

      <div className="card">
        {/* TODOS */}
        {filtro === 'todos' && (
          <>
            <div className="todos-grid">
              <div /><div style={{ fontSize: '.6em', color: 'var(--suave)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Jugador</div>
              {['INS', 'HOT', 'VIA'].map(h => <div key={h} style={{ fontSize: '.58em', color: 'var(--suave)', textAlign: 'center', fontWeight: 700 }}>{h}</div>)}
              {jugs.map((j, i) => {
                const eI = paymentState(pagos, j.id, 'inscripcion')
                const eH = paymentState(pagos, j.id, 'hotel')
                const eV = paymentState(pagos, j.id, 'viaje')
                const Cdot = ({ e, t }: { e: EstadoPago, t: TipoPago }) => (
                  <div className={`cdot ${e}`} onClick={() => handleCycleTodos(t, j.id)} title={LABELS[e]}>
                    {e === 'pagado' ? '✓' : e === 'parcial' ? '◑' : e === 'noaplica' ? '—' : '✗'}
                  </div>
                )
                return [
                  <div key={`n${j.id}`} style={{ fontSize: '.72em', color: 'var(--suave)' }}>{i + 1}</div>,
                  <div key={`nm${j.id}`} style={{ fontSize: '.82em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.apellido}, {j.nombre}</div>,
                  <Cdot key={`i${j.id}`} e={eI} t="inscripcion" />,
                  <Cdot key={`h${j.id}`} e={eH} t="hotel" />,
                  <Cdot key={`v${j.id}`} e={eV} t="viaje" />,
                ]
              })}
              {com.length > 0 && (
                <div style={{ gridColumn: '1/-1', fontSize: '.58em', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--amarillo)', padding: '6px 0 2px', borderTop: '1px solid var(--borde)', marginTop: '2px' }}>
                  Comitiva
                </div>
              )}
              {com.map((j, i) => {
                const eH = paymentState(pagos, j.id, 'hotel')
                const eV = paymentState(pagos, j.id, 'viaje')
                const Cdot = ({ e, t }: { e: EstadoPago, t: TipoPago }) => (
                  <div className={`cdot ${e}`} onClick={() => handleCycleTodos(t, j.id)} title={LABELS[e]}>
                    {e === 'pagado' ? '✓' : e === 'parcial' ? '◑' : e === 'noaplica' ? '—' : '✗'}
                  </div>
                )
                return [
                  <div key={`cn${j.id}`} style={{ fontSize: '.72em', color: 'var(--suave)' }}>{jugs.length + i + 1}</div>,
                  <div key={`cnm${j.id}`} style={{ fontSize: '.82em', fontWeight: 600, color: 'var(--amarillo)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.apellido}, {j.nombre}</div>,
                  <div key={`ci${j.id}`} style={{ width: '30px', height: '30px' }} />,
                  <Cdot key={`ch${j.id}`} e={eH} t="hotel" />,
                  <Cdot key={`cv${j.id}`} e={eV} t="viaje" />,
                ]
              })}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--borde)', marginTop: '8px' }}>
              {(['pagado', 'parcial', 'debe', 'noaplica'] as EstadoPago[]).map(e => (
                <div key={e} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '.65em', color: 'var(--suave)' }}>
                  <div className={`cdot ${e}`} style={{ width: '14px', height: '14px', borderRadius: '4px', cursor: 'default' }} />
                  {LABELS[e]}
                </div>
              ))}
            </div>
          </>
        )}

        {/* INSCRIPCIÓN */}
        {filtro === 'inscripcion' && (
          <>
            <div className="lista-seccion">Jugadores <span>{jugs.length}</span></div>
            {jugs.map(j => <PagoRow key={j.id} j={j} tipo="inscripcion" />)}
          </>
        )}

        {/* HOTEL */}
        {filtro === 'hotel' && (() => {
          const personas = [...jugs, ...com, ...extras('hotel')]
          let recaudado = 0
          personas.forEach(p => {
            const e = paymentState(pagos, p.id, 'hotel')
            if (e === 'pagado') recaudado += HOTEL_TOTAL
            if (e === 'parcial') recaudado += HOTEL_SENIA
          })
          const totalEsp = personas.length * HOTEL_TOTAL
          const pct = totalEsp ? Math.round(recaudado / totalEsp * 100) : 0
          return (
            <>
              <div className="lista-seccion">Jugadores <span>{jugs.length}</span></div>
              {jugs.map(j => <PagoRow key={j.id} j={j} tipo="hotel" />)}
              {com.length > 0 && <>
                <div className="lista-seccion" style={{ color: 'var(--amarillo)' }}>Comitiva <span>{com.length}</span></div>
                {com.map(j => <PagoRow key={j.id} j={j} tipo="hotel" badge={<span className="pago-sub" style={{ color: 'var(--amarillo)' }}>comitiva</span>} />)}
              </>}
              {extras('hotel').length > 0 && <>
                <div className="lista-seccion" style={{ color: 'var(--naranja)' }}>Extras hotel <span>{extras('hotel').length}</span></div>
                {extras('hotel').map(p => <ExtraRow key={p.id} p={p} tipo="hotel" />)}
              </>}
              <InlineAdd ctx="hotel" />
              <div className="hotel-totales">
                <div className="hotel-tot-row">
                  <span style={{ color: 'var(--suave)' }}>Recaudado</span>
                  <span className="hotel-monto" style={{ color: 'var(--verde)' }}>{fmtPesos(recaudado)}</span>
                </div>
                <div className="bar-track" style={{ margin: '6px 0' }}><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                <div className="hotel-tot-row" style={{ fontSize: '.7em' }}>
                  <span style={{ color: 'var(--suave)' }}>Seña {fmtPesos(HOTEL_SENIA)} · Total {fmtPesos(HOTEL_TOTAL)} p/p · {personas.length} personas</span>
                  <span style={{ fontWeight: 700 }}>{fmtPesos(Math.max(0, totalEsp - recaudado))} faltante</span>
                </div>
              </div>
            </>
          )
        })()}

        {/* VIAJE */}
        {filtro === 'viaje' && (
          <>
            <div className="lista-seccion">Jugadores <span>{jugs.length}</span></div>
            {jugs.map(j => {
              const tBadge = j.transporte === 'avion'
                ? <span style={{ fontSize: '.6em', color: 'var(--verde)', fontWeight: 700, flexShrink: 0, marginLeft: '4px' }}>✈️</span>
                : j.transporte === 'propio'
                ? <span style={{ fontSize: '.6em', color: 'var(--naranja)', fontWeight: 700, flexShrink: 0, marginLeft: '4px' }}>🚗</span>
                : <span style={{ fontSize: '.6em', color: 'var(--suave)', flexShrink: 0, marginLeft: '4px' }}>?</span>
              return <PagoRow key={j.id} j={j} tipo="viaje" badge={tBadge} />
            })}
            {com.length > 0 && <>
              <div className="lista-seccion" style={{ color: 'var(--amarillo)' }}>Comitiva <span>{com.length}</span></div>
              {com.map(j => <PagoRow key={j.id} j={j} tipo="viaje" badge={<span className="pago-sub" style={{ color: 'var(--amarillo)' }}>comitiva</span>} />)}
            </>}
            {extras('viaje').length > 0 && <>
              <div className="lista-seccion" style={{ color: 'var(--naranja)' }}>Extras viaje <span>{extras('viaje').length}</span></div>
              {extras('viaje').map(p => <ExtraRow key={p.id} p={p} tipo="viaje" />)}
            </>}
            <InlineAdd ctx="viaje" />
          </>
        )}
      </div>
    </>
  )
}
