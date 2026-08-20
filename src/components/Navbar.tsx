import React from 'react';
import { BalloonLogo } from './BalloonLogo';
import { User } from '../types';
import { LEVEL_CONFIGS } from '../data/initialData';
import { Crown, Sparkles, UserCircle, LogOut, RefreshCw } from 'lucide-react';
import { getMarketDay, simulateNextMarketDay } from '../data/storage';

interface NavbarProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({ currentUser, onOpenAuth, onLogout }: NavbarProps) {
  const currentLevelConfig = LEVEL_CONFIGS.find((l) => l.level === (currentUser?.level || 1));
  const marketDay = getMarketDay();

  return (
    <header
      id="neisser-header"
      className="sticky top-0 z-30 border-b border-neutral-900 bg-black/95 backdrop-blur-md px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        {/* Left: Purple Balloon Logo & Brand */}
        <div className="flex items-center gap-3">
          <BalloonLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">Neisser</h1>
              {currentUser?.role === 'developer' && (
                <span className="rounded-md border border-purple-500/40 bg-purple-950/60 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                  DEWELOPER
                </span>
              )}
              {currentUser?.role === 'premium' && (
                <span className="rounded-md border border-amber-500/40 bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  PREMIUM
                </span>
              )}
            </div>
            <p className="text-[10px] text-neutral-400 font-mono">
              Bank Społeczności • Dzień Rynku #{marketDay}
            </p>
          </div>
        </div>

        {/* Right: Quick User Info / Switcher */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              {/* Level indicator */}
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300">
                <span>{currentLevelConfig?.badge.split(' ')[0]}</span>
                <span className="text-[11px] font-medium text-neutral-200">
                  Poziom {currentUser.level}
                </span>
              </div>

              {/* User profile card toggle */}
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-800 transition-colors"
                title="Zmień konto lub zaloguj się"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-800 text-[11px] font-bold text-white border border-neutral-700 font-mono">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold">{currentUser.name}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Wyloguj i zablokuj PINem"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-neutral-200 transition-colors"
            >
              Zaloguj PINem
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
