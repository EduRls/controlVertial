import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FileText,
  MapPin,
  ShieldCheck,
  Shirt,
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
  fechaTrabajo?: string
  horaInicio?: string | null
  horaTermino?: string | null
  estatus?: string
  operadorNombre?: string
  operadorTelefono?: string
  autorizadoPor?: string | null
  comentariosAutorizacion?: string

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

  return `${day} ${months[Number(month) - 1] || '---'}, ${year}`
}

function normalizeStatus(estatus?: string): EstatusSolicitud {
  const value = (estatus || '').toLowerCase().trim()

  if (value === 'aprobada' || value === 'autorizado' || value === 'autorizada') {
    return 'aprobada'
  }

  if (value === 'rechazada' || value === 'rechazado') {
    return 'rechazada'
  }

  return 'pendiente'
}

export default function SolicitudDetalleModal({
  open,
  service,
  onClose,
  supervisorName,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [comment, setComment] = useState('')

  const status = useMemo(
    () => normalizeStatus(service?.estatus),
    [service?.estatus]
  )

  const imageUrl = service?.evidencia?.fotos?.[0]?.url || ''

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
            <h2>{service.operadorNombre || 'Operador sin nombre'}</h2>
            <p>{service.datosGenerales?.nombreTrabajo || 'Trabajo sin nombre'}</p>
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
                  <span>{service.operadorNombre || 'No especificado'}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <MapPin size={16} />
                <div>
                  <strong>Ubicación</strong>
                  <span>{service.datosGenerales?.lugarEjecucion || 'Sin dirección'}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <CalendarDays size={16} />
                <div>
                  <strong>Fecha</strong>
                  <span>{formatFecha(service.fechaTrabajo)}</span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <Clock3 size={16} />
                <div>
                  <strong>Horario</strong>
                  <span>
                    {service.horaInicio || '--:--'}
                    {service.horaTermino ? ` - ${service.horaTermino}` : ''}
                  </span>
                </div>
              </div>

              <div className="solicitud-modal__item">
                <FileText size={16} />
                <div>
                  <strong>Ruta asignada</strong>
                  <span>{service.datosGenerales?.rutaAsignada || 'Sin ruta'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>Actividad</h3>

            <div className="solicitud-modal__grid">
              <div className="solicitud-modal__infoBox">
                <strong>Tipo de trabajo</strong>
                <span>
                  {service.descripcionActividad?.tipoTrabajoAltura || 'No especificado'}
                </span>
              </div>

              <div className="solicitud-modal__infoBox">
                <strong>Altura aproximada</strong>
                <span>{service.descripcionActividad?.alturaAproximada ?? 0} m</span>
              </div>

              <div className="solicitud-modal__infoBox solicitud-modal__infoBox--full">
                <strong>Material involucrado</strong>
                <span>
                  {service.descripcionActividad?.materialesInvolucrados || 'No especificado'}
                </span>
              </div>

              <div className="solicitud-modal__infoBox solicitud-modal__infoBox--full">
                <strong>Herramientas / equipos</strong>
                <span>
                  {service.descripcionActividad?.herramientasEquipos?.length
                    ? service.descripcionActividad.herramientasEquipos.join(', ')
                    : 'No registrados'}
                </span>
              </div>
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>
              <AlertTriangle size={16} />
              Evaluación de riesgos
            </h3>

            <div className="solicitud-modal__chips">
              <span className="solicitud-chip">
                Riesgo de caída: {renderBoolean(service.evaluacionRiesgos?.riesgoCaida)}
              </span>
              <span className="solicitud-chip">
                Riesgo eléctrico: {renderBoolean(service.evaluacionRiesgos?.riesgoElectrico)}
              </span>
              <span className="solicitud-chip">
                Sustancias peligrosas:{' '}
                {renderBoolean(service.evaluacionRiesgos?.riesgoSustanciasPeligrosas)}
              </span>
              <span className="solicitud-chip">
                Riesgo climático:{' '}
                {renderBoolean(service.evaluacionRiesgos?.riesgoCondicionesClimaticas)}
              </span>
            </div>

            <div className="solicitud-modal__note">
              <strong>Otros riesgos</strong>
              <p>{service.evaluacionRiesgos?.otrosRiesgos || 'Sin observaciones'}</p>
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>
              <Shirt size={16} />
              EPP
            </h3>

            <div className="solicitud-modal__chips">
              <span className="solicitud-chip">
                Guantes: {renderBoolean(service.epp?.guantesSeguridad)}
              </span>
              <span className="solicitud-chip">
                Calzado antiderrapante: {renderBoolean(service.epp?.calzadoAntiderrapante)}
              </span>
              <span className="solicitud-chip">
                Ropa de algodón: {renderBoolean(service.epp?.ropaAlgodon)}
              </span>
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>
              <ShieldCheck size={16} />
              Condiciones previas
            </h3>

            <div className="solicitud-modal__chips">
              <span className="solicitud-chip">
                Inspección realizada:{' '}
                {renderBoolean(service.condicionesPrevias?.inspeccionAreaRealizada)}
              </span>
              <span className="solicitud-chip">
                Señalización colocada:{' '}
                {renderBoolean(service.condicionesPrevias?.senalizacionColocada)}
              </span>
              <span className="solicitud-chip">
                Supervisión asignada:{' '}
                {renderBoolean(service.condicionesPrevias?.supervisionAsignada)}
              </span>
              <span className="solicitud-chip">
                Plan de rescate:{' '}
                {renderBoolean(service.condicionesPrevias?.planRescateDefinido)}
              </span>
              <span className="solicitud-chip">
                Botiquín y brigada:{' '}
                {renderBoolean(service.condicionesPrevias?.botiquinYBrigadaDisponibles)}
              </span>
            </div>
          </div>

          <div className="solicitud-modal__section">
            <h3>Comentario de autorización</h3>
            <textarea
              className="solicitud-modal__textarea"
              placeholder="Escribe una observación para aprobar o rechazar..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {status === 'pendiente' && (
            <div className="solicitud-modal__actions">
              <button
                type="button"
                className="solicitud-modal__btn solicitud-modal__btn--reject"
                disabled={saving}
                onClick={() => handleChangeStatus('rechazada')}
              >
                {saving ? 'Guardando...' : 'Rechazar'}
              </button>

              <button
                type="button"
                className="solicitud-modal__btn solicitud-modal__btn--approve"
                disabled={saving}
                onClick={() => handleChangeStatus('aprobada')}
              >
                {saving ? 'Guardando...' : 'Autorizar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}