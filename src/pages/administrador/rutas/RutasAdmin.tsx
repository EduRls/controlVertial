import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import {
  Plus,
  Pencil,
  Power,
  X,
  Save,
  Route,
  Truck,
  Gauge,
  BadgeInfo,
} from 'lucide-react'

import { db } from '../../../firebase/firebase'
import './RutasAdmin.css'

type RutaItem = {
  id: string
  numeroEconomico: string
  placas: string
  capacidad: number
  activo: boolean
  fechaAlta?: Timestamp | null
}

type FormState = {
  numeroEconomico: string
  placas: string
  capacidad: string
  activo: boolean
}

const initialForm: FormState = {
  numeroEconomico: '',
  placas: '',
  capacidad: '',
  activo: true,
}

function normalizeNumeroEconomico(value: string) {
  return value.trim().toUpperCase()
}

function normalizePlacas(value: string) {
  return value.trim().toUpperCase()
}

function formatFecha(value?: Timestamp | null) {
  if (!value) return '—'
  const date = value.toDate()
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function RutasAdmin() {
  const [rutas, setRutas] = useState<RutaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos')

  const [openModal, setOpenModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)

  useEffect(() => {
    const rutasRef = collection(db, 'rutas')

    const unsubscribe = onSnapshot(
      rutasRef,
      (snapshot) => {
        const items: RutaItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Omit<RutaItem, 'id'>
          return {
            id: docSnap.id,
            ...data,
          }
        })

        items.sort((a, b) => a.numeroEconomico.localeCompare(b.numeroEconomico, 'es', { numeric: true }))

        setRutas(items)
        setLoading(false)
      },
      (err) => {
        console.error('Error cargando rutas:', err)
        setError('No se pudieron cargar las rutas.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const rutasFiltradas = useMemo(() => {
    return rutas.filter((ruta) => {
      const term = search.trim().toLowerCase()

      const matchesSearch =
        !term ||
        ruta.numeroEconomico.toLowerCase().includes(term) ||
        ruta.placas.toLowerCase().includes(term) ||
        String(ruta.capacidad).includes(term)

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activos' && ruta.activo) ||
        (statusFilter === 'inactivos' && !ruta.activo)

      return matchesSearch && matchesStatus
    })
  }, [rutas, search, statusFilter])

  const totalActivas = rutas.filter((r) => r.activo).length
  const totalInactivas = rutas.filter((r) => !r.activo).length

  function handleOpenCreate() {
    setEditingId(null)
    setForm(initialForm)
    setOpenModal(true)
  }

  function handleOpenEdit(ruta: RutaItem) {
    setEditingId(ruta.id)
    setForm({
      numeroEconomico: ruta.numeroEconomico,
      placas: ruta.placas,
      capacidad: String(ruta.capacidad),
      activo: ruta.activo,
    })
    setOpenModal(true)
  }

  function handleCloseModal() {
    if (saving) return
    setOpenModal(false)
    setEditingId(null)
    setForm(initialForm)
  }

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const numeroEconomico = normalizeNumeroEconomico(form.numeroEconomico)
    const placas = normalizePlacas(form.placas)
    const capacidad = Number(form.capacidad)

    if (!numeroEconomico) {
      setError('Ingresa el número económico.')
      return
    }

    if (!placas) {
      setError('Ingresa las placas.')
      return
    }

    if (!form.capacidad || Number.isNaN(capacidad) || capacidad <= 0) {
      setError('Ingresa una capacidad válida.')
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        const rutaOriginal = rutas.find((r) => r.id === editingId)

        if (!rutaOriginal) {
          throw new Error('No se encontró la ruta a editar.')
        }

        const oldId = rutaOriginal.id
        const newId = numeroEconomico

        if (oldId !== newId) {
          const existing = rutas.find((r) => r.id === newId)
          if (existing) {
            throw new Error('Ya existe una ruta con ese número económico.')
          }

          await setDoc(doc(db, 'rutas', newId), {
            numeroEconomico: newId,
            placas,
            capacidad,
            activo: form.activo,
            fechaAlta: rutaOriginal.fechaAlta ?? serverTimestamp(),
          })

          await updateDoc(doc(db, 'rutas', oldId), {
            activo: false,
          })
        } else {
          await updateDoc(doc(db, 'rutas', oldId), {
            numeroEconomico: newId,
            placas,
            capacidad,
            activo: form.activo,
          })
        }
      } else {
        const existing = rutas.find((r) => r.id === numeroEconomico)
        if (existing) {
          throw new Error('Ya existe una ruta con ese número económico.')
        }

        await setDoc(doc(db, 'rutas', numeroEconomico), {
          numeroEconomico,
          placas,
          capacidad,
          activo: form.activo,
          fechaAlta: serverTimestamp(),
        })
      }

      handleCloseModal()
    } catch (err) {
      console.error('Error guardando ruta:', err)
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ruta.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(ruta: RutaItem) {
    try {
      await updateDoc(doc(db, 'rutas', ruta.id), {
        activo: !ruta.activo,
      })
    } catch (err) {
      console.error('Error actualizando estado:', err)
      setError('No se pudo actualizar el estado de la ruta.')
    }
  }

  return (
    <section className="rutas-admin">
      <div className="rutas-admin__header">
        <div>
          <p className="rutas-admin__eyebrow">Administración</p>
          <h1>Rutas</h1>
          <p className="rutas-admin__subtitle">
            Registro de pipas activas e inactivas dentro de la colección <strong>rutas</strong>.
          </p>
        </div>

        <button className="rutas-admin__primary-btn" onClick={handleOpenCreate}>
          <Plus size={18} />
          Nueva ruta
        </button>
      </div>

      <div className="rutas-admin__stats">
        <article className="rutas-admin__stat-card">
          <div className="rutas-admin__stat-icon">
            <Route size={18} />
          </div>
          <div>
            <span>Total</span>
            <strong>{rutas.length}</strong>
          </div>
        </article>

        <article className="rutas-admin__stat-card">
          <div className="rutas-admin__stat-icon">
            <Truck size={18} />
          </div>
          <div>
            <span>Activas</span>
            <strong>{totalActivas}</strong>
          </div>
        </article>

        <article className="rutas-admin__stat-card">
          <div className="rutas-admin__stat-icon">
            <BadgeInfo size={18} />
          </div>
          <div>
            <span>Inactivas</span>
            <strong>{totalInactivas}</strong>
          </div>
        </article>
      </div>

      <div className="rutas-admin__panel">
        <div className="rutas-admin__toolbar">
          <input
            type="text"
            placeholder="Buscar por número económico, placas o capacidad"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rutas-admin__search"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'todos' | 'activos' | 'inactivos')}
            className="rutas-admin__select"
          >
            <option value="todos">Todas</option>
            <option value="activos">Activas</option>
            <option value="inactivos">Inactivas</option>
          </select>
        </div>

        {error && <div className="rutas-admin__error">{error}</div>}

        {loading ? (
          <div className="rutas-admin__empty">Cargando rutas...</div>
        ) : rutasFiltradas.length === 0 ? (
          <div className="rutas-admin__empty">No se encontraron rutas registradas.</div>
        ) : (
          <div className="rutas-admin__table-wrap">
            <table className="rutas-admin__table">
              <thead>
                <tr>
                  <th>Número económico</th>
                  <th>Placas</th>
                  <th>Capacidad</th>
                  <th>Estatus</th>
                  <th>Fecha de alta</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutasFiltradas.map((ruta) => (
                  <tr key={ruta.id}>
                    <td>{ruta.numeroEconomico}</td>
                    <td>{ruta.placas}</td>
                    <td>{ruta.capacidad.toLocaleString('es-MX')} L</td>
                    <td>
                      <span
                        className={
                          ruta.activo
                            ? 'rutas-admin__badge rutas-admin__badge--active'
                            : 'rutas-admin__badge rutas-admin__badge--inactive'
                        }
                      >
                        {ruta.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>{formatFecha(ruta.fechaAlta)}</td>
                    <td>
                      <div className="rutas-admin__actions">
                        <button
                          className="rutas-admin__icon-btn"
                          onClick={() => handleOpenEdit(ruta)}
                          title="Editar ruta"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          className="rutas-admin__icon-btn"
                          onClick={() => handleToggleStatus(ruta)}
                          title={ruta.activo ? 'Desactivar ruta' : 'Activar ruta'}
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openModal && (
        <div className="rutas-admin__modal-backdrop" onClick={handleCloseModal}>
          <div
            className="rutas-admin__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rutas-admin__modal-header">
              <div>
                <h2>{editingId ? 'Editar ruta' : 'Nueva ruta'}</h2>
                <p>Registra la pipa con su número económico como identificador del documento.</p>
              </div>

              <button className="rutas-admin__close-btn" onClick={handleCloseModal}>
                <X size={18} />
              </button>
            </div>

            <form className="rutas-admin__form" onSubmit={handleSubmit}>
              <div className="rutas-admin__field">
                <label>Número económico</label>
                <div className="rutas-admin__input-wrap">
                  <Truck size={16} />
                  <input
                    type="text"
                    value={form.numeroEconomico}
                    onChange={(e) => handleChange('numeroEconomico', e.target.value)}
                    placeholder="Ej. P-101"
                  />
                </div>
              </div>

              <div className="rutas-admin__field">
                <label>Placas</label>
                <div className="rutas-admin__input-wrap">
                  <BadgeInfo size={16} />
                  <input
                    type="text"
                    value={form.placas}
                    onChange={(e) => handleChange('placas', e.target.value)}
                    placeholder="Ej. AB-1234-C"
                  />
                </div>
              </div>

              <div className="rutas-admin__field">
                <label>Capacidad (litros)</label>
                <div className="rutas-admin__input-wrap">
                  <Gauge size={16} />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.capacidad}
                    onChange={(e) => handleChange('capacidad', e.target.value)}
                    placeholder="Ej. 10000"
                  />
                </div>
              </div>

              <div className="rutas-admin__switch-row">
                <span>Estatus</span>
                <label className="rutas-admin__switch">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => handleChange('activo', e.target.checked)}
                  />
                  <span className="rutas-admin__switch-slider" />
                  <strong>{form.activo ? 'Activa' : 'Inactiva'}</strong>
                </label>
              </div>

              <div className="rutas-admin__form-actions">
                <button
                  type="button"
                  className="rutas-admin__secondary-btn"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rutas-admin__primary-btn"
                  disabled={saving}
                >
                  <Save size={18} />
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Registrar ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}