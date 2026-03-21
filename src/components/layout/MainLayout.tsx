import type { ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import FooterNavOperador from './FooterNavOperador'
import FooterNavSupervisor from './FooterNavSupervisor'
import AdminSidebar from './AdminSidebar'
import './MainLayout.css'

type Props = {
  children: ReactNode
}

export default function MainLayout({ children }: Props) {
  const { userProfile } = useAuth()

  if (userProfile?.rol === 'administrador') {
    return (
      <div className="main-layout main-layout--admin">
        <AdminSidebar />
        <main className="main-layout__content main-layout__content--admin">{children}</main>
      </div>
    )
  }

  return (
    <div className="main-layout">
      <main className="main-layout__content">{children}</main>
      {userProfile?.rol === 'supervisor' ? <FooterNavSupervisor /> : <FooterNavOperador />}
    </div>
  )
}