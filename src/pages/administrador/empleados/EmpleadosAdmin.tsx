import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { Pencil, Plus, Search, UserCheck, UserX } from 'lucide-react'
import { db } from '../../../firebase/firebase'
import EmpleadoFormModal from './components/EmpleadoFormModal'
import './EmpleadosAdmin.css'

type RolUsuario = 'operador' | 'supervisor'
type FiltroRol = 'todos' | 'operador' | 'supervisor'
type FiltroEstado = 'todos' | 'activos' | 'inactivos'

export type Empleado = {
  id: string
  nombre: string
  correo: string
  telefono: string
  rol: RolUsuario
  rutaAsignada?: string
  fechaAlta?: Timestamp | null
  activo: boolean
}

function getIniciales(nombre: string) {
  const limpio = (nombre || '').trim()
  if (!limpio) return 'US'
  return limpio.slice(0, 2).toUpperCase()
}

export default function EmpleadosAdmin() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [rolFiltro, setRolFiltro] = useState<FiltroRol>('todos')
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado>('todos')

  const [formOpen, setFormOpen] = useState(false)
  const [empleadoEditando, setEmpleadoEditando] = useState<Empleado | null>(null)

  useEffect(() => {
    setLoading(true)
    setError('')

    const q = query(collection(db, 'users'), orderBy('fechaAlta', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Empleado[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Omit<Empleado, 'id'>
            return {
              id: docSnap.id,
              nombre: data.nombre ?? '',
              correo: data.correo ?? '',
              telefono: data.telefono ?? '',
              rol: (data.rol ?? 'operador') as RolUsuario,
              rutaAsignada: data.rutaAsignada ?? '',
              fechaAlta: data.fechaAlta ?? null,
              activo: data.activo ?? true,
            }
          })
          .filter((item) => item.rol === 'operador' || item.rol === 'supervisor')

        setEmpleados(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error al cargar empleados:', err)
        setError('No se pudieron cargar los empleados.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const empleadosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase()

    return empleados.filter((empleado) => {
      const matchSearch =
        !term ||
        empleado.nombre.toLowerCase().includes(term) ||
        empleado.correo.toLowerCase().includes(term) ||
        empleado.telefono.toLowerCase().includes(term) ||
        (empleado.rutaAsignada ?? '').toLowerCase().includes(term)

      const matchRol = rolFiltro === 'todos' ? true : empleado.rol === rolFiltro

      const matchEstado =
        estadoFiltro === 'todos'
          ? true
          : estadoFiltro === 'activos'
            ? empleado.activo
            : !empleado.activo

      return matchSearch && matchRol && matchEstado
    })
  }, [empleados, search, rolFiltro, estadoFiltro])

  const totalOperadores = empleados.filter((e) => e.rol === 'operador').length
  const totalSupervisores = empleados.filter((e) => e.rol === 'supervisor').length
  const totalActivos = empleados.filter((e) => e.activo).length

  async function handleToggleActivo(empleado: Empleado) {
    try {
      await updateDoc(doc(db, 'users', empleado.id), {
        activo: !empleado.activo,
      })
    } catch (err) {
      console.error('Error al cambiar estado:', err)
      alert('No se pudo actualizar el estado del empleado.')
    }
  }

  function handleOpenCreate() {
    setEmpleadoEditando(null)
    setFormOpen(true)
  }

  function handleOpenEdit(empleado: Empleado) {
    setEmpleadoEditando(empleado)
    setFormOpen(true)
  }

  return (
    <section className="empleados-admin">
      <div className="empleados-admin__content">
        <header className="empleados-admin__header">
          <div>
            <p className="empleados-admin__eyebrow">Administración</p>
            <h1>Empleados</h1>
            <p className="empleados-admin__subtitle">
              Gestiona operadores y supervisores del sistema.
            </p>
          </div>

          <div className="empleados-admin__header-actions">
            <div className="empleados-admin__stats">
              <article className="empleados-admin__stat">
                <span>Total</span>
                <strong>{empleados.length}</strong>
              </article>
              <article className="empleados-admin__stat">
                <span>Operadores</span>
                <strong>{totalOperadores}</strong>
              </article>
              <article className="empleados-admin__stat">
                <span>Supervisores</span>
                <strong>{totalSupervisores}</strong>
              </article>
              <article className="empleados-admin__stat">
                <span>Activos</span>
                <strong>{totalActivos}</strong>
              </article>
            </div>

            <button
              type="button"
              className="empleados-admin__add-btn"
              onClick={handleOpenCreate}
            >
              <Plus size={18} />
              Nuevo empleado
            </button>
          </div>
        </header>

        <div className="empleados-admin__toolbar">
          <div className="empleados-admin__search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, teléfono o ruta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="empleados-admin__filters">
            <select
              value={rolFiltro}
              onChange={(e) => setRolFiltro(e.target.value as FiltroRol)}
            >
              <option value="todos">Todos los roles</option>
              <option value="operador">Operadores</option>
              <option value="supervisor">Supervisores</option>
            </select>

            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value as FiltroEstado)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>
        </div>

        <div className="empleados-admin__table-card">
          <div className="empleados-admin__table-head">
            <span>Empleado</span>
            <span>Rol</span>
            <span>Ruta</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          {loading ? (
            <div className="empleados-admin__empty">
              <p>Cargando empleados...</p>
            </div>
          ) : error ? (
            <div className="empleados-admin__empty empleados-admin__empty--error">
              <p>{error}</p>
            </div>
          ) : !empleadosFiltrados.length ? (
            <div className="empleados-admin__empty">
              <p>No se encontraron empleados con esos filtros.</p>
            </div>
          ) : (
            <div className="empleados-admin__table-body">
              {empleadosFiltrados.map((empleado) => (
                <div key={empleado.id} className="empleados-admin__row">
                  <div className="empleados-admin__employee">
                    <div className="empleados-admin__avatar">
                      {getIniciales(empleado.nombre)}
                    </div>

                    <div className="empleados-admin__employee-info">
                      <strong>{empleado.nombre}</strong>
                      <span>{empleado.correo}</span>
                      <small>{empleado.telefono}</small>
                    </div>
                  </div>

                  <div>
                    <span
                      className={`empleados-admin__chip empleados-admin__chip--${empleado.rol}`}
                    >
                      {empleado.rol}
                    </span>
                  </div>

                  <div className="empleados-admin__route">
                    {empleado.rol === 'supervisor'
                      ? 'No aplica'
                      : empleado.rutaAsignada || 'Sin ruta'}
                  </div>

                  <div>
                    <span
                      className={`empleados-admin__status ${empleado.activo ? 'is-active' : 'is-inactive'}`}
                    >
                      {empleado.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="empleados-admin__actions">
                    <button
                      type="button"
                      className="empleados-admin__action-btn empleados-admin__action-btn--edit"
                      onClick={() => handleOpenEdit(empleado)}
                    >
                      <Pencil size={16} />
                      Editar
                    </button>

                    <button
                      type="button"
                      className={`empleados-admin__action-btn ${
                        empleado.activo
                          ? 'empleados-admin__action-btn--danger'
                          : 'empleados-admin__action-btn--success'
                      }`}
                      onClick={() => handleToggleActivo(empleado)}
                    >
                      {empleado.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                      {empleado.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EmpleadoFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        empleado={empleadoEditando}
      />
    </section>
  )
}