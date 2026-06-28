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
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  indent?: boolean;
  roles?: string[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline auto", icon: Workflow },
  { href: "/demandes", label: "Demandes", icon: InboxIcon },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/calendrier", label: "Calendrier", icon: Calendar },
  { href: "/formateurs", label: "Formateurs", icon: Users },
  { href: "/formateurs/preselection", label: "Présélection", icon: UserSearch, indent: true },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/themes", label: "Thèmes", icon: BookOpen },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/rapports", label: "Rapports", icon: FileText },
  { href: "/facturation", label: "Facturation", icon: Receipt },
  { href: "/achats", label: "Achats externes", icon: ShoppingCart, indent: true },
  { href: "/analytiques", label: "Analytiques", icon: TrendingUp },
  { href: "/ged", label: "Archivage & GED", icon: Archive },
  { href: "/parametres", label: "Paramètres", icon: Settings },
  { href: "/mes-validations", label: "Mes validations", icon: CheckSquare, roles: ["FORMATEUR"] },
];

interface SidebarNavProps {
  role?: string;
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <aside className="sidebar-dark w-60 flex-shrink-0 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
        <CcelogLogo className="h-8 w-auto" showText />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleItems.map((item) => {
          // Exact match OU sous-route directe (évite /sessions matchant /sessions123)
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
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

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        <p className="text-xs text-sidebar-foreground/50">CCE LOG v2.0</p>
      </div>
    </aside>
  );
}
