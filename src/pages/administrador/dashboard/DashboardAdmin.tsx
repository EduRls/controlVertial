import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BriefcaseBusiness,
  FileHeart,
  FileText,
  MapPinned,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase/firebase'
import './DashboardAdmin.css'

type TimestampLike = {
  seconds?: number
  nanoseconds?: number
  toDate?: () => Date
}

type UserDoc = {
  id: string
  rol?: string
  activo?: boolean
  fichaIdentificacion?: {
    nombre?: string
    numeroEmpleado?: string
  }
}

type RutaDoc = {
  id: string
  activo?: boolean
  numeroEconomico?: string
  placas?: string
}

type SolicitudAlturaDoc = {
  id: string
  folio?: string
  estatus?: string
  autorizacion?: boolean
  autorizadoPor?: string | null
  fechaSolicitud?: TimestampLike | null
  fechaAutorizacion?: TimestampLike | null
  operador?: {
    nombre?: string
    numeroEmpleado?: string
  }
  datosGenerales?: {
    unidad?: string
    lugarArea?: string
    tipoTrabajo?: string
  }
  condicionesClimaticas?: {
    bloqueoAutomatico?: boolean
  }
}

type RegistroMedicoDoc = {
  id: string
  createdAt?: TimestampLike | null
  operadorId?: string
  operadorNombre?: string
  supervisorNombre?: string
  conclusion?: {
    apto?: boolean
    noApto?: boolean
    nombreMedico?: string
  }
  exploracion?: {
    fechaEvaluacion?: string
  }
}

type ActivityItem = {
  id: string
  usuario: string
  actividad: string
  estado: 'completado' | 'pendiente' | 'bloqueado'
  fechaMs: number
  fechaLabel: string
}

function timestampToMs(value?: TimestampLike | null) {
  if (!value) return 0
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (typeof value.seconds === 'number') return value.seconds * 1000
  return 0
}

function formatRelativeDate(ms: number) {
  if (!ms) return 'Sin fecha'

  const diff = Date.now() - ms
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Hace unos segundos'
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours} h`
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(ms))
}

function parseDateOnlyToMs(dateStr?: string) {
  if (!dateStr) return 0
  const date = new Date(`${dateStr}T12:00:00`)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function getSolicitudEstado(
  solicitud: SolicitudAlturaDoc
): 'completado' | 'pendiente' | 'bloqueado' {
  const bloqueada = solicitud.condicionesClimaticas?.bloqueoAutomatico
  const autorizada = solicitud.autorizacion === true
  const estatus = (solicitud.estatus || '').toLowerCase()

  if (bloqueada) return 'bloqueado'
  if (autorizada || estatus === 'autorizado' || estatus === 'aprobado') {
    return 'completado'
  }
  return 'pendiente'
}

export default function DashboardAdmin() {
  const [usuarios, setUsuarios] = useState<UserDoc[]>([])
  const [rutas, setRutas] = useState<RutaDoc[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudAlturaDoc[]>([])
  const [registrosMedicos, setRegistrosMedicos] = useState<RegistroMedicoDoc[]>([])

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<UserDoc, 'id'>),
      }))
      setUsuarios(data)
    })

    const unsubRutas = onSnapshot(collection(db, 'rutas'), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<RutaDoc, 'id'>),
      }))
      setRutas(data)
    })

    const unsubSolicitudes = onSnapshot(collection(db, 'solicitudes_altura'), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<SolicitudAlturaDoc, 'id'>),
      }))
      setSolicitudes(data)
    })

    const unsubMedicos = onSnapshot(collection(db, 'registros_medicos'), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<RegistroMedicoDoc, 'id'>),
      }))
      setRegistrosMedicos(data)
    })

    return () => {
      unsubUsers()
      unsubRutas()
      unsubSolicitudes()
      unsubMedicos()
    }
  }, [])

  const stats = useMemo(() => {
    const empleadosActivos = usuarios.filter(
      (u) => u.rol === 'operador' && u.activo === true
    ).length

    const supervisoresActivos = usuarios.filter(
      (u) => u.rol === 'supervisor' && u.activo === true
    ).length

    const rutasRegistradas = rutas.length
    const rutasActivas = rutas.filter((ruta) => ruta.activo === true).length

    const solicitudesPendientes = solicitudes.filter(
      (s) => getSolicitudEstado(s) === 'pendiente'
    ).length

    const solicitudesAutorizadas = solicitudes.filter(
      (s) => getSolicitudEstado(s) === 'completado'
    ).length

    const solicitudesBloqueadas = solicitudes.filter(
      (s) => getSolicitudEstado(s) === 'bloqueado'
    ).length

    const medicosAptos = registrosMedicos.filter(
      (r) => r.conclusion?.apto === true
    ).length

    const medicosNoAptos = registrosMedicos.filter(
      (r) => r.conclusion?.noApto === true
    ).length

    const medicosTotal = registrosMedicos.length

    const medicosVigentesPct = medicosTotal
      ? Math.round((medicosAptos / medicosTotal) * 100)
      : 0

    const solicitudesResueltas = solicitudesAutorizadas
    const solicitudesTotal = solicitudes.length
    const eficienciaOperativa = solicitudesTotal
      ? Math.round((solicitudesResueltas / solicitudesTotal) * 100)
      : 0

    return {
      empleadosActivos,
      supervisoresActivos,
      rutasRegistradas,
      rutasActivas,
      solicitudesPendientes,
      solicitudesAutorizadas,
      solicitudesBloqueadas,
      medicosAptos,
      medicosNoAptos,
      medicosTotal,
      medicosVigentesPct,
      eficienciaOperativa,
    }
  }, [usuarios, rutas, solicitudes, registrosMedicos])

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const solicitudesActivity: ActivityItem[] = solicitudes.map((s) => {
      const fechaMs = timestampToMs(s.fechaSolicitud)
      const estado = getSolicitudEstado(s)

      return {
        id: `sol-${s.id}`,
        usuario: s.operador?.nombre || 'Operador',
        actividad: s.autorizacion
          ? `Solicitud autorizada ${s.folio ? `(${s.folio})` : ''}`
          : `Nueva solicitud de altura ${s.folio ? `(${s.folio})` : ''}`,
        estado,
        fechaMs,
        fechaLabel: formatRelativeDate(fechaMs),
      }
    })

    const medicosActivity: ActivityItem[] = registrosMedicos.map((r) => {
      const fechaMs =
        timestampToMs(r.createdAt) || parseDateOnlyToMs(r.exploracion?.fechaEvaluacion)

      return {
        id: `med-${r.id}`,
        usuario: r.operadorNombre || 'Operador',
        actividad:
          r.conclusion?.apto === true
            ? 'Registro médico apto'
            : r.conclusion?.noApto === true
              ? 'Registro médico no apto'
              : 'Registro médico cargado',
        estado:
          r.conclusion?.noApto === true
            ? 'bloqueado'
            : r.conclusion?.apto === true
              ? 'completado'
              : 'pendiente',
        fechaMs,
        fechaLabel: formatRelativeDate(fechaMs),
      }
    })

    return [...solicitudesActivity, ...medicosActivity]
      .sort((a, b) => b.fechaMs - a.fechaMs)
      .slice(0, 6)
  }, [solicitudes, registrosMedicos])

  /*
  const plantasInfo = useMemo(() => {
    const rutasActivas = stats.rutasActivas
    const operadoresActivos = stats.empleadosActivos
    const cobertura = rutasActivas && operadoresActivos
      ? Math.min(100, Math.round((operadoresActivos / rutasActivas) * 100))
      : 0

    return {
      nombre: 'Operación de plantas',
      descripcion: `${rutasActivas} rutas activas · ${operadoresActivos} operadores disponibles`,
      cobertura,
    }
  }, [stats.rutasActivas, stats.empleadosActivos])
  */

  return (
    <section className="dashboard-admin">
      <header className="dashboard-admin__header">
        <div>
          <h1>Panel de administración</h1>
          <p>Control general del sistema</p>
        </div>
      </header>

      <div className="dashboard-admin__grid">
        <main className="dashboard-admin__main">
          <section className="dashboard-admin__stats">
            <article className="stat-card stat-card--active">
              <div className="stat-card__top">
                <div className="stat-card__icon stat-card__icon--blue">
                  <UserRound size={18} />
                </div>
                <span className="stat-card__badge stat-card__badge--green">
                  Operadores
                </span>
              </div>
              <strong>{stats.empleadosActivos}</strong>
              <span>Empleados Activos</span>
              <small>{stats.supervisoresActivos} supervisores activos</small>
            </article>

            <article className="stat-card">
              <div className="stat-card__top">
                <div className="stat-card__icon stat-card__icon--slate">
                  <MapPinned size={18} />
                </div>
                <span className="stat-card__badge stat-card__badge--gray">
                  Estable
                </span>
              </div>
              <strong>{stats.rutasRegistradas}</strong>
              <span>Rutas Registradas</span>
              <small>{stats.rutasActivas} rutas activas</small>
            </article>

            <article className="stat-card">
              <div className="stat-card__top">
                <div className="stat-card__icon stat-card__icon--red">
                  <FileText size={18} />
                </div>
                <span className="stat-card__badge stat-card__badge--red">
                  Atención
                </span>
              </div>
              <strong>{String(stats.solicitudesPendientes).padStart(2, '0')}</strong>
              <span>Solicitudes Pendientes</span>
              <small>
                {stats.solicitudesAutorizadas} autorizadas · {stats.solicitudesBloqueadas} bloqueadas
              </small>
            </article>

            <article className="stat-card">
              <div className="stat-card__top">
                <div className="stat-card__icon stat-card__icon--green">
                  <ShieldCheck size={18} />
                </div>
                <span className="stat-card__badge stat-card__badge--green-soft">
                  Médicos
                </span>
              </div>
              <strong>{stats.medicosVigentesPct}%</strong>
              <span>Médicos Vigentes</span>
              <small>
                {stats.medicosAptos} aptos · {stats.medicosNoAptos} no aptos
              </small>
            </article>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel__head">
              <h2>Actividad Reciente</h2>
              <button type="button">Ver todo</button>
            </div>

            <div className="activity-table">
              <div className="activity-table__head">
                <span>Usuario</span>
                <span>Actividad</span>
                <span>Estado</span>
                <span>Fecha</span>
              </div>

              <div className="activity-table__body">
                {recentActivity.length === 0 ? (
                  <div className="activity-empty">
                    <Activity size={18} />
                    <span>No hay actividad reciente.</span>
                  </div>
                ) : (
                  recentActivity.map((item) => (
                    <article className="activity-row" key={item.id}>
                      <div className="activity-user">
                        <div className="activity-user__avatar">
                          {(item.usuario || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="activity-user__text">
                          <strong>{item.usuario}</strong>
                        </div>
                      </div>

                      <div className="activity-description">
                        {item.actividad}
                      </div>

                      <div>
                        <span className={`status-pill status-pill--${item.estado}`}>
                          {item.estado === 'completado'
                            ? 'Completado'
                            : item.estado === 'bloqueado'
                              ? 'Bloqueado'
                              : 'Pendiente'}
                        </span>
                      </div>

                      <div className="activity-date">{item.fechaLabel}</div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>

        <aside className="dashboard-admin__side">
          <section className="operations-card">
            <div className="operations-card__header">
              <div>
                <span>Estado de Operaciones</span>
                <strong>{stats.eficienciaOperativa}%</strong>
                <p>Eficiencia Global</p>
              </div>

              <div className="operations-card__icon">
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="operations-card__progress">
              <div
                className="operations-card__progress-fill"
                style={{ width: `${stats.eficienciaOperativa}%` }}
              />
            </div>

            <div className="operations-card__mini-stats">
              <div>
                <span>Alturas autorizadas</span>
                <strong>{stats.solicitudesAutorizadas}</strong>
              </div>
              <div>
                <span>Bloqueadas</span>
                <strong>{stats.solicitudesBloqueadas}</strong>
              </div>
            </div>

            <button type="button" className="operations-card__button">
              Generar Reporte Técnico
            </button>
          </section>
                {/*
          <section className="location-card">
            <p className="location-card__eyebrow">Ubicación de plantas</p>

            <div className="location-card__image">
              <div className="location-card__overlay">
                <span>{plantasInfo.nombre}</span>
              </div>
            </div>

            <div className="location-card__info">
              <strong>{plantasInfo.descripcion}</strong>
              <span>Cobertura operativa estimada: {plantasInfo.cobertura}%</span>
            </div>
          </section>
          */}

          <section className="summary-card">
            <div className="summary-card__row">
              <div className="summary-card__icon">
                <BriefcaseBusiness size={16} />
              </div>
              <div>
                <span>Registros médicos</span>
                <strong>{stats.medicosTotal}</strong>
              </div>
            </div>

            <div className="summary-card__row">
              <div className="summary-card__icon">
                <FileHeart size={16} />
              </div>
              <div>
                <span>Solicitudes de altura</span>
                <strong>{solicitudes.length}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}