import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleHomeRedirect() {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '24px' }}>Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/inicio-sesion" replace />
  }

  if (!userProfile) {
    return <Navigate to="/inicio-sesion" replace />
  }

  if (userProfile.rol === 'administrador') {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (userProfile.rol === 'supervisor') {
    return <Navigate to="/supervisor/inspecciones" replace />
  }

  return <Navigate to="/mis-servicios" replace />
}