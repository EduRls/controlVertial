import {
  AlertTriangle,
  Clock3,
  FileText,
  MapPin,
  ShieldCheck,
  Shirt,
  X,
} from 'lucide-react'
import './ServicioDetalleModal.css'

type EstatusFiltro = 'todos' | 'pendiente' | 'autorizado' | 'rechazado'

type SolicitudAltura = {
  id: string
  folio?: string
  fechaTrabajo?: string
  horaInicio?: string | null
  estatus?: string

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

type Props = {
  open: boolean
  service: SolicitudAltura | null
  onClose: () => void
  statusLabel: string
  statusClass: EstatusFiltro
}

function renderBoolean(value?: boolean) {
  return value ? 'Sí' : 'No'
}

export default function ServicioDetalleModal({
  open,
  service,
  onClose,
  statusLabel,
  statusClass,
}: Props) {
  if (!open || !service) return null

  return (
    <div className="servicio-modal__overlay" onClick={onClose}>
      <div
        className="servicio-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="servicio-modal__header">
          <div>
            <span className="servicio-modal__eyebrow">Detalle del servicio</span>
            <h2>
              {service.datosGenerales?.nombreTrabajo || 'Trabajo sin nombre'}
            </h2>
          </div>

          <button
            type="button"
            className="servicio-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="servicio-modal__body">
          <div className="servicio-modal__statusRow">
            <span className={`servicio-modal__status servicio-modal__status--${statusClass}`}>
              {statusLabel}
            </span>

            {service.folio && (
              <span className="servicio-modal__folio">{service.folio}</span>
            )}
          </div>

          <div className="servicio-modal__section">
            <h3>Datos generales</h3>

            <div className="servicio-modal__items">
              <div className="servicio-modal__item">
                <MapPin size={16} />
                <div>
                  <strong>Ubicación</strong>
                  <span>{service.datosGenerales?.lugarEjecucion || 'Sin dirección'}</span>
                </div>
              </div>

              <div className="servicio-modal__item">
                <Clock3 size={16} />
                <div>
                  <strong>Fecha y hora</strong>
                  <span>
                    {service.fechaTrabajo || 'Sin fecha'}
                    {service.horaInicio ? ` · ${service.horaInicio}` : ''}
                  </span>
                </div>
              </div>

              <div className="servicio-modal__item">
                <FileText size={16} />
                <div>
                  <strong>Ruta asignada</strong>
                  <span>{service.datosGenerales?.rutaAsignada || 'Sin ruta'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>Actividad</h3>

            <div className="servicio-modal__grid">
              <div className="servicio-modal__infoBox">
                <strong>Tipo de trabajo</strong>
                <span>
                  {service.descripcionActividad?.tipoTrabajoAltura || 'No especificado'}
                </span>
              </div>

              <div className="servicio-modal__infoBox">
                <strong>Altura aproximada</strong>
                <span>
                  {service.descripcionActividad?.alturaAproximada ?? 0} m
                </span>
              </div>

              <div className="servicio-modal__infoBox servicio-modal__infoBox--full">
                <strong>Material involucrado</strong>
                <span>
                  {service.descripcionActividad?.materialesInvolucrados || 'No especificado'}
                </span>
              </div>

              <div className="servicio-modal__infoBox servicio-modal__infoBox--full">
                <strong>Herramientas / equipos</strong>
                <span>
                  {service.descripcionActividad?.herramientasEquipos?.length
                    ? service.descripcionActividad.herramientasEquipos.join(', ')
                    : 'No registrados'}
                </span>
              </div>
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>
              <AlertTriangle size={16} />
              Evaluación de riesgos
            </h3>

            <div className="servicio-modal__chips">
              <span className="servicio-chip">
                Riesgo de caída: {renderBoolean(service.evaluacionRiesgos?.riesgoCaida)}
              </span>
              <span className="servicio-chip">
                Riesgo eléctrico: {renderBoolean(service.evaluacionRiesgos?.riesgoElectrico)}
              </span>
              <span className="servicio-chip">
                Sustancias peligrosas: {renderBoolean(service.evaluacionRiesgos?.riesgoSustanciasPeligrosas)}
              </span>
              <span className="servicio-chip">
                Riesgo climático: {renderBoolean(service.evaluacionRiesgos?.riesgoCondicionesClimaticas)}
              </span>
            </div>

            <div className="servicio-modal__note">
              <strong>Otros riesgos</strong>
              <p>{service.evaluacionRiesgos?.otrosRiesgos || 'Sin observaciones'}</p>
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>
              <Shirt size={16} />
              EPP
            </h3>

            <div className="servicio-modal__chips">
              <span className="servicio-chip">
                Guantes: {renderBoolean(service.epp?.guantesSeguridad)}
              </span>
              <span className="servicio-chip">
                Calzado antiderrapante: {renderBoolean(service.epp?.calzadoAntiderrapante)}
              </span>
              <span className="servicio-chip">
                Ropa de algodón: {renderBoolean(service.epp?.ropaAlgodon)}
              </span>
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>
              <ShieldCheck size={16} />
              Condiciones previas
            </h3>

            <div className="servicio-modal__chips">
              <span className="servicio-chip">
                Inspección realizada: {renderBoolean(service.condicionesPrevias?.inspeccionAreaRealizada)}
              </span>
              <span className="servicio-chip">
                Señalización colocada: {renderBoolean(service.condicionesPrevias?.senalizacionColocada)}
              </span>
              <span className="servicio-chip">
                Supervisión asignada: {renderBoolean(service.condicionesPrevias?.supervisionAsignada)}
              </span>
              <span className="servicio-chip">
                Plan de rescate: {renderBoolean(service.condicionesPrevias?.planRescateDefinido)}
              </span>
              <span className="servicio-chip">
                Botiquín y brigada: {renderBoolean(service.condicionesPrevias?.botiquinYBrigadaDisponibles)}
              </span>
            </div>
          </div>

          {service.comentariosAutorizacion && (
            <div className="servicio-modal__section">
              <h3>Comentarios de autorización</h3>
              <div className="servicio-modal__note">
                <p>{service.comentariosAutorizacion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}