'use client'
import { useStore } from '@/lib/store'
import { soloJugadores, fmtFecha, fmtTomoFolio } from '@/lib/utils'

export default function BuenaFePage() {
  const { jugadores } = useStore()
  const base = soloJugadores(jugadores)

  const imprimir = () => window.print()

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '11px', flexWrap: 'wrap', gap: '7px' }}>
        <div className="sec-title" style={{ margin: 0 }}>Lista de Buena Fe</div>
        <button className="btn-primary" onClick={imprimir}>🖨 Imprimir</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="buenafe-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Apellido</th>
              <th>Nombre</th>
              <th>DNI</th>
              <th>F. Nac.</th>
              <th>T° y F°</th>
              <th>Profesión</th>
            </tr>
          </thead>
          <tbody>
            {base.length === 0
              ? <tr><td colSpan={7} style={{ color: 'var(--suave)', padding: '18px' }}>Sin jugadores.</td></tr>
              : base.map((j, i) => (
                <tr key={j.id}>
                  <td className="num-col">{i + 1}</td>
                  <td><strong>{j.apellido}</strong></td>
                  <td>{j.nombre}</td>
                  <td>{j.dni || ''}</td>
                  <td>{fmtFecha(j.fnac)}</td>
                  <td>{fmtTomoFolio(j)}</td>
                  <td>{j.titulo || ''}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </>
  )
}
