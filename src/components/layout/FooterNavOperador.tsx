import { NavLink } from 'react-router-dom'
import { ClipboardList, UserRound, Plus } from 'lucide-react'
import './FooterNavOperador.css'

export default function FooterNav() {
  return (
    <nav className="footer-nav">
      <NavLink
        to="/mis-servicios"
        className={({ isActive }) =>
          `footer-nav__item ${isActive ? 'footer-nav__item--active' : ''}`
        }
      >
        <ClipboardList size={20} strokeWidth={2.1} />
        <span className="footer-nav__label">Mis servicios</span>
      </NavLink>

      <NavLink to="/nueva-revision" className="footer-nav__center" aria-label="Nueva revisión">
        <span className="footer-nav__center-circle">
          <Plus size={28} strokeWidth={3} />
        </span>
      </NavLink>

      <NavLink
        to="/perfil"
        className={({ isActive }) =>
          `footer-nav__item ${isActive ? 'footer-nav__item--active' : ''}`
        }
      >
        <UserRound size={20} strokeWidth={2.1} />
        <span className="footer-nav__label">Perfil</span>
      </NavLink>
    </nav>
  )
}