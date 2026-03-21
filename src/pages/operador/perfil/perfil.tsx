import {
  ChevronRight,
  BookOpen,
  Headset,
  TriangleAlert,
  Download,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import './Perfil.css'

function getInitials(nombre?: string) {
  if (!nombre) return 'US'
  return nombre.trim().slice(0, 2).toUpperCase()
}

function getShortId(id?: string) {
  if (!id) return '0000'
  return id.slice(0, 4).toUpperCase()
}

export default function Perfil() {
  const { userProfile, logout } = useAuth()

  const nombre = userProfile?.nombre || 'Usuario'
  const correo = userProfile?.correo || 'Sin correo'
  const rutaAsignada = userProfile?.rutaAsignada || 'Sin ruta asignada'
  const avatarText = getInitials(nombre)
  const shortId = getShortId(userProfile?.id)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <section className="perfil-page">
      <header className="perfil-page__hero">
        <div className="perfil-page__avatar">{avatarText}</div>

        <h1 className="perfil-page__name">{nombre}</h1>

        <p className="perfil-page__meta">
          ID: {shortId} <span>•</span> {correo}
        </p>

        <span className="perfil-page__badge">{rutaAsignada}</span>
      </header>

      <div className="perfil-block">
        <p className="perfil-block__title">AYUDA</p>

        <div className="perfil-section">
          <button className="perfil-item" type="button">
            <span className="perfil-item__left">
              <span className="perfil-item__icon perfil-item__icon--purple">
                <BookOpen size={18} />
              </span>
              <span className="perfil-item__text">Manual de uso</span>
            </span>
            <Download size={18} className="perfil-item__arrow" />
          </button>

          <button className="perfil-item" type="button">
            <span className="perfil-item__left">
              <span className="perfil-item__icon perfil-item__icon--purple">
                <Headset size={18} />
              </span>
              <span className="perfil-item__text">Contacto con supervisor</span>
            </span>
            <ChevronRight size={18} className="perfil-item__arrow" />
          </button>

          <button className="perfil-item" type="button">
            <span className="perfil-item__left">
              <span className="perfil-item__icon perfil-item__icon--purple">
                <TriangleAlert size={18} />
              </span>
              <span className="perfil-item__text">Reportar problema</span>
            </span>
            <ChevronRight size={18} className="perfil-item__arrow" />
          </button>
        </div>
      </div>

      <button className="perfil-page__logout" onClick={handleLogout}>
        <LogOut size={18} />
        <span>Cerrar sesión</span>
      </button>
    </section>
  )
}