import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Edit3,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useStockData } from '@/hooks/useStockData';
import { useSettings } from '@/hooks/useSettings';
import { getExpiryStatus } from '@/components/ExpiryBadge';

const Sidebar = () => {
  const { user, userRole, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { stockItems } = useStockData();
  const { settings } = useSettings();

  // Calculate alerts count
  const alertsCount = stockItems.filter((item) => {
    const isLowStock = item.current_quantity <= item.minimum_stock;
    const expiryStatus = getExpiryStatus(item.expiry_date, settings.expiry_alert_days);
    const hasExpiryAlert = expiryStatus.status === 'expired' || expiryStatus.status === 'expiring';
    return isLowStock || hasExpiryAlert;
  }).length;

  const navItems = [
    {
      name: 'Gestão de Estoque',
      href: '/dashboard',
      icon: ClipboardList,
      adminOnly: false,
    },
    {
      name: 'Preenchimento',
      href: '/stock-entry',
      icon: Edit3,
      adminOnly: false,
    },
    {
      name: 'Usuários',
      href: '/users',
      icon: Users,
      adminOnly: true,
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const NavContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="MesaChef Logo" className="w-12 h-12 object-contain rounded-full" />
          <div>
            <h1 className="font-bold text-sidebar-foreground">MesaChef</h1>
            <p className="text-xs text-sidebar-foreground/60">Estoque & Gestão</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-base',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-accent-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {userRole || 'Carregando...'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header bar - fixed at top, contains menu button */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-40 lg:hidden flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(true)}
            className="transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2 ml-3">
            <img src={logo} alt="MesaChef Logo" className="w-8 h-8 object-contain rounded-full" />
            <span className="font-semibold text-foreground">MesaChef</span>
          </div>
        </div>
        
        {/* Alert badge */}
        {alertsCount > 0 && (
          <Link to="/dashboard" className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs p-0 animate-pulse"
              >
                {alertsCount > 99 ? '99+' : alertsCount}
              </Badge>
            </Button>
          </Link>
        )}
      </header>

      {/* Mobile overlay with fade animation */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar with smooth slide animation */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-sidebar flex flex-col z-50',
          'transition-all duration-300 ease-out',
          'lg:translate-x-0 lg:shadow-none',
          isMobileOpen 
            ? 'translate-x-0 shadow-2xl' 
            : '-translate-x-full'
        )}
      >
        {/* Close button inside sidebar with rotation animation */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-4 right-4 lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            "transition-all duration-200 hover:rotate-90"
          )}
          onClick={() => setIsMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
        <NavContent />
      </aside>
    </>
  );
};

export default Sidebar;
