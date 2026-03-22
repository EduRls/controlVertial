import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Route,
  HeartPulse,
  FolderOpen,
  Shield,
  Menu,
  X,
  LogOut,
} from 'lucide-react'

import { getAuth, signOut } from 'firebase/auth'

import './AdminSidebar.css'

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const auth = getAuth()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) {
        setIsOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const closeSidebar = () => setIsOpen(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login') // ajusta esta ruta si es necesario
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  return (
    <>
      <button
        className="admin-sidebar__mobile-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <div
          className="admin-sidebar__overlay"
          onClick={closeSidebar}
        />
      )}

      <aside className={`admin-sidebar ${isOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__mobile-header">
          <span>Menú</span>
          <button
            className="admin-sidebar__close"
            onClick={closeSidebar}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__logo">
            <Shield size={20} />
          </div>
          <div>
            <h2>Control Vertical</h2>
            <p>Administración</p>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          <NavLink
            to="/admin/dashboard"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
            }
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/empleados"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
            }
          >
            <Users size={18} />
            <span>Empleados</span>
          </NavLink>

          <NavLink
            to="/admin/rutas"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
            }
          >
            <Route size={18} />
            <span>Rutas</span>
          </NavLink>

          <NavLink
            to="/admin/registros-medicos"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
            }
          >
            <HeartPulse size={18} />
            <span>Registros médicos</span>
          </NavLink>

          <NavLink
            to="/admin/documentos"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
            }
          >
            <FolderOpen size={18} />
            <span>Documentos</span>
          </NavLink>

          {/* 🔴 LOGOUT */}
          <button
            onClick={handleLogout}
            className="admin-sidebar__link admin-sidebar__logout"
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </nav>
      </aside>
    </>
  )
}