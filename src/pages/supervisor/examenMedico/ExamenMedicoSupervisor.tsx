import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import {
  HeartPulse,
  UserRound,
  ClipboardList,
  Stethoscope,
  ShieldCheck,
  Phone,
  Users,
  Route,
} from 'lucide-react'
import { db } from '../../../firebase/firebase'
import { useAuth } from '../../../context/AuthContext'
import './ExamenMedicoSupervisor.css'

type SiNo = 'si' | 'no' | ''

type PatologicoItem = {
  respuesta: SiNo
  descripcion: string
}

type OperadorOption = {
  id: string
  nombre: string
  numeroEmpleado?: string
  rutaAsignada?: string
  telefono?: string
  correo?: string
  activo?: boolean
  fichaIdentificacion?: {
    area?: string
    cargo?: string
    edad?: number | string
    genero?: string
    numeroEmpleado?: string
    telefono?: string
  }
  contactoEmergencia?: {
    nombre?: string
    parentesco?: string
    telefono?: string
  }
}

const patologicosIniciales: Record<string, PatologicoItem> = {
  enfermedadCronica: { respuesta: '', descripcion: '' },
  enfermedadNeurologica: { respuesta: '', descripcion: '' },
  enfermedadMusculoesqueletica: { respuesta: '', descripcion: '' },
  enfermedadCardiovascular: { respuesta: '', descripcion: '' },
  enfermedadRespiratoria: { respuesta: '', descripcion: '' },
  fobiaAlturas: { respuesta: '', descripcion: '' },
  sintomasEnfermedad: { respuesta: '', descripcion: '' },
  medicamentoActual: { respuesta: '', descripcion: '' },
  alergias: { respuesta: '', descripcion: '' },
  incidentesAlturas: { respuesta: '', descripcion: '' },
}

export default function ExamenMedicoSupervisor() {
  const { user, userData } = useAuth() as {
    user: { uid: string } | null
    userData?: { nombre?: string; rol?: string }
  }

  const [operadores, setOperadores] = useState<OperadorOption[]>([])
  const [loadingOperadores, setLoadingOperadores] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [operadorId, setOperadorId] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  const operadorSeleccionado = useMemo(
    () => operadores.find((op) => op.id === operadorId) || null,
    [operadorId, operadores]
  )

  const [noPatologicos, setNoPatologicos] = useState({
    ultimaVezAlcohol: '',
    drogasAbuso: '' as SiNo,
    drogasAbusoDescripcion: '',
    ultimaComidaHora: '',
    durmioNormalmente: '' as SiNo,
    horasSueno: '',
  })

  const [patologicos, setPatologicos] = useState(patologicosIniciales)

  const [exploracion, setExploracion] = useState({
    presionArterial: '',
    frecuenciaCardiaca: '',
    temperatura: '',
    frecuenciaRespiratoria: '',
    peso: '',
    estatura: '',
    hallazgosPositivos: '',
  })

  const [conclusion, setConclusion] = useState({
    apto: false,
    noApto: false,
    comentariosAdicionales: '',
    cedulaMedico: '',
    nombreMedico: '',
  })

  useEffect(() => {
    const cargarOperadores = async () => {
      try {
        setLoadingOperadores(true)

        const q = query(
          collection(db, 'users'),
          where('rol', '==', 'operador'),
          orderBy('nombre', 'asc')
        )

        const snap = await getDocs(q)

        const lista: OperadorOption[] = snap.docs.map((doc) => {
          const data = doc.data()

          return {
            id: doc.id,
            nombre: data.nombre || 'Sin nombre',
            numeroEmpleado:
              data.fichaIdentificacion?.numeroEmpleado ||
              data.numeroEmpleado ||
              '',
            rutaAsignada: data.rutaAsignada || '',
            telefono:
              data.fichaIdentificacion?.telefono ||
              data.telefono ||
              '',
            correo: data.correo || '',
            activo: data.activo ?? true,
            fichaIdentificacion: {
              area: data.fichaIdentificacion?.area || '',
              cargo: data.fichaIdentificacion?.cargo || '',
              edad: data.fichaIdentificacion?.edad ?? '',
              genero: data.fichaIdentificacion?.genero || '',
              numeroEmpleado:
                data.fichaIdentificacion?.numeroEmpleado ||
                data.numeroEmpleado ||
                '',
              telefono:
                data.fichaIdentificacion?.telefono ||
                data.telefono ||
                '',
            },
            contactoEmergencia: {
              nombre: data.contactoEmergencia?.nombre || '',
              parentesco: data.contactoEmergencia?.parentesco || '',
              telefono: data.contactoEmergencia?.telefono || '',
            },
          }
        })

        setOperadores(lista)
      } catch (error) {
        console.error('Error cargando operadores:', error)
        setMensaje('No fue posible cargar la lista de operadores.')
      } finally {
        setLoadingOperadores(false)
      }
    }

    cargarOperadores()
  }, [])

  const handlePatologicoChange = (
    key: string,
    field: 'respuesta' | 'descripcion',
    value: string
  ) => {
    setPatologicos((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }))
  }

  const resetForm = () => {
    setOperadorId('')
    setFecha(new Date().toISOString().slice(0, 10))

    setNoPatologicos({
      ultimaVezAlcohol: '',
      drogasAbuso: '',
      drogasAbusoDescripcion: '',
      ultimaComidaHora: '',
      durmioNormalmente: '',
      horasSueno: '',
    })

    setPatologicos(patologicosIniciales)

    setExploracion({
      presionArterial: '',
      frecuenciaCardiaca: '',
      temperatura: '',
      frecuenciaRespiratoria: '',
      peso: '',
      estatura: '',
      hallazgosPositivos: '',
    })

    setConclusion({
      apto: false,
      noApto: false,
      comentariosAdicionales: '',
      cedulaMedico: '',
      nombreMedico: '',
    })
  }

  const handleGuardar = async () => {
    setMensaje('')

    if (!operadorId || !operadorSeleccionado) {
      setMensaje('Selecciona un operador antes de guardar.')
      return
    }

    try {
      setSaving(true)

      await addDoc(collection(db, 'registros_medicos'), {
        operadorId: operadorSeleccionado.id,
        operadorNombre: operadorSeleccionado.nombre,
        fechaEvaluacion: fecha,
        createdAt: serverTimestamp(),

        supervisorId: user?.uid || '',
        supervisorNombre: userData?.nombre || '',

        operadorSnapshot: {
          nombre: operadorSeleccionado.nombre || '',
          correo: operadorSeleccionado.correo || '',
          telefono:
            operadorSeleccionado.fichaIdentificacion?.telefono ||
            operadorSeleccionado.telefono ||
            '',
          rutaAsignada: operadorSeleccionado.rutaAsignada || '',
          activo: operadorSeleccionado.activo ?? true,
          fichaIdentificacion: {
            area: operadorSeleccionado.fichaIdentificacion?.area || '',
            cargo: operadorSeleccionado.fichaIdentificacion?.cargo || '',
            edad: operadorSeleccionado.fichaIdentificacion?.edad ?? '',
            genero: operadorSeleccionado.fichaIdentificacion?.genero || '',
            numeroEmpleado:
              operadorSeleccionado.fichaIdentificacion?.numeroEmpleado || '',
            telefono:
              operadorSeleccionado.fichaIdentificacion?.telefono || '',
          },
          contactoEmergencia: {
            nombre: operadorSeleccionado.contactoEmergencia?.nombre || '',
            parentesco:
              operadorSeleccionado.contactoEmergencia?.parentesco || '',
            telefono: operadorSeleccionado.contactoEmergencia?.telefono || '',
          },
        },

        noPatologicos,
        patologicos,
        exploracion,
        conclusion,
      })

      setMensaje('Registro médico guardado correctamente.')
      resetForm()
    } catch (error) {
      console.error('Error guardando registro médico:', error)
      setMensaje('No se pudo guardar el registro médico.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="examen-medico-page">
      <div className="examen-medico-page__header">
        <h1>Examen médico</h1>
        <p>Registro previo de aptitud física para trabajos en altura</p>
      </div>

      <section className="examen-card">
        <div className="examen-card__title">
          <HeartPulse size={18} />
          <h2>Datos principales</h2>
        </div>

        <div className="examen-grid examen-grid--2">
          <div className="field">
            <label>Operador</label>
            <select
              value={operadorId}
              onChange={(e) => setOperadorId(e.target.value)}
              disabled={loadingOperadores}
            >
              <option value="">
                {loadingOperadores ? 'Cargando operadores...' : 'Seleccione un operador'}
              </option>

              {operadores.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
        </div>

        {operadorSeleccionado && (
          <div className="empleado-card-preview">
            <div className="empleado-card-preview__header">
              <div className="empleado-card-preview__icon">
                <UserRound size={18} />
              </div>

              <div>
                <h3>{operadorSeleccionado.nombre}</h3>
                <p>
                  {operadorSeleccionado.fichaIdentificacion?.cargo || 'Operador'}
                </p>
              </div>

              <span
                className={`empleado-status ${
                  operadorSeleccionado.activo ? 'is-active' : 'is-inactive'
                }`}
              >
                {operadorSeleccionado.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="empleado-card-preview__grid">
              <div className="empleado-mini-card">
                <div className="empleado-mini-card__label">Número de empleado</div>
                <div className="empleado-mini-card__value">
                  {operadorSeleccionado.fichaIdentificacion?.numeroEmpleado || '—'}
                </div>
              </div>

              <div className="empleado-mini-card">
                <div className="empleado-mini-card__label">Género</div>
                <div className="empleado-mini-card__value">
                  {operadorSeleccionado.fichaIdentificacion?.genero || '—'}
                </div>
              </div>

              <div className="empleado-mini-card">
                <div className="empleado-mini-card__label">Edad</div>
                <div className="empleado-mini-card__value">
                  {operadorSeleccionado.fichaIdentificacion?.edad || '—'}
                </div>
              </div>

              <div className="empleado-mini-card">
                <div className="empleado-mini-card__label">Área</div>
                <div className="empleado-mini-card__value">
                  {operadorSeleccionado.fichaIdentificacion?.area || '—'}
                </div>
              </div>

              <div className="empleado-mini-card">
                <div className="empleado-mini-card__label">Cargo</div>
                <div className="empleado-mini-card__value">
                  {operadorSeleccionado.fichaIdentificacion?.cargo || '—'}
                </div>
              </div>

              <div className="empleado-mini-card">
                <div className="empleado-mini-card__label">Ruta asignada</div>
                <div className="empleado-mini-card__value">
                  {operadorSeleccionado.rutaAsignada || '—'}
                </div>
              </div>
            </div>

            <div className="empleado-card-preview__details">
              <div className="empleado-detail-line">
                <Phone size={15} />
                <span>
                  Teléfono: {operadorSeleccionado.fichaIdentificacion?.telefono || '—'}
                </span>
              </div>

              <div className="empleado-detail-line">
                <ShieldCheck size={15} />
                <span>Correo: {operadorSeleccionado.correo || '—'}</span>
              </div>

              <div className="empleado-detail-line">
                <Route size={15} />
                <span>Ruta: {operadorSeleccionado.rutaAsignada || '—'}</span>
              </div>
            </div>

            <div className="empleado-contacto-box">
              <div className="empleado-contacto-box__title">
                <Users size={16} />
                <span>Contacto de emergencia</span>
              </div>

              <div className="empleado-contacto-box__grid">
                <div>
                  <strong>Nombre:</strong>{' '}
                  {operadorSeleccionado.contactoEmergencia?.nombre || '—'}
                </div>
                <div>
                  <strong>Parentesco:</strong>{' '}
                  {operadorSeleccionado.contactoEmergencia?.parentesco || '—'}
                </div>
                <div>
                  <strong>Teléfono:</strong>{' '}
                  {operadorSeleccionado.contactoEmergencia?.telefono || '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="examen-card">
        <div className="examen-card__title">
          <ClipboardList size={18} />
          <h2>Antecedentes no patológicos</h2>
        </div>

        <div className="examen-grid examen-grid--2">
          <div className="field">
            <label>¿Cuándo ingirió alcohol por última vez?</label>
            <input
              type="text"
              value={noPatologicos.ultimaVezAlcohol}
              onChange={(e) =>
                setNoPatologicos({
                  ...noPatologicos,
                  ultimaVezAlcohol: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>¿A qué hora fue su última comida?</label>
            <input
              type="text"
              value={noPatologicos.ultimaComidaHora}
              onChange={(e) =>
                setNoPatologicos({
                  ...noPatologicos,
                  ultimaComidaHora: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>¿Ha utilizado drogas de abuso?</label>
            <div className="radio-group">
              <button
                type="button"
                className={noPatologicos.drogasAbuso === 'si' ? 'radio-pill active' : 'radio-pill'}
                onClick={() =>
                  setNoPatologicos({ ...noPatologicos, drogasAbuso: 'si' })
                }
              >
                Sí
              </button>

              <button
                type="button"
                className={noPatologicos.drogasAbuso === 'no' ? 'radio-pill active' : 'radio-pill'}
                onClick={() =>
                  setNoPatologicos({ ...noPatologicos, drogasAbuso: 'no' })
                }
              >
                No
              </button>
            </div>
          </div>

          <div className="field">
            <label>Explique cuál</label>
            <input
              type="text"
              value={noPatologicos.drogasAbusoDescripcion}
              onChange={(e) =>
                setNoPatologicos({
                  ...noPatologicos,
                  drogasAbusoDescripcion: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>¿Durmió normalmente la noche anterior?</label>
            <div className="radio-group">
              <button
                type="button"
                className={noPatologicos.durmioNormalmente === 'si' ? 'radio-pill active' : 'radio-pill'}
                onClick={() =>
                  setNoPatologicos({
                    ...noPatologicos,
                    durmioNormalmente: 'si',
                  })
                }
              >
                Sí
              </button>

              <button
                type="button"
                className={noPatologicos.durmioNormalmente === 'no' ? 'radio-pill active' : 'radio-pill'}
                onClick={() =>
                  setNoPatologicos({
                    ...noPatologicos,
                    durmioNormalmente: 'no',
                  })
                }
              >
                No
              </button>
            </div>
          </div>

          <div className="field">
            <label>¿Cuántas horas?</label>
            <input
              type="text"
              value={noPatologicos.horasSueno}
              onChange={(e) =>
                setNoPatologicos({
                  ...noPatologicos,
                  horasSueno: e.target.value,
                })
              }
            />
          </div>
        </div>
      </section>

      <section className="examen-card">
        <div className="examen-card__title">
          <Stethoscope size={18} />
          <h2>Antecedentes patológicos</h2>
        </div>

        <div className="patologicos-list">
          {[
            ['enfermedadCronica', '¿Padece alguna enfermedad crónica?'],
            ['enfermedadNeurologica', '¿Padece alguna enfermedad neurológica?'],
            ['enfermedadMusculoesqueletica', '¿Padece alguna enfermedad musculoesquelética?'],
            ['enfermedadCardiovascular', '¿Padece alguna enfermedad cardiovascular?'],
            ['enfermedadRespiratoria', '¿Padece alguna enfermedad respiratoria?'],
            ['fobiaAlturas', '¿Padece fobia o miedo a las alturas?'],
            ['sintomasEnfermedad', '¿Tiene síntomas de alguna enfermedad?'],
            ['medicamentoActual', '¿Toma algún tipo de medicamento?'],
            ['alergias', '¿Padece alergia a alguna sustancia o medicamento?'],
            ['incidentesAlturas', '¿Ha tenido incidentes laborando en alturas?'],
          ].map(([key, label], index) => (
            <div className="patologico-row" key={key}>
              <div className="patologico-row__question">
                {index + 1}. {label}
              </div>

              <div className="patologico-row__actions">
                <button
                  type="button"
                  className={
                    patologicos[key].respuesta === 'si'
                      ? 'radio-pill active'
                      : 'radio-pill'
                  }
                  onClick={() => handlePatologicoChange(key, 'respuesta', 'si')}
                >
                  Sí
                </button>

                <button
                  type="button"
                  className={
                    patologicos[key].respuesta === 'no'
                      ? 'radio-pill active'
                      : 'radio-pill'
                  }
                  onClick={() => handlePatologicoChange(key, 'respuesta', 'no')}
                >
                  No
                </button>
              </div>

              <div className="field">
                <label>Describa</label>
                <input
                  type="text"
                  value={patologicos[key].descripcion}
                  onChange={(e) =>
                    handlePatologicoChange(key, 'descripcion', e.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="examen-card">
        <div className="examen-card__title">
          <HeartPulse size={18} />
          <h2>Exploración física</h2>
        </div>

        <div className="examen-grid examen-grid--3">
          <div className="field">
            <label>Presión arterial</label>
            <input
              type="text"
              value={exploracion.presionArterial}
              onChange={(e) =>
                setExploracion({ ...exploracion, presionArterial: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Frecuencia cardiaca</label>
            <input
              type="text"
              value={exploracion.frecuenciaCardiaca}
              onChange={(e) =>
                setExploracion({
                  ...exploracion,
                  frecuenciaCardiaca: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Temperatura</label>
            <input
              type="text"
              value={exploracion.temperatura}
              onChange={(e) =>
                setExploracion({ ...exploracion, temperatura: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Frecuencia respiratoria</label>
            <input
              type="text"
              value={exploracion.frecuenciaRespiratoria}
              onChange={(e) =>
                setExploracion({
                  ...exploracion,
                  frecuenciaRespiratoria: e.target.value,
                })
              }
            />
          </div>

          <div className="field">
            <label>Peso</label>
            <input
              type="text"
              value={exploracion.peso}
              onChange={(e) =>
                setExploracion({ ...exploracion, peso: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Estatura</label>
            <input
              type="text"
              value={exploracion.estatura}
              onChange={(e) =>
                setExploracion({ ...exploracion, estatura: e.target.value })
              }
            />
          </div>
        </div>

        <div className="field">
          <label>Hallazgos positivos</label>
          <textarea
            rows={4}
            value={exploracion.hallazgosPositivos}
            onChange={(e) =>
              setExploracion({
                ...exploracion,
                hallazgosPositivos: e.target.value,
              })
            }
            placeholder="Describa hallazgos positivos..."
          />
        </div>
      </section>

      <section className="examen-card">
        <div className="examen-card__title">
          <ClipboardList size={18} />
          <h2>Conclusiones</h2>
        </div>

        <div className="radio-group radio-group--wide">
          <button
            type="button"
            className={conclusion.apto ? 'radio-pill active' : 'radio-pill'}
            onClick={() =>
              setConclusion({ ...conclusion, apto: true, noApto: false })
            }
          >
            Apto
          </button>

          <button
            type="button"
            className={conclusion.noApto ? 'radio-pill active' : 'radio-pill'}
            onClick={() =>
              setConclusion({ ...conclusion, apto: false, noApto: true })
            }
          >
            No apto
          </button>
        </div>

        <div className="field">
          <label>Comentarios adicionales</label>
          <textarea
            rows={4}
            value={conclusion.comentariosAdicionales}
            onChange={(e) =>
              setConclusion({
                ...conclusion,
                comentariosAdicionales: e.target.value,
              })
            }
            placeholder="Observaciones o comentarios..."
          />
        </div>

        <div className="examen-grid examen-grid--2">
          <div className="field">
            <label>Cédula profesional del médico</label>
            <input
              type="text"
              value={conclusion.cedulaMedico}
              onChange={(e) =>
                setConclusion({ ...conclusion, cedulaMedico: e.target.value })
              }
            />
          </div>

          <div className="field">
            <label>Nombre y firma del médico</label>
            <input
              type="text"
              value={conclusion.nombreMedico}
              onChange={(e) =>
                setConclusion({ ...conclusion, nombreMedico: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      {mensaje ? <div className="examen-message">{mensaje}</div> : null}

      <div className="examen-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={handleGuardar}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar registro médico'}
        </button>
      </div>
    </div>
  )
}