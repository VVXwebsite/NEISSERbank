import { LayoutDashboard, ArrowLeftRight, TrendingUp, ShoppingBag, User } from 'lucide-react';

export type TabType = 'home' | 'transfers' | 'crypto' | 'marketplace' | 'profile';

interface BottomBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingRequestsCount?: number;
}

export function BottomBar({ activeTab, onChangeTab, pendingRequestsCount = 0 }: BottomBarProps) {
  const tabs = [
    {
      id: 'home' as TabType,
      label: 'Główna',
      icon: LayoutDashboard,
    },
    {
      id: 'transfers' as TabType,
      label: 'Przelewy',
      icon: ArrowLeftRight,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
    },
    {
      id: 'crypto' as TabType,
      label: 'Krypto',
      icon: TrendingUp,
    },
    {
      id: 'marketplace' as TabType,
      label: 'Marketplace',
      icon: ShoppingBag,
    },
    {
      id: 'profile' as TabType,
      label: 'Profil',
      icon: User,
    },
  ];

  return (
    <nav
      id="neisser-bottom-navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-900 bg-black/95 backdrop-blur-lg pb-safe"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 transition-colors ${
                isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-black">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold' : 'font-normal'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
