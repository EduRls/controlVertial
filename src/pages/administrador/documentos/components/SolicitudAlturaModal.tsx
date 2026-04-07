import {
  CalendarDays,
  Clock3,
  FileText,
  Image as ImageIcon,
  MapPin,
  Shield,
  UserRound,
  X,
} from 'lucide-react'
import './SolicitudAlturaModal.css'

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

type Props = {
  open: boolean
  solicitud: SolicitudAltura | null
  onClose: () => void
}

function timestampToDate(value?: TimestampLike | null) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000)
  return null
}

function formatDateTime(date?: Date | null) {
  if (!date) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function yesNo(value?: boolean) {
  return value ? 'Sí' : 'No'
}

function getEstadoMeta(item: SolicitudAltura) {
  const bloqueada = item.condicionesClimaticas?.bloqueoAutomatico
  const autorizada = item.autorizacion === true
  const estatus = (item.estatus || '').toLowerCase()

  if (bloqueada) {
    return { label: 'Bloqueado', className: 'bloqueado' }
  }

  if (autorizada || estatus === 'autorizado' || estatus === 'aprobado') {
    return { label: 'Autorizado', className: 'autorizado' }
  }

  return { label: 'Pendiente', className: 'pendiente' }
}

function activeItems(source?: Record<string, boolean | string>, labels?: Record<string, string>) {
  if (!source || !labels) return []
  return Object.entries(labels)
    .filter(([key]) => source[key] === true)
    .map(([, label]) => label)
}

export default function SolicitudAlturaModal({
  open,
  solicitud,
  onClose,
}: Props) {
  if (!open || !solicitud) return null

  const estado = getEstadoMeta(solicitud)

  const equipo = activeItems(solicitud.equipoUtilizar, {
    andamio: 'Andamio',
    elevadorElectricoPersonal: 'Elevador eléctrico personal',
    escaleraTijera: 'Escalera tijera',
    escaleraExtension: 'Escalera extensión',
    escaleraFija: 'Escalera fija',
    equipoElevacionArticulado: 'Equipo elevación articulado',
    escaleraMarina: 'Escalera marina',
    pasoGatoTecho: 'Paso de gato en techo',
  })

  const proteccion = activeItems(solicitud.proteccionCaidas, {
    arnes: 'Arnés',
    lineaVida: 'Línea de vida',
    limitadorCaida: 'Limitador de caída',
    anclaje: 'Anclaje',
  })

  const epp = activeItems(solicitud.epp, {
    zapatoSeguridad: 'Zapato de seguridad',
    guantesSeguridad: 'Guantes de seguridad',
    guantesPiel: 'Guantes de piel',
    cascoBarbiquejo: 'Casco con barbiquejo',
    lentesSeguridad: 'Lentes de seguridad',
    taponesAuditivos: 'Tapones auditivos',
    conchasAuditivas: 'Conchas auditivas',
    chalecoReflectivo: 'Chaleco reflectivo',
  })

  const clima = activeItems(solicitud.condicionesClimaticas as Record<string, boolean | string>, {
    lluvia: 'Lluvia',
    viento: 'Viento',
    temperaturaExtrema: 'Temperatura extrema',
    hieloGranizo: 'Hielo / granizo',
    nieve: 'Nieve',
  })

  const requisitosPrevios = activeItems(
    solicitud.requisitosAntesIniciar as Record<string, boolean | string>,
    {
      areaDelimitada: 'Área delimitada',
      serviciosDeshabilitados: 'Servicios deshabilitados',
      controlEnergiasPeligrosas: 'Control de energías peligrosas',
      inspeccionEquiposUtilizar: 'Inspección de equipos',
      inspeccionArnes: 'Inspección de arnés',
      inspeccionLineaVida: 'Inspección de línea de vida',
      inspeccionEpp: 'Inspección de EPP',
      sistemaComunicacion: 'Sistema de comunicación',
    }
  )

  return (
    <div className="solicitud-modal__backdrop" onClick={onClose}>
      <div
        className="solicitud-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="solicitud-modal__header">
          <div>
            <p className="solicitud-modal__eyebrow">Detalle del documento</p>
            <h2>{solicitud.folio}</h2>
            <div className="solicitud-modal__header-meta">
              <span className={`solicitud-badge ${estado.className}`}>
                {estado.label}
              </span>
              <span>{solicitud.datosGenerales?.tipoTrabajo || 'Solicitud'}</span>
            </div>
          </div>

          <button
            className="solicitud-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="solicitud-modal__body">
          <section className="solicitud-block">
            <div className="solicitud-block__title">
              <UserRound size={16} />
              <h3>Operador</h3>
            </div>

            <div className="solicitud-grid">
              <div><span>Nombre</span><strong>{solicitud.operador?.nombre || 'Sin dato'}</strong></div>
              <div><span>No. empleado</span><strong>{solicitud.operador?.numeroEmpleado || 'Sin dato'}</strong></div>
              <div><span>Unidad</span><strong>{solicitud.datosGenerales?.unidad || solicitud.operador?.rutaAsignada || 'Sin dato'}</strong></div>
              <div><span>Cargo</span><strong>{solicitud.operador?.cargo || 'Operador'}</strong></div>
              <div><span>Correo</span><strong>{solicitud.operador?.correo || 'Sin dato'}</strong></div>
              <div><span>Teléfono</span><strong>{solicitud.operador?.telefono || 'Sin dato'}</strong></div>
            </div>
          </section>

          <section className="solicitud-block">
            <div className="solicitud-block__title">
              <FileText size={16} />
              <h3>Datos generales</h3>
            </div>

            <div className="solicitud-grid">
              <div><span>Tipo de trabajo</span><strong>{solicitud.datosGenerales?.tipoTrabajo || 'Sin dato'}</strong></div>
              <div><span>Altura aproximada</span><strong>{solicitud.datosGenerales?.alturaAproximada ?? 'Sin dato'} m</strong></div>
              <div><span>Área / lugar</span><strong>{solicitud.datosGenerales?.lugarArea || 'Sin dato'}</strong></div>
              <div><span>Tiempo estimado</span><strong>{solicitud.datosGenerales?.tiempoEstimadoMin ?? 'Sin dato'} min</strong></div>
              <div><span>Fecha del trabajo</span><strong>{solicitud.datosGenerales?.fecha || 'Sin dato'}</strong></div>
              <div><span>Hora</span><strong>{solicitud.datosGenerales?.horaInicio || '--'} - {solicitud.datosGenerales?.horaTermino || '--'}</strong></div>
              <div><span>Fecha de solicitud</span><strong>{formatDateTime(timestampToDate(solicitud.fechaSolicitud))}</strong></div>
              <div><span>Autorizado por</span><strong>{solicitud.autorizadoPor || 'Sin autorizar'}</strong></div>
            </div>
          </section>

          <section className="solicitud-block solicitud-block--double">
            <div>
              <div className="solicitud-block__title">
                <Shield size={16} />
                <h3>Protección y equipo</h3>
              </div>

              <div className="solicitud-tags-wrap">
                <label>Equipo a utilizar</label>
                <div className="solicitud-tags">
                  {equipo.length ? equipo.map((item) => (
                    <span key={item}>{item}</span>
                  )) : <em>Sin elementos marcados</em>}
                </div>
              </div>

              <div className="solicitud-tags-wrap">
                <label>Protección contra caídas</label>
                <div className="solicitud-tags">
                  {proteccion.length ? proteccion.map((item) => (
                    <span key={item}>{item}</span>
                  )) : <em>Sin elementos marcados</em>}
                </div>
              </div>

              <div className="solicitud-tags-wrap">
                <label>EPP</label>
                <div className="solicitud-tags">
                  {epp.length ? epp.map((item) => (
                    <span key={item}>{item}</span>
                  )) : <em>Sin elementos marcados</em>}
                </div>
              </div>
            </div>

            <div>
              <div className="solicitud-block__title">
                <CalendarDays size={16} />
                <h3>Clima y validaciones</h3>
              </div>

              <div className="solicitud-grid solicitud-grid--compact">
                <div><span>Bloqueo automático</span><strong>{yesNo(solicitud.condicionesClimaticas?.bloqueoAutomatico)}</strong></div>
                <div><span>Notificación WhatsApp</span><strong>{yesNo(solicitud.notificacionEnviada)}</strong></div>
                <div><span>Autorización</span><strong>{yesNo(solicitud.autorizacion)}</strong></div>
                <div><span>Fecha WhatsApp</span><strong>{formatDateTime(timestampToDate(solicitud.fechaNotificacionWhatsApp))}</strong></div>
              </div>

              <div className="solicitud-tags-wrap">
                <label>Condiciones climatológicas detectadas</label>
                <div className="solicitud-tags">
                  {clima.length ? clima.map((item) => (
                    <span key={item}>{item}</span>
                  )) : <em>Sin bloqueo climatológico</em>}
                </div>
              </div>

              <div className="solicitud-tags-wrap">
                <label>Requisitos antes de iniciar</label>
                <div className="solicitud-tags">
                  {requisitosPrevios.length ? requisitosPrevios.map((item) => (
                    <span key={item}>{item}</span>
                  )) : <em>Sin requisitos marcados</em>}
                </div>
              </div>
            </div>
          </section>

          <section className="solicitud-block">
            <div className="solicitud-block__title">
              <Clock3 size={16} />
              <h3>Personal competente</h3>
            </div>

            <div className="solicitud-people-list">
              {(solicitud.personalCompetente || []).length ? (
                solicitud.personalCompetente?.map((person, index) => (
                  <article className="solicitud-person-card" key={`${person.numeroEmpleado}-${index}`}>
                    <strong>{person.nombre || 'Sin nombre'}</strong>
                    <span>{person.numeroEmpleado || 'Sin número'} · {person.tipo || 'Sin tipo'}</span>
                    <p>
                      DC3: {yesNo(person.cuentaConDC3)} · Apto médico: {yesNo(person.evaluacionMedicaApto)} · Anexa resultado: {yesNo(person.anexaResultadoMedico)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="solicitud-empty-inline">Sin personal registrado.</p>
              )}
            </div>
          </section>

          <section className="solicitud-block">
            <div className="solicitud-block__title">
              <ImageIcon size={16} />
              <h3>Evidencia fotográfica</h3>
            </div>

            {(solicitud.evidencia?.fotos || []).length ? (
              <div className="solicitud-photos">
                {solicitud.evidencia?.fotos?.map((foto, index) => (
                  <a
                    key={`${foto.url}-${index}`}
                    href={foto.url}
                    target="_blank"
                    rel="noreferrer"
                    className="solicitud-photo-card"
                  >
                    <img
                      src={foto.url}
                      alt={foto.nombre || `Foto ${index + 1}`}
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="solicitud-empty-inline">No hay fotos adjuntas.</p>
            )}
          </section>

          <section className="solicitud-block">
            <div className="solicitud-block__title">
              <MapPin size={16} />
              <h3>Observaciones</h3>
            </div>

            <div className="solicitud-note-box">
              {solicitud.observacionesComentarios?.trim()
                ? solicitud.observacionesComentarios
                : 'Sin observaciones registradas.'}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}