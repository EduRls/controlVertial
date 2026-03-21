import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Eye,
  MoveVertical,
} from 'lucide-react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../../../firebase/firebase'
import { useAuth } from '../../../context/AuthContext'
import SolicitudDetalleModal from './components/SolicitudDetalleModal'
import './SolicitudesSupervisor.css'

type FiltroSolicitud = 'pendiente' | 'aprobada' | 'rechazada'

type SolicitudAltura = {
  id: string
  folio?: string
  fechaSolicitud?: Timestamp | null
  fechaTrabajo?: string
  horaInicio?: string | null
  estatus?: string
  operadorNombre?: string
  operadorId?: string
  comentariosAutorizacion?: string
  autorizadoPor?: string | null

  datosGenerales?: {
    nombreTrabajo?: string
    lugarEjecucion?: string
    rutaAsignada?: string
  }

  descripcionActividad?: {
    alturaAproximada?: number
    tipoTrabajoAltura?: string
    herramientasEquipos?: string[]
    materialesInvolucrados?: string
  }

  evaluacionRiesgos?: {
    riesgoCaida?: boolean
    riesgoElectrico?: boolean
    riesgoSustanciasPeligrosas?: boolean
    riesgoCondicionesClimaticas?: boolean
    otrosRiesgos?: string
  }

  epp?: {
    guantesSeguridad?: boolean
    calzadoAntiderrapante?: boolean
    ropaAlgodon?: boolean
  }

  condicionesPrevias?: {
    inspeccionAreaRealizada?: boolean
    senalizacionColocada?: boolean
    supervisionAsignada?: boolean
    planRescateDefinido?: boolean
    botiquinYBrigadaDisponibles?: boolean
  }

  evidencia?: {
    totalFotos?: number
    fotos?: Array<{
      nombre?: string
      ruta?: string
      size?: number
      tipo?: string
      url?: string
    }>
  }
}

const FILTERS: { key: FiltroSolicitud; label: string }[] = [
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'aprobada', label: 'Aprobadas' },
  { key: 'rechazada', label: 'Rechazadas' },
]

function normalizeStatus(estatus?: string): FiltroSolicitud {
  const value = (estatus || '').toLowerCase().trim()

  if (value === 'aprobada' || value === 'autorizado' || value === 'autorizada') {
    return 'aprobada'
  }

  if (value === 'rechazada' || value === 'rechazado') {
    return 'rechazada'
  }

  return 'pendiente'
}

function getStatusLabel(status: FiltroSolicitud) {
  if (status === 'aprobada') return 'APROBADA'
  if (status === 'rechazada') return 'RECHAZADA'
  return 'PENDIENTE'
}

function getInitials(name?: string) {
  if (!name) return 'NA'

  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}

function formatFecha(fechaTrabajo?: string, fechaSolicitud?: Timestamp | null) {
  if (fechaTrabajo) {
    const [year, month, day] = fechaTrabajo.split('-')
    if (year && month && day) {
      return `${day} ${getMonthName(Number(month))}, ${year}`
    }
  }

  if (fechaSolicitud?.toDate) {
    const date = fechaSolicitud.toDate()
    const day = String(date.getDate()).padStart(2, '0')
    const month = getMonthName(date.getMonth() + 1)
    const year = date.getFullYear()
    return `${day} ${month}, ${year}`
  }

  return 'Sin fecha'
}

function getMonthName(month: number) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ]

  return months[month - 1] || '---'
}

export default function SolicitudesSupervisor() {
  const { userProfile } = useAuth() as any

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FiltroSolicitud>('pendiente')
  const [solicitudes, setSolicitudes] = useState<SolicitudAltura[]>([])
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudAltura | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')

    const q = query(
      collection(db, 'solicitudes_altura'),
      orderBy('fechaSolicitud', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: SolicitudAltura[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<SolicitudAltura, 'id'>
          return {
            id: docSnap.id,
            ...data,
          }
        })

        setSolicitudes(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching solicitudes:', err)
        setError('No se pudieron cargar las solicitudes.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!selectedSolicitud) return

    const html = document.documentElement
    const body = document.body

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      html.style.overflow = ''
      body.style.overflow = ''
    }
  }, [selectedSolicitud])
  /*
  const counts = useMemo(() => {
    return {
      pendiente: solicitudes.filter(
        (item) => normalizeStatus(item.estatus) === 'pendiente'
      ).length,
      aprobada: solicitudes.filter(
        (item) => normalizeStatus(item.estatus) === 'aprobada'
      ).length,
      rechazada: solicitudes.filter(
        (item) => normalizeStatus(item.estatus) === 'rechazada'
      ).length,
    }
  }, [solicitudes]) */

  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter((item) => normalizeStatus(item.estatus) === filter)
  }, [solicitudes, filter])

  return (
    <>
      <section className="solicitudes-supervisor">
        <div className="solicitudes-supervisor__content">
          <div className="solicitudes-supervisor__titleBlock">
            <h2>Solicitudes de altura</h2>
            <p>Revise y autorice trabajos pendientes</p>
          </div>

          <div className="solicitudes-supervisor__filters">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`solicitudes-supervisor__filter ${
                  filter === item.key ? 'is-active' : ''
                }`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="solicitudes-supervisor__state">
              Cargando solicitudes...
            </div>
          )}

          {!loading && error && (
            <div className="solicitudes-supervisor__state solicitudes-supervisor__state--error">
              {error}
            </div>
          )}

          {!loading && !error && filteredSolicitudes.length === 0 && (
            <div className="solicitudes-supervisor__empty">
              No hay solicitudes en este filtro.
            </div>
          )}

          {!loading && !error && filteredSolicitudes.length > 0 && (
            <div className="solicitudes-supervisor__list">
              {filteredSolicitudes.map((item) => {
                const status = normalizeStatus(item.estatus)

                return (
                  <article key={item.id} className="solicitud-card">
                    <div className="solicitud-card__top">
                      <div className="solicitud-card__identity">
                        <div className="solicitud-card__avatar">
                          {getInitials(item.operadorNombre)}
                        </div>

                        <div className="solicitud-card__identityText">
                          <h3>{item.operadorNombre || 'Operador sin nombre'}</h3>
                          <p>
                            {item.datosGenerales?.nombreTrabajo || 'Trabajo sin nombre'}
                          </p>
                        </div>
                      </div>

                      <span className={`solicitud-card__badge solicitud-card__badge--${status}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    <div className="solicitud-card__meta">
                      <span>
                        <MoveVertical size={15} />
                        Altura:{' '}
                        <strong>
                          {item.descripcionActividad?.alturaAproximada ?? 0} m
                        </strong>
                      </span>

                      <span>
                        <CalendarDays size={15} />
                        Fecha: <strong>{formatFecha(item.fechaTrabajo, item.fechaSolicitud)}</strong>
                      </span>
                    </div>

                    <div className="solicitud-card__riskBox">
                      <span className="solicitud-card__riskTitle">RESUMEN DE RIESGO</span>

                      <p>
                        Riesgo de caída:{' '}
                        <strong
                          className={
                            item.evaluacionRiesgos?.riesgoCaida
                              ? 'risk-yes'
                              : 'risk-no'
                          }
                        >
                          {item.evaluacionRiesgos?.riesgoCaida ? 'Sí' : 'No'}
                        </strong>{' '}
                        | Riesgo eléctrico:{' '}
                        <strong
                          className={
                            item.evaluacionRiesgos?.riesgoElectrico
                              ? 'risk-yes'
                              : 'risk-no'
                          }
                        >
                          {item.evaluacionRiesgos?.riesgoElectrico ? 'Sí' : 'No'}
                        </strong>
                      </p>
                    </div>

                    <div className="solicitud-card__footer">
                      {status === 'pendiente' ? (
                        <button
                          type="button"
                          className="solicitud-card__authorize"
                          onClick={() => setSelectedSolicitud(item)}
                        >
                          Autorizar
                        </button>
                      ) : (
                        <div className="solicitud-card__statusSpacer" />
                      )}

                      <button
                        type="button"
                        className="solicitud-card__view"
                        onClick={() => setSelectedSolicitud(item)}
                        aria-label="Ver detalle"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <SolicitudDetalleModal
        open={!!selectedSolicitud}
        service={selectedSolicitud}
        onClose={() => setSelectedSolicitud(null)}
        supervisorName={userProfile?.nombre || 'Supervisor de seguridad'}
      />
    </>
  )
}