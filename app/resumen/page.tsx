'use client'
import { useStore } from '@/lib/store'
import { soloJugadores, soloComitiva, paymentState, fmtPesos } from '@/lib/utils'
import { TLABELS, type TipoPago } from '@/lib/types'

const TIPOS: TipoPago[] = ['inscripcion', 'hotel', 'viaje']

export default function ResumenPage() {
  const { jugadores, pagos } = useStore()
  const jugs = soloJugadores(jugadores)
  const com  = soloComitiva(jugadores)

  const docOk        = jugs.filter(j => j.doc_dni && j.doc_titulo).length
  const conAvion     = jugs.filter(j => j.transporte === 'avion').length
  const porSuCuenta  = jugs.filter(j => j.transporte === 'propio').length
  const sinDefinir   = jugs.filter(j => !j.transporte || j.transporte === 'none').length

  return (
    <>
      {/* Totales */}
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dash-num" style={{ color: 'var(--azul)' }}>{jugs.length}</div>
          <div className="dash-label">Jugadores</div>
        </div>
        <div className="dash-card">
          <div className="dash-num" style={{ color: 'var(--amarillo)' }}>{com.length}</div>
          <div className="dash-label">Comitiva</div>
        </div>
        <div className="dash-card">
          <div className="dash-num" style={{ color: 'var(--verde)' }}>{docOk}/{jugs.length}</div>
          <div className="dash-label">Docs OK</div>
        </div>
      </div>

      <div className="sec-title">Estado de pagos</div>

      {/* Transporte */}
      <div className="pago-bar-wrap">
        <div className="pago-bar-header">
          <div className="pago-bar-label">Transporte jugadores</div>
        </div>
        <div className="pago-bar-sub">
          <span>✈️ Avión: <b style={{ color: 'var(--verde)' }}>{conAvion}</b></span>
          <span>🚗 Por su cuenta: <b style={{ color: 'var(--naranja)' }}>{porSuCuenta}</b></span>
          <span>❓ Sin definir: <b style={{ color: 'var(--suave)' }}>{sinDefinir}</b></span>
        </div>
      </div>

      {/* Barras por tipo */}
      {TIPOS.map(tipo => {
        let nP = 0, nPar = 0, nD = 0, nNA = 0, tot = 0
        jugs.forEach(j => {
          const e = paymentState(pagos, j.id, tipo)
          if (e === 'noaplica') { nNA++; return }
          tot++
          if (e === 'pagado') nP++
          else if (e === 'parcial') nPar++
          else nD++
        })
        const pct = tot ? Math.round(nP / tot * 100) : 0
        return (
          <div className="pago-bar-wrap" key={tipo}>
            <div className="pago-bar-header">
              <div className="pago-bar-label">{TLABELS[tipo]}</div>
              <div className="pago-bar-pct">{pct}% al día</div>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="pago-bar-sub">
              <span>✓ Pagado: <b style={{ color: 'var(--verde)' }}>{nP}</b></span>
              <span>◑ Parcial: <b style={{ color: 'var(--amarillo)' }}>{nPar}</b></span>
              <span>✗ Debe: <b style={{ color: 'var(--rojo)' }}>{nD}</b></span>
              {nNA > 0 && <span>— No aplica: <b>{nNA}</b></span>}
            </div>
          </div>
        )
      })}
    </>
  )
}
