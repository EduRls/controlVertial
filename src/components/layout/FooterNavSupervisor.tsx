import { NavLink } from 'react-router-dom'
import { ClipboardCheck, FileText, PlusSquare, UserCircle2 } from 'lucide-react'
import './FooterNavSupervisor.css'

export default function FooterNavSupervisor() {
  return (
    <nav className="footer-nav-supervisor">

      <NavLink
        to="/supervisor/inspecciones"
        className={({ isActive }) =>
          `footer-nav-supervisor__item ${isActive ? 'footer-nav-supervisor__item--active' : ''}`
        }
      >
        <ClipboardCheck size={20} />
        <span className="footer-nav-supervisor__label">Inspecciones</span>
      </NavLink>

      <NavLink
        to="/supervisor/solicitudes"
        className={({ isActive }) =>
          `footer-nav-supervisor__item ${isActive ? 'footer-nav-supervisor__item--active' : ''}`
        }
      >
        <FileText size={20} />
        <span className="footer-nav-supervisor__label">Solicitudes</span>
      </NavLink>

      <NavLink
        to="/supervisor/nueva-inspeccion"
        className={({ isActive }) =>
          `footer-nav-supervisor__item ${isActive ? 'footer-nav-supervisor__item--active' : ''}`
        }
      >
        <PlusSquare size={20} />
        <span className="footer-nav-supervisor__label">Nueva</span>
      </NavLink>

      <NavLink
        to="/supervisor/perfil"
        className={({ isActive }) =>
          `footer-nav-supervisor__item ${isActive ? 'footer-nav-supervisor__item--active' : ''}`
        }
      >
        <UserCircle2 size={20} />
        <span className="footer-nav-supervisor__label">Perfil</span>
      </NavLink>

    </nav>
  )
}