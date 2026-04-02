'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { soloJugadores, soloComitiva } from '@/lib/utils'
import type { Jugador, PersonaExtra, Transporte } from '@/lib/types'

export default function ViajePage() {
  const { jugadores, personasExtra, setPersonasExtra, setTransporte, showToast } = useStore()
  const [nomExtra, setNomExtra] = useState('')
  const [apeExtra, setApeExtra] = useState('')

  const jugs = soloJugadores(jugadores)
  const com  = soloComitiva(jugadores)
  const extV = personasExtra.filter(p => p.contexto === 'viaje')

  const todosViaje = [...jugs, ...com]
  const col   = todosViaje.filter(j => j.transporte === 'avion')
  const prop  = todosViaje.filter(j => j.transporte === 'propio')
  const sin   = todosViaje.filter(j => !j.transporte || j.transporte === 'none')
  const colE  = extV.filter(p => p.transporte === 'avion')
  const propE = extV.filter(p => p.transporte === 'propio')
  const sinE  = extV.filter(p => !p.transporte || p.transporte === 'none')

  const handleTransporteExtra = (id: string, next: Transporte) => {
    setPersonasExtra(personasExtra.map(p => p.id === id ? { ...p, transporte: next } : p))
  }

  const agregarExtra = () => {
    if (!nomExtra && !apeExtra) { showToast('Ingresá al menos un nombre', 'err'); return }
    const id = 'ex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    setPersonasExtra([...personasExtra, { id, nombre: nomExtra.trim(), apellido: apeExtra.trim(), contexto: 'viaje', transporte: 'none' }])
    setNomExtra(''); setApeExtra('')
  }

  const quitarExtra = (id: string) => {
    setPersonasExtra(personasExtra.filter(p => p.id !== id))
  }

  const BtnT = ({ cur, val, label, cls, onClic }: {
    cur: Transporte | undefined, val: Transporte, label: string, cls: string, onClic: () => void
  }) => (
    <div
      className={`viaje-btn ${cur === val ? cls : ''}`}
      style={cur === val ? { pointerEvents: 'none' } : {}}
      onClick={e => { e.stopPropagation(); if (cur !== val) onClic() }}
    >
      {label}
    </div>
  )

  const ItemJug = ({ j }: { j: Jugador }) => (
    <div className="viaje-item">
      <div className="viaje-nombre">
        {j.apellido}, {j.nombre}
        {j.rol === 'comitiva' && <span style={{ fontSize: '.6em', color: 'var(--amarillo)', marginLeft: '4px' }}>· comitiva</span>}
      </div>
      <div className="viaje-actions" onClick={e => e.stopPropagation()}>
        <BtnT cur={j.transporte} val="none"   label="Sin definir" cls="active-none"  onClic={() => setTransporte(j.id, 'none')} />
        <BtnT cur={j.transporte} val="avion"  label="✈️ Avión"    cls="active-avion" onClic={() => setTransporte(j.id, 'avion')} />
        <BtnT cur={j.transporte} val="propio" label="🚗 Cuenta"   cls="active-propio" onClic={() => setTransporte(j.id, 'propio')} />
      </div>
    </div>
  )

  const ItemExtra = ({ p }: { p: PersonaExtra }) => (
    <div className="viaje-item">
      <div className="viaje-nombre">
        {p.apellido}, {p.nombre}
        <span style={{ fontSize: '.6em', color: 'var(--naranja)', marginLeft: '4px' }}>· extra</span>
        <span onClick={() => quitarExtra(p.id)} style={{ color: 'var(--rojo)', cursor: 'pointer', fontSize: '.65em', padding: '1px 5px', border: '1px solid var(--rojo)', borderRadius: '3px', marginLeft: '6px' }}>✕</span>
      </div>
      <div className="viaje-actions" onClick={e => e.stopPropagation()}>
        <BtnT cur={p.transporte} val="none"   label="Sin definir" cls="active-none"  onClic={() => handleTransporteExtra(p.id, 'none')} />
        <BtnT cur={p.transporte} val="avion"  label="✈️ Avión"    cls="active-avion" onClic={() => handleTransporteExtra(p.id, 'avion')} />
        <BtnT cur={p.transporte} val="propio" label="🚗 Cuenta"   cls="active-propio" onClic={() => handleTransporteExtra(p.id, 'propio')} />
      </div>
    </div>
  )

  return (
    <>
      <div className="viaje-leyenda">
        <div className="vley-item"><div className="vley-dot" style={{ background: 'var(--verde)' }} />Avión</div>
        <div className="vley-item"><div className="vley-dot" style={{ background: 'var(--naranja)' }} />Por su cuenta</div>
        <div className="vley-item"><div className="vley-dot" style={{ background: 'var(--borde)' }} />Sin definir</div>
      </div>

      <div className="viaje-cols">
        <div className="viaje-card">
          <div className="viaje-card-title" style={{ color: 'var(--verde)' }}>
            ✈️ Avión <span style={{ fontSize: '.7em', color: 'var(--suave)' }}>({col.length + colE.length})</span>
          </div>
          {col.length + colE.length === 0
            ? <div className="viaje-empty">Ninguno aún.</div>
            : [...col.map(j => <ItemJug key={j.id} j={j} />), ...colE.map(p => <ItemExtra key={p.id} p={p} />)]
          }
        </div>
        <div className="viaje-card">
          <div className="viaje-card-title" style={{ color: 'var(--naranja)' }}>
            🚗 Por su cuenta <span style={{ fontSize: '.7em', color: 'var(--suave)' }}>({prop.length + propE.length})</span>
          </div>
          {prop.length + propE.length === 0
            ? <div className="viaje-empty">Ninguno aún.</div>
            : [...prop.map(j => <ItemJug key={j.id} j={j} />), ...propE.map(p => <ItemExtra key={p.id} p={p} />)]
          }
        </div>
      </div>

      <div style={{ marginTop: '9px' }}>
        <div className="viaje-card">
          <div className="viaje-card-title" style={{ color: 'var(--suave)' }}>
            ❓ Sin definir <span style={{ fontSize: '.7em' }}>({sin.length + sinE.length})</span>
          </div>
          {sin.length + sinE.length === 0
            ? <div className="viaje-empty">Todos definidos ✓</div>
            : [...sin.map(j => <ItemJug key={j.id} j={j} />), ...sinE.map(p => <ItemExtra key={p.id} p={p} />)]
          }
          <div className="inline-add" style={{ marginTop: '8px' }}>
            <input value={nomExtra} onChange={e => setNomExtra(e.target.value)} placeholder="Nombre" />
            <input value={apeExtra} onChange={e => setApeExtra(e.target.value)} placeholder="Apellido" />
            <button className="btn-inline" onClick={agregarExtra}>+ Agregar</button>
          </div>
        </div>
      </div>
    </>
  )
}
