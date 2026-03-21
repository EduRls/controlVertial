import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, User, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './InicioSesion.css'

export default function InicioSesion() {
  const navigate = useNavigate()
  const { login, user, userProfile, loading } = useAuth()

  const [form, setForm] = useState({
    username: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const redirectByRole = (rol: string) => {
    if (rol === 'administrador') {
      navigate('/admin/dashboard', { replace: true })
      return
    }

    if (rol === 'supervisor') {
      navigate('/supervisor/inspecciones', { replace: true })
      return
    }

    navigate('/mis-servicios', { replace: true })
  }

  useEffect(() => {
    if (loading) return
    if (!user || !userProfile) return

    redirectByRole(userProfile.rol)
  }, [user, userProfile, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const profile = await login({
        email: form.username,
        password: form.password,
      })

      if (!profile) {
        setError('No se encontró el perfil del usuario.')
        return
      }

      redirectByRole(profile.rol)
    } catch (error) {
      console.error('Error al iniciar sesión:', error)
      setError('No fue posible iniciar sesión. Verifique su usuario y contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__hero">
        <div className="login-page__logo-circle">
          <div className="login-page__logo-inner">
            <Shield size={22} strokeWidth={2.2} />
          </div>
        </div>

        <p className="login-page__brand">CONTROL VERTICAL</p>
        <span className="login-page__brand-line" />
      </div>

      <div className="login-page__card">
        <h1 className="login-page__title">
          Sistema de Seguridad
          <br />
          para Trabajos en
          <br />
          Altura
        </h1>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form__field">
            <label htmlFor="username">Usuario</label>
            <div className="login-form__input-wrap">
              <User size={18} className="login-form__icon" />
              <input
                id="username"
                type="text"
                name="username"
                placeholder="test"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-form__field">
            <label htmlFor="password">Contraseña</label>
            <div className="login-form__input-wrap">
              <Lock size={18} className="login-form__icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-form__toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="login-form__error">{error}</p>}

          <button type="submit" disabled={submitting} className="login-form__submit">
            <span>{submitting ? 'Entrando...' : 'Iniciar sesión'}</span>
            {!submitting && <LogIn size={17} />}
          </button>

          <div className="login-form__secure">
            <span className="login-form__secure-line" />
            <span className="login-form__secure-text">ACCESO SEGURO</span>
            <span className="login-form__secure-line" />
          </div>
        </form>
      </div>

      <p className="login-page__help">
        ¿Problemas para entrar? <span>Contactar administrador</span>
      </p>
    </div>
  )
}