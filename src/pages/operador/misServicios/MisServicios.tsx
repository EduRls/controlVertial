import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import {
  BriefcaseBusiness,
  Clock3,
  MapPin,
  Ruler,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { db } from '../../../firebase/firebase'
import { useAuth } from '../../../context/AuthContext'
import ServicioDetalleModal from './components/ServicioDetalleModal'
import './MisServicios.css'

type EstatusFiltro = 'todos' | 'pendiente' | 'autorizado' | 'rechazado'

type SolicitudAltura = {
  id: string
  folio?: string
  fechaSolicitud?: Timestamp | null
  fechaTrabajo?: string
  horaInicio?: string | null
  estatus?: string
  autorizacion?: boolean

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

  comentariosAutorizacion?: string
}

const FILTERS: { key: EstatusFiltro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'autorizado', label: 'Autorizados' },
  { key: 'rechazado', label: 'Rechazados' },
]

function formatFecha(fechaTrabajo?: string, fechaSolicitud?: Timestamp | null) {
  if (fechaTrabajo) {
    const [year, month, day] = fechaTrabajo.split('-')
    if (year && month && day) {
      return `${day} ${getMonthName(Number(month))} ${year}`
    }
  }

  if (fechaSolicitud?.toDate) {
    const date = fechaSolicitud.toDate()
    const day = String(date.getDate()).padStart(2, '0')
    const month = getMonthName(date.getMonth() + 1)
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  return 'Sin fecha'
}

function getMonthName(month: number) {
  const months = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC',
  ]
  return months[month - 1] || '---'
}

function normalizeStatus(estatus?: string): EstatusFiltro {
  const value = (estatus || '').toLowerCase().trim()

  if (
    value === 'autorizado' ||
    value === 'autorizada' ||
    value === 'aprobada'
  ) {
    return 'autorizado'
  }

  if (value === 'rechazado' || value === 'rechazada') {
    return 'rechazado'
  }

  return 'pendiente'
}

function getStatusLabel(status: EstatusFiltro) {
  if (status === 'autorizado') return 'Autorizado'
  if (status === 'rechazado') return 'Rechazado'
  return 'Pendiente'
}

function getStatusIcon(status: EstatusFiltro) {
  if (status === 'autorizado') return <ShieldCheck size={16} />
  if (status === 'rechazado') return <XCircle size={16} />
  return <Clock3 size={16} />
}

export default function MisServicios() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<EstatusFiltro>('todos')
  const [services, setServices] = useState<SolicitudAltura[]>([])
  const [selectedService, setSelectedService] = useState<SolicitudAltura | null>(null)

  useEffect(() => {
    if (!user?.uid) {
      setServices([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const q = query(
      collection(db, 'solicitudes_altura'),
      where('operadorId', '==', user.uid),
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

        setServices(items)
        setLoading(false)
      },
      (err: any) => {
        console.error('Error fetching services:', err)
        setError('No se pudieron cargar los servicios.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!selectedService) return

    const html = document.documentElement
    const body = document.body

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      html.style.overflow = ''
      body.style.overflow = ''
    }
  }, [selectedService])

  const filteredServices = useMemo(() => {
    if (filter === 'todos') return services
    return services.filter((item) => normalizeStatus(item.estatus) === filter)
  }, [services, filter])

  const counts = useMemo(() => {
    return {
      todos: services.length,
      pendiente: services.filter(
        (item) => normalizeStatus(item.estatus) === 'pendiente'
      ).length,
      autorizado: services.filter(
        (item) => normalizeStatus(item.estatus) === 'autorizado'
      ).length,
      rechazado: services.filter(
        (item) => normalizeStatus(item.estatus) === 'rechazado'
      ).length,
    }
  }, [services])

  return (
    <>
      <section className="mis-servicios-page">
        <header className="mis-servicios-page__header">
          <span className="mis-servicios-page__eyebrow">Mis servicios</span>
          <h1>Trabajos recientes</h1>
          <p>
            Aquí se muestran únicamente las solicitudes del operador actual.
          </p>
        </header>

        <div className="mis-servicios-page__filters">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              className={filter === item.key ? 'active' : ''}
              onClick={() => setFilter(item.key)}
              type="button"
            >
              {item.label}
              <span>{counts[item.key]}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="mis-servicios-state">Cargando servicios...</div>
        )}

        {!loading && error && (
          <div className="mis-servicios-state mis-servicios-state--error">
            {error}
          </div>
        )}

        {!loading && !error && filteredServices.length === 0 && (
          <div className="mis-servicios-empty">
            <BriefcaseBusiness size={20} />
            <strong>No hay servicios para mostrar</strong>
            <p>No se encontraron solicitudes en este filtro.</p>
          </div>
        )}

        {!loading && !error && filteredServices.length > 0 && (
          <div className="mis-servicios-page__list">
            {filteredServices.map((service) => {
              const status = normalizeStatus(service.estatus)

              return (
                <article
                  className="service-card service-card--clickable"
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedService(service)
                    }
                  }}
                >
                  <div className="service-card__top">
                    <span className="service-card__date">
                      {formatFecha(service.fechaTrabajo, service.fechaSolicitud)}
                    </span>

                    <div className={`service-card__icon service-card__icon--${status}`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>

                  <h3>
                    {service.datosGenerales?.nombreTrabajo || 'Trabajo sin nombre'}
                  </h3>

                  <p className="service-card__address">
                    <MapPin size={14} />
                    <span>
                      {service.datosGenerales?.lugarEjecucion || 'Sin dirección'}
                    </span>
                  </p>

                  <div className="service-card__meta">
                    <span>
                      <Ruler size={14} />
                      {service.descripcionActividad?.alturaAproximada ?? 0}m Altura
                    </span>

                    {service.horaInicio && (
                      <span>
                        <Clock3 size={14} />
                        {service.horaInicio}
                      </span>
                    )}
                  </div>

                  <div className="service-card__footer">
                    <span className={`status status--${status}`}>
                      {getStatusLabel(status)}
                    </span>

                    {service.folio && (
                      <small className="service-card__folio">{service.folio}</small>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <ServicioDetalleModal
        open={!!selectedService}
        service={selectedService}
        onClose={() => setSelectedService(null)}
        statusLabel={
          selectedService
            ? getStatusLabel(normalizeStatus(selectedService.estatus))
            : ''
        }
        statusClass={
          selectedService
            ? normalizeStatus(selectedService.estatus)
            : 'pendiente'
        }
      />
    </>
  )
}