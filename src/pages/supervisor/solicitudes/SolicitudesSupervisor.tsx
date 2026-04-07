import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore'
import {
  CalendarDays,
  Clock3,
  Eye,
  MoveVertical,
  ShieldAlert,
  UserRound,
} from 'lucide-react'

import { db } from '../../../firebase/firebase'
import { useAuth } from '../../../context/AuthContext'
import SolicitudDetalleModal from './components/SolicitudDetalleModal'
import './SolicitudesSupervisor.css'

type FiltroSolicitud = 'pendiente' | 'aprobada' | 'rechazada'

type SolicitudAltura = {
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

  observacionesComentarios?: string

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

  if (
    value === 'aprobada' ||
    value === 'autorizado' ||
    value === 'autorizada'
  ) {
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

function getMonthName(month: number) {
  const months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
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

function formatFecha(fecha?: string, fechaSolicitud?: Timestamp | null) {
  if (fecha) {
    const [year, month, day] = fecha.split('-')
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

function getRiskSummary(item: SolicitudAltura) {
  const clima = item.condicionesClimaticas
  const personal = item.personalCompetente?.[0]

  const climaBloqueante =
    clima?.lluvia ||
    clima?.viento ||
    clima?.temperaturaExtrema ||
    clima?.hieloGranizo ||
    clima?.nieve

  const sinDc3 = personal?.cuentaConDC3 === false
  const noApto = personal?.evaluacionMedicaApto === false

  if (climaBloqueante || noApto) {
    return {
      label: 'RIESGO ALTO',
      className: 'risk-high',
    }
  }

  if (sinDc3) {
    return {
      label: 'RIESGO MEDIO',
      className: 'risk-medium',
    }
  }

  return {
    label: 'RIESGO CONTROLADO',
    className: 'risk-low',
  }
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
  }, [solicitudes])

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
                <span className="solicitudes-supervisor__filterCount">
                  {counts[item.key]}
                </span>
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
                const risk = getRiskSummary(item)
                const personal = item.personalCompetente?.[0]
                const totalFotos = item.evidencia?.totalFotos ?? 0

                return (
                  <article key={item.id} className="solicitud-card">
                    <div className="solicitud-card__top">
                      <div className="solicitud-card__identity">
                        <div className="solicitud-card__avatar">
                          {getInitials(item.operador?.nombre)}
                        </div>

                        <div className="solicitud-card__identityText">
                          <h3>{item.operador?.nombre || 'Operador sin nombre'}</h3>
                          <p>
                            {item.datosGenerales?.tipoTrabajo ||
                              'Trabajo en alturas'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`solicitud-card__badge solicitud-card__badge--${status}`}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    <div className="solicitud-card__meta">
                      <span>
                        <MoveVertical size={15} />
                        Altura:{' '}
                        <strong>
                          {item.datosGenerales?.alturaAproximada ?? 0} m
                        </strong>
                      </span>

                      <span>
                        <CalendarDays size={15} />
                        Fecha:{' '}
                        <strong>
                          {formatFecha(
                            item.datosGenerales?.fecha,
                            item.fechaSolicitud
                          )}
                        </strong>
                      </span>
                    </div>

                    <div className="solicitud-card__meta">
                      <span>
                        <Clock3 size={15} />
                        Inicio:{' '}
                        <strong>{item.datosGenerales?.horaInicio || '--:--'}</strong>
                      </span>

                      <span>
                        <UserRound size={15} />
                        No. empleado:{' '}
                        <strong>{item.operador?.numeroEmpleado || '---'}</strong>
                      </span>
                    </div>

                    <div className="solicitud-card__location">
                      <strong>Lugar:</strong>{' '}
                      {item.datosGenerales?.lugarArea || 'Sin ubicación'}
                    </div>

                    <div className="solicitud-card__riskBox">
                      <span className="solicitud-card__riskTitle">
                        RESUMEN DE VALIDACIÓN
                      </span>

                      <p>
                        DC3:{' '}
                        <strong
                          className={
                            personal?.cuentaConDC3 ? 'risk-no' : 'risk-yes'
                          }
                        >
                          {personal?.cuentaConDC3 ? 'Sí' : 'No'}
                        </strong>
                      </p>

                      <p>
                        Apto médico:{' '}
                        <strong
                          className={
                            personal?.evaluacionMedicaApto ? 'risk-no' : 'risk-yes'
                          }
                        >
                          {personal?.evaluacionMedicaApto ? 'Sí' : 'No'}
                        </strong>
                      </p>

                      <p>
                        Bloqueo climático:{' '}
                        <strong
                          className={
                            item.condicionesClimaticas?.bloqueoAutomatico
                              ? 'risk-yes'
                              : 'risk-no'
                          }
                        >
                          {item.condicionesClimaticas?.bloqueoAutomatico
                            ? 'Sí'
                            : 'No'}
                        </strong>
                      </p>

                      <p>
                        Evidencia:{' '}
                        <strong className="risk-no">{totalFotos} foto(s)</strong>
                      </p>
                    </div>

                    <div className={`solicitud-card__priority ${risk.className}`}>
                      <ShieldAlert size={15} />
                      <span>{risk.label}</span>
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