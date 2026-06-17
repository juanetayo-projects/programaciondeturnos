export type Rol = 'admin' | 'coordinador' | 'nomina'

export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: Rol
  servicio_id: string | null
  activo: boolean
}

export interface Servicio { id: string; nombre: string; activo: boolean }
export interface Cargo { id: string; nombre: string; activo: boolean }

export interface Colaborador {
  id: string
  nombre_completo: string
  numero_documento: string
  email: string | null
  telefono: string | null
  servicio_id: string
  cargo_id: string
  activo: boolean
  fecha_ingreso: string | null
  observacion: string | null
}

export interface CatalogoSigla {
  id: string
  sigla: string
  descripcion: string
  horas: number
  es_ausencia: boolean
  categoria_capacidad: 'dia' | 'manana' | 'tarde' | 'noche' | 'noche8' | null
  activo: boolean
  orden: number
}

export interface ReglaColor {
  id: string
  nombre: string
  operador: '=' | '<' | '>' | '<=' | '>=' | 'between'
  valor_min: number | null
  valor_max: number | null
  color: string
  texto: string
  orden: number
  activo: boolean
}
