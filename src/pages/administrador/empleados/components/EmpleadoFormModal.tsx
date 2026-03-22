import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  Briefcase,
  Hash,
  Mail,
  Phone,
  Route,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react'
import { db } from '../../../../firebase/firebase'
import type { Empleado } from '../EmpleadosAdmin'
import './EmpleadoFormModal.css'

type Props = {
  open: boolean
  onClose: () => void
  empleado: Empleado | null
}

type RolUsuario = 'operador' | 'supervisor'
type FormSection = 'generales' | 'ficha' | 'emergencia'

type RutaItem = {
  id: string
  label: string
  numeroEconomico: string
  placas: string
}

type FormState = {
  nombre: string
  correo: string
  telefono: string
  rol: RolUsuario
  rutaAsignada: string
  activo: boolean

  fichaIdentificacion: {
    numeroEmpleado: string
    cargo: string
    genero: string
    edad: string
    area: string
    telefono: string
  }

  contactoEmergencia: {
    nombre: string
    parentesco: string
    telefono: string
  }
}

const initialState: FormState = {
  nombre: '',
  correo: '',
  telefono: '',
  rol: 'operador',
  rutaAsignada: '',
  activo: true,
  fichaIdentificacion: {
    numeroEmpleado: '',
    cargo: 'Operador',
    genero: '',
    edad: '',
    area: 'Conductor de autotanque',
    telefono: '',
  },
  contactoEmergencia: {
    nombre: '',
    parentesco: '',
    telefono: '',
  },
}

function getIniciales(nombre: string) {
  const limpio = (nombre || '').trim()
  if (!limpio) return 'US'
  return limpio.slice(0, 2).toUpperCase()
}

function getRutaLabel(data: Record<string, any>, fallbackId: string) {
  const numeroEconomico = data.numeroEconomico || fallbackId
  const placas = data.placas || 'Sin placas'
  return `${numeroEconomico} · ${placas}`
}

export default function EmpleadoFormModal({ open, onClose, empleado }: Props) {
  const [form, setForm] = useState<FormState>(initialState)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<FormSection>('generales')
  const [rutas, setRutas] = useState<RutaItem[]>([])
  const [loadingRutas, setLoadingRutas] = useState(false)

  const isEdit = !!empleado

  useEffect(() => {
    if (!open) return

    if (empleado) {
      const data = empleado as Empleado & {
        fichaIdentificacion?: {
          numeroEmpleado?: string
          cargo?: string
          genero?: string
          edad?: string | number
          area?: string
          telefono?: string
        } | null
        contactoEmergencia?: {
          nombre?: string
          parentesco?: string
          telefono?: string
        } | null
      }

      setForm({
        nombre: data.nombre ?? '',
        correo: data.correo ?? '',
        telefono: data.telefono ?? '',
        rol: data.rol ?? 'operador',
        rutaAsignada: data.rutaAsignada ?? '',
        activo: data.activo ?? true,
        fichaIdentificacion: {
          numeroEmpleado: data.fichaIdentificacion?.numeroEmpleado ?? '',
          cargo: data.fichaIdentificacion?.cargo ?? 'Operador',
          genero: data.fichaIdentificacion?.genero ?? '',
          edad: String(data.fichaIdentificacion?.edad ?? ''),
          area: data.fichaIdentificacion?.area ?? 'Conductor de autotanque',
          telefono: data.fichaIdentificacion?.telefono ?? data.telefono ?? '',
        },
        contactoEmergencia: {
          nombre: data.contactoEmergencia?.nombre ?? '',
          parentesco: data.contactoEmergencia?.parentesco ?? '',
          telefono: data.contactoEmergencia?.telefono ?? '',
        },
      })

      setActiveSection('generales')
    } else {
      setForm(initialState)
      setActiveSection('generales')
    }
  }, [open, empleado])

  useEffect(() => {
    if (!open) return

    async function loadRutas() {
      setLoadingRutas(true)

      try {
        const q = query(collection(db, 'rutas'), orderBy('numeroEconomico'))
        const snapshot = await getDocs(q)

        const items: RutaItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()

          return {
            id: docSnap.id,
            label: getRutaLabel(data, docSnap.id),
            numeroEconomico: data.numeroEconomico || docSnap.id,
            placas: data.placas || 'Sin placas',
          }
        })

        setRutas(items)
      } catch (error) {
        console.error('Error al cargar rutas:', error)
        setRutas([])
      } finally {
        setLoadingRutas(false)
      }
    }

    loadRutas()
  }, [open])

  const titulo = useMemo(
    () => (isEdit ? 'Editar empleado' : 'Nuevo empleado'),
    [isEdit]
  )

  const sections = useMemo(() => {
    if (form.rol === 'supervisor') {
      return [{ key: 'generales' as FormSection, label: 'Datos generales' }]
    }

    return [
      { key: 'generales' as FormSection, label: 'Datos generales' },
      { key: 'ficha' as FormSection, label: 'Ficha de identificación' },
      { key: 'emergencia' as FormSection, label: 'Contacto de emergencia' },
    ]
  }, [form.rol])

  useEffect(() => {
    if (form.rol === 'supervisor' && activeSection !== 'generales') {
      setActiveSection('generales')
    }
  }, [form.rol, activeSection])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateFicha<K extends keyof FormState['fichaIdentificacion']>(
    key: K,
    value: FormState['fichaIdentificacion'][K]
  ) {
    setForm((prev) => ({
      ...prev,
      fichaIdentificacion: {
        ...prev.fichaIdentificacion,
        [key]: value,
      },
    }))
  }

  function updateEmergencia<K extends keyof FormState['contactoEmergencia']>(
    key: K,
    value: FormState['contactoEmergencia'][K]
  ) {
    setForm((prev) => ({
      ...prev,
      contactoEmergencia: {
        ...prev.contactoEmergencia,
        [key]: value,
      },
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.nombre.trim()) {
      alert('El nombre es obligatorio.')
      return
    }

    if (!form.correo.trim()) {
      alert('El correo es obligatorio.')
      return
    }

    if (!form.telefono.trim()) {
      alert('El teléfono es obligatorio.')
      return
    }

    if (form.rol === 'operador' && !form.rutaAsignada.trim()) {
      alert('Debes seleccionar una ruta.')
      return
    }

    if (form.rol === 'operador') {
      if (!form.fichaIdentificacion.numeroEmpleado.trim()) {
        alert('El número de empleado es obligatorio.')
        return
      }

      if (!form.fichaIdentificacion.genero.trim()) {
        alert('El género es obligatorio.')
        return
      }

      if (!form.fichaIdentificacion.edad.trim()) {
        alert('La edad es obligatoria.')
        return
      }

      if (!form.contactoEmergencia.nombre.trim()) {
        alert('El nombre del contacto de emergencia es obligatorio.')
        return
      }

      if (!form.contactoEmergencia.parentesco.trim()) {
        alert('El parentesco del contacto de emergencia es obligatorio.')
        return
      }

      if (!form.contactoEmergencia.telefono.trim()) {
        alert('El teléfono del contacto de emergencia es obligatorio.')
        return
      }
    }

    setSaving(true)

    try {
      const payload = {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim(),
        rol: form.rol,
        rutaAsignada: form.rol === 'operador' ? form.rutaAsignada : '',
        activo: form.activo,
        fichaIdentificacion:
          form.rol === 'operador'
            ? {
                numeroEmpleado: form.fichaIdentificacion.numeroEmpleado.trim(),
                cargo: form.fichaIdentificacion.cargo.trim() || 'Operador',
                genero: form.fichaIdentificacion.genero.trim(),
                edad: Number(form.fichaIdentificacion.edad),
                area:
                  form.fichaIdentificacion.area.trim() ||
                  'Conductor de autotanque',
                telefono:
                  form.fichaIdentificacion.telefono.trim() || form.telefono.trim(),
              }
            : null,
        contactoEmergencia:
          form.rol === 'operador'
            ? {
                nombre: form.contactoEmergencia.nombre.trim(),
                parentesco: form.contactoEmergencia.parentesco.trim(),
                telefono: form.contactoEmergencia.telefono.trim(),
              }
            : null,
      }

      if (empleado) {
        await updateDoc(doc(db, 'users', empleado.id), payload)
      } else {
        await addDoc(collection(db, 'users'), {
          ...payload,
          fechaAlta: serverTimestamp(),
        })
      }

      onClose()
    } catch (err) {
      console.error('Error guardando empleado:', err)
      alert('No se pudo guardar el empleado.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="empleado-form-modal">
      <div className="empleado-form-modal__overlay" onClick={onClose} />

      <div className="empleado-form-modal__dialog" role="dialog" aria-modal="true">
        <div className="empleado-form-modal__header">
          <div>
            <p className="empleado-form-modal__eyebrow">Administración</p>
            <h2>{titulo}</h2>
          </div>

          <button
            type="button"
            className="empleado-form-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <form className="empleado-form-modal__form" onSubmit={handleSubmit}>
          <div className="empleado-form-modal__profile">
            <div className="empleado-form-modal__avatar">
              {getIniciales(form.nombre)}
            </div>
            <div>
              <strong>{form.nombre.trim() || 'Nuevo usuario'}</strong>
              <span>{form.rol === 'supervisor' ? 'Supervisor' : 'Operador'}</span>
            </div>
          </div>

          <div className="empleado-form-modal__tabs">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                className={`empleado-form-modal__tab ${
                  activeSection === section.key ? 'is-active' : ''
                }`}
                onClick={() => setActiveSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === 'generales' && (
            <div className="empleado-form-modal__panel">
              <div className="empleado-form-modal__fields">
                <label className="empleado-form-modal__field">
                  <span>Nombre completo</span>
                  <div className="empleado-form-modal__input-wrap">
                    <User size={16} />
                    <input
                      type="text"
                      placeholder="Nombre del empleado"
                      value={form.nombre}
                      onChange={(e) => updateField('nombre', e.target.value)}
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Correo electrónico</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Mail size={16} />
                    <input
                      type="email"
                      placeholder="correo@empresa.com"
                      value={form.correo}
                      onChange={(e) => updateField('correo', e.target.value)}
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Teléfono</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Phone size={16} />
                    <input
                      type="text"
                      placeholder="4921234567"
                      value={form.telefono}
                      onChange={(e) => updateField('telefono', e.target.value)}
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Rol</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Shield size={16} />
                    <select
                      value={form.rol}
                      onChange={(e) => updateField('rol', e.target.value as RolUsuario)}
                    >
                      <option value="operador">Operador</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </div>
                </label>

                {form.rol === 'operador' && (
                  <label className="empleado-form-modal__field empleado-form-modal__field--full">
                    <span>Ruta asignada</span>
                    <div className="empleado-form-modal__input-wrap">
                      <Route size={16} />
                      <select
                        value={form.rutaAsignada}
                        onChange={(e) => updateField('rutaAsignada', e.target.value)}
                        disabled={loadingRutas}
                      >
                        <option value="">
                          {loadingRutas
                            ? 'Cargando rutas...'
                            : 'Selecciona una ruta'}
                        </option>

                        {rutas.map((ruta) => (
                          <option key={ruta.id} value={ruta.numeroEconomico}>
                            {ruta.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                )}

                <label className="empleado-form-modal__switch">
                  <div>
                    <strong>Cuenta activa</strong>
                    <p>Permite activar o desactivar el acceso del empleado.</p>
                  </div>

                  <button
                    type="button"
                    className={`empleado-form-modal__switch-btn ${
                      form.activo ? 'is-on' : ''
                    }`}
                    onClick={() => updateField('activo', !form.activo)}
                  >
                    <span />
                  </button>
                </label>
              </div>
            </div>
          )}

          {form.rol === 'operador' && activeSection === 'ficha' && (
            <div className="empleado-form-modal__panel">
              <div className="empleado-form-modal__fields">
                <label className="empleado-form-modal__field">
                  <span>Número de empleado</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Hash size={16} />
                    <input
                      type="text"
                      placeholder="Ej. OP-001"
                      value={form.fichaIdentificacion.numeroEmpleado}
                      onChange={(e) =>
                        updateFicha('numeroEmpleado', e.target.value)
                      }
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Cargo</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Briefcase size={16} />
                    <input
                      type="text"
                      value={form.fichaIdentificacion.cargo}
                      onChange={(e) => updateFicha('cargo', e.target.value)}
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Género</span>
                  <div className="empleado-form-modal__input-wrap">
                    <User size={16} />
                    <select
                      value={form.fichaIdentificacion.genero}
                      onChange={(e) => updateFicha('genero', e.target.value)}
                    >
                      <option value="">Selecciona una opción</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Edad</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Hash size={16} />
                    <input
                      type="number"
                      placeholder="Ej. 32"
                      value={form.fichaIdentificacion.edad}
                      onChange={(e) => updateFicha('edad', e.target.value)}
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Área</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Briefcase size={16} />
                    <input
                      type="text"
                      value={form.fichaIdentificacion.area}
                      onChange={(e) => updateFicha('area', e.target.value)}
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Teléfono</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Phone size={16} />
                    <input
                      type="text"
                      placeholder="4921234567"
                      value={form.fichaIdentificacion.telefono}
                      onChange={(e) => updateFicha('telefono', e.target.value)}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}

          {form.rol === 'operador' && activeSection === 'emergencia' && (
            <div className="empleado-form-modal__panel">
              <div className="empleado-form-modal__fields">
                <label className="empleado-form-modal__field">
                  <span>Nombre de contacto de emergencia</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Users size={16} />
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={form.contactoEmergencia.nombre}
                      onChange={(e) => updateEmergencia('nombre', e.target.value)}
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field">
                  <span>Parentesco</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Users size={16} />
                    <input
                      type="text"
                      placeholder="Ej. Esposa, Madre, Hermano"
                      value={form.contactoEmergencia.parentesco}
                      onChange={(e) =>
                        updateEmergencia('parentesco', e.target.value)
                      }
                    />
                  </div>
                </label>

                <label className="empleado-form-modal__field empleado-form-modal__field--full">
                  <span>Teléfono contacto de emergencia</span>
                  <div className="empleado-form-modal__input-wrap">
                    <Phone size={16} />
                    <input
                      type="text"
                      placeholder="4921234567"
                      value={form.contactoEmergencia.telefono}
                      onChange={(e) =>
                        updateEmergencia('telefono', e.target.value)
                      }
                    />
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="empleado-form-modal__actions">
            <button
              type="button"
              className="empleado-form-modal__ghost-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="empleado-form-modal__primary-btn"
              disabled={saving}
            >
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}