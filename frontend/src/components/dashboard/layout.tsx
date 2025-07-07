"use client";

import Link from "next/link";
import { DashboardSidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Target, Users, BarChart3 } from "lucide-react";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  const quickActions = [
    {
      label: "Add Competitor",
      icon: Target,
      href: "/competitors",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      label: "View Ads",
      icon: BarChart3,
      href: "/ads",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      label: "Manage Competitors",
      icon: Users,
      href: "/competitors",
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action buttons */}
      <div className={cn(
        "flex flex-col gap-2 mb-4 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {quickActions.map((action, index) => (
          <Button
            key={action.label}
            size="sm"
            className={cn(
              "h-12 w-12 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center text-white",
              action.color,
              "hover:scale-110"
            )}
            asChild
            style={{ 
              transitionDelay: isOpen ? `${index * 50}ms` : `${(quickActions.length - index - 1) * 50}ms`
            }}
          >
            <Link href={action.href} title={action.label}>
              <action.icon className="h-5 w-5" />
            </Link>
          </Button>
        ))}
      </div>

      {/* Main FAB */}
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white transition-all duration-300",
          "hover:scale-110 active:scale-95",
          isOpen && "rotate-45"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      
      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        isCollapsed ? "lg:ml-20" : "lg:ml-72"
      )}>
        <main className="py-6 lg:py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
} 