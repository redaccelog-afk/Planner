"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CcelogLogo } from "@/components/ccelog-logo";
import {
  LayoutDashboard,
  InboxIcon,
  CalendarDays,
  Users,
  UserSearch,
  Building2,
  BookOpen,
  Package,
  FileText,
  Settings,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Workflow,
  Calendar,
  Archive,
  CheckSquare,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";
import type { AppRole } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  indent?: boolean;
  roles?: AppRole[]; // undefined = visible par tous les rôles authentifiés
};

const navItems: NavItem[] = [
  // ── Tous ──────────────────────────────────────────────────────────
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },

  // ── Planification ─────────────────────────────────────────────────
  { href: "/pipeline", label: "Pipeline auto", icon: Workflow, roles: ["ADMIN", "PLANIFICATEUR"] },
  { href: "/demandes", label: "Demandes", icon: InboxIcon, roles: ["ADMIN", "PLANIFICATEUR"] },
  { href: "/sessions", label: "Sessions", icon: CalendarDays, roles: ["ADMIN", "PLANIFICATEUR"] },
  { href: "/calendrier", label: "Calendrier", icon: Calendar, roles: ["ADMIN", "PLANIFICATEUR"] },

  // ── Ressources ────────────────────────────────────────────────────
  { href: "/formateurs", label: "Formateurs", icon: Users, roles: ["ADMIN", "PLANIFICATEUR"] },
  { href: "/formateurs/preselection", label: "Présélection", icon: UserSearch, indent: true, roles: ["ADMIN", "PLANIFICATEUR"] },
  { href: "/clients", label: "Clients", icon: Building2, roles: ["ADMIN", "PLANIFICATEUR", "COMPTABILITE"] },
  { href: "/themes", label: "Thèmes", icon: BookOpen, roles: ["ADMIN", "PLANIFICATEUR"] },

  // ── Dossiers & Stock ──────────────────────────────────────────────
  { href: "/stock", label: "Stock", icon: Package, roles: ["ADMIN", "PLANIFICATEUR", "PREPARATEUR"] },
  { href: "/dossiers", label: "Dossiers formation", icon: FolderOpen, roles: ["ADMIN", "PLANIFICATEUR", "PREPARATEUR"] },

  // ── Formateur ────────────────────────────────────────────────────
  { href: "/mes-validations", label: "Mes validations", icon: CheckSquare, roles: ["ADMIN", "FORMATEUR"] },
  { href: "/rapports", label: "Rapports", icon: FileText, roles: ["ADMIN", "PLANIFICATEUR", "FORMATEUR"] },

  // ── Comptabilité ─────────────────────────────────────────────────
  { href: "/facturation", label: "Facturation", icon: Receipt, roles: ["ADMIN", "COMPTABILITE"] },
  { href: "/achats", label: "Achats externes", icon: ShoppingCart, indent: true, roles: ["ADMIN", "PLANIFICATEUR", "COMPTABILITE"] },

  // ── Analytique & GED ─────────────────────────────────────────────
  { href: "/analytiques", label: "Analytiques", icon: TrendingUp, roles: ["ADMIN", "PLANIFICATEUR", "COMPTABILITE"] },
  { href: "/ged", label: "Archivage & GED", icon: Archive, roles: ["ADMIN", "PLANIFICATEUR", "COMPTABILITE"] },

  // ── Admin ────────────────────────────────────────────────────────
  { href: "/parametres", label: "Paramètres", icon: Settings, roles: ["ADMIN"] },
  { href: "/parametres/autorisations", label: "Autorisations", icon: ShieldCheck, indent: true, roles: ["ADMIN"] },
];

interface SidebarNavProps {
  role?: string;
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true; // pas de restriction → tous les rôles
    return role ? item.roles.includes(role as AppRole) : false;
  });

  return (
    <aside className="sidebar-dark w-60 flex-shrink-0 flex flex-col h-full">
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-14"
        style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <CcelogLogo className="h-8 w-auto" showText />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 py-2 rounded-md text-sm font-medium transition-colors",
                item.indent ? "pl-8 pr-3" : "px-3",
                isActive
                  ? "bg-sidebar-primary/20 text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Badge rôle + footer */}
      <div
        className="px-4 py-3 space-y-1"
        style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
      >
        {role && (
          <p className="text-xs text-sidebar-foreground/40 truncate">
            {ROLE_DISPLAY[role as AppRole] ?? role}
          </p>
        )}
        <p className="text-xs text-sidebar-foreground/30">CCE LOG v2.0</p>
      </div>
    </aside>
  );
}

const ROLE_DISPLAY: Record<AppRole, string> = {
  ADMIN: "⚙ Super Admin",
  PLANIFICATEUR: "📋 Planificateur",
  PREPARATEUR: "📁 Préparateur dossiers",
  COMPTABILITE: "💰 Comptabilité",
  FORMATEUR: "🎓 Formateur",
  LECTEUR: "👁 Lecteur",
  CLIENT: "🏢 Client",
};
