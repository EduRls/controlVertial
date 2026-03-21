import { ChevronRight, CircleUserRound, HelpCircle, LogOut } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import './PerfilSupervisor.css'

export default function PerfilSupervisor() {
  const { userProfile, logout } = useAuth()

  return (
    <section className="supervisor-profile">
      <div className="supervisor-profile__hero">
        <div className="supervisor-profile__avatar">
          <CircleUserRound size={56} />
        </div>
        <h1>{userProfile?.nombre ?? 'Supervisor'}</h1>
        <p>Supervisor de seguridad</p>
      </div>


      <div className="supervisor-profile__section">
        <h2>Ayuda</h2>

        <button className="supervisor-profile__item">
          <span>
            <HelpCircle size={18} />
            Manual de uso
          </span>
          <ChevronRight size={18} />
        </button>
      </div>

      <button className="supervisor-profile__logout" onClick={logout}>
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </section>
  )
}