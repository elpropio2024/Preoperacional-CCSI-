import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Wrench, 
  History, 
  CalendarClock, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  LogOut, 
  Truck,
  ShieldCheck,
  Gauge,
  FileCheck2,
  BarChart3
} from 'lucide-react';

interface LayoutMantenimientoProps {
  children?: React.ReactNode;
  onLogout?: () => void;
  adminSession?: any;
}

interface MenuItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export default function LayoutMantenimiento({ children, onLogout, adminSession }: LayoutMantenimientoProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const location = useLocation();

  const menuItems: MenuItem[] = [
    {
      title: 'Control de Flota',
      path: '/mantenimiento',
      icon: Wrench,
    },
    {
      title: 'Reportes de Kilometraje',
      path: '/mantenimiento/reportes-kilometraje',
      icon: BarChart3,
    },
    {
      title: 'Documentación',
      path: '/mantenimiento/documentacion',
      icon: FileCheck2,
    },
    {
      title: 'Reporte Mensual',
      path: '/mantenimiento/reporte-mensual',
      icon: Gauge,
    },
    {
      title: 'Historial',
      path: '/mantenimiento/historial',
      icon: History,
    },
    {
      title: 'Cronograma',
      path: '/mantenimiento/cronograma',
      icon: CalendarClock,
    }
  ];

  const userName = adminSession?.user?.nombres_apellidos || adminSession?.user?.nombre || 'Personal de Mantenimiento';
  const userEmail = adminSession?.user?.email || 'mantenimiento@ccsi.com.co';

  return (
    <div className="flex h-screen w-full bg-gray-900 text-gray-100 overflow-hidden font-sans">
      
      {/* OVERLAY PARA MÓVILES */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between
          bg-[#0B0F19] border-r border-gray-800/80 shadow-2xl md:shadow-none
          transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        {/* Encabezado del Sidebar */}
        <div className="flex flex-col">
          <div className="h-18 flex items-center justify-between px-4 border-b border-gray-800/60">
            
            {/* Logo / Título */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                <Truck className="w-5 h-5" />
              </div>
              
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col leading-tight whitespace-nowrap overflow-hidden transition-opacity duration-300">
                  <span className="font-bold text-sm text-white tracking-wide">CCSI Flota</span>
                  <span className="text-[11px] text-amber-500 font-semibold tracking-wider uppercase">Mantenimiento</span>
                </div>
              )}
            </div>

            {/* Botón cerrar en móvil */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 md:hidden"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Botón colapsar / expandir en escritorio */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navegación de Elementos */}
          <nav className="p-3 space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/mantenimiento'}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed ? item.title : undefined}
                  className={({ isActive: linkActive }) => `
                    group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${(linkActive || isActive) 
                      ? 'bg-gray-800/90 text-white shadow-sm border border-gray-700/60' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'}
                    ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}
                  `}
                >
                  <Icon 
                    className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                      isActive ? 'text-amber-500' : 'text-gray-400 group-hover:text-amber-400'
                    }`} 
                  />

                  {(!isCollapsed || isMobileOpen) && (
                    <span className="whitespace-nowrap transition-opacity duration-300">
                      {item.title}
                    </span>
                  )}

                  {/* Tooltip flotante en escritorio cuando está colapsado */}
                  {isCollapsed && !isMobileOpen && (
                    <div className="absolute left-full ml-3 hidden group-hover:flex items-center px-2.5 py-1 bg-gray-800 text-gray-100 text-xs font-semibold rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50 pointer-events-none">
                      {item.title}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Pie del Sidebar: Perfil y Cierre de Sesión */}
        <div className="p-3 border-t border-gray-800/60 flex flex-col gap-2">
          
          {/* Tarjeta de usuario */}
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-gray-900/60 border border-gray-800/50 ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0 overflow-hidden leading-tight">
                <span className="text-xs font-bold text-gray-200 truncate">{userName}</span>
                <span className="text-[11px] text-gray-500 truncate">{userEmail}</span>
              </div>
            )}
          </div>

          {/* Botón de Cerrar Sesión */}
          {onLogout && (
            <button
              onClick={onLogout}
              title={isCollapsed ? "Cerrar Sesión" : undefined}
              className={`
                group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all duration-200 cursor-pointer
                ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}
              `}
            >
              <LogOut className="w-5 h-5 shrink-0 text-rose-400 group-hover:scale-105 transition-transform" />
              {(!isCollapsed || isMobileOpen) && (
                <span className="whitespace-nowrap">Cerrar Sesión</span>
              )}
            </button>
          )}
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Barra superior para móvil */}
        <header className="h-16 bg-[#0B0F19]/90 backdrop-blur-md border-b border-gray-800/80 px-4 flex md:hidden items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white focus:outline-none"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-sm text-white">Mantenimiento CCSI</span>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/30"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Vista principal con Scroll */}
        <main className="flex-1 overflow-y-auto bg-gray-900 transition-all duration-300" id="main-mantenimiento-content">
          {children || <Outlet />}
        </main>
      </div>

    </div>
  );
}
