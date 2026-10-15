import { Link, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, LayoutDashboard, BriefcaseBusiness, ChartNoAxesCombined, ArrowLeftRight, Star, Settings, ChevronDown, ChevronRight, Bell, Menu, X, Layers, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/portfolios', label: 'Portfolios', icon: BriefcaseBusiness },
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/watchlist', label: 'Watchlist', icon: Star },
] as const;

export function PulseShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = [...navigation, { to: '/settings', label: 'Settings' }].find((item) => item.to === pathname)?.label ?? 'Workspace';
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); menuRef.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  return <div className="pulse-shell">
    <div className={`mobile-overlay ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
    <aside className={`sidebar ${open ? 'is-open' : ''}`} id="workspace-navigation" aria-label="Workspace sidebar">
      <Link to="/" className="brand"><span className="brand-mark"><Activity strokeWidth={2.5} /></span>Portfolio Pulse</Link>
      <div className="workspace-switch"><span className="workspace-icon"><Layers size={16} /></span><div><strong>Personal workspace</strong><small>Sample portfolio</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map(({ to, label, icon: Icon }) => <Link key={to} to={to} activeOptions={{ exact: true }} className="nav-item"><Icon />{label}</Link>)}</nav>
      <div className="sidebar-bottom">
        <nav aria-label="Account navigation"><Link to="/settings" className="nav-item"><Settings />Settings</Link></nav>
        <div className="plan-note"><div>Portfolio Pulse <span className="plan-tag">PRO PREVIEW</span></div><p>A clearer picture of your investments.</p></div>
        <div className="profile"><span className="avatar">JD</span><div><strong>Jamie Davis</strong><small>Personal account · Demo</small></div><Button asChild size="icon" variant="ghost" className="ml-auto" title="Account settings"><Link to="/settings" aria-label="Account settings"><ArrowUpRight size={15} /></Link></Button></div>
      </div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="flex items-center gap-2"><Button ref={menuRef} variant="ghost" size="icon" className="mobile-menu" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} /><strong>{title}</strong></div></div>
      <div className="header-actions"><span className="demo-badge">Demo workspace</span><span className="header-divider" /><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Notifications" title="Notifications"><Bell size={17} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator /><p className="px-2 py-5 text-xs text-muted-foreground">You're all caught up.</p></DropdownMenuContent></DropdownMenu><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="gap-2 px-1" aria-label="Account menu"><span className="avatar">JD</span><ChevronDown size={12} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Jamie Davis · Demo</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link to="/settings"><Settings />Account settings</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    </header><main>{children}</main></div>
  </div>;
}
