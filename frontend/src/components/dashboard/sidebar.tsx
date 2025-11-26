"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { adsApi } from "@/lib/api";
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
  Download,
  Brain,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  Clock,
  Heart,
  FolderHeart,
  Video
} from "lucide-react";

const navigationGroups = [
  {
    items: [
      {
        name: "Dashboard",
        href: "/",
        icon: Home,
        current: true
      }
    ]
  },
  {
    label: "Ad Management",
    items: [
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
        name: "Saved",
        href: "/saved",
        icon: Heart,
        current: false
      },
      {
        name: "Favorite Lists",
        href: "/favorite-lists",
        icon: FolderHeart,
        current: false
      }
    ]
  },
  {
    label: "Explore",
    items: [
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
        name: "Download Ads",
        href: "/download-ads",
        icon: Download,
        current: false
      },
      {
        name: "Veo Generator",
        href: "/veo",
        icon: Video,
        current: false
      }
    ]
  },
  {
    label: "System",
    items: [
      {
        name: "Tasks",
        href: "/tasks",
        icon: Activity,
        current: false
      },
      {
        name: "Daily Scraping",
        href: "/daily-scraping",
        icon: Clock,
        current: false
      },
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        current: false
      }
    ]
  }
];

interface SidebarContentProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
}

function SidebarContent({ isCollapsed = false, onItemClick }: SidebarContentProps) {
  const pathname = usePathname();

  const [veoCredits, setVeoCredits] = useState<number | null>(null);
  const [veoTier, setVeoTier] = useState<string | null>(null);
  const [veoRefreshing, setVeoRefreshing] = useState<boolean>(false);

  // Always initialize with defaults to avoid hydration mismatch
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    navigationGroups.forEach((group, index) => {
      // Default: all groups open except System
      if (group.label === "System") {
        initial[index] = false;
      } else {
        initial[index] = true;
      }
    });
    return initial;
  });

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("sidebarOpenGroups");
      if (stored) {
        const parsed = JSON.parse(stored) as Record<number, boolean>;
        setOpenGroups(parsed);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const toggleGroup = (index: number) => {
    setOpenGroups((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("sidebarOpenGroups", JSON.stringify(openGroups));
    } catch {
      // ignore storage errors
    }
  }, [openGroups]);

  useEffect(() => {
    let cancelled = false;
    const loadCredits = async () => {
      try {
        const data = await adsApi.getVeoCredits();
        if (cancelled) return;
        setVeoCredits(typeof data.credits === "number" ? data.credits : null);
        setVeoTier(data.userPaygateTier || null);
      } catch {
        // Silently ignore errors; sidebar should not break if credits are unavailable.
      }
    };
    loadCredits();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefreshCredits = async () => {
    try {
      setVeoRefreshing(true);
      const data = await adsApi.getVeoCredits();
      setVeoCredits(typeof data.credits === "number" ? data.credits : null);
      setVeoTier(data.userPaygateTier || null);
    } catch {
      // ignore refresh errors; user can retry
    } finally {
      setVeoRefreshing(false);
    }
  };

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
        "flex-1 py-6 transition-all duration-300 overflow-y-auto",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {navigationGroups.map((group, groupIndex) => {
          const isGroupOpen = openGroups[groupIndex] ?? true;
          return (
            <div
              key={groupIndex}
              className={cn(groupIndex > 0 && "mt-6")}
            >
              {group.label && !isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(groupIndex)}
                  className="px-3 mb-2 flex w-full items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  <span>{group.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform",
                      isGroupOpen && "rotate-90"
                    )}
                  />
                </button>
              )}
              {group.label && isCollapsed && (
                <div className="h-px bg-border mx-2 mb-2" />
              )}
              {(!group.label || isGroupOpen) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
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
                        <item.icon
                          className={cn(
                            "h-5 w-5 transition-colors flex-shrink-0",
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
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
                </div>
              )}
            </div>
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Premium User
                  {veoCredits !== null && (
                    <>
                      {" "}
                      · Veo credits: {veoCredits}
                    </>
                  )}
                </p>
                {veoCredits !== null && (
                  <button
                    type="button"
                    className="text-[10px] text-neutral-500 hover:text-neutral-200 underline-offset-2 hover:underline disabled:opacity-60"
                    onClick={handleRefreshCredits}
                    disabled={veoRefreshing}
                  >
                    {veoRefreshing ? "Refreshing…" : "Refresh"}
                  </button>
                )}
              </div>
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