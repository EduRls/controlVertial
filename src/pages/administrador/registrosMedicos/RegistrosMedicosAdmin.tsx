import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import {
  Eye,
  Search,
  FileHeart,
  UserRound,
  ShieldCheck,
  HeartPulse,
  X,
  Filter,
} from 'lucide-react'
import { db } from '../../../firebase/firebase'
import './RegistrosMedicosAdmin.css'

type RegistroMedico = {
  id: string
  operadorId?: string
  operadorNombre?: string
  supervisorId?: string
  supervisorNombre?: string
  fechaEvaluacion?: string
  createdAt?: any
  noPatologicos?: {
    drogasAbuso?: string
    drogasAbusoDescripcion?: string
    durmioNormalmente?: string
    horasSueno?: string
    ultimaComidaHora?: string
    ultimaVezAlcohol?: string
  }
  exploracion?: {
    estatura?: string
    frecuenciaCardiaca?: string
    frecuenciaRespiratoria?: string
    hallazgosPositivos?: string
    peso?: string
    presionArterial?: string
    temperatura?: string
  }
  conclusion?: {
    apto?: boolean
    noApto?: boolean
    cedulaMedico?: string
    comentariosAdicionales?: string
    nombreMedico?: string
  }
  operadorSnapshot?: {
    activo?: boolean
    nombre?: string
    correo?: string
    rutaAsignada?: string
    telefono?: string
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
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatTimestamp(timestamp: any) {
  if (!timestamp?.seconds) return '—'

  const date = new Date(timestamp.seconds * 1000)
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getEstadoConclusion(conclusion?: RegistroMedico['conclusion']) {
  if (conclusion?.apto) return 'Apto'
  if (conclusion?.noApto) return 'No apto'
  return 'Sin definir'
}

export default function RegistrosMedicosAdmin() {
  const [registros, setRegistros] = useState<RegistroMedico[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroMedico | null>(null)

  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroRuta, setFiltroRuta] = useState('todas')
  const [filtroActivo, setFiltroActivo] = useState('todos')

  useEffect(() => {
    const cargarRegistros = async () => {
      try {
        setLoading(true)

        const q = query(
          collection(db, 'registros_medicos'),
          orderBy('createdAt', 'desc')
        )

        const snap = await getDocs(q)

        const lista: RegistroMedico[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setRegistros(lista)
      } catch (error) {
        console.error('Error cargando registros médicos:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarRegistros()
  }, [])

  const rutasDisponibles = useMemo(() => {
    const rutas = new Set<string>()

    registros.forEach((registro) => {
      const ruta = registro.operadorSnapshot?.rutaAsignada
      if (ruta) rutas.add(ruta)
    })

    return Array.from(rutas).sort((a, b) => a.localeCompare(b))
  }, [registros])

  const registrosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()

    return registros.filter((registro) => {
      const operador = registro.operadorNombre?.toLowerCase() || ''
      const numeroEmpleado =
        String(registro.operadorSnapshot?.fichaIdentificacion?.numeroEmpleado || '').toLowerCase()
      const ruta = (registro.operadorSnapshot?.rutaAsignada || '').toLowerCase()
      const supervisor = (registro.supervisorNombre || '').toLowerCase()
      const estado = getEstadoConclusion(registro.conclusion)
      const activo = registro.operadorSnapshot?.activo

      const matchSearch =
        !term ||
        operador.includes(term) ||
        numeroEmpleado.includes(term) ||
        ruta.includes(term) ||
        supervisor.includes(term)

      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'apto' && estado === 'Apto') ||
        (filtroEstado === 'no_apto' && estado === 'No apto') ||
        (filtroEstado === 'sin_definir' && estado === 'Sin definir')

      const matchRuta =
        filtroRuta === 'todas' ||
        registro.operadorSnapshot?.rutaAsignada === filtroRuta

      const matchActivo =
        filtroActivo === 'todos' ||
        (filtroActivo === 'activos' && activo === true) ||
        (filtroActivo === 'inactivos' && activo === false)

      return matchSearch && matchEstado && matchRuta && matchActivo
    })
  }, [registros, search, filtroEstado, filtroRuta, filtroActivo])

  const totalAptos = useMemo(
    () => registros.filter((r) => r.conclusion?.apto).length,
    [registros]
  )

  const totalNoAptos = useMemo(
    () => registros.filter((r) => r.conclusion?.noApto).length,
    [registros]
  )

  const totalPendientes = useMemo(
    () => registros.filter((r) => !r.conclusion?.apto && !r.conclusion?.noApto).length,
    [registros]
  )

  return (
    <section className="registros-medicos-admin">
      <div className="registros-medicos-admin__header">
        <div>
          <h1>Registros médicos</h1>
          <p>Monitoreo y consulta de evaluaciones médicas previas para trabajos en altura.</p>
        </div>

        <button
          type="button"
          className="btn-excel-disabled"
          disabled
          title="La descarga en Excel se agregará después"
        >
          Descargar Excel
        </button>
      </div>

      <div className="registros-medicos-admin__stats">
        <div className="stat-card">
          <span className="stat-card__label">Total</span>
          <strong>{registros.length}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">Aptos</span>
          <strong>{totalAptos}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">No aptos</span>
          <strong>{totalNoAptos}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-card__label">Sin definir</span>
          <strong>{totalPendientes}</strong>
        </div>
      </div>

      <div className="registros-medicos-admin__filters">
        <div className="filter-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por operador, número de empleado, ruta o supervisor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-field">
          <Filter size={16} />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="apto">Aptos</option>
            <option value="no_apto">No aptos</option>
            <option value="sin_definir">Sin definir</option>
          </select>
        </div>

        <div className="filter-field">
          <select value={filtroRuta} onChange={(e) => setFiltroRuta(e.target.value)}>
            <option value="todas">Todas las rutas</option>
            {rutasDisponibles.map((ruta) => (
              <option key={ruta} value={ruta}>
                {ruta}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
        </div>
      </div>

      <div className="registros-medicos-admin__table-wrap">
        <table className="registros-table">
          <thead>
            <tr>
              <th>Operador</th>
              <th>No. empleado</th>
              <th>Ruta</th>
              <th>Fecha evaluación</th>
              <th>Resultado</th>
              <th>Supervisor</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  Cargando registros médicos...
                </td>
              </tr>
            ) : registrosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="table-empty">
                  No se encontraron registros médicos.
                </td>
              </tr>
            ) : (
              registrosFiltrados.map((registro) => {
                const estado = getEstadoConclusion(registro.conclusion)

                return (
                  <tr key={registro.id}>
                    <td>
                      <div className="td-primary">
                        <span>{registro.operadorNombre || '—'}</span>
                        <small>
                          {registro.operadorSnapshot?.fichaIdentificacion?.cargo || 'Operador'}
                        </small>
                      </div>
                    </td>

                    <td>
                      {registro.operadorSnapshot?.fichaIdentificacion?.numeroEmpleado || '—'}
                    </td>

                    <td>{registro.operadorSnapshot?.rutaAsignada || '—'}</td>

                    <td>{formatDate(registro.fechaEvaluacion)}</td>

                    <td>
                      <span
                        className={`status-badge ${estado === 'Apto'
                            ? 'status-badge--success'
                            : estado === 'No apto'
                              ? 'status-badge--danger'
                              : 'status-badge--neutral'
                          }`}
                      >
                        {estado}
                      </span>
                    </td>

                    <td>{registro.supervisorNombre || '—'}</td>

                    <td>{formatTimestamp(registro.createdAt)}</td>

                    <td>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => setSelectedRegistro(registro)}
                      >
                        <Eye size={16} />
                        Ver
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedRegistro && (
        <div className="registro-modal-overlay" onClick={() => setSelectedRegistro(null)}>
          <div
            className="registro-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="registro-modal__header">
              <div>
                <h2>Detalle del registro médico</h2>
                <p>Consulta completa del examen médico del operador.</p>
              </div>

              <button
                type="button"
                className="registro-modal__close"
                onClick={() => setSelectedRegistro(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="registro-modal__content">
              <section className="modal-block">
                <div className="modal-block__title">
                  <UserRound size={18} />
                  <h3>Operador</h3>
                </div>

                <div className="modal-grid modal-grid--3">
                  <div className="modal-field">
                    <span>Nombre</span>
                    <strong>{selectedRegistro.operadorNombre || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Número de empleado</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.fichaIdentificacion?.numeroEmpleado || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Ruta asignada</span>
                    <strong>{selectedRegistro.operadorSnapshot?.rutaAsignada || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Cargo</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.fichaIdentificacion?.cargo || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Área</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.fichaIdentificacion?.area || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Activo</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.activo ? 'Sí' : 'No'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Género</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.fichaIdentificacion?.genero || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Edad</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.fichaIdentificacion?.edad || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Teléfono</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.fichaIdentificacion?.telefono || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Correo</span>
                    <strong>{selectedRegistro.operadorSnapshot?.correo || '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="modal-block">
                <div className="modal-block__title">
                  <ShieldCheck size={18} />
                  <h3>Contacto de emergencia</h3>
                </div>

                <div className="modal-grid modal-grid--3">
                  <div className="modal-field">
                    <span>Nombre</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.contactoEmergencia?.nombre || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Parentesco</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.contactoEmergencia?.parentesco || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Teléfono</span>
                    <strong>
                      {selectedRegistro.operadorSnapshot?.contactoEmergencia?.telefono || '—'}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="modal-block">
                <div className="modal-block__title">
                  <FileHeart size={18} />
                  <h3>Antecedentes no patológicos</h3>
                </div>

                <div className="modal-grid modal-grid--3">
                  <div className="modal-field">
                    <span>Última vez que ingirió alcohol</span>
                    <strong>{selectedRegistro.noPatologicos?.ultimaVezAlcohol || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Drogas de abuso</span>
                    <strong>{selectedRegistro.noPatologicos?.drogasAbuso || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Descripción drogas</span>
                    <strong>
                      {selectedRegistro.noPatologicos?.drogasAbusoDescripcion || '—'}
                    </strong>
                  </div>

                  <div className="modal-field">
                    <span>Última comida</span>
                    <strong>{selectedRegistro.noPatologicos?.ultimaComidaHora || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Durmió normalmente</span>
                    <strong>{selectedRegistro.noPatologicos?.durmioNormalmente || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Horas de sueño</span>
                    <strong>{selectedRegistro.noPatologicos?.horasSueno || '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="modal-block">
                <div className="modal-block__title">
                  <HeartPulse size={18} />
                  <h3>Exploración física</h3>
                </div>

                <div className="modal-grid modal-grid--3">
                  <div className="modal-field">
                    <span>Presión arterial</span>
                    <strong>{selectedRegistro.exploracion?.presionArterial || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Frecuencia cardiaca</span>
                    <strong>{selectedRegistro.exploracion?.frecuenciaCardiaca || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Frecuencia respiratoria</span>
                    <strong>{selectedRegistro.exploracion?.frecuenciaRespiratoria || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Temperatura</span>
                    <strong>{selectedRegistro.exploracion?.temperatura || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Peso</span>
                    <strong>{selectedRegistro.exploracion?.peso || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Estatura</span>
                    <strong>{selectedRegistro.exploracion?.estatura || '—'}</strong>
                  </div>

                  <div className="modal-field modal-field--full">
                    <span>Hallazgos positivos</span>
                    <strong>{selectedRegistro.exploracion?.hallazgosPositivos || '—'}</strong>
                  </div>
                </div>
              </section>

              <section className="modal-block">
                <div className="modal-block__title">
                  <FileHeart size={18} />
                  <h3>Conclusión</h3>
                </div>

                <div className="modal-grid modal-grid--3">
                  <div className="modal-field">
                    <span>Resultado</span>
                    <strong>{getEstadoConclusion(selectedRegistro.conclusion)}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Nombre del médico</span>
                    <strong>{selectedRegistro.conclusion?.nombreMedico || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Cédula / referencia</span>
                    <strong>{selectedRegistro.conclusion?.cedulaMedico || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Fecha de evaluación</span>
                    <strong>{formatDate(selectedRegistro.fechaEvaluacion)}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Supervisor</span>
                    <strong>{selectedRegistro.supervisorNombre || '—'}</strong>
                  </div>

                  <div className="modal-field">
                    <span>Fecha de creación</span>
                    <strong>{formatTimestamp(selectedRegistro.createdAt)}</strong>
                  </div>

                  <div className="modal-field modal-field--full">
                    <span>Comentarios adicionales</span>
                    <strong>
                      {selectedRegistro.conclusion?.comentariosAdicionales || '—'}
                    </strong>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}