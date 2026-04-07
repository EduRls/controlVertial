import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore'
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  HardHat,
  ImagePlus,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { db, storage } from '../../../firebase/firebase'
import { useAuth } from '../../../context/AuthContext'
import './NuevaRevision.css'

type UploadedPhoto = {
  nombre: string
  ruta: string
  url: string
  tipo: string
  size: number
}

type FormState = {
  datosGenerales: {
    unidad: string
    tipoTrabajo: string
    lugarArea: string
    alturaAproximada: string
    fecha: string
    horaInicio: string
    horaTermino: string
    tiempoEstimadoMin: string
  }

  personalCompetente: {
    tipo: 'Empleado' | 'Contratista'
    cuentaConDC3: boolean
    evaluacionMedicaApto: boolean
    anexaResultadoMedico: boolean
  }

  equipoUtilizar: {
    andamio: boolean
    elevadorElectricoPersonal: boolean
    escaleraTijera: boolean
    escaleraExtension: boolean
    escaleraFija: boolean
    equipoElevacionArticulado: boolean
    escaleraMarina: boolean
    pasoGatoTecho: boolean
    otros: string
  }

  proteccionCaidas: {
    arnes: boolean
    lineaVida: boolean
    limitadorCaida: boolean
    anclaje: boolean
    otros: string
  }

  epp: {
    zapatoSeguridad: boolean
    guantesSeguridad: boolean
    guantesPiel: boolean
    cascoBarbiquejo: boolean
    lentesSeguridad: boolean
    taponesAuditivos: boolean
    conchasAuditivas: boolean
    chalecoReflectivo: boolean
    otros: string
  }

  condicionesClimaticas: {
    lluvia: boolean
    viento: boolean
    temperaturaExtrema: boolean
    hieloGranizo: boolean
    nieve: boolean
    otros: string
  }

  requisitosAntesIniciar: {
    areaDelimitada: boolean
    serviciosDeshabilitados: boolean
    controlEnergiasPeligrosas: boolean
    inspeccionEquiposUtilizar: boolean
    inspeccionArnes: boolean
    inspeccionLineaVida: boolean
    inspeccionEpp: boolean
    sistemaComunicacion: boolean
  }

  observacionesComentarios: string
}

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
  datosGenerales: {
    unidad: '',
    tipoTrabajo: 'Relleno de cilindro / tanque estacionario',
    lugarArea: '',
    alturaAproximada: '',
    fecha: getNowDate(),
    horaInicio: getNowTime(),
    horaTermino: '',
    tiempoEstimadoMin: '',
  },

  personalCompetente: {
    tipo: 'Empleado',
    cuentaConDC3: false,
    evaluacionMedicaApto: false,
    anexaResultadoMedico: false,
  },

  equipoUtilizar: {
    andamio: false,
    elevadorElectricoPersonal: false,
    escaleraTijera: false,
    escaleraExtension: true,
    escaleraFija: false,
    equipoElevacionArticulado: false,
    escaleraMarina: false,
    pasoGatoTecho: false,
    otros: '',
  },

  proteccionCaidas: {
    arnes: true,
    lineaVida: true,
    limitadorCaida: false,
    anclaje: true,
    otros: '',
  },

  epp: {
    zapatoSeguridad: true,
    guantesSeguridad: true,
    guantesPiel: false,
    cascoBarbiquejo: true,
    lentesSeguridad: true,
    taponesAuditivos: false,
    conchasAuditivas: false,
    chalecoReflectivo: true,
    otros: '',
  },

  condicionesClimaticas: {
    lluvia: false,
    viento: false,
    temperaturaExtrema: false,
    hieloGranizo: false,
    nieve: false,
    otros: '',
  },

  requisitosAntesIniciar: {
    areaDelimitada: false,
    serviciosDeshabilitados: false,
    controlEnergiasPeligrosas: false,
    inspeccionEquiposUtilizar: false,
    inspeccionArnes: false,
    inspeccionLineaVida: false,
    inspeccionEpp: false,
    sistemaComunicacion: false,
  },

  observacionesComentarios: '',
}

export default function NuevaRevision() {
  const { user, userProfile } = useAuth()

  const [form, setForm] = useState<FormState>(initialForm)
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
    if (!userProfile) return

    setForm((prev) => ({
      ...prev,
      datosGenerales: {
        ...prev.datosGenerales,
        unidad: userProfile.rutaAsignada || '',
      },
    }))
  }, [userProfile])

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [photoPreviews])

  type NestedSection =
    | 'datosGenerales'
    | 'personalCompetente'
    | 'equipoUtilizar'
    | 'proteccionCaidas'
    | 'epp'
    | 'condicionesClimaticas'
    | 'requisitosAntesIniciar'

  const updateNestedField = <
    S extends NestedSection,
    K extends keyof FormState[S]
  >(
    section: S,
    field: K,
    value: FormState[S][K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as FormState[S]),
        [field]: value,
      },
    }))
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

  const datosGeneralesComplete = useMemo(() => {
    return Boolean(
      form.datosGenerales.unidad.trim() &&
      form.datosGenerales.lugarArea.trim() &&
      form.datosGenerales.alturaAproximada.trim() &&
      form.datosGenerales.fecha &&
      form.datosGenerales.horaInicio &&
      form.datosGenerales.tiempoEstimadoMin.trim()
    )
  }, [form.datosGenerales])

  const personalComplete = useMemo(() => {
    return Boolean(userProfile?.fichaIdentificacion?.nombre)
  }, [userProfile])

  const equipoComplete = useMemo(() => {
    return (
      Object.values(form.equipoUtilizar).some((value) => value === true) ||
      form.equipoUtilizar.otros.trim().length > 0
    )
  }, [form.equipoUtilizar])

  const seguridadComplete = useMemo(() => {
    return (
      Object.values(form.proteccionCaidas).some((value) => value === true) ||
      form.proteccionCaidas.otros.trim().length > 0
    )
  }, [form.proteccionCaidas])

  const requisitosComplete = useMemo(() => {
    return form.requisitosAntesIniciar.areaDelimitada &&
      form.requisitosAntesIniciar.inspeccionEquiposUtilizar &&
      form.requisitosAntesIniciar.inspeccionEpp &&
      form.requisitosAntesIniciar.sistemaComunicacion
  }, [form.requisitosAntesIniciar])

  const progressCount = [
    datosGeneralesComplete,
    personalComplete,
    equipoComplete,
    seguridadComplete,
    requisitosComplete,
  ].filter(Boolean).length

  const climaBloqueante =
    form.condicionesClimaticas.lluvia ||
    form.condicionesClimaticas.viento ||
    form.condicionesClimaticas.temperaturaExtrema ||
    form.condicionesClimaticas.hieloGranizo ||
    form.condicionesClimaticas.nieve

  const formReady =
    !!user?.uid &&
    !!userProfile &&
    userProfile.rol === 'operador' &&
    datosGeneralesComplete &&
    personalComplete &&
    equipoComplete &&
    seguridadComplete &&
    requisitosComplete &&
    !climaBloqueante

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

    if (!user?.uid || !userProfile) {
      setError('No se encontró la información del operador.')
      return
    }

    if (userProfile.rol !== 'operador') {
      setError('Solo un operador puede enviar esta solicitud.')
      return
    }

    if (climaBloqueante) {
      setError(
        'No se puede autorizar la solicitud si existe una condición climatológica bloqueante.'
      )
      return
    }

    if (!formReady) {
      setError('Complete los campos obligatorios antes de enviar.')
      return
    }

    const altura = Number(form.datosGenerales.alturaAproximada)
    const tiempoEstimadoMin = Number(form.datosGenerales.tiempoEstimadoMin)

    if (Number.isNaN(altura) || altura <= 0) {
      setError('La altura aproximada debe ser mayor a 0.')
      return
    }

    if (Number.isNaN(tiempoEstimadoMin) || tiempoEstimadoMin <= 0) {
      setError('El tiempo estimado debe ser mayor a 0.')
      return
    }

    try {
      setSaving(true)

      const folio = buildFolio()
      const uploadedPhotos = await uploadPhotos(folio)

      const payload = {
        folio,
        fechaSolicitud: serverTimestamp(),
        estatus: 'pendiente',
        autorizacion: false,

        operador: {
          uid: user.uid,
          nombre: userProfile.fichaIdentificacion.nombre,
          numeroEmpleado: userProfile.fichaIdentificacion.numeroEmpleado,
          telefono: userProfile.fichaIdentificacion.telefono,
          correo: userProfile.correo || user.email || '',
          rol: userProfile.rol,
          rutaAsignada: userProfile.rutaAsignada || '',
          area: userProfile.fichaIdentificacion.area,
          cargo: userProfile.fichaIdentificacion.cargo,
        },

        datosGenerales: {
          unidad: form.datosGenerales.unidad.trim(),
          responsableAutorizaNombre: '',
          supervisorNombre: '',
          tipoTrabajo: form.datosGenerales.tipoTrabajo,
          lugarArea: form.datosGenerales.lugarArea.trim(),
          alturaAproximada: altura,
          fecha: form.datosGenerales.fecha,
          horaInicio: form.datosGenerales.horaInicio,
          horaTermino: form.datosGenerales.horaTermino || '',
          tiempoEstimadoMin,
        },

        personalCompetente: [
          {
            numeroEmpleado: userProfile.fichaIdentificacion.numeroEmpleado || '',
            nombre: userProfile.fichaIdentificacion.nombre || '',
            tipo: form.personalCompetente.tipo,
            cuentaConDC3: form.personalCompetente.cuentaConDC3,
            evaluacionMedicaApto: form.personalCompetente.evaluacionMedicaApto,
            anexaResultadoMedico: form.personalCompetente.anexaResultadoMedico,
            firmaEmpleado: '',
          },
        ],

        equipoUtilizar: {
          ...form.equipoUtilizar,
          otros: form.equipoUtilizar.otros.trim(),
        },

        proteccionCaidas: {
          ...form.proteccionCaidas,
          otros: form.proteccionCaidas.otros.trim(),
        },

        epp: {
          ...form.epp,
          otros: form.epp.otros.trim(),
        },

        condicionesClimaticas: {
          ...form.condicionesClimaticas,
          otros: form.condicionesClimaticas.otros.trim(),
          bloqueoAutomatico: climaBloqueante,
        },

        requisitosAntesIniciar: form.requisitosAntesIniciar,

        requisitosAlTerminar: {
          barrerasRetiradas: false,
          supervisorNotificado: false,
          personalAreaNotificado: false,
          areaLimpiaOrdenada: false,
          herramientasRecogidas: false,
          materialesRetirados: false,
          aprobadorCierreNombre: '',
          aprobadorCierreFirma: '',
          aprobadorCierreFecha: '',
        },

        observacionesComentarios: form.observacionesComentarios.trim(),

        aprobaciones: {
          aprobadorAreaNombre: '',
          empleadoTurnoFirma: '',
          supervisorAreaFirma: '',
          contratistaFirma: '',
        },

        evidencia: {
          totalFotos: uploadedPhotos.length,
          fotos: uploadedPhotos,
        },

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
        datosGenerales: {
          ...initialForm.datosGenerales,
          unidad: userProfile.rutaAsignada || '',
          fecha: getNowDate(),
          horaInicio: getNowTime(),
        },
      })
    } catch (err) {
      console.error(err)
      setError('Ocurrió un error al guardar la solicitud.')
    } finally {
      setSaving(false)
    }
  }

  if (!userProfile) {
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
        <span className="nueva-revision-page__eyebrow">Solicitud de trabajo</span>
        <h1>Permiso para trabajo en alturas</h1>
        <p>Capture únicamente la información necesaria antes de iniciar.</p>

        <div className="nueva-revision-progress">
          <span>{progressCount}/5 apartados completos</span>
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
          <strong>{userProfile.fichaIdentificacion.nombre || 'Operador'}</strong>
          <span>
            #{userProfile.fichaIdentificacion.numeroEmpleado || 'Sin número'} ·{' '}
            {userProfile.correo || 'Sin correo'}
          </span>
          <small>
            Unidad: {userProfile.rutaAsignada || 'Sin ruta'} · Cargo:{' '}
            {userProfile.fichaIdentificacion.cargo || 'Operador'}
          </small>
        </div>
      </div>

      {climaBloqueante && (
        <div className="feedback feedback--error">
          Existe una condición climatológica que bloquea la autorización del permiso.
        </div>
      )}

      <div className="section-card">
        <div className="section-card__head">
          <div className="section-card__titleWrap">
            <div className="section-card__icon">
              <ClipboardList size={18} />
            </div>
            <div>
              <h3>Datos generales</h3>
              <p>Unidad, lugar, altura, fecha y tiempo estimado.</p>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Unidad</span>
            <input
              type="text"
              value={form.datosGenerales.unidad}
              onChange={(e) =>
                updateNestedField('datosGenerales', 'unidad', e.target.value)
              }
            />
          </label>

          <label className="field">
            <span>Altura aproximada (m)</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={form.datosGenerales.alturaAproximada}
              onChange={(e) =>
                updateNestedField(
                  'datosGenerales',
                  'alturaAproximada',
                  e.target.value
                )
              }
            />
          </label>

          <label className="field field--full">
            <span>Lugar o área</span>
            <input
              type="text"
              value={form.datosGenerales.lugarArea}
              onChange={(e) =>
                updateNestedField('datosGenerales', 'lugarArea', e.target.value)
              }
              placeholder="Ej. Techo de casa habitación"
            />
          </label>

          <label className="field">
            <span>Fecha</span>
            <input
              type="date"
              value={form.datosGenerales.fecha}
              onChange={(e) =>
                updateNestedField('datosGenerales', 'fecha', e.target.value)
              }
            />
          </label>

          <label className="field">
            <span>Hora de inicio</span>
            <input
              type="time"
              value={form.datosGenerales.horaInicio}
              onChange={(e) =>
                updateNestedField('datosGenerales', 'horaInicio', e.target.value)
              }
            />
          </label>

          <label className="field">
            <span>Hora de término</span>
            <input
              type="time"
              value={form.datosGenerales.horaTermino}
              onChange={(e) =>
                updateNestedField('datosGenerales', 'horaTermino', e.target.value)
              }
            />
          </label>

          <label className="field">
            <span>Tiempo estimado (min)</span>
            <input
              type="number"
              min="1"
              value={form.datosGenerales.tiempoEstimadoMin}
              onChange={(e) =>
                updateNestedField(
                  'datosGenerales',
                  'tiempoEstimadoMin',
                  e.target.value
                )
              }
            />
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <div className="section-card__titleWrap">
            <div className="section-card__icon">
              <Users size={18} />
            </div>
            <div>
              <h3>Personal autorizado</h3>
              <p>Se llena casi todo automáticamente con los datos del operador.</p>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span># Empleado</span>
            <input
              type="text"
              value={userProfile.fichaIdentificacion.numeroEmpleado || ''}
              disabled
            />
          </label>

          <label className="field field--full">
            <span>Nombre del empleado autorizado</span>
            <input
              type="text"
              value={userProfile.fichaIdentificacion.nombre || ''}
              disabled
            />
          </label>

          <label className="field">
            <span>Tipo</span>
            <select
              value={form.personalCompetente.tipo}
              onChange={(e) =>
                updateNestedField(
                  'personalCompetente',
                  'tipo',
                  e.target.value as 'Empleado' | 'Contratista'
                )
              }
            >
              <option value="Empleado">Empleado</option>
              <option value="Contratista">Contratista</option>
            </select>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.personalCompetente.cuentaConDC3}
              onChange={(e) =>
                updateNestedField(
                  'personalCompetente',
                  'cuentaConDC3',
                  e.target.checked
                )
              }
            />
            <span>Cuenta con DC3</span>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.personalCompetente.evaluacionMedicaApto}
              onChange={(e) =>
                updateNestedField(
                  'personalCompetente',
                  'evaluacionMedicaApto',
                  e.target.checked
                )
              }
            />
            <span>Evaluación médica apto</span>
          </label>

          <label className="check-item">
            <input
              type="checkbox"
              checked={form.personalCompetente.anexaResultadoMedico}
              onChange={(e) =>
                updateNestedField(
                  'personalCompetente',
                  'anexaResultadoMedico',
                  e.target.checked
                )
              }
            />
            <span>Anexa resultado médico</span>
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card__head">
          <div className="section-card__titleWrap">
            <div className="section-card__icon">
              <Wrench size={18} />
            </div>
            <div>
              <h3>Equipo a utilizar</h3>
              <p>Marque solo lo que llevará realmente.</p>
            </div>
          </div>
        </div>

        <div className="checks-grid">
          {[
            ['andamio', 'Andamio'],
            ['elevadorElectricoPersonal', 'Elevador eléctrico personal'],
            ['escaleraTijera', 'Escalera tijera'],
            ['escaleraExtension', 'Escalera extensión'],
            ['escaleraFija', 'Escalera fija'],
            ['equipoElevacionArticulado', 'Equipo elevación articulado'],
            ['escaleraMarina', 'Escalera marina'],
            ['pasoGatoTecho', 'Paso de gato en techo'],
          ].map(([key, label]) => (
            <label className="check-item" key={key}>
              <input
                type="checkbox"
                checked={form.equipoUtilizar[key as keyof FormState['equipoUtilizar']] as boolean}
                onChange={(e) =>
                  updateNestedField(
                    'equipoUtilizar',
                    key as keyof FormState['equipoUtilizar'],
                    e.target.checked as never
                  )
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <label className="field field--full field--top">
          <span>Otros</span>
          <input
            type="text"
            value={form.equipoUtilizar.otros}
            onChange={(e) =>
              updateNestedField('equipoUtilizar', 'otros', e.target.value)
            }
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
              <h3>Protección y condiciones</h3>
              <p>Protección contra caídas, EPP, clima y revisión previa.</p>
            </div>
          </div>
        </div>

        <h4>Sistema de protección contra caídas</h4>
        <div className="checks-grid">
          {[
            ['arnes', 'Arnés'],
            ['lineaVida', 'Línea de vida'],
            ['limitadorCaida', 'Limitador de caída'],
            ['anclaje', 'Anclaje'],
          ].map(([key, label]) => (
            <label className="check-item" key={key}>
              <input
                type="checkbox"
                checked={form.proteccionCaidas[key as keyof FormState['proteccionCaidas']] as boolean}
                onChange={(e) =>
                  updateNestedField(
                    'proteccionCaidas',
                    key as keyof FormState['proteccionCaidas'],
                    e.target.checked as never
                  )
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <label className="field field--full field--top">
          <span>Otros</span>
          <input
            type="text"
            value={form.proteccionCaidas.otros}
            onChange={(e) =>
              updateNestedField('proteccionCaidas', 'otros', e.target.value)
            }
          />
        </label>

        <h4>Equipo de protección personal</h4>
        <div className="checks-grid">
          {[
            ['zapatoSeguridad', 'Zapato de seguridad'],
            ['guantesSeguridad', 'Guantes de seguridad'],
            ['guantesPiel', 'Guantes de piel'],
            ['cascoBarbiquejo', 'Casco con barbiquejo'],
            ['lentesSeguridad', 'Lentes de seguridad'],
            ['taponesAuditivos', 'Tapones auditivos'],
            ['conchasAuditivas', 'Conchas auditivas'],
            ['chalecoReflectivo', 'Chaleco reflectivo'],
          ].map(([key, label]) => (
            <label className="check-item" key={key}>
              <input
                type="checkbox"
                checked={form.epp[key as keyof FormState['epp']] as boolean}
                onChange={(e) =>
                  updateNestedField(
                    'epp',
                    key as keyof FormState['epp'],
                    e.target.checked as never
                  )
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <label className="field field--full field--top">
          <span>Otros</span>
          <input
            type="text"
            value={form.epp.otros}
            onChange={(e) =>
              updateNestedField('epp', 'otros', e.target.value)
            }
          />
        </label>

        <h4>Condiciones climatológicas</h4>
        <div className="checks-grid">
          {[
            ['lluvia', 'Lluvia'],
            ['viento', 'Viento'],
            ['temperaturaExtrema', 'Temperatura extrema'],
            ['hieloGranizo', 'Hielo / granizo'],
            ['nieve', 'Nieve'],
          ].map(([key, label]) => (
            <label className="check-item" key={key}>
              <input
                type="checkbox"
                checked={form.condicionesClimaticas[key as keyof FormState['condicionesClimaticas']] as boolean}
                onChange={(e) =>
                  updateNestedField(
                    'condicionesClimaticas',
                    key as keyof FormState['condicionesClimaticas'],
                    e.target.checked as never
                  )
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        <label className="field field--full field--top">
          <span>Otros</span>
          <input
            type="text"
            value={form.condicionesClimaticas.otros}
            onChange={(e) =>
              updateNestedField(
                'condicionesClimaticas',
                'otros',
                e.target.value
              )
            }
          />
        </label>

        <h4>Requisitos antes de iniciar</h4>
        <div className="checks-grid">
          {[
            ['areaDelimitada', 'Área delimitada'],
            ['serviciosDeshabilitados', 'Servicios deshabilitados si aplica'],
            ['controlEnergiasPeligrosas', 'Control de energías peligrosas'],
            ['inspeccionEquiposUtilizar', 'Inspección de equipos a utilizar'],
            ['inspeccionArnes', 'Inspección de arnés'],
            ['inspeccionLineaVida', 'Inspección de línea de vida'],
            ['inspeccionEpp', 'Inspección de EPP'],
            ['sistemaComunicacion', 'Sistema de comunicación efectivo'],
          ].map(([key, label]) => (
            <label className="check-item" key={key}>
              <input
                type="checkbox"
                checked={form.requisitosAntesIniciar[key as keyof FormState['requisitosAntesIniciar']] as boolean}
                onChange={(e) =>
                  updateNestedField(
                    'requisitosAntesIniciar',
                    key as keyof FormState['requisitosAntesIniciar'],
                    e.target.checked as never
                  )
                }
              />
              <span>{label}</span>
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
              <h3>Observaciones y evidencia</h3>
              <p>Agregue algún comentario relevante y, si aplica, fotografías.</p>
            </div>
          </div>
        </div>

        <label className="field field--full field--top">
          <span>Observaciones / comentarios</span>
          <textarea
            rows={3}
            value={form.observacionesComentarios}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                observacionesComentarios: e.target.value,
              }))
            }
          />
        </label>

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
        {saving ? 'Enviando solicitud...' : 'Enviar solicitud'}
      </button>
    </section>
  )
}