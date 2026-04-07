import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FileText,
  HardHat,
  MapPin,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../../firebase/firebase'
import './SolicitudDetalleModal.css'

type EstatusSolicitud = 'pendiente' | 'aprobada' | 'rechazada'

type SolicitudAltura = {
  id: string
  folio?: string
  fechaSolicitud?: unknown
  estatus?: string
  autorizacion?: boolean
  comentariosAutorizacion?: string
  autorizadoPor?: string | null

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

type Props = {
  open: boolean
  service: SolicitudAltura | null
  onClose: () => void
  supervisorName?: string
}

function renderBoolean(value?: boolean) {
  return value ? 'Sí' : 'No'
}

function formatFecha(fecha?: string) {
  if (!fecha) return 'Sin fecha'

  const [year, month, day] = fecha.split('-')
  if (!year || !month || !day) return fecha

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

  return `${day} ${months[Number(month) - 1] || '---'} ${year}`
}

function normalizeStatus(estatus?: string): EstatusSolicitud {
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

function getCheckedLabels(
  source: Record<string, unknown> | undefined,
  labels: Record<string, string>
) {
  if (!source) return []

  return Object.entries(labels)
    .filter(([key]) => source[key] === true)
    .map(([, label]) => label)
}

export default function SolicitudDetalleModal({
  open,
  service,
  onClose,
  supervisorName,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState(service?.comentariosAutorizacion || '')

  const status = useMemo(
    () => normalizeStatus(service?.estatus),
    [service?.estatus]
  )

  const imageUrl = service?.evidencia?.fotos?.[0]?.url || ''

  const equipoLabels = {
    andamio: 'Andamio',
    elevadorElectricoPersonal: 'Elevador eléctrico personal',
    escaleraTijera: 'Escalera tijera',
    escaleraExtension: 'Escalera extensión',
    escaleraFija: 'Escalera fija',
    equipoElevacionArticulado: 'Equipo de elevación articulado',
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

  const equipoSeleccionado = getCheckedLabels(service?.equipoUtilizar, equipoLabels)
  const proteccionSeleccionada = getCheckedLabels(
    service?.proteccionCaidas,
    proteccionLabels
  )
  const eppSeleccionado = getCheckedLabels(service?.epp, eppLabels)
  const climaSeleccionado = getCheckedLabels(
    service?.condicionesClimaticas,
    climaLabels
  )
  const requisitosSeleccionados = getCheckedLabels(
    service?.requisitosAntesIniciar,
    requisitosLabels
  )

  const personal = service?.personalCompetente?.[0]

  if (!open || !service) return null

  const handleChangeStatus = async (nextStatus: EstatusSolicitud) => {
    if (saving) return

    try {
      setSaving(true)

      await updateDoc(doc(db, 'solicitudes_altura', service.id), {
        estatus: nextStatus,
        autorizacion: nextStatus === 'aprobada',
        autorizadoPor: supervisorName || 'Supervisor de seguridad',
        comentariosAutorizacion: comment.trim(),
        fechaAutorizacion: serverTimestamp(),
        'datosGenerales.supervisorNombre': supervisorName || 'Supervisor de seguridad',
      })

      onClose()
    } catch (error) {
      console.error('Error al actualizar la solicitud:', error)
      alert('No se pudo actualizar la solicitud.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="solicitud-modal__overlay" onClick={onClose}>
      <div className="solicitud-modal" onClick={(e) => e.stopPropagation()}>
        <div className="solicitud-modal__header">
          <div>
            <span className="solicitud-modal__eyebrow">Detalle de la solicitud</span>
            <h2>{service.operador?.nombre || 'Operador sin nombre'}</h2>
            <p>
              {service.datosGenerales?.tipoTrabajo || 'Permiso de trabajo en alturas'}
            </p>
          </div>

          <button
            type="button"
            className="solicitud-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="solicitud-modal__body">
          <div className="solicitud-modal__statusRow">
            <span className={`solicitud-modal__status solicitud-modal__status--${status}`}>
              {status === 'aprobada'
                ? 'APROBADA'
                : status === 'rechazada'
                  ? 'RECHAZADA'
                  : 'PENDIENTE'}
            </span>

            {service.folio && (
              <span className="solicitud-modal__folio">{service.folio}</span>
            )}
          </div>

          {imageUrl && (
            <div className="solicitud-modal__imageWrap">
              <img
                src={imageUrl}
                alt="Evidencia del servicio"
                className="solicitud-modal__image"
              />
            </div>
          )}

          <div className="solicitud-modal__section">
            <h3>Datos generales</h3>

            <div className="solicitud-modal__items">
              <div className="solicitud-modal__item">
                <UserRound size={16} />
                <div>
                  <strong>Operador</strong>
                  <span>{service.operador?.nombre || 'No especificado'}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <FileText size={16} />
                <div>
                  <strong>No. empleado</strong>
                  <span>{service.operador?.numeroEmpleado || 'Sin número'}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <MapPin size={16} />
                <div>
                  <strong>Lugar o área</strong>
                  <span>{service.datosGenerales?.lugarArea || 'Sin ubicación'}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <CalendarDays size={16} />
                <div>
                  <strong>Fecha</strong>
                  <span>{formatFecha(service.datosGenerales?.fecha)}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <Clock3 size={16} />
                <div>
                  <strong>Horario</strong>
                  <span>
                    {service.datosGenerales?.horaInicio || '--:--'}
                    {service.datosGenerales?.horaTermino
                      ? ` - ${service.datosGenerales.horaTermino}`
                      : ''}
                  </span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <HardHat size={16} />
                <div>
                  <strong>Altura aproximada</strong>
                  <span>{service.datosGenerales?.alturaAproximada ?? 0} m</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <FileText size={16} />
                <div>
                  <strong>Unidad</strong>
                  <span>{service.datosGenerales?.unidad || service.operador?.rutaAsignada || 'Sin unidad'}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <Clock3 size={16} />
                <div>
                  <strong>Tiempo estimado</strong>
                  <span>
                    {service.datosGenerales?.tiempoEstimadoMin
                      ? `${service.datosGenerales.tiempoEstimadoMin} min`
                      : 'No especificado'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>Personal competente</h3>

            <div className="solicitud-modal__items">
              <div className="solicitud-modal__item">
                <UserRound size={16} />
                <div>
                  <strong>Nombre</strong>
                  <span>{personal?.nombre || service.operador?.nombre || 'No especificado'}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <FileText size={16} />
                <div>
                  <strong>Tipo</strong>
                  <span>{personal?.tipo || 'Empleado'}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <ShieldCheck size={16} />
                <div>
                  <strong>Cuenta con DC3</strong>
                  <span>{renderBoolean(personal?.cuentaConDC3)}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <ShieldCheck size={16} />
                <div>
                  <strong>Evaluación médica apto</strong>
                  <span>{renderBoolean(personal?.evaluacionMedicaApto)}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <FileText size={16} />
                <div>
                  <strong>Anexa resultado médico</strong>
                  <span>{renderBoolean(personal?.anexaResultadoMedico)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>Equipo a utilizar</h3>
            <div className="solicitud-modal__chips">
              {equipoSeleccionado.length > 0 ? (
                equipoSeleccionado.map((item) => (
                  <span className="solicitud-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="solicitud-chip">Sin equipo marcado</span>
              )}

              {service.equipoUtilizar?.otros && (
                <span className="solicitud-chip">
                  Otros: {service.equipoUtilizar.otros}
                </span>
              )}
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>Sistema de protección contra caídas</h3>
            <div className="solicitud-modal__chips">
              {proteccionSeleccionada.length > 0 ? (
                proteccionSeleccionada.map((item) => (
                  <span className="solicitud-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="solicitud-chip">Sin protección marcada</span>
              )}

              {service.proteccionCaidas?.otros && (
                <span className="solicitud-chip">
                  Otros: {service.proteccionCaidas.otros}
                </span>
              )}
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>EPP</h3>
            <div className="solicitud-modal__chips">
              {eppSeleccionado.length > 0 ? (
                eppSeleccionado.map((item) => (
                  <span className="solicitud-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="solicitud-chip">Sin EPP marcado</span>
              )}

              {service.epp?.otros && (
                <span className="solicitud-chip">Otros: {service.epp.otros}</span>
              )}
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>Condiciones climatológicas</h3>
            <div className="solicitud-modal__chips">
              {climaSeleccionado.length > 0 ? (
                climaSeleccionado.map((item) => (
                  <span className="solicitud-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="solicitud-chip">Sin condiciones reportadas</span>
              )}

              {service.condicionesClimaticas?.otros && (
                <span className="solicitud-chip">
                  Otros: {service.condicionesClimaticas.otros}
                </span>
              )}
            </div>

            {service.condicionesClimaticas?.bloqueoAutomatico && (
              <div className="solicitud-modal__warning">
                <AlertTriangle size={16} />
                <span>La solicitud quedó marcada con bloqueo por clima.</span>
              </div>
            )}
          </div>

          <div className="solicitud-modal__section">
            <h3>Requisitos antes de iniciar</h3>
            <div className="solicitud-modal__chips">
              {requisitosSeleccionados.length > 0 ? (
                requisitosSeleccionados.map((item) => (
                  <span className="solicitud-chip" key={item}>
                    {item}
                  </span>
                ))
              ) : (
                <span className="solicitud-chip">Sin requisitos marcados</span>
              )}
            </div>
          </div>

          {service.observacionesComentarios && (
            <div className="solicitud-modal__section">
              <h3>Observaciones / comentarios</h3>
              <div className="solicitud-modal__note">
                <p>{service.observacionesComentarios}</p>
              </div>
            </div>
          )}

          <div className="solicitud-modal__section">
            <h3>Comentario del supervisor</h3>
            <textarea
              className="solicitud-modal__textarea"
              rows={4}
              placeholder="Agregue una observación para aprobar o rechazar la solicitud"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="solicitud-modal__actions">
            <button
              type="button"
              className="solicitud-modal__btn solicitud-modal__btn--reject"
              onClick={() => handleChangeStatus('rechazada')}
              disabled={saving}
            >
              Rechazar
            </button>

            <button
              type="button"
              className="solicitud-modal__btn solicitud-modal__btn--approve"
              onClick={() => handleChangeStatus('aprobada')}
              disabled={saving}
            >
              Aprobar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}