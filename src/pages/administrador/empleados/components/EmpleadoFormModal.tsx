import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { Mail, Phone, Route, Shield, User, X } from 'lucide-react'
import { db } from '../../../../firebase/firebase'
import type { Empleado } from '../EmpleadosAdmin'
import './EmpleadoFormModal.css'

type Props = {
  open: boolean
  onClose: () => void
  empleado: Empleado | null
}

type RolUsuario = 'operador' | 'supervisor'

type FormState = {
  nombre: string
  correo: string
  telefono: string
  rol: RolUsuario
  rutaAsignada: string
  activo: boolean
}

const initialState: FormState = {
  nombre: '',
  correo: '',
  telefono: '',
  rol: 'operador',
  rutaAsignada: '',
  activo: true,
}

function getIniciales(nombre: string) {
  const limpio = (nombre || '').trim()
  if (!limpio) return 'US'
  return limpio.slice(0, 2).toUpperCase()
}

export default function EmpleadoFormModal({ open, onClose, empleado }: Props) {
  const [form, setForm] = useState<FormState>(initialState)
  const [saving, setSaving] = useState(false)

  const isEdit = !!empleado

  useEffect(() => {
    if (!open) return

    if (empleado) {
      setForm({
        nombre: empleado.nombre ?? '',
        correo: empleado.correo ?? '',
        telefono: empleado.telefono ?? '',
        rol: empleado.rol ?? 'operador',
        rutaAsignada: empleado.rutaAsignada ?? '',
        activo: empleado.activo ?? true,
      })
    } else {
      setForm(initialState)
    }
  }, [open, empleado])

  const titulo = useMemo(
    () => (isEdit ? 'Editar empleado' : 'Nuevo empleado'),
    [isEdit]
  )

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      alert('La ruta es obligatoria para operadores.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim(),
        rol: form.rol,
        rutaAsignada: form.rol === 'operador' ? form.rutaAsignada.trim() : '',
        activo: form.activo,
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
              <label className="empleado-form-modal__field">
                <span>Ruta asignada</span>
                <div className="empleado-form-modal__input-wrap">
                  <Route size={16} />
                  <input
                    type="text"
                    placeholder="R25"
                    value={form.rutaAsignada}
                    onChange={(e) => updateField('rutaAsignada', e.target.value)}
                  />
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
                className={`empleado-form-modal__switch-btn ${form.activo ? 'is-on' : ''}`}
                onClick={() => updateField('activo', !form.activo)}
              >
                <span />
              </button>
            </label>
          </div>

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