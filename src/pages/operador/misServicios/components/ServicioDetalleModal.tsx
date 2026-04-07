import {
  CheckSquare,
  Clock3,
  FileText,
  HardHat,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react'
import './ServicioDetalleModal.css'
import type { SolicitudAltura } from '../MisServicios'

type EstatusFiltro = 'todos' | 'pendiente' | 'autorizado' | 'rechazado'

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

function getSelectedItems(
  source: Record<string, unknown> | undefined,
  labels: Record<string, string>
) {
  if (!source) return []

  return Object.entries(labels)
    .filter(([key]) => source[key] === true)
    .map(([, label]) => label)
}

export default function ServicioDetalleModal({
  open,
  service,
  onClose,
  statusLabel,
  statusClass,
}: Props) {
  if (!open || !service) return null

  const equipoLabels = {
    andamio: 'Andamio',
    elevadorElectricoPersonal: 'Elevador eléctrico personal',
    escaleraTijera: 'Escalera tijera',
    escaleraExtension: 'Escalera extensión',
    escaleraFija: 'Escalera fija',
    equipoElevacionArticulado: 'Equipo elevación articulado',
    escaleraMarina: 'Escalera marina',
    pasoGatoTecho: 'Paso de gato en techo',
  }

  const proteccionLabels = {
    arnes: 'Arnés',
    lineaVida: 'Línea de vida',
    limitadorCaida: 'Limitador de caída',
    anclaje: 'Anclaje',
  }

  const eppLabels = {
    zapatoSeguridad: 'Zapato de seguridad',
    guantesSeguridad: 'Guantes de seguridad',
    guantesPiel: 'Guantes de piel',
    cascoBarbiquejo: 'Casco con barbiquejo',
    lentesSeguridad: 'Lentes de seguridad',
    taponesAuditivos: 'Tapones auditivos',
    conchasAuditivas: 'Conchas auditivas',
    chalecoReflectivo: 'Chaleco reflectivo',
  }

  const climaLabels = {
    lluvia: 'Lluvia',
    viento: 'Viento',
    temperaturaExtrema: 'Temperatura extrema',
    hieloGranizo: 'Hielo / granizo',
    nieve: 'Nieve',
  }

  const requisitosLabels = {
    areaDelimitada: 'Área delimitada',
    serviciosDeshabilitados: 'Servicios deshabilitados',
    controlEnergiasPeligrosas: 'Control de energías peligrosas',
    inspeccionEquiposUtilizar: 'Inspección de equipos',
    inspeccionArnes: 'Inspección de arnés',
    inspeccionLineaVida: 'Inspección de línea de vida',
    inspeccionEpp: 'Inspección de EPP',
    sistemaComunicacion: 'Sistema de comunicación',
  }

  const equipoSeleccionado = getSelectedItems(service.equipoUtilizar, equipoLabels)
  const proteccionSeleccionada = getSelectedItems(
    service.proteccionCaidas,
    proteccionLabels
  )
  const eppSeleccionado = getSelectedItems(service.epp, eppLabels)
  const climaSeleccionado = getSelectedItems(
    service.condicionesClimaticas,
    climaLabels
  )
  const requisitosSeleccionados = getSelectedItems(
    service.requisitosAntesIniciar,
    requisitosLabels
  )

  const personal = service.personalCompetente?.[0]

  return (
    <div className="servicio-modal__overlay" onClick={onClose}>
      <div
        className="servicio-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="servicio-modal__header">
          <div>
            <span className="servicio-modal__eyebrow">
              Detalle de la solicitud
            </span>
            <h2>
              {service.datosGenerales?.tipoTrabajo || 'Permiso de trabajo en alturas'}
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
                  <strong>Lugar o área</strong>
                  <span>{service.datosGenerales?.lugarArea || 'Sin ubicación'}</span>
                </div>
              </div>

              <div className="servicio-modal__item">
                <Clock3 size={16} />
                <div>
                  <strong>Fecha y hora</strong>
                  <span>
                    {service.datosGenerales?.fecha || 'Sin fecha'}
                    {service.datosGenerales?.horaInicio
                      ? ` · ${service.datosGenerales.horaInicio}`
                      : ''}
                  </span>
                </div>
              </div>

              <div className="servicio-modal__item">
                <FileText size={16} />
                <div>
                  <strong>Unidad</strong>
                  <span>{service.datosGenerales?.unidad || 'Sin unidad'}</span>
                </div>
              </div>

              <div className="servicio-modal__item">
                <HardHat size={16} />
                <div>
                  <strong>Altura aproximada</strong>
                  <span>{service.datosGenerales?.alturaAproximada ?? 0} m</span>
                </div>
              </div>
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>Operador y personal autorizado</h3>

            <div className="servicio-modal__grid">
              <div className="servicio-modal__infoBox">
                <strong>Operador</strong>
                <span>{service.operador?.nombre || 'No especificado'}</span>
              </div>

              <div className="servicio-modal__infoBox">
                <strong># Empleado</strong>
                <span>{service.operador?.numeroEmpleado || 'Sin número'}</span>
              </div>

              <div className="servicio-modal__infoBox">
                <strong>Tipo</strong>
                <span>{personal?.tipo || 'No especificado'}</span>
              </div>

              <div className="servicio-modal__infoBox">
                <strong>Cuenta con DC3</strong>
                <span>{renderBoolean(personal?.cuentaConDC3)}</span>
              </div>

              <div className="servicio-modal__infoBox">
                <strong>Evaluación médica apto</strong>
                <span>{renderBoolean(personal?.evaluacionMedicaApto)}</span>
              </div>

              <div className="servicio-modal__infoBox">
                <strong>Anexa resultado médico</strong>
                <span>{renderBoolean(personal?.anexaResultadoMedico)}</span>
              </div>
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>
              <CheckSquare size={16} />
              Equipo a utilizar
            </h3>

            <div className="servicio-modal__chips">
              {equipoSeleccionado.length > 0 ? (
                equipoSeleccionado.map((item) => (
                  <span className="servicio-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="servicio-chip">Sin equipo marcado</span>
              )}

              {service.equipoUtilizar?.otros && (
                <span className="servicio-chip">
                  Otros: {service.equipoUtilizar.otros}
                </span>
              )}
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>
              <ShieldCheck size={16} />
              Protección contra caídas
            </h3>

            <div className="servicio-modal__chips">
              {proteccionSeleccionada.length > 0 ? (
                proteccionSeleccionada.map((item) => (
                  <span className="servicio-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="servicio-chip">Sin protección marcada</span>
              )}

              {service.proteccionCaidas?.otros && (
                <span className="servicio-chip">
                  Otros: {service.proteccionCaidas.otros}
                </span>
              )}
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>EPP</h3>

            <div className="servicio-modal__chips">
              {eppSeleccionado.length > 0 ? (
                eppSeleccionado.map((item) => (
                  <span className="servicio-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="servicio-chip">Sin EPP marcado</span>
              )}

              {service.epp?.otros && (
                <span className="servicio-chip">Otros: {service.epp.otros}</span>
              )}
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>Condiciones climatológicas</h3>

            <div className="servicio-modal__chips">
              {climaSeleccionado.length > 0 ? (
                climaSeleccionado.map((item) => (
                  <span className="servicio-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="servicio-chip">Sin condiciones bloqueantes</span>
              )}

              {service.condicionesClimaticas?.otros && (
                <span className="servicio-chip">
                  Otros: {service.condicionesClimaticas.otros}
                </span>
              )}
            </div>

            <div className="servicio-modal__note">
              <strong>Bloqueo automático</strong>
              <p>
                {service.condicionesClimaticas?.bloqueoAutomatico
                  ? 'Sí, esta solicitud quedó bloqueada por condiciones climatológicas.'
                  : 'No'}
              </p>
            </div>
          </div>

          <div className="servicio-modal__section">
            <h3>Requisitos antes de iniciar</h3>

            <div className="servicio-modal__chips">
              {requisitosSeleccionados.length > 0 ? (
                requisitosSeleccionados.map((item) => (
                  <span className="servicio-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="servicio-chip">Sin requisitos marcados</span>
              )}
            </div>
          </div>

          {service.observacionesComentarios && (
            <div className="servicio-modal__section">
              <h3>Observaciones / comentarios</h3>
              <div className="servicio-modal__note">
                <p>{service.observacionesComentarios}</p>
              </div>
            </div>
          )}

          {service.comentariosAutorizacion && (
            <div className="servicio-modal__section">
              <h3>Comentarios de autorización</h3>
              <div className="servicio-modal__note">
                <p>{service.comentariosAutorizacion}</p>
              </div>
            </div>
          )}

          <div className="servicio-modal__section">
            <h3>Evidencia</h3>
            <div className="servicio-modal__note">
              <p>
                Total de fotos: {service.evidencia?.totalFotos ?? 0}
              </p>
            </div>

            {service.evidencia?.fotos?.length ? (
              <div className="servicio-modal__gallery">
                {service.evidencia.fotos.map((foto, index) => (
                  <a
                    key={`${foto.url}-${index}`}
                    href={foto.url}
                    target="_blank"
                    rel="noreferrer"
                    className="servicio-modal__photo"
                  >
                    <img
                      src={foto.url}
                      alt={foto.nombre || `Evidencia ${index + 1}`}
                    />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}