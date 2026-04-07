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
  UserRound,
  XCircle,
} from 'lucide-react'
import { db } from '../../../firebase/firebase'
import { useAuth } from '../../../context/AuthContext'
import ServicioDetalleModal from './components/ServicioDetalleModal'
import './MisServicios.css'

type EstatusFiltro = 'todos' | 'pendiente' | 'autorizado' | 'rechazado'

export type SolicitudAltura = {
  id: string
  folio?: string
  fechaSolicitud?: Timestamp | null
  estatus?: string
  autorizacion?: boolean
  comentariosAutorizacion?: string

  operador?: {
    uid?: string
    nombre?: string
    numeroEmpleado?: string
    telefono?: string
    correo?: string
    rol?: string
    rutaAsignada?: string
    area?: string
    cargo?: string
  }

  datosGenerales?: {
    unidad?: string
    responsableAutorizaNombre?: string
    supervisorNombre?: string
    tipoTrabajo?: string
    lugarArea?: string
    alturaAproximada?: number
    fecha?: string
    horaInicio?: string
    horaTermino?: string
    tiempoEstimadoMin?: number
  }

  personalCompetente?: Array<{
    numeroEmpleado?: string
    nombre?: string
    tipo?: string
    cuentaConDC3?: boolean
    evaluacionMedicaApto?: boolean
    anexaResultadoMedico?: boolean
    firmaEmpleado?: string
  }>

  equipoUtilizar?: {
    andamio?: boolean
    elevadorElectricoPersonal?: boolean
    escaleraTijera?: boolean
    escaleraExtension?: boolean
    escaleraFija?: boolean
    equipoElevacionArticulado?: boolean
    escaleraMarina?: boolean
    pasoGatoTecho?: boolean
    otros?: string
  }

  proteccionCaidas?: {
    arnes?: boolean
    lineaVida?: boolean
    limitadorCaida?: boolean
    anclaje?: boolean
    otros?: string
  }

  epp?: {
    zapatoSeguridad?: boolean
    guantesSeguridad?: boolean
    guantesPiel?: boolean
    cascoBarbiquejo?: boolean
    lentesSeguridad?: boolean
    taponesAuditivos?: boolean
    conchasAuditivas?: boolean
    chalecoReflectivo?: boolean
    otros?: string
  }

  condicionesClimaticas?: {
    lluvia?: boolean
    viento?: boolean
    temperaturaExtrema?: boolean
    hieloGranizo?: boolean
    nieve?: boolean
    otros?: string
    bloqueoAutomatico?: boolean
  }

  requisitosAntesIniciar?: {
    areaDelimitada?: boolean
    serviciosDeshabilitados?: boolean
    controlEnergiasPeligrosas?: boolean
    inspeccionEquiposUtilizar?: boolean
    inspeccionArnes?: boolean
    inspeccionLineaVida?: boolean
    inspeccionEpp?: boolean
    sistemaComunicacion?: boolean
  }

  requisitosAlTerminar?: {
    barrerasRetiradas?: boolean
    supervisorNotificado?: boolean
    personalAreaNotificado?: boolean
    areaLimpiaOrdenada?: boolean
    herramientasRecogidas?: boolean
    materialesRetirados?: boolean
    aprobadorCierreNombre?: string
    aprobadorCierreFirma?: string
    aprobadorCierreFecha?: string
  }

  observacionesComentarios?: string

  aprobaciones?: {
    aprobadorAreaNombre?: string
    empleadoTurnoFirma?: string
    supervisorAreaFirma?: string
    contratistaFirma?: string
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

  notificacionEnviada?: boolean
  fechaAutorizacion?: Timestamp | null
  autorizadoPor?: string | null
}

const FILTERS: { key: EstatusFiltro; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'autorizado', label: 'Autorizados' },
  { key: 'rechazado', label: 'Rechazados' },
]

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

function formatFecha(
  fecha?: string,
  fechaSolicitud?: Timestamp | null
) {
  if (fecha) {
    const [year, month, day] = fecha.split('-')
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
      where('operador.uid', '==', user.uid),
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
      (err) => {
        console.error('Error fetching services:', err)
        setError('No se pudieron cargar las solicitudes.')
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
          <span className="mis-servicios-page__eyebrow">
            Mis solicitudes
          </span>
          <h1>Permisos de trabajo en alturas</h1>
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
          <div className="mis-servicios-state">Cargando solicitudes...</div>
        )}

        {!loading && error && (
          <div className="mis-servicios-state mis-servicios-state--error">
            {error}
          </div>
        )}

        {!loading && !error && filteredServices.length === 0 && (
          <div className="mis-servicios-empty">
            <BriefcaseBusiness size={20} />
            <strong>No hay solicitudes para mostrar</strong>
            <p>No se encontraron registros en este filtro.</p>
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
                      {formatFecha(
                        service.datosGenerales?.fecha,
                        service.fechaSolicitud
                      )}
                    </span>

                    <div className={`service-card__icon service-card__icon--${status}`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>

                  <h3>
                    {service.datosGenerales?.tipoTrabajo ||
                      'Permiso de trabajo en alturas'}
                  </h3>

                  <p className="service-card__address">
                    <MapPin size={14} />
                    <span>
                      {service.datosGenerales?.lugarArea || 'Sin ubicación'}
                    </span>
                  </p>

                  <div className="service-card__meta">
                    <span>
                      <Ruler size={14} />
                      {service.datosGenerales?.alturaAproximada ?? 0} m
                    </span>

                    {service.datosGenerales?.horaInicio && (
                      <span>
                        <Clock3 size={14} />
                        {service.datosGenerales.horaInicio}
                      </span>
                    )}

                    <span>
                      <UserRound size={14} />
                      {service.operador?.numeroEmpleado || 'Sin número'}
                    </span>
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