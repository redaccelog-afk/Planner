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
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline auto", icon: Workflow },
  { href: "/demandes", label: "Demandes", icon: InboxIcon },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/formateurs", label: "Formateurs", icon: Users },
  { href: "/formateurs/preselection", label: "Présélection", icon: UserSearch, indent: true },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/themes", label: "Thèmes", icon: BookOpen },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/rapports", label: "Rapports", icon: FileText },
  { href: "/facturation", label: "Facturation", icon: Receipt },
  { href: "/achats", label: "Achats externes", icon: ShoppingCart, indent: true },
  { href: "/analytiques", label: "Analytiques", icon: TrendingUp },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
        <CcelogLogo className="h-8 w-auto" showText />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/formateurs" && pathname.startsWith(item.href + "/")) || (item.href === "/formateurs" && pathname === "/formateurs");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 py-2 rounded-md text-sm font-medium transition-colors",
                item.indent ? "pl-8 pr-3" : "px-3",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground">CCE LOG v2.0</p>
      </div>
    </aside>
  );
}
