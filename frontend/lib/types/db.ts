export type UserRole = "tienda" | "admin";

export type CtzUsuario = {
  id: string;
  email: string;
  nombre_completo: string | null;
  rol: UserRole;
  activo: boolean;
  created_at: string;
};

export type CtzSucursal = {
  id: string;
  nombre: string;
  prefijo_folio: string;
  region: string | null;
  iva_predeterminado: number;
  ciudad: string | null;
  centro: string | null;
  direccion: string | null;
  terminos_adicionales: string | null;
  activo: boolean;
  created_at: string;
};

export type CtzCliente = {
  id: string;
  id_sucursal: string;
  nombre_cliente: string;
  num_cliente: string | null;
  empresa: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
  created_at: string;
};

export type CtzProducto = {
  id: string;
  sku: string | null;
  descripcion: string;
  unidad_medida: string | null;
  precio_unitario_base: number;
  activo: boolean;
  created_at: string;
};

export type CtzCotizacion = {
  id: string;
  folio: string;
  id_usuario: string;
  id_sucursal: string;
  id_cliente: string | null;
  nombre_obra: string | null;
  /** "Credito" sin acento: registros antiguos en BD */
  tipo_pago: "Contado" | "Crédito" | "Credito" | null;
  referencia_pago: string | null;
  comentarios: string | null;
  mostrar_con_iva: boolean;
  iva_porcentaje: number;
  subtotal: number;
  iva_total: number;
  total: number;
  created_at: string;
  updated_at: string;
};

export type CtzCotizacionItem = {
  id: string;
  id_cotizacion: string;
  id_producto: string | null;
  descripcion_registro: string;
  cantidad: number;
  unidad_medida: string | null;
  precio_unitario: number;
  iva_porcentaje: number;
  subtotal_item: number;
  total_item: number;
  created_at: string;
};

