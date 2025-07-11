"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { 
  BarChart3, 
  Home, 
  Target, 
  Users, 
  Settings, 
  TrendingUp,
  Menu,
  Zap,
  Search,
  Brain,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    current: true
  },
  {
    name: "Ad Intelligence",
    href: "/ads",
    icon: Brain,
    current: false
  },
  {
    name: "Ad Sets",
    href: "/ad-sets",
    icon: Layers,
    current: false
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    current: false
  },
  {
    name: "Competitors",
    href: "/competitors",
    icon: Target,
    current: false
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: Activity,
    current: false
  },
  {
    name: "Trends",
    href: "/trends",
    icon: TrendingUp,
    current: false
  },
  {
    name: "Search",
    href: "/search",
    icon: Search,
    current: false
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    current: false
  }
];

interface SidebarContentProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

function SidebarContent({ isCollapsed = false, onItemClick }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-border transition-all duration-300",
        isCollapsed ? "px-4 justify-center" : "px-6"
      )}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-photon-400 to-photon-600 flex-shrink-0">
            <Zap className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="transition-opacity duration-300">
              <h1 className="text-lg font-bold text-gradient-primary">AdMind</h1>
              <p className="text-xs text-muted-foreground">Intelligence Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-1 py-6 transition-all duration-300",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onItemClick}
              prefetch={true}
              className={cn(
                "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all hover:bg-accent/50 relative",
                isCollapsed ? "px-3 py-3 justify-center" : "px-3 py-2",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors flex-shrink-0",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {!isCollapsed && (
                <>
                  <span className="transition-opacity duration-300">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                  )}
                </>
              )}
              {isCollapsed && isActive && (
                <div className="absolute right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={cn(
        "border-t border-border transition-all duration-300",
        isCollapsed ? "p-2" : "p-4"
      )}>
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed ? "justify-center" : "gap-3"
        )}>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-iridium-400 to-iridium-600 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 transition-opacity duration-300">
              <p className="text-sm font-medium">John Doe</p>
              <p className="text-xs text-muted-foreground">Premium User</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300",
        isCollapsed ? "lg:w-20" : "lg:w-72"
      )}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card relative">
          <SidebarContent isCollapsed={isCollapsed} />
          
          {/* Collapse Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-6 h-6 w-6 rounded-full border border-border bg-background shadow-md hover:bg-accent z-10"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Header with Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-card/95 backdrop-blur-sm border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-photon-400 to-photon-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient-primary">AdMind</h1>
          </div>
        </div>
        
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent onItemClick={() => setIsMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile Spacer */}
      <div className="lg:hidden h-16" />
    </>
  );
} 