import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../../firebase/firebase'
import './InspeccionesSupervisor.css'

type EstadoInspeccion = 'pendiente' | 'aprobada' | 'observada'

type ChecklistDetalleItem = {
  clave: string
  label: string
  cumple: boolean
}

type InspeccionSeguridad = {
  id: string
  operadorUnidad?: string
  rutaAsignada?: string
  fecha?: string
  hora?: string
  observaciones?: string
  checklistDetalle?: ChecklistDetalleItem[]
  totalItems?: number
  cumplidos?: number
  observadas?: number
  estatus?: EstadoInspeccion | string
  requiereAtencion?: boolean
  creadoEn?: unknown
}

type FiltroEstado = 'pendiente' | 'aprobada' | 'observada'

const filtros: FiltroEstado[] = ['pendiente', 'aprobada', 'observada']

function formatEstadoLabel(estado: string) {
  if (estado === 'aprobada') return 'Aprobada'
  if (estado === 'observada') return 'Observada'
  return 'Pendiente'
}

function generarResumen(item: InspeccionSeguridad) {
  const checklist = item.checklistDetalle ?? []
  const incumplidos = checklist.filter((punto) => !punto.cumple)

  if (item.estatus === 'aprobada') {
    if (typeof item.cumplidos === 'number' && typeof item.totalItems === 'number') {
      return `Verificación completa: ${item.cumplidos}/${item.totalItems} puntos de seguridad cumplidos.`
    }

    return 'Inspección aprobada sin observaciones relevantes.'
  }

  if (item.estatus === 'observada') {
    if (incumplidos.length > 0) {
      const texto = incumplidos
        .slice(0, 2)
        .map((punto) => punto.label)
        .join(', ')

      const faltantesExtra = incumplidos.length - 2

      if (faltantesExtra > 0) {
        return `Se detectaron observaciones en ${texto} y ${faltantesExtra} punto(s) adicional(es).`
      }

      return `Se detectaron observaciones en ${texto}.`
    }

    if (item.observaciones?.trim()) {
      return item.observaciones.trim()
    }

    return 'Inspección registrada con observaciones.'
  }

  return 'Inspección pendiente de revisión final.'
}

export default function InspeccionesSupervisor() {
  const [filtro, setFiltro] = useState<FiltroEstado>('pendiente')
  const [inspecciones, setInspecciones] = useState<InspeccionSeguridad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    const q = query(
      collection(db, 'inspeccion_seguridad'),
      orderBy('creadoEn', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: InspeccionSeguridad[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<InspeccionSeguridad, 'id'>

          return {
            id: docSnap.id,
            ...data,
          }
        })

        setInspecciones(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching inspecciones:', err)
        setError('No se pudieron cargar las inspecciones.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const inspeccionesFiltradas = useMemo(() => {
    return inspecciones.filter((item) => {
      const estadoNormalizado: EstadoInspeccion =
        item.estatus === 'aprobada' || item.estatus === 'observada' || item.estatus === 'pendiente'
          ? item.estatus
          : 'pendiente'

      return estadoNormalizado === filtro
    })
  }, [inspecciones, filtro])

  return (
    <section className="supervisor-screen">
      <header className="supervisor-screen__header">
        <h1>Inspecciones de seguridad</h1>
        <p>Revisiones previas antes de salida</p>
      </header>

      <div className="supervisor-chips">
        {filtros.map((item) => (
          <button
            key={item}
            type="button"
            className={`supervisor-chip ${filtro === item ? 'supervisor-chip--active' : ''}`}
            onClick={() => setFiltro(item)}
          >
            {formatEstadoLabel(item)}
          </button>
        ))}
      </div>

      {loading ? <p className="supervisor-state">Cargando inspecciones...</p> : null}
      {error ? <p className="supervisor-state supervisor-state--error">{error}</p> : null}

      {!loading && !error && (
        <div className="supervisor-list">
          {inspeccionesFiltradas.length === 0 ? (
            <div className="supervisor-empty">
              <h3>No hay inspecciones</h3>
              <p>
                No se encontraron inspecciones en el filtro{' '}
                <strong>{formatEstadoLabel(filtro).toLowerCase()}</strong>.
              </p>
            </div>
          ) : (
            inspeccionesFiltradas.map((item) => {
              const estado: EstadoInspeccion =
                item.estatus === 'aprobada' || item.estatus === 'observada' || item.estatus === 'pendiente'
                  ? item.estatus
                  : 'pendiente'

              return (
                <article key={item.id} className="supervisor-card">
                  <div className="supervisor-card__top">
                    <div>
                      <h3>{item.operadorUnidad || 'Sin operador / unidad'}</h3>
                      <p>{item.rutaAsignada || 'Sin ruta asignada'}</p>
                    </div>

                    <span className={`supervisor-badge supervisor-badge--${estado}`}>
                      {formatEstadoLabel(estado)}
                    </span>
                  </div>

                  <div className="supervisor-card__meta">
                    <span>{item.fecha || 'Sin fecha'}</span>
                    <span>{item.hora ? `${item.hora} hrs` : 'Sin hora'}</span>
                  </div>

                  <p className="supervisor-card__summary">{generarResumen(item)}</p>
                </article>
              )
            })
          )}
        </div>
      )}
    </section>
  )
}