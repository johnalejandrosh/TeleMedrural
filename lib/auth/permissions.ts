/**
 * Catálogo de permisos que usa la aplicación. Compartido entre cliente, servidor y seed.
 * Estos permisos se crean como "de sistema" (no se pueden eliminar ni cambiar su clave);
 * desde la UI se pueden crear permisos adicionales para módulos futuros.
 *
 * Actores: promotor de salud rural (registra casos en la app móvil), profesional de salud
 * (revisa los casos en el panel web), coordinador y administrador.
 */

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  CASES_READ: "cases.read",
  CASES_READ_OWN: "cases.read_own",
  CASES_REVIEW: "cases.review",
  CASES_SYNC: "cases.sync",
  PATIENTS_READ: "patients.read",
  SYNC_READ: "sync.read",
  SYNC_MANAGE: "sync.manage",
  USERS_READ: "users.read",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  ROLES_READ: "roles.read",
  ROLES_CREATE: "roles.create",
  ROLES_UPDATE: "roles.update",
  ROLES_DELETE: "roles.delete",
  PERMISSIONS_READ: "permissions.read",
  PERMISSIONS_CREATE: "permissions.create",
  PERMISSIONS_UPDATE: "permissions.update",
  PERMISSIONS_DELETE: "permissions.delete",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_PERMISSIONS: { key: PermissionKey; name: string; module: string; description: string }[] = [
  { key: "dashboard.view", name: "Ver inicio", module: "Inicio", description: "Panel con el resumen de casos y prioridades." },
  { key: "cases.read", name: "Ver todos los casos", module: "Casos", description: "Consultar las fichas clínicas sincronizadas por todos los promotores." },
  { key: "cases.read_own", name: "Ver mis casos", module: "Casos", description: "Consultar los casos registrados por uno mismo y el concepto médico." },
  { key: "cases.review", name: "Revisar casos", module: "Casos", description: "Registrar observaciones médicas y marcar casos como revisados." },
  { key: "cases.sync", name: "Sincronizar desde la app", module: "Casos", description: "Enviar casos desde la app móvil (API /api/v1)." },
  { key: "patients.read", name: "Ver pacientes", module: "Pacientes", description: "Consultar pacientes y su historial de atenciones." },
  { key: "sync.read", name: "Ver sincronización", module: "Sincronización", description: "Consultar la bitácora de lotes recibidos y los dispositivos conectados." },
  { key: "sync.manage", name: "Gestionar dispositivos", module: "Sincronización", description: "Revocar el acceso de dispositivos móviles." },
  { key: "users.read", name: "Ver usuarios", module: "Usuarios", description: "Consultar la lista de usuarios." },
  { key: "users.create", name: "Crear usuarios", module: "Usuarios", description: "Dar de alta nuevos usuarios." },
  { key: "users.update", name: "Editar usuarios", module: "Usuarios", description: "Modificar datos, rol y estado de usuarios." },
  { key: "users.delete", name: "Eliminar usuarios", module: "Usuarios", description: "Eliminar usuarios de forma permanente." },
  { key: "roles.read", name: "Ver roles", module: "Roles", description: "Consultar roles y sus permisos." },
  { key: "roles.create", name: "Crear roles", module: "Roles", description: "Crear roles nuevos." },
  { key: "roles.update", name: "Editar roles", module: "Roles", description: "Cambiar nombre, descripción y permisos de un rol." },
  { key: "roles.delete", name: "Eliminar roles", module: "Roles", description: "Eliminar roles sin usuarios asignados." },
  { key: "permissions.read", name: "Ver permisos", module: "Permisos", description: "Consultar el catálogo de permisos." },
  { key: "permissions.create", name: "Crear permisos", module: "Permisos", description: "Agregar permisos al catálogo." },
  { key: "permissions.update", name: "Editar permisos", module: "Permisos", description: "Modificar nombre, módulo y descripción de permisos." },
  { key: "permissions.delete", name: "Eliminar permisos", module: "Permisos", description: "Eliminar permisos que no son del sistema." },
];

/** Roles que crea el seed. El Administrador es de sistema y tiene acceso total. */
export const ADMIN_ROLE_NAME = "Administrador";
export const DOCTOR_ROLE_NAME = "Profesional de salud";
export const PROMOTER_ROLE_NAME = "Promotor de salud";
export const COORDINATOR_ROLE_NAME = "Coordinador";

/** Perfiles que se pueden elegir al crear una cuenta (quedan pendientes de aprobación). */
export const SELF_SIGNUP_ROLES = [DOCTOR_ROLE_NAME, PROMOTER_ROLE_NAME] as const;

export const SEED_ROLES: { name: string; description: string; isSystem: boolean; permissions: PermissionKey[] }[] = [
  {
    name: ADMIN_ROLE_NAME,
    description: "Gestiona usuarios, roles y dispositivos. Acceso total.",
    isSystem: true,
    permissions: [],
  },
  {
    name: DOCTOR_ROLE_NAME,
    description: "Médico, enfermero u otro profesional: revisa los casos y registra su concepto.",
    isSystem: false,
    permissions: ["dashboard.view", "cases.read", "cases.review", "patients.read"],
  },
  {
    name: PROMOTER_ROLE_NAME,
    description: "Promotor de salud rural: registra casos en la app móvil y consulta el concepto médico.",
    isSystem: false,
    permissions: ["dashboard.view", "cases.read_own", "cases.sync"],
  },
  {
    name: COORDINATOR_ROLE_NAME,
    description: "Coordinador de la ESE o del programa: consulta casos, pacientes y la sincronización.",
    isSystem: false,
    permissions: ["dashboard.view", "cases.read", "patients.read", "sync.read"],
  },
];
