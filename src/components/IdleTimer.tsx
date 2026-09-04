import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/apiClients';

interface IdleTimerProps {
  children: React.ReactNode;
  onLogout: () => void;
  isActive: boolean;
  userRole?: string | null;
}

export default function IdleTimer({ children, onLogout, isActive, userRole }: IdleTimerProps) {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const timeoutDuration = 15 * 60 * 1000; // 15 minutes in milliseconds (900,000 ms)

  const handleLogoutFlow = async () => {
    try {
      // Clear all sessionStorage (including horaInicioPreoperacional)
      sessionStorage.clear();

      if (supabase && supabase.auth) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Error signing out from Supabase:', e);
    }
    
    // Clear all localStorage as requested
    localStorage.clear();
    
    // Trigger parent React state cleanups
    onLogout();
    
    // Hard redirect to avoid backward navigation
    navigate('/login', { replace: true });
  };

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current as any);
    }
    if (isActive) {
      timeoutRef.current = setTimeout(handleLogoutFlow, timeoutDuration);
    }
  };

  useEffect(() => {
    // CONDICIÓN DE GUARDIA: Administradores y Mantenimiento no tienen límite de inactividad
    const roleNormalized = (userRole || '').toLowerCase();
    const isExempt = 
      roleNormalized === 'admin' || 
      roleNormalized === 'administrador' || 
      roleNormalized === 'mantenimiento' ||
      roleNormalized.includes('admin') || 
      roleNormalized.includes('mantenimiento') ||
      roleNormalized.includes('gerent') || 
      roleNormalized.includes('director');
    if (isExempt) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as any);
      }
      return;
    }

    if (!isActive) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as any);
      }
      return;
    }

    // List of interaction events to listen
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
    
    // Start initial timer
    resetTimer();

    // Attach listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup on unmount or when isActive changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as any);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isActive, userRole]);

  return <>{children}</>;
}
