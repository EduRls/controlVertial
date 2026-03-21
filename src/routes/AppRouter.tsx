import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import RoleHomeRedirect from './RoleHomeRedirect'
import InicioSesion from '../pages/inicioSesion/InicioSesion'
import MisServicios from '../pages/operador/misServicios/MisServicios'
import NuevaRevision from '../pages/operador/nuevaRevision/NuevaRevision'
import Perfil from '../pages/operador/perfil/perfil'
import InspeccionesSupervisor from '../pages/supervisor/inspecciones/InspeccionesSupervisor'
import SolicitudesSupervisor from '../pages/supervisor/solicitudes/SolicitudesSupervisor'
import NuevaInspeccionSupervisor from '../pages/supervisor/nuevaInspeccion/NuevaInspeccionSupervisor'
import PerfilSupervisor from '../pages/supervisor/perfil/PerfilSupervisor'
import DashboardAdmin from '../pages/administrador/dashboard/DashboardAdmin'
import EmpleadosAdmin from '../pages/administrador/empleados/EmpleadosAdmin'
import RutasAdmin from '../pages/administrador/rutas/RutasAdmin'
import RegistrosMedicosAdmin from '../pages/administrador/registrosMedicos/RegistrosMedicosAdmin'
import DocumentosAdmin from '../pages/administrador/documentos/DocumentosAdmin'
import ConfiguracionAdmin from '../pages/administrador/configuracion/ConfiguracionAdmin'
import MainLayout from '../components/layout/MainLayout'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/inicio-sesion" element={<InicioSesion />} />

        <Route
          path="/mis-servicios"
          element={
            <ProtectedRoute allowedRoles={['operador']}>
              <MainLayout>
                <MisServicios />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/nueva-revision"
          element={
            <ProtectedRoute allowedRoles={['operador']}>
              <MainLayout>
                <NuevaRevision />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute allowedRoles={['operador']}>
              <MainLayout>
                <Perfil />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/supervisor/inspecciones"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <MainLayout>
                <InspeccionesSupervisor />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/supervisor/solicitudes"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <MainLayout>
                <SolicitudesSupervisor />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/supervisor/nueva-inspeccion"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <MainLayout>
                <NuevaInspeccionSupervisor />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/supervisor/perfil"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <MainLayout>
                <PerfilSupervisor />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <MainLayout>
                <DashboardAdmin />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/empleados"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <MainLayout>
                <EmpleadosAdmin />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/rutas"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <MainLayout>
                <RutasAdmin />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/registros-medicos"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <MainLayout>
                <RegistrosMedicosAdmin />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/documentos"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <MainLayout>
                <DocumentosAdmin />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/configuracion"
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <MainLayout>
                <ConfiguracionAdmin />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}