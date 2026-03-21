import { useMemo, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { ClipboardList, ShieldCheck, AlertCircle } from 'lucide-react'
import { db } from '../../../firebase/firebase'
import { useAuth } from '../../../context/AuthContext'
import './NuevaInspeccionSupervisor.css'

type ChecklistKey =
  | 'capacitacionVigente'
  | 'evaluacionRiesgos'
  | 'accesoSeguro'
  | 'eppCompleto'
  | 'arnesBuenEstado'
  | 'lineaVidaInstalada'
  | 'puntoAnclajeSeguro'
  | 'sinEscalerasImprovisadas'
  | 'supervisionDirecta'
  | 'senalizacionVisible'
  | 'climaFavorable'
  | 'botiquinYPrimerosAuxilios'
  | 'planRescate'
  | 'sinTransporteManualInseguro'
  | 'inspeccionVisualArea'

type ChecklistItem = {
  key: ChecklistKey
  label: string
}

type ChecklistState = Record<ChecklistKey, boolean>

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    key: 'capacitacionVigente',
    label: 'Capacitación vigente del operador',
  },
  {
    key: 'evaluacionRiesgos',
    label: 'Evaluación previa de riesgos',
  },
  {
    key: 'accesoSeguro',
    label: 'Acceso seguro a la zona de trabajo',
  },
  {
    key: 'eppCompleto',
    label: 'Equipo de protección personal completo',
  },
  {
    key: 'arnesBuenEstado',
    label: 'Arnés certificado y en buen estado',
  },
  {
    key: 'lineaVidaInstalada',
    label: 'Línea de vida instalada correctamente',
  },
  {
    key: 'puntoAnclajeSeguro',
    label: 'Punto de anclaje estructural seguro',
  },
  {
    key: 'sinEscalerasImprovisadas',
    label: 'Sin escaleras improvisadas o estructuras inestables',
  },
  {
    key: 'supervisionDirecta',
    label: 'Supervisión directa durante la maniobra',
  },
  {
    key: 'senalizacionVisible',
    label: 'Señalización visible en el área',
  },
  {
    key: 'climaFavorable',
    label: 'Condiciones climáticas adecuadas',
  },
  {
    key: 'botiquinYPrimerosAuxilios',
    label: 'Botiquín y primeros auxilios disponibles',
  },
  {
    key: 'planRescate',
    label: 'Plan de rescate disponible',
  },
  {
    key: 'sinTransporteManualInseguro',
    label: 'Sin transporte manual inseguro de cilindros',
  },
  {
    key: 'inspeccionVisualArea',
    label: 'Inspección visual del área antes y después',
  },
]

const initialChecklist: ChecklistState = {
  capacitacionVigente: false,
  evaluacionRiesgos: false,
  accesoSeguro: false,
  eppCompleto: false,
  arnesBuenEstado: false,
  lineaVidaInstalada: false,
  puntoAnclajeSeguro: false,
  sinEscalerasImprovisadas: false,
  supervisionDirecta: false,
  senalizacionVisible: false,
  climaFavorable: false,
  botiquinYPrimerosAuxilios: false,
  planRescate: false,
  sinTransporteManualInseguro: false,
  inspeccionVisualArea: false,
}

export default function NuevaInspeccionSupervisor() {
  const { user, userProfile } = useAuth() as {
    user: { uid: string } | null
    userProfile?: {
      nombre?: string
      correo?: string
      rol?: string
    } | null
  }

  const now = useMemo(() => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    }
  }, [])

  const [form, setForm] = useState({
    operadorUnidad: '',
    rutaAsignada: '',
    fecha: now.date,
    hora: now.time,
    observaciones: '',
  })

  const [checklist, setChecklist] = useState<ChecklistState>(initialChecklist)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const totalItems = CHECKLIST_ITEMS.length
  const cumplidos = Object.values(checklist).filter(Boolean).length
  const observadas = totalItems - cumplidos

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const toggleChecklist = (key: ChecklistKey) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const resetForm = () => {
    setForm({
      operadorUnidad: '',
      rutaAsignada: '',
      fecha: now.date,
      hora: now.time,
      observaciones: '',
    })
    setChecklist(initialChecklist)
  }

  const buildChecklistDetalle = () => {
    return CHECKLIST_ITEMS.map((item) => ({
      clave: item.key,
      label: item.label,
      cumple: checklist[item.key],
    }))
  }

  const handleSave = async (withObservations = false) => {
    setError('')
    setSuccess('')

    if (!form.operadorUnidad.trim()) {
      setError('Debes capturar el operador o unidad.')
      return
    }

    if (!form.rutaAsignada.trim()) {
      setError('Debes capturar la ruta asignada.')
      return
    }

    if (!form.fecha || !form.hora) {
      setError('Debes capturar la fecha y hora de inspección.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        operadorUnidad: form.operadorUnidad.trim(),
        rutaAsignada: form.rutaAsignada.trim(),
        fecha: form.fecha,
        hora: form.hora,
        observaciones: form.observaciones.trim(),
        checklist,
        checklistDetalle: buildChecklistDetalle(),
        totalItems,
        cumplidos,
        observadas,
        estatus:
          withObservations || observadas > 0 ? 'observada' : 'aprobada',
        requiereAtencion: withObservations || observadas > 0,
        supervisorId: user?.uid ?? '',
        supervisorNombre: userProfile?.nombre ?? '',
        supervisorCorreo: userProfile?.correo ?? '',
        creadoEn: serverTimestamp(),
      }

      await addDoc(collection(db, 'inspeccion_seguridad'), payload)

      setSuccess(
        withObservations || observadas > 0
          ? 'Inspección registrada con observaciones.'
          : 'Inspección guardada correctamente.'
      )

      resetForm()
    } catch (err) {
      console.error('Error al guardar inspección:', err)
      setError('No se pudo guardar la inspección.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="supervisor-inspection-screen">
      <header className="supervisor-inspection-header">
        <h1>Nueva inspección</h1>
        <p>Verifique condiciones de seguridad antes de salida</p>
      </header>

      <div className="supervisor-inspection-card">
        <div className="supervisor-inspection-card__title">
          <div className="supervisor-inspection-card__icon">
            <ClipboardList size={18} />
          </div>
          <h2>Datos de inspección</h2>
        </div>

        <div className="supervisor-inspection-info">
          <div className="supervisor-inspection-field">
            <label htmlFor="operadorUnidad">Operador / unidad</label>
            <input
              id="operadorUnidad"
              name="operadorUnidad"
              type="text"
              placeholder="Ej. Juan Pérez - Unidad 402"
              value={form.operadorUnidad}
              onChange={handleChange}
            />
          </div>

          <div className="supervisor-inspection-field">
            <label htmlFor="rutaAsignada">Ruta</label>
            <input
              id="rutaAsignada"
              name="rutaAsignada"
              type="text"
              placeholder="Ej. Norte - Sector Industrial A"
              value={form.rutaAsignada}
              onChange={handleChange}
            />
          </div>

          <div className="supervisor-inspection-grid">
            <div className="supervisor-inspection-field">
              <label htmlFor="fecha">Fecha</label>
              <input
                id="fecha"
                name="fecha"
                type="date"
                value={form.fecha}
                onChange={handleChange}
              />
            </div>

            <div className="supervisor-inspection-field">
              <label htmlFor="hora">Hora</label>
              <input
                id="hora"
                name="hora"
                type="time"
                value={form.hora}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="supervisor-inspection-card">
        <div className="supervisor-inspection-card__title">
          <div className="supervisor-inspection-card__icon">
            <ShieldCheck size={18} />
          </div>
          <h2>Checklist de seguridad</h2>
        </div>

        <div className="supervisor-inspection-summary">
          <span>{cumplidos} cumplidos</span>
          <span>{observadas} observaciones</span>
        </div>

        <div className="supervisor-inspection-checklist">
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.key} className="supervisor-inspection-row">
              <span className="supervisor-inspection-row__label">
                {item.label}
              </span>

              <button
                type="button"
                className={`supervisor-switch ${
                  checklist[item.key] ? 'supervisor-switch--active' : ''
                }`}
                onClick={() => toggleChecklist(item.key)}
                aria-pressed={checklist[item.key]}
                aria-label={item.label}
              >
                <span className="supervisor-switch__thumb" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="supervisor-inspection-card">
        <div className="supervisor-inspection-card__title">
          <div className="supervisor-inspection-card__icon supervisor-inspection-card__icon--danger">
            <AlertCircle size={18} />
          </div>
          <h2>Observaciones</h2>
        </div>

        <textarea
          name="observaciones"
          rows={5}
          placeholder="Escriba aquí cualquier detalle adicional..."
          value={form.observaciones}
          onChange={handleChange}
        />
      </div>

      {error ? <div className="supervisor-feedback supervisor-feedback--error">{error}</div> : null}
      {success ? (
        <div className="supervisor-feedback supervisor-feedback--success">{success}</div>
      ) : null}

      <div className="supervisor-inspection-actions">
        <button
          type="button"
          className="supervisor-action-btn supervisor-action-btn--primary"
          onClick={() => handleSave(false)}
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar inspección'}
        </button>

        <button
          type="button"
          className="supervisor-action-btn supervisor-action-btn--danger"
          onClick={() => handleSave(true)}
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Registrar con observaciones'}
        </button>
      </div>
    </section>
  )
}