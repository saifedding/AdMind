import * as React from "react"
import { cn } from "@/lib/utils"

// Simple dropdown menu implementation without Radix UI dependency
// This is a basic implementation for the accessibility task

interface DropdownMenuProps {
  children: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, { 
              onClick: () => setIsOpen(!isOpen) 
            });
          }
          if (child.type === DropdownMenuContent) {
            return isOpen ? React.cloneElement(child as React.ReactElement<any>, { 
              onClose: () => setIsOpen(false) 
            }) : null;
          }
        }
        return child;
      })}
    </div>
  );
};

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: () => void;
}

const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ 
  children, 
  asChild = false, 
  onClick 
}) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick });
  }
  
  return (
    <button onClick={onClick} className="inline-flex items-center">
      {children}
    </button>
  );
};

interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  onClose?: () => void;
  role?: string;
  'aria-label'?: string;
}

const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ 
  children, 
  className, 
  align = 'start',
  onClose,
  role,
  'aria-label': ariaLabel
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose?.();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  const alignmentClass = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  }[align];
  
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2",
        alignmentClass,
        className
      )}
      style={{ top: '100%', marginTop: '4px' }}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

interface DropdownMenuItemProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  role?: string;
}

const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  children, 
  className, 
  onClick,
  disabled = false,
  role = "menuitem"
}) => {
  return (
    <div
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={disabled ? undefined : onClick}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  );
};

const DropdownMenuSeparator: React.FC<{ className?: string }> = ({ className }) => {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} role="separator" />;
};

const DropdownMenuLabel: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
      {children}
    </div>
  );
};

// Placeholder components for compatibility
const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuSub = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuSubContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuSubTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuCheckboxItem = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuRadioItem = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuShortcut = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}