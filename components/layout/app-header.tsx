"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CContainer, CHeader, CHeaderToggler } from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilBell, cilFolderOpen, cilMenu } from "@coreui/icons";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/components/providers/session-provider";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ThemeSwitcher } from "./theme-switcher";

export function AppHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const { user, can } = useSession();
  const canSeeCases = can(PERMISSIONS.CASES_READ) || can(PERMISSIONS.CASES_READ_OWN);

  // Sombra suave cuando el contenido pasa por debajo del header.
  useEffect(() => {
    const onScroll = () => {
      headerRef.current?.classList.toggle("shadow-sm", document.documentElement.scrollTop > 0);
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    return () => document.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <CHeader position="sticky" className="app-header p-0 no-print" ref={headerRef}>
      <CContainer className="px-3 px-lg-4 gap-2 gap-md-3 flex-nowrap" fluid>
        <CHeaderToggler onClick={onToggleSidebar} className="px-2" aria-label="Mostrar u ocultar menú">
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        <Link href="/dashboard" className="d-lg-none me-auto" aria-label="TeleMed Rural, ir al inicio">
          <Logo size={30} withWordmark={false} />
        </Link>

        <span className="header-context d-none d-md-inline-flex me-auto">
          <span className="header-context__pulse" aria-hidden="true" />
          Telemedicina diferida · Pre-triaje NEWS2
        </span>

        {can(PERMISSIONS.CASES_READ) && (
          <Link href="/dashboard/casos?estado=pendiente" className="btn btn-primary btn-sm d-none d-sm-inline-flex align-items-center gap-2">
            <CIcon icon={cilFolderOpen} />
            Revisar pendientes
            {user.pendingCases > 0 && <span className="header-count">{user.pendingCases}</span>}
          </Link>
        )}
        {canSeeCases && (
          <Link
            href="/dashboard/casos?estado=pendiente&riesgo=urgente"
            className="icon-btn"
            aria-label={user.urgentCases ? `${user.urgentCases} casos urgentes sin revisar` : "Casos urgentes"}
            title={user.urgentCases ? `${user.urgentCases} casos de riesgo alto o medio sin revisar` : "Sin casos urgentes pendientes"}
          >
            <CIcon icon={cilBell} />
            {user.urgentCases > 0 && <span className="icon-btn__dot" aria-hidden="true" />}
          </Link>
        )}
        <ThemeSwitcher />
      </CContainer>
    </CHeader>
  );
}
