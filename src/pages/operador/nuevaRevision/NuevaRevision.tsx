import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  HardHat,
  ImagePlus,
  ShieldCheck,
  X,
} from 'lucide-react'
import { db, storage } from '../../../firebase/firebase'
import { useAuth } from '../../../context/AuthContext'
import './NuevaRevision.css'

type UserProfile = {
  nombre?: string
  correo?: string
  telefono?: string
  rutaAsignada?: string
  rol?: string
}

type FormState = {
  fechaTrabajo: string
  horaInicio: string

  datosGenerales: {
    nombreTrabajo: string
    lugarEjecucion: string
    rutaAsignada: string
  }

  descripcionActividad: {
    tipoTrabajoAltura: string
    alturaAproximada: string
    herramientasEquipos: string[]
    materialesInvolucrados: string
  }

  evaluacionRiesgos: {
    riesgoCaida: boolean
    riesgoElectrico: boolean
    riesgoSustanciasPeligrosas: boolean
    riesgoCondicionesClimaticas: boolean
    otrosRiesgos: string
  }

  epp: {
    guantesSeguridad: boolean
    calzadoAntiderrapante: boolean
    ropaAlgodon: boolean
  }

  condicionesPrevias: {
    inspeccionAreaRealizada: boolean
    senalizacionColocada: boolean
    supervisionAsignada: boolean
  }
}

type UploadedPhoto = {
  nombre: string
  ruta: string
  url: string
  tipo: string
  size: number
}

const TOOL_OPTIONS = ['Escalera', 'Manguera', 'Conexiones', 'Llave']
const WORK_TYPE_OPTIONS = ['Carga de gas en azotea']
const MAX_PHOTOS = 4
const MAX_FILE_SIZE_MB = 10

function getNowDate() {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function getNowTime() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function buildFolio() {
  const now = new Date()
  const year = now.getFullYear()
  const stamp = `${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes()
  ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `ALT-${year}-${stamp}`
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
}

const initialForm: FormState = {
  fechaTrabajo: getNowDate(),
  horaInicio: getNowTime(),

  datosGenerales: {
    nombreTrabajo: 'Carga de gas LP en azotea',
    lugarEjecucion: '',
    rutaAsignada: '',
  },

  descripcionActividad: {
    tipoTrabajoAltura: 'Carga de gas en azotea',
    alturaAproximada: '',
    herramientasEquipos: [],
    materialesInvolucrados: 'GAS L.P.',
  },

  evaluacionRiesgos: {
    riesgoCaida: false,
    riesgoElectrico: false,
    riesgoSustanciasPeligrosas: false,
    riesgoCondicionesClimaticas: false,
    otrosRiesgos: '',
  },

  epp: {
    guantesSeguridad: true,
    calzadoAntiderrapante: true,
    ropaAlgodon: true,
  },

  condicionesPrevias: {
    inspeccionAreaRealizada: false,
    senalizacionColocada: false,
    supervisionAsignada: false,
  },
}

export default function NuevaRevision() {
  const { user } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [loadingUser, setLoadingUser] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
      navigator.userAgent
    )
  }, [])

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.uid) {
        setLoadingUser(false)
        return
      }

      try {
        const userRef = doc(db, 'users', user.uid)
        const snap = await getDoc(userRef)

        if (snap.exists()) {
          const data = snap.data() as UserProfile
          setProfile(data)

          setForm((prev) => ({
            ...prev,
            datosGenerales: {
              ...prev.datosGenerales,
              rutaAsignada: data.rutaAsignada || '',
            },
          }))
        } else {
          setProfile(null)
        }
      } catch {
        setError('No se pudo cargar la información del operador.')
      } finally {
        setLoadingUser(false)
      }
    }

    loadUserProfile()
  }, [user])

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [photoPreviews])

  const updateRootField = (
    field: keyof Pick<FormState, 'fechaTrabajo' | 'horaInicio'>,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const updateSectionField = <
    T extends keyof Pick<
      FormState,
      | 'datosGenerales'
      | 'descripcionActividad'
      | 'evaluacionRiesgos'
      | 'epp'
      | 'condicionesPrevias'
    >,
    K extends keyof FormState[T]
  >(
    section: T,
    field: K,
    value: FormState[T][K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))
  }

  const toggleTool = (tool: string) => {
    setForm((prev) => {
      const current = prev.descripcionActividad.herramientasEquipos
      const exists = current.includes(tool)

      return {
        ...prev,
        descripcionActividad: {
          ...prev.descripcionActividad,
          herramientasEquipos: exists
            ? current.filter((item) => item !== tool)
            : [...current, tool],
        },
      }
    })
  }

  const rebuildPreviews = (files: File[]) => {
    photoPreviews.forEach((url) => URL.revokeObjectURL(url))
    const previews = files.map((file) => URL.createObjectURL(file))
    setPhotoFiles(files)
    setPhotoPreviews(previews)
  }

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')

    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const onlyImages = files.filter((file) => file.type.startsWith('image/'))

    const validBySize = onlyImages.filter(
      (file) => file.size <= MAX_FILE_SIZE_MB * 1024 * 1024
    )

    if (onlyImages.length !== validBySize.length) {
      setError(`Cada imagen debe pesar máximo ${MAX_FILE_SIZE_MB} MB.`)
    }

    const mergedFiles = [...photoFiles, ...validBySize].slice(0, MAX_PHOTOS)

    if (photoFiles.length + validBySize.length > MAX_PHOTOS) {
      setError(`Solo puede subir un máximo de ${MAX_PHOTOS} fotos.`)
    }

    rebuildPreviews(mergedFiles)
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    const nextFiles = photoFiles.filter((_, i) => i !== index)
    rebuildPreviews(nextFiles)
  }

  const datosServicioComplete = useMemo(() => {
    return Boolean(
      form.fechaTrabajo &&
        form.horaInicio &&
        form.datosGenerales.lugarEjecucion.trim() &&
        form.descripcionActividad.alturaAproximada.trim()
    )
  }, [
    form.fechaTrabajo,
    form.horaInicio,
    form.datosGenerales.lugarEjecucion,
    form.descripcionActividad.alturaAproximada,
  ])

  const herramientasComplete = useMemo(() => {
    return form.descripcionActividad.herramientasEquipos.length > 0
  }, [form.descripcionActividad.herramientasEquipos])

  const riesgosComplete = useMemo(() => {
    return (
      form.evaluacionRiesgos.riesgoCaida ||
      form.evaluacionRiesgos.riesgoElectrico ||
      form.evaluacionRiesgos.riesgoSustanciasPeligrosas ||
      form.evaluacionRiesgos.riesgoCondicionesClimaticas ||
      form.evaluacionRiesgos.otrosRiesgos.trim().length > 0
    )
  }, [form.evaluacionRiesgos])

  const condicionesComplete = useMemo(() => {
    return (
      form.condicionesPrevias.inspeccionAreaRealizada &&
      form.condicionesPrevias.senalizacionColocada &&
      form.condicionesPrevias.supervisionAsignada
    )
  }, [form.condicionesPrevias])

  const fotosComplete = useMemo(() => {
    return photoFiles.length > 0
  }, [photoFiles])

  const progressCount = [
    datosServicioComplete,
    herramientasComplete,
    riesgosComplete,
    condicionesComplete,
    fotosComplete,
  ].filter(Boolean).length

  const formReady =
    !!user?.uid &&
    !!profile &&
    datosServicioComplete &&
    herramientasComplete &&
    riesgosComplete &&
    condicionesComplete &&
    fotosComplete

  const uploadPhotos = async (folio: string): Promise<UploadedPhoto[]> => {
    if (!user?.uid) return []

    const uploadedPhotos = await Promise.all(
      photoFiles.map(async (file, index) => {
        const safeName = sanitizeFileName(file.name)
        const extension = safeName.includes('.')
          ? safeName.split('.').pop()
          : 'jpg'

        const fileName = `foto_${index + 1}_${Date.now()}.${extension}`
        const filePath = `solicitudes_altura/${user.uid}/${folio}/${fileName}`

        const storageRef = ref(storage, filePath)

        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)

        return {
          nombre: safeName,
          ruta: filePath,
          url,
          tipo: file.type,
          size: file.size,
        }
      })
    )

    return uploadedPhotos
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    if (!user?.uid) {
      setError('No hay un usuario autenticado.')
      return
    }

    if (!profile) {
      setError('No se encontró la información del operador.')
      return
    }

    if (!formReady) {
      setError('Complete todos los apartados antes de enviar.')
      return
    }

    const altura = Number(form.descripcionActividad.alturaAproximada)

    if (Number.isNaN(altura) || altura <= 0) {
      setError('La altura aproximada debe ser un número válido mayor a 0.')
      return
    }

    try {
      setSaving(true)

      const folio = buildFolio()
      const uploadedPhotos = await uploadPhotos(folio)

      const payload = {
        operadorId: user.uid,
        operadorNombre: profile.nombre || '',
        operadorTelefono: profile.telefono || '',
        operadorCorreo: profile.correo || user.email || '',
        rol: profile.rol || 'operador',

        folio,
        fechaSolicitud: serverTimestamp(),
        fechaTrabajo: form.fechaTrabajo,
        horaInicio: form.horaInicio,
        horaTermino: null,

        datosGenerales: {
          nombreTrabajo: form.datosGenerales.nombreTrabajo,
          lugarEjecucion: form.datosGenerales.lugarEjecucion.trim(),
          rutaAsignada: form.datosGenerales.rutaAsignada.trim(),
        },

        descripcionActividad: {
          tipoTrabajoAltura: form.descripcionActividad.tipoTrabajoAltura,
          alturaAproximada: altura,
          herramientasEquipos: form.descripcionActividad.herramientasEquipos,
          materialesInvolucrados:
            form.descripcionActividad.materialesInvolucrados,
        },

        evaluacionRiesgos: {
          riesgoCaida: form.evaluacionRiesgos.riesgoCaida,
          riesgoElectrico: form.evaluacionRiesgos.riesgoElectrico,
          riesgoSustanciasPeligrosas:
            form.evaluacionRiesgos.riesgoSustanciasPeligrosas,
          riesgoCondicionesClimaticas:
            form.evaluacionRiesgos.riesgoCondicionesClimaticas,
          otrosRiesgos: form.evaluacionRiesgos.otrosRiesgos.trim(),
        },

        epp: {
          guantesSeguridad: form.epp.guantesSeguridad,
          calzadoAntiderrapante: form.epp.calzadoAntiderrapante,
          ropaAlgodon: form.epp.ropaAlgodon,
        },

        condicionesPrevias: {
          inspeccionAreaRealizada:
            form.condicionesPrevias.inspeccionAreaRealizada,
          senalizacionColocada: form.condicionesPrevias.senalizacionColocada,
          supervisionAsignada: form.condicionesPrevias.supervisionAsignada,
        },

        evidencia: {
          totalFotos: uploadedPhotos.length,
          fotos: uploadedPhotos,
        },

        autorizacion: false,
        estatus: 'pendiente',
        notificacionEnviada: false,
        fechaAutorizacion: null,
        autorizadoPor: null,
        comentariosAutorizacion: '',
      }

      await addDoc(collection(db, 'solicitudes_altura'), payload)

      setSuccess('Solicitud enviada correctamente.')
      photoPreviews.forEach((url) => URL.revokeObjectURL(url))
      setPhotoFiles([])
      setPhotoPreviews([])

      setForm({
        ...initialForm,
        fechaTrabajo: getNowDate(),
        horaInicio: getNowTime(),
        datosGenerales: {
          ...initialForm.datosGenerales,
          rutaAsignada: profile.rutaAsignada || '',
        },
      })
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al guardar la solicitud.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingUser) {
    return (
      <section className="nueva-revision-page">
        <div className="nueva-revision-loading">
          Cargando información del operador...
        </div>
      </section>
    )
  }

  return (
    <section className="nueva-revision-page">
      <header className="nueva-revision-page__header">
        <span className="nueva-revision-page__eyebrow">Nueva revisión</span>
        <h1>Complete la inspección antes de iniciar el trabajo</h1>
        <p>
          Registre solo lo necesario para solicitar autorización en el momento.
        </p>

        <div className="nueva-revision-progress">
          <span>{progressCount}/5 secciones completas</span>
          <div className="nueva-revision-progress__bar">
            <div
              className="nueva-revision-progress__fill"
              style={{ width: `${(progressCount / 5) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="operator-card">
        <div className="operator-card__icon">
          <HardHat size={18} />
        </div>

        <div className="operator-card__content">
          <strong>{profile?.nombre || 'Operador'}</strong>
          <span>{profile?.correo || user?.email || 'Sin correo'}</span>
          <small>
            Ruta: {profile?.rutaAsignada || 'Sin ruta'} · Rol:{' '}
            {profile?.rol || 'operador'}
          </small>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <div className="section-card__titleWrap">
            <div className="section-card__icon">
              <ClipboardList size={18} />
            </div>
            <div>
              <h3>Datos del servicio</h3>
              <p>Ubicación, fecha, hora y altura aproximada.</p>
            </div>
          </div>

          <span
            className={`status-pill ${datosServicioComplete ? 'is-complete' : ''}`}
          >
            {datosServicioComplete ? 'Completo' : 'Pendiente'}
          </span>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Fecha de trabajo</span>
            <input
              type="date"
              value={form.fechaTrabajo}
              onChange={(e) => updateRootField('fechaTrabajo', e.target.value)}
            />
          </label>

          <label className="field">
            <span>Hora de inicio</span>
            <input
              type="time"
              value={form.horaInicio}
              onChange={(e) => updateRootField('horaInicio', e.target.value)}
            />
          </label>

          <label className="field field--full">
            <span>Ubicación / dirección</span>
            <input
              type="text"
              value={form.datosGenerales.lugarEjecucion}
              onChange={(e) =>
                updateSectionField(
                  'datosGenerales',
                  'lugarEjecucion',
                  e.target.value
                )
              }
              placeholder="Ej. Av. Principal 123"
            />
          </label>

          <label className="field">
            <span>Ruta</span>
            <input
              type="text"
              value={form.datosGenerales.rutaAsignada}
              onChange={(e) =>
                updateSectionField(
                  'datosGenerales',
                  'rutaAsignada',
                  e.target.value
                )
              }
            />
          </label>

          <label className="field">
            <span>Altura aproximada (m)</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={form.descripcionActividad.alturaAproximada}
              onChange={(e) =>
                updateSectionField(
                  'descripcionActividad',
                  'alturaAproximada',
                  e.target.value
                )
              }
              placeholder="Ej. 3"
            />
          </label>

          <label className="field field--full">
            <span>Tipo de trabajo</span>
            <select
              value={form.descripcionActividad.tipoTrabajoAltura}
              onChange={(e) =>
                updateSectionField(
                  'descripcionActividad',
                  'tipoTrabajoAltura',
                  e.target.value
                )
              }
            >
              {WORK_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <div className="section-card__titleWrap">
            <div className="section-card__icon">
              <FileText size={18} />
            </div>
            <div>
              <h3>Herramientas</h3>
              <p>Seleccione lo que llevará el operador.</p>
            </div>
          </div>

          <span
            className={`status-pill ${herramientasComplete ? 'is-complete' : ''}`}
          >
            {herramientasComplete ? 'Completo' : 'Pendiente'}
          </span>
        </div>

        <div className="checks-grid">
          {TOOL_OPTIONS.map((tool) => (
            <label className="check-item" key={tool}>
              <input
                type="checkbox"
                checked={form.descripcionActividad.herramientasEquipos.includes(
                  tool
                )}
                onChange={() => toggleTool(tool)}
              />
              <span>{tool}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <div className="section-card__titleWrap">
            <div className="section-card__icon">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3>Evaluación de riesgos</h3>
              <p>Marque los riesgos detectados en este servicio.</p>
            </div>
          </div>

          <span
            className={`status-pill ${riesgosComplete ? 'is-complete' : ''}`}
          >
            {riesgosComplete ? 'Completo' : 'Pendiente'}
          </span>
        </div>

        <div className="checks-grid">
          <label className="check-item">
            <input
              type="checkbox"
              checked={form.evaluacionRiesgos.riesgoCaida}
              onChange={(e) =>
                updateSectionField(
                  'evaluacionRiesgos',
                  'riesgoCaida',
                  e.target.checked
                )
              }
            />
            <span>Riesgo de caída</span>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.evaluacionRiesgos.riesgoElectrico}
              onChange={(e) =>
                updateSectionField(
                  'evaluacionRiesgos',
                  'riesgoElectrico',
                  e.target.checked
                )
              }
            />
            <span>Riesgo eléctrico</span>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.evaluacionRiesgos.riesgoSustanciasPeligrosas}
              onChange={(e) =>
                updateSectionField(
                  'evaluacionRiesgos',
                  'riesgoSustanciasPeligrosas',
                  e.target.checked
                )
              }
            />
            <span>Sustancias peligrosas</span>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.evaluacionRiesgos.riesgoCondicionesClimaticas}
              onChange={(e) =>
                updateSectionField(
                  'evaluacionRiesgos',
                  'riesgoCondicionesClimaticas',
                  e.target.checked
                )
              }
            />
            <span>Condiciones climáticas</span>
          </label>
        </div>

        <label className="field field--full field--top">
          <span>Otros riesgos</span>
          <textarea
            rows={2}
            value={form.evaluacionRiesgos.otrosRiesgos}
            onChange={(e) =>
              updateSectionField(
                'evaluacionRiesgos',
                'otrosRiesgos',
                e.target.value
              )
            }
            placeholder="Ej. Piso resbaloso, objetos suspendidos, cables cercanos"
          />
        </label>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <div className="section-card__titleWrap">
            <div className="section-card__icon">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3>Condiciones del área</h3>
              <p>Marque lo mínimo necesario antes de subir.</p>
            </div>
          </div>

          <span
            className={`status-pill ${condicionesComplete ? 'is-complete' : ''}`}
          >
            {condicionesComplete ? 'Completo' : 'Pendiente'}
          </span>
        </div>

        <div className="checks-grid">
          <label className="check-item">
            <input
              type="checkbox"
              checked={form.condicionesPrevias.inspeccionAreaRealizada}
              onChange={(e) =>
                updateSectionField(
                  'condicionesPrevias',
                  'inspeccionAreaRealizada',
                  e.target.checked
                )
              }
            />
            <span>Inspección realizada</span>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.condicionesPrevias.senalizacionColocada}
              onChange={(e) =>
                updateSectionField(
                  'condicionesPrevias',
                  'senalizacionColocada',
                  e.target.checked
                )
              }
            />
            <span>Señalización colocada</span>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.condicionesPrevias.supervisionAsignada}
              onChange={(e) =>
                updateSectionField(
                  'condicionesPrevias',
                  'supervisionAsignada',
                  e.target.checked
                )
              }
            />
            <span>Supervisión asignada</span>
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <div className="section-card__titleWrap">
            <div className="section-card__icon">
              <Camera size={18} />
            </div>
            <div>
              <h3>Evidencia fotográfica</h3>
              <p>
                {isMobile
                  ? 'Tome una foto o selecciónela desde el teléfono.'
                  : 'Seleccione imágenes desde su equipo.'}
              </p>
            </div>
          </div>

          <span className={`status-pill ${fotosComplete ? 'is-complete' : ''}`}>
            {fotosComplete ? 'Completo' : 'Pendiente'}
          </span>
        </div>

        <label className="upload-box">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosChange}
            {...(isMobile ? { capture: 'environment' as const } : {})}
          />

          <div className="upload-box__content">
            <ImagePlus size={22} />
            <strong>
              {isMobile ? 'Tomar o seleccionar foto' : 'Subir imágenes'}
            </strong>
            <span>Máximo {MAX_PHOTOS} fotos</span>
          </div>
        </label>

        {photoPreviews.length > 0 && (
          <div className="photo-grid">
            {photoPreviews.map((src, index) => (
              <div className="photo-card" key={`${src}-${index}`}>
                <img src={src} alt={`Evidencia ${index + 1}`} />
                <button
                  type="button"
                  className="photo-card__remove"
                  onClick={() => removePhoto(index)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="feedback feedback--error">{error}</div>}

      {success && (
        <div className="feedback feedback--success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      <button
        className="submit-review"
        disabled={!formReady || saving}
        onClick={handleSubmit}
      >
        {saving ? 'Enviando solicitud...' : 'Enviar a autorización'}
      </button>
    </section>
  )
}