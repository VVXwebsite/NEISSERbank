/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { User, Transaction, CryptoCurrency } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getTransactions,
  getCryptos,
  getFriendRequests,
  subscribeToStore,
  checkAndAutoUpdateMarket,
} from './data/storage';
import { Navbar } from './components/Navbar';
import { BottomBar, TabType } from './components/BottomBar';
import { AuthModal } from './components/AuthModal';
import { HomeTab } from './components/tabs/HomeTab';
import { TransfersTab } from './components/tabs/TransfersTab';
import { CryptoTab } from './components/tabs/CryptoTab';
import { MarketplaceTab } from './components/tabs/MarketplaceTab';
import { ProfileTab } from './components/tabs/ProfileTab';

export default function App() {
  const [currentUser, setCurrUser] = useState<User | null>(getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(getTransactions());
  const [cryptos, setCryptos] = useState<CryptoCurrency[]>(getCryptos());

  const refreshAllState = () => {
    setCurrUser(getCurrentUser());
    setTransactions(getTransactions());
    setCryptos(getCryptos());
  };

  useEffect(() => {
    // Check for 5h market auto-update on load
    checkAndAutoUpdateMarket();

    // Subscribe to multi-view reactive store updates
    const unsubscribe = subscribeToStore(() => {
      refreshAllState();
    });

    // Check periodically for 5h market update interval
    const marketInterval = setInterval(() => {
      checkAndAutoUpdateMarket();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(marketInterval);
    };
  }, []);

  const friendRequests = getFriendRequests();
  const pendingRequestsCount = currentUser
    ? friendRequests.filter((req) => req.toUserId === currentUser.id && req.status === 'pending').length
    : 0;

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrUser(null);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans antialiased">
      {/* Top Header */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 pt-4 sm:pt-6">
        {currentUser ? (
          <>
            {activeTab === 'home' && (
              <HomeTab
                currentUser={currentUser}
                transactions={transactions}
                cryptos={cryptos}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'transfers' && (
              <TransfersTab
                currentUser={currentUser}
                onRefreshUser={refreshAllState}
              />
            )}

            {activeTab === 'crypto' && (
              <CryptoTab
                currentUser={currentUser}
                onRefreshUser={refreshAllState}
              />
            )}

            {activeTab === 'marketplace' && (
              <MarketplaceTab
                currentUser={currentUser}
                onRefreshUser={refreshAllState}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileTab
                currentUser={currentUser}
                onRefreshUser={refreshAllState}
              />
            )}
          </>
        ) : (
          <div className="py-20 text-center space-y-4">
            <h2 className="text-xl font-bold">Witaj w bankowości Neisser</h2>
            <p className="text-sm text-neutral-400">
              Aby uzyskać dostęp do swojego konta i portfela NSD, zaloguj się kodem PIN lub zarejestruj.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-black hover:bg-neutral-200"
            >
              Otwórz panel logowania / rejestracji
            </button>
          </div>
        )}
      </main>

      {/* Bottom 5-Tab Navigation Bar */}
      {currentUser && (
        <BottomBar
          activeTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          pendingRequestsCount={pendingRequestsCount}
        />
      )}

      {/* Auth & PIN & 20s Verification Modal */}
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrUser(user);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
