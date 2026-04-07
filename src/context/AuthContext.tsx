import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, authPersistenceReady, db } from '../firebase/firebase'

const AUTH_EMAIL_DOMAIN = 'controlvertical.gb'

type LoginData = {
  email: string
  password: string
}

export type UserRole = 'operador' | 'supervisor' | 'administrador'

export type EmergencyContact = {
  nombre: string
  parentesco: string
  telefono: string
}

export type IdentificationCard = {
  nombre: string
  numeroEmpleado: string
  cargo: string
  area: string
  edad: number | null
  genero: string
  telefono: string
}

export type AppUserProfile = {
  id: string
  nombre: string
  telefono: string
  rutaAsignada?: string
  fechaAlta: string
  correo: string
  rol: UserRole | ''
  activo: boolean

  fichaIdentificacion: IdentificationCard
  contactoEmergencia: EmergencyContact
}

type AuthContextType = {
  user: User | null
  userProfile: AppUserProfile | null
  loading: boolean
  login: (data: LoginData) => Promise<AppUserProfile | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type Props = {
  children: ReactNode
}

function normalizeLoginEmail(input: string) {
  const cleanValue = input.trim().toLowerCase()

  if (!cleanValue) return ''

  if (cleanValue.includes('@')) {
    return cleanValue
  }

  return `${cleanValue}@${AUTH_EMAIL_DOMAIN}`
}

function formatFirestoreDate(value: unknown): string {
  if (!value) return ''

  if (typeof value === 'string') {
    return value
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    const date = value.toDate()

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds: unknown }).seconds === 'number'
  ) {
    const timestampValue = value as { seconds: number }
    const date = new Date(timestampValue.seconds * 1000)

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  return ''
}

async function getUserProfileByUid(uid: string): Promise<AppUserProfile | null> {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    return null
  }

  const data = userSnap.data()

  return {
    id: userSnap.id,
    nombre: data.nombre ?? '',
    telefono: data.telefono ?? '',
    rutaAsignada: data.rutaAsignada ?? '',
    fechaAlta: formatFirestoreDate(data.fechaAlta),
    correo: data.correo ?? '',
    rol: data.rol ?? '',
    activo: data.activo ?? false,

    fichaIdentificacion: {
      nombre: data.fichaIdentificacion?.nombre ?? data.nombre ?? '',
      numeroEmpleado: data.fichaIdentificacion?.numeroEmpleado ?? '',
      cargo: data.fichaIdentificacion?.cargo ?? '',
      area: data.fichaIdentificacion?.area ?? '',
      edad:
        typeof data.fichaIdentificacion?.edad === 'number'
          ? data.fichaIdentificacion.edad
          : null,
      genero: data.fichaIdentificacion?.genero ?? '',
      telefono:
        data.fichaIdentificacion?.telefono ?? data.telefono ?? '',
    },

    contactoEmergencia: {
      nombre: data.contactoEmergencia?.nombre ?? '',
      parentesco: data.contactoEmergencia?.parentesco ?? '',
      telefono: data.contactoEmergencia?.telefono ?? '',
    },
  }
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true)
        setUser(firebaseUser)

        if (!firebaseUser) {
          setUserProfile(null)
          return
        }

        const profile = await getUserProfileByUid(firebaseUser.uid)
        setUserProfile(profile)
      } catch (error) {
        console.error('Error al obtener el perfil del usuario:', error)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const login = async ({ email, password }: LoginData) => {
    await authPersistenceReady

    const normalizedEmail = normalizeLoginEmail(email)
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
    const profile = await getUserProfileByUid(credential.user.uid)

    setUser(credential.user)
    setUserProfile(profile)

    return profile
  }

  const logout = async () => {
    await signOut(auth)
  }

  const value = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      login,
      logout,
    }),
    [user, userProfile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}