import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'

type Props = {
  allowedRoles?: UserRole[]
  children?: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { user, userProfile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div style={{ padding: '24px' }}>Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/inicio-sesion" replace state={{ from: location }} />
  }

  if (!userProfile) {
    return <Navigate to="/inicio-sesion" replace />
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.rol as UserRole)) {
    if (userProfile.rol === 'administrador') {
      return <Navigate to="/admin/dashboard" replace />
    }

    if (userProfile.rol === 'supervisor') {
      return <Navigate to="/supervisor/inspecciones" replace />
    }

    return <Navigate to="/mis-servicios" replace />
  }

  return children ? <>{children}</> : <Outlet />
}