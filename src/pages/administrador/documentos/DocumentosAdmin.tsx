import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import {
  ChevronRight,
  Eye,
  FileText,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { db } from '../../../firebase/firebase'
import SolicitudAlturaModal from './components/SolicitudAlturaModal'
import './DocumentosAdmin.css'

type TimestampLike = {
  seconds?: number
  nanoseconds?: number
  toDate?: () => Date
}

type SolicitudAltura = {
  id: string
  folio: string
  estatus?: string
  autorizacion?: boolean
  autorizadoPor?: string | null
  fechaSolicitud?: TimestampLike | null
  fechaAutorizacion?: TimestampLike | null
  fechaNotificacionWhatsApp?: TimestampLike | null
  notificacionEnviada?: boolean
  whatsappMessageId?: string
  errorNotificacionWhatsApp?: string | null
  observacionesComentarios?: string

  operador?: {
    uid?: string
    nombre?: string
    numeroEmpleado?: string
    rutaAsignada?: string
    correo?: string
    telefono?: string
    area?: string
    cargo?: string
  }

  datosGenerales?: {
    unidad?: string
    tipoTrabajo?: string
    lugarArea?: string
    alturaAproximada?: number
    fecha?: string
    horaInicio?: string
    horaTermino?: string
    tiempoEstimadoMin?: number
    responsableAutorizaNombre?: string
    supervisorNombre?: string
  }

  evidencia?: {
    totalFotos?: number
    fotos?: Array<{
      nombre?: string
      ruta?: string
      url?: string
      tipo?: string
      size?: number
    }>
  }

  condicionesClimaticas?: {
    bloqueoAutomatico?: boolean
    lluvia?: boolean
    viento?: boolean
    temperaturaExtrema?: boolean
    hieloGranizo?: boolean
    nieve?: boolean
    otros?: string
  }

  equipoUtilizar?: Record<string, boolean | string>
  proteccionCaidas?: Record<string, boolean | string>
  epp?: Record<string, boolean | string>
  requisitosAntesIniciar?: Record<string, boolean>
  requisitosAlTerminar?: Record<string, boolean | string>
  aprobaciones?: Record<string, string | boolean | null>
  personalCompetente?: Array<{
    numeroEmpleado?: string
    nombre?: string
    tipo?: string
    cuentaConDC3?: boolean
    evaluacionMedicaApto?: boolean
    anexaResultadoMedico?: boolean
    firmaEmpleado?: string
  }>
}

type FilterKey = 'todos' | 'pendientes' | 'autorizados' | 'bloqueados'

function timestampToDate(value?: TimestampLike | null) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000)
  return null
}

function formatDate(date?: Date | null) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatDateTime(date?: Date | null) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getEstadoMeta(item: SolicitudAltura) {
  const bloqueada = item.condicionesClimaticas?.bloqueoAutomatico
  const autorizada = item.autorizacion === true
  const estatus = (item.estatus || '').toLowerCase()

  if (bloqueada) {
    return {
      key: 'bloqueado',
      label: 'Bloqueado',
      className: 'bloqueado',
    }
  }

  if (autorizada || estatus === 'autorizado' || estatus === 'aprobado') {
    return {
      key: 'autorizado',
      label: 'Autorizado',
      className: 'autorizado',
    }
  }

  return {
    key: 'pendiente',
    label: 'Pendiente',
    className: 'pendiente',
  }
}

export default function DocumentosAdmin() {
  const [solicitudes, setSolicitudes] = useState<SolicitudAltura[]>([])
  const [selected, setSelected] = useState<SolicitudAltura | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('todos')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'solicitudes_altura'), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<SolicitudAltura, 'id'>),
      }))

      data.sort((a, b) => {
        const dateA = timestampToDate(a.fechaSolicitud)?.getTime() || 0
        const dateB = timestampToDate(b.fechaSolicitud)?.getTime() || 0
        return dateB - dateA
      })

      setSolicitudes(data)
    })

    return () => unsub()
  }, [])

  const metrics = useMemo(() => {
    const total = solicitudes.length
    const pendientes = solicitudes.filter(
      (item) => getEstadoMeta(item).key === 'pendiente'
    ).length
    const autorizados = solicitudes.filter(
      (item) => getEstadoMeta(item).key === 'autorizado'
    ).length
    const bloqueados = solicitudes.filter(
      (item) => getEstadoMeta(item).key === 'bloqueado'
    ).length

    return { total, pendientes, autorizados, bloqueados }
  }, [solicitudes])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return solicitudes.filter((item) => {
      const estado = getEstadoMeta(item).key
      const matchesFilter =
        filter === 'todos' ||
        (filter === 'pendientes' && estado === 'pendiente') ||
        (filter === 'autorizados' && estado === 'autorizado') ||
        (filter === 'bloqueados' && estado === 'bloqueado')

      if (!matchesFilter) return false

      if (!term) return true

      const values = [
        item.folio,
        item.operador?.nombre,
        item.operador?.numeroEmpleado,
        item.operador?.rutaAsignada,
        item.datosGenerales?.unidad,
        item.datosGenerales?.tipoTrabajo,
        item.datosGenerales?.lugarArea,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return values.includes(term)
    })
  }, [solicitudes, filter, search])

  return (
    <>
      <section className="documentos-admin-v2">
        <header className="docs-topbar">
          <div>
            <p className="docs-topbar__eyebrow">Administración documental</p>
            <h1>Documentos</h1>
            <span>
              Biblioteca central de solicitudes de trabajo en alturas.
            </span>
          </div>

          <div className="docs-metrics">
            <article className="docs-metric-card">
              <strong>{metrics.total}</strong>
              <span>Total archivos</span>
            </article>

            <article className="docs-metric-card">
              <strong>{metrics.pendientes}</strong>
              <span>Pendientes</span>
            </article>

            <article className="docs-metric-card">
              <strong>{metrics.autorizados}</strong>
              <span>Autorizados</span>
            </article>
          </div>
        </header>

        <section className="docs-panel">
          <div className="docs-toolbar">
            <div className="docs-tabs">
              <button
                className={filter === 'todos' ? 'active' : ''}
                onClick={() => setFilter('todos')}
              >
                Todos
              </button>
              <button
                className={filter === 'pendientes' ? 'active' : ''}
                onClick={() => setFilter('pendientes')}
              >
                Pendientes
              </button>
              <button
                className={filter === 'autorizados' ? 'active' : ''}
                onClick={() => setFilter('autorizados')}
              >
                Autorizados
              </button>
              <button
                className={filter === 'bloqueados' ? 'active' : ''}
                onClick={() => setFilter('bloqueados')}
              >
                Bloqueados
              </button>
            </div>

            <label className="docs-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por folio, operador, unidad o área"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className="docs-table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Empleado relacionado</th>
                  <th>Fecha de carga</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="docs-empty">
                        <FileText size={18} />
                        <strong>No hay registros para mostrar</strong>
                        <p>Prueba cambiando el filtro o el texto de búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const estado = getEstadoMeta(item)
                    const fecha = timestampToDate(item.fechaSolicitud)

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="doc-main-cell">
                            <div className="doc-main-cell__icon">
                              <FileText size={18} />
                            </div>

                            <div className="doc-main-cell__content">
                              <strong>{item.folio || 'Solicitud sin folio'}</strong>
                              <span>
                                {(item.datosGenerales?.tipoTrabajo ||
                                  'Solicitud de altura') +
                                  ' · ' +
                                  `${item.evidencia?.totalFotos || 0} foto(s)`}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="doc-type-chip">
                            Solicitud de altura
                          </span>
                        </td>

                        <td>
                          <div className="doc-user-cell">
                            <div className="doc-user-cell__avatar">
                              {(item.operador?.nombre || 'S')
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="doc-user-cell__text">
                              <strong>
                                {item.operador?.nombre || 'Sin operador'}
                              </strong>
                              <span>
                                {item.operador?.numeroEmpleado || 'Sin número'} ·{' '}
                                {item.datosGenerales?.unidad ||
                                  item.operador?.rutaAsignada ||
                                  'Sin unidad'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="doc-date-cell">
                            <strong>{formatDate(fecha)}</strong>
                            <span>{formatDateTime(fecha)}</span>
                          </div>
                        </td>

                        <td>
                          <span className={`doc-status-chip ${estado.className}`}>
                            {estado.key === 'autorizado' && (
                              <ShieldCheck size={13} />
                            )}
                            {estado.key === 'pendiente' && (
                              <ChevronRight size={13} />
                            )}
                            {estado.key === 'bloqueado' && (
                              <TriangleAlert size={13} />
                            )}
                            {estado.label}
                          </span>
                        </td>

                        <td>
                          <button
                            className="doc-action-btn"
                            onClick={() => setSelected(item)}
                            aria-label="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="docs-footer">
            <span>
              Mostrando <strong>{filtered.length}</strong> de{' '}
              <strong>{solicitudes.length}</strong> solicitudes
            </span>
          </footer>
        </section>
      </section>

      <SolicitudAlturaModal
        open={!!selected}
        solicitud={selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}