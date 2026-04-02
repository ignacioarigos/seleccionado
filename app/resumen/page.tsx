'use client'
import { useStore } from '@/lib/store'
import { soloJugadores, soloComitiva, paymentState, fmtPesos } from '@/lib/utils'
import { HOTEL_TOTAL, HOTEL_SENIA, TLABELS, type TipoPago } from '@/lib/types'

const TIPOS: TipoPago[] = ['inscripcion', 'hotel', 'viaje']

export default function ResumenPage() {
  const { jugadores, pagos, personasExtra } = useStore()
  const jugs = soloJugadores(jugadores)
  const com  = soloComitiva(jugadores)

  const docOk       = jugs.filter(j => j.doc_dni && j.doc_titulo).length
  const conAvion    = jugs.filter(j => j.transporte === 'avion').length
  const porSuCuenta = jugs.filter(j => j.transporte === 'propio').length
  const sinDefinir  = jugs.filter(j => !j.transporte || j.transporte === 'none').length

  // Hotel: calcular seña y total por separado
  const extrasHotel   = personasExtra.filter(p => p.contexto === 'hotel')
  const todasHotel    = [...jugs, ...com, ...extrasHotel]
  const nHotelPagado  = todasHotel.filter(p => paymentState(pagos, p.id, 'hotel') === 'pagado').length
  const nHotelSenia   = todasHotel.filter(p => paymentState(pagos, p.id, 'hotel') === 'parcial').length
  const nHotelDebe    = todasHotel.filter(p => paymentState(pagos, p.id, 'hotel') === 'debe').length
  const totalHotel    = todasHotel.length
  const recaudadoSenia  = nHotelSenia * HOTEL_SENIA + nHotelPagado * HOTEL_TOTAL
  const esperadoTotal   = totalHotel * HOTEL_TOTAL
  const pctSenia        = totalHotel ? Math.round(nHotelSenia / totalHotel * 100) : 0
  const pctTotal        = totalHotel ? Math.round(nHotelPagado / totalHotel * 100) : 0

  return (
    <>
      {/* Cards superiores */}
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

      {/* Inscripción */}
      {(() => {
        let nP = 0, nD = 0
        jugs.forEach(j => {
          paymentState(pagos, j.id, 'inscripcion') === 'pagado' ? nP++ : nD++
        })
        const pct = jugs.length ? Math.round(nP / jugs.length * 100) : 0
        return (
          <div className="pago-bar-wrap">
            <div className="pago-bar-header">
              <div className="pago-bar-label">Inscripción</div>
              <div className="pago-bar-pct">{pct}% pagado</div>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="pago-bar-sub">
              <span>✓ Pagado: <b style={{ color: 'var(--verde)' }}>{nP}</b></span>
              <span>✗ Debe: <b style={{ color: 'var(--rojo)' }}>{nD}</b></span>
            </div>
          </div>
        )
      })()}

      {/* Hotel — dividido en Seña y Total */}
      <div className="pago-bar-wrap">
        <div className="pago-bar-header">
          <div className="pago-bar-label">Hotel</div>
          <div style={{ fontSize: '.72em', color: 'var(--suave)' }}>{totalHotel} personas</div>
        </div>

        {/* Barra seña */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '.72em', color: 'var(--amarillo)', fontWeight: 700 }}>Seña ({fmtPesos(HOTEL_SENIA)})</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--amarillo)', fontSize: '.95em' }}>{pctSenia}%</span>
          </div>
          <div className="bar-track">
            <div style={{ height: '100%', borderRadius: '5px', background: 'linear-gradient(90deg, var(--amarillo), #fde68a)', width: `${pctSenia}%`, transition: 'width .5s ease' }} />
          </div>
          <div className="pago-bar-sub" style={{ marginTop: '4px' }}>
            <span>Pagaron seña: <b style={{ color: 'var(--amarillo)' }}>{nHotelSenia}</b></span>
            <span>Sin pagar: <b style={{ color: 'var(--rojo)' }}>{nHotelDebe}</b></span>
          </div>
        </div>

        {/* Barra total */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '.72em', color: 'var(--verde)', fontWeight: 700 }}>Total ({fmtPesos(HOTEL_TOTAL)})</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'var(--verde)', fontSize: '.95em' }}>{pctTotal}%</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${pctTotal}%` }} />
          </div>
          <div className="pago-bar-sub" style={{ marginTop: '4px' }}>
            <span>Pagaron todo: <b style={{ color: 'var(--verde)' }}>{nHotelPagado}</b></span>
            <span>Recaudado: <b style={{ color: 'var(--verde)' }}>{fmtPesos(recaudadoSenia)}</b></span>
            <span>Faltante: <b style={{ color: 'var(--rojo)' }}>{fmtPesos(Math.max(0, esperadoTotal - recaudadoSenia))}</b></span>
          </div>
        </div>
      </div>

      {/* Viaje */}
      {(() => {
        let nP = 0, nD = 0, nNA = 0, tot = 0
        jugs.forEach(j => {
          const e = paymentState(pagos, j.id, 'viaje')
          if (e === 'noaplica') { nNA++; return }
          tot++
          if (e === 'pagado') nP++
          else nD++
        })
        const pct = tot ? Math.round(nP / tot * 100) : 0
        return (
          <div className="pago-bar-wrap">
            <div className="pago-bar-header">
              <div className="pago-bar-label">Transporte / Viaje</div>
              <div className="pago-bar-pct">{pct}% al día</div>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="pago-bar-sub">
              <span>✓ Pagado: <b style={{ color: 'var(--verde)' }}>{nP}</b></span>
              <span>✗ Debe: <b style={{ color: 'var(--rojo)' }}>{nD}</b></span>
              {nNA > 0 && <span>— Por su cuenta: <b>{nNA}</b></span>}
            </div>
          </div>
        )
      })()}
    </>
  )
}
