import { cilBook, cilFolderOpen, cilHome, cilLockLocked, cilPeople, cilSettings, cilSync, cilWarning } from "@coreui/icons";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";

type Badge = { text: string; color: string };

export type NavLinkEntry = {
  kind: "link";
  label: string;
  href: string;
  /** Opcional en los ítems de un submenú (se muestra una viñeta). */
  icon?: string[];
  badge?: Badge;
  /** Contador dinámico que se muestra como insignia (casos pendientes de revisión). */
  counter?: "pending";
  /** Para secciones aún no implementadas. */
  disabled?: boolean;
  /** Si se indica, el ítem solo se muestra a quien tenga este permiso. */
  permission?: PermissionKey;
  /** Basta con tener cualquiera de estos permisos. */
  anyPermission?: PermissionKey[];
  /** Marca activo solo con la ruta exacta (no sus subrutas). */
  exact?: boolean;
};

export type NavEntry =
  | { kind: "title"; label: string }
  | NavLinkEntry
  | {
      kind: "group";
      label: string;
      icon: string[];
      items: NavLinkEntry[];
    };

export const navigation: NavEntry[] = [
  { kind: "title", label: "Atención" },
  { kind: "link", label: "Inicio", href: "/dashboard", icon: cilHome, permission: PERMISSIONS.DASHBOARD_VIEW, exact: true },
  {
    kind: "link",
    label: "Bandeja de casos",
    href: "/dashboard/casos",
    icon: cilFolderOpen,
    anyPermission: [PERMISSIONS.CASES_READ, PERMISSIONS.CASES_READ_OWN],
    counter: "pending",
  },
  { kind: "link", label: "Pacientes", href: "/dashboard/pacientes", icon: cilPeople, permission: PERMISSIONS.PATIENTS_READ },
  { kind: "link", label: "Escala NEWS2", href: "/dashboard/news2", icon: cilWarning, permission: PERMISSIONS.DASHBOARD_VIEW },
  { kind: "title", label: "Administración" },
  { kind: "link", label: "Sincronización", href: "/dashboard/sincronizacion", icon: cilSync, permission: PERMISSIONS.SYNC_READ },
  { kind: "link", label: "API de la app móvil", href: "/dashboard/api", icon: cilBook, anyPermission: [PERMISSIONS.SYNC_READ, PERMISSIONS.CASES_SYNC] },
  {
    kind: "group",
    label: "Usuarios y acceso",
    icon: cilLockLocked,
    items: [
      { kind: "link", label: "Usuarios", href: "/dashboard/usuarios", permission: PERMISSIONS.USERS_READ },
      { kind: "link", label: "Roles", href: "/dashboard/roles", permission: PERMISSIONS.ROLES_READ },
      { kind: "link", label: "Permisos", href: "/dashboard/permisos", permission: PERMISSIONS.PERMISSIONS_READ },
    ],
  },
  { kind: "title", label: "Cuenta" },
  {
    kind: "group",
    label: "Configuración",
    icon: cilSettings,
    items: [
      { kind: "link", label: "Mi perfil", href: "/dashboard/configuracion/perfil" },
      { kind: "link", label: "Apariencia", href: "/dashboard/configuracion/temas" },
    ],
  },
];
