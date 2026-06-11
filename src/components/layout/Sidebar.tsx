import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ClipboardList, Edit3, Users, LogOut, Menu, X, Bell, LayoutDashboard, DollarSign, FileText, Settings, Calculator, BarChart3, Camera, Wrench, ChevronDown, Package, Tag, Shield, Building2, UtensilsCrossed, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ShoppingCart, TrendingDown } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useStockData } from '@/hooks/useStockData';
import { useSettings } from '@/hooks/useSettings';
import { getExpiryStatus } from '@/components/ExpiryBadge';
import ThemeToggle from '@/components/ThemeToggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
const Sidebar = () => {
  const {
    user,
    userRole,
    signOut,
    isAdmin,
    isSuperadmin,
  } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === '1';
  });
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed ? '1' : '0');
    window.dispatchEvent(new Event('sidebar-collapsed-changed'));
  }, [isCollapsed]);
  const {
    stockItems
  } = useStockData();
  const {
    settings
  } = useSettings();

  // Calculate alerts count (only active items)
  const alertsCount = stockItems.filter(item => {
    if (!item.is_active) return false;

    // Out of stock
    if (item.current_quantity === 0) return true;

    // Low stock (using percentage threshold)
    const lowStockThreshold = settings.low_stock_percentage || 20;
    const threshold = item.minimum_stock * (1 + lowStockThreshold / 100);
    const isLowStock = item.current_quantity > 0 && item.current_quantity <= threshold;

    // Expiry alert
    const expiryStatus = getExpiryStatus(item.expiry_date, settings.expiry_alert_days);
    const hasExpiryAlert = expiryStatus.status === 'expired' || expiryStatus.status === 'expiring';
    return isLowStock || hasExpiryAlert;
  }).length;

  type NavItem = { name: string; href: string; icon: any; adminOnly?: boolean; superadminOnly?: boolean };
  type NavGroup = { name: string; icon: any; items: NavItem[] };

  const standaloneItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
  ];

  const groups: NavGroup[] = [
    {
      name: 'Estoque',
      icon: Package,
      items: [
        { name: 'Gestão de Estoque', href: '/stock-management', icon: ClipboardList, adminOnly: true },
        { name: 'Preenchimento', href: '/stock-entry', icon: Edit3, adminOnly: false },
        { name: 'Valoração', href: '/stock-valuation', icon: DollarSign, adminOnly: true },
        { name: 'Compras', href: '/stock-purchases', icon: ShoppingCart, adminOnly: true },
        { name: 'Ajustes de Estoque', href: '/stock-adjustments', icon: Wrench, adminOnly: true },
      ],
    },
    {
      name: 'CMV',
      icon: TrendingDown,
      items: [
        { name: 'Dashboard CMV', href: '/cmv', icon: TrendingDown, adminOnly: true },
        { name: 'Snapshots CMV', href: '/cmv/snapshots', icon: Camera, adminOnly: true },
      ],
    },
    {
      name: 'Precificação',
      icon: Tag,
      items: [
        { name: 'Precificação', href: '/pricing', icon: Calculator, adminOnly: false },
        { name: 'Relatórios', href: '/pricing/reports', icon: BarChart3, adminOnly: true },
        { name: 'Self-Service', href: '/self-service', icon: UtensilsCrossed, adminOnly: true },
      ],
    },
    {
      name: 'Administração',
      icon: Shield,
      items: [
        { name: 'Empresas', href: '/companies', icon: Building2, superadminOnly: true },
        { name: 'Usuários', href: '/users', icon: Users, adminOnly: true },
        { name: 'Log de Auditoria', href: '/audit-log', icon: FileText, adminOnly: true },
        { name: 'Configurações', href: '/settings', icon: Settings, adminOnly: true },
      ],
    },
  ];

  const filterItems = (items: NavItem[]) => items.filter(i => {
    if (i.superadminOnly && !isSuperadmin) return false;
    if (i.adminOnly && !isAdmin) return false;
    return true;
  });
  const filteredStandalone = filterItems(standaloneItems);
  const filteredGroups = groups
    .map(g => ({ ...g, items: filterItems(g.items) }))
    .filter(g => g.items.length > 0);

  // Auto-open the group that contains the active route
  const getInitialOpenGroups = () => {
    const open: Record<string, boolean> = {};
    filteredGroups.forEach(g => {
      open[g.name] = g.items.some(i => location.pathname === i.href || location.pathname.startsWith(i.href + '/'));
    });
    return open;
  };
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups);
  useEffect(() => {
    setOpenGroups(prev => {
      const next = { ...prev };
      filteredGroups.forEach(g => {
        if (g.items.some(i => location.pathname === i.href || location.pathname.startsWith(i.href + '/'))) {
          next[g.name] = true;
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleGroup = (name: string) =>
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));
  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => <>
      <div className={cn("p-6", collapsed && "p-3 flex justify-center")}>
        <div className={cn("flex items-center gap-3", collapsed && "gap-0")}>
          <img alt="MesaChef Logo" className={cn("object-contain", collapsed ? "w-9 h-9" : "w-12 h-12")} src={logo} />
          {!collapsed && (
            <div>
              <h1 className="font-bold text-sidebar-foreground">MesaChef</h1>
              <p className="text-xs text-sidebar-foreground/60">Estoque & Gestão</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent">
          {filteredStandalone.map(item => {
            const isActive = location.pathname === item.href;
            const link = (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md transition-base text-sm',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="font-medium truncate">{item.name}</span>}
              </Link>
            );
            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.name}</TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}

          {filteredGroups.map(group => {
            const isOpen = !!openGroups[group.name];
            const hasActiveChild = group.items.some(
              i => location.pathname === i.href || location.pathname.startsWith(i.href + '/')
            );
            if (collapsed) {
              return (
                <div key={group.name} className="pt-1 space-y-0.5">
                  {group.items.map(item => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Tooltip key={item.href} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              'flex items-center justify-center px-2 py-2 rounded-md transition-base',
                              isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            }
            return (
              <div key={group.name} className="pt-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.name)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-base text-sm',
                    hasActiveChild
                      ? 'text-sidebar-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                  aria-expanded={isOpen}
                >
                  <group.icon className="w-4 h-4 shrink-0" />
                  <span className="font-medium truncate flex-1 text-left">{group.name}</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 shrink-0 transition-transform duration-200',
                      isOpen ? 'rotate-180' : ''
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border space-y-0.5">
                    {group.items.map(item => {
                      const isActive = location.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-base text-sm',
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          )}
                        >
                          <item.icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-medium truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className={cn("p-4 border-t border-sidebar-border", collapsed && "p-2")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center" title={user?.email || ''}>
              <span className="text-sm font-medium text-sidebar-accent-foreground">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <ThemeToggle variant="sidebar" />
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <>
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
              <ThemeToggle variant="sidebar" />
            </div>
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Sair
            </Button>
          </>
        )}
      </div>
    </>;
  return <TooltipProvider delayDuration={0}>
      {/* Mobile header bar - fixed at top, contains menu button */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-40 lg:hidden flex items-center justify-between px-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)} className="transition-transform duration-200 hover:scale-105 active:scale-95">
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2 ml-3">
            <img src={logo} alt="MesaChef Logo" className="w-8 h-8 object-contain" />
            <span className="font-semibold text-foreground">MesaChef</span>
          </div>
        </div>
        
        {/* Alert badge */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {alertsCount > 0 && <Link to="/dashboard" className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs p-0 animate-pulse">
                {alertsCount > 99 ? '99+' : alertsCount}
              </Badge>
            </Button>
          </Link>}
        </div>
      </header>

      {/* Mobile overlay with fade animation */}
      <div className={cn("fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300", isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setIsMobileOpen(false)} />

      {/* Sidebar with smooth slide animation */}
      <aside className={cn(
        'fixed left-0 top-0 h-full bg-sidebar flex flex-col z-50',
        'transition-all duration-300 ease-out',
        'lg:translate-x-0 lg:shadow-none',
        isMobileOpen ? 'translate-x-0 shadow-2xl w-64' : '-translate-x-full w-64',
        isCollapsed ? 'lg:w-16' : 'lg:w-64'
      )}>
        {/* Close button inside sidebar with rotation animation */}
        <Button variant="ghost" size="icon" className={cn("absolute top-4 right-4 lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent", "transition-all duration-200 hover:rotate-90")} onClick={() => setIsMobileOpen(false)}>
          <X className="w-5 h-5" />
        </Button>
        {/* Desktop collapse toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(v => !v)}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          className="hidden lg:flex absolute -right-3 top-7 z-10 w-6 h-6 items-center justify-center rounded-full border border-sidebar-border bg-background text-foreground shadow-sm hover:bg-accent transition-colors"
        >
          {isCollapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
        </button>
        {/* Mobile uses expanded; desktop honors isCollapsed */}
        <div className="hidden lg:flex flex-col h-full">
          <NavContent collapsed={isCollapsed} />
        </div>
        <div className="flex lg:hidden flex-col h-full">
          <NavContent collapsed={false} />
        </div>
      </aside>
    </TooltipProvider>;
};
export default Sidebar;