import React, { useEffect, useState } from 'react';
import { User, CryptoCurrency } from '../../types';
import { FormatNSD } from '../CurrencySymbol';
import {
  addTransaction,
  getCryptos,
  getMarketDay,
  getNextMarketUpdateTime,
  checkAndAutoUpdateMarket,
  simulateNextMarketDay,
  updateUser,
} from '../../data/storage';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  Wallet,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Flame,
  Zap,
} from 'lucide-react';

interface CryptoTabProps {
  currentUser: User;
  onRefreshUser: () => void;
}

export function CryptoTab({ currentUser, onRefreshUser }: CryptoTabProps) {
  const cryptos = getCryptos();
  const marketDay = getMarketDay();

  const [selectedCryptoId, setSelectedCryptoId] = useState<string>(
    cryptos.find((c) => c.isSpecialMoon)?.id || cryptos[0]?.id || 'crypto-moon'
  );
  const selectedCrypto = cryptos.find((c) => c.id === selectedCryptoId) || cryptos[0];

  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradeAmount, setTradeAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeftStr, setTimeLeftStr] = useState('');

  // 5-hour countdown calculation
  useEffect(() => {
    const updateCountdown = () => {
      const target = getNextMarketUpdateTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeftStr(`${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`);

      // If time reached 0, trigger auto update
      if (diff === 0) {
        checkAndAutoUpdateMarket();
        onRefreshUser();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [onRefreshUser]);

  const userPortfolio = currentUser.cryptoPortfolio || {};
  const selectedCoinOwned = userPortfolio[selectedCrypto.symbol] || 0;
  const selectedCoinValueNSD = selectedCoinOwned * selectedCrypto.currentPrice;

  // Calculate total crypto portfolio worth
  const totalCryptoWorth = Object.entries(userPortfolio).reduce((acc, [sym, qty]) => {
    const coin = cryptos.find((c) => c.symbol === sym);
    return acc + (coin ? coin.currentPrice * qty : 0);
  }, 0);

  // Filter cryptos
  const filteredCryptos = cryptos.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
  });

  const handleSimulateMarket = () => {
    simulateNextMarketDay();
    setSuccessMsg(`Zaktualizowano rynek! Rozpoczęto dzień giełdowy #${getMarketDay()}. Wszyscy użytkownicy mają nowe, zsynchronizowane ceny.`);
    onRefreshUser();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleExecuteTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const qty = parseFloat(tradeAmount.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Wprowadź prawidłową ilość jednostek krypto.');
      return;
    }

    const totalCostNSD = qty * selectedCrypto.currentPrice;

    if (tradeAction === 'buy') {
      if (currentUser.balanceNSD < totalCostNSD) {
        setErrorMsg(`Niewystarczające saldo NSD. Potrzebujesz ${totalCostNSD.toFixed(2)} NSD.`);
        return;
      }

      // Deduct NSD, add tokens
      const updatedPortfolio = { ...userPortfolio };
      updatedPortfolio[selectedCrypto.symbol] = (updatedPortfolio[selectedCrypto.symbol] || 0) + qty;

      updateUser({
        id: currentUser.id,
        balanceNSD: currentUser.balanceNSD - totalCostNSD,
        cryptoPortfolio: updatedPortfolio,
      });

      addTransaction({
        senderId: currentUser.id,
        senderName: `${currentUser.name} ${currentUser.surname}`,
        receiverId: 'crypto-exchange',
        receiverName: `Giełda Neisser (${selectedCrypto.symbol})`,
        amount: totalCostNSD,
        title: `Kupno ${qty} ${selectedCrypto.symbol} po kursie ${selectedCrypto.currentPrice} NSD`,
        category: 'crypto',
        type: 'instant',
        status: 'completed',
      });

      setSuccessMsg(`Pomyślnie zakupiono ${qty} ${selectedCrypto.symbol} za ${totalCostNSD.toFixed(2)} NSD!`);
      setTradeAmount('');
      onRefreshUser();
    } else {
      // SELL
      if (selectedCoinOwned < qty) {
        setErrorMsg(`Posiadasz tylko ${selectedCoinOwned.toFixed(4)} ${selectedCrypto.symbol}.`);
        return;
      }

      const updatedPortfolio = { ...userPortfolio };
      const remaining = selectedCoinOwned - qty;
      if (remaining <= 0.00001) {
        delete updatedPortfolio[selectedCrypto.symbol];
      } else {
        updatedPortfolio[selectedCrypto.symbol] = remaining;
      }

      updateUser({
        id: currentUser.id,
        balanceNSD: currentUser.balanceNSD + totalCostNSD,
        cryptoPortfolio: updatedPortfolio,
      });

      addTransaction({
        senderId: 'crypto-exchange',
        senderName: `Giełda Neisser (${selectedCrypto.symbol})`,
        receiverId: currentUser.id,
        receiverName: `${currentUser.name} ${currentUser.surname}`,
        amount: totalCostNSD,
        title: `Sprzedaż ${qty} ${selectedCrypto.symbol} po kursie ${selectedCrypto.currentPrice} NSD`,
        category: 'crypto',
        type: 'instant',
        status: 'completed',
      });

      setSuccessMsg(`Pomyślnie sprzedano ${qty} ${selectedCrypto.symbol} za ${totalCostNSD.toFixed(2)} NSD!`);
      setTradeAmount('');
      onRefreshUser();
    }
  };

  // Sparkline generator for selected coin
  const hist = selectedCrypto.history || [selectedCrypto.currentPrice];
  const svgW = 400;
  const svgH = 140;
  const minPrice = Math.min(...hist) * 0.95;
  const maxPrice = Math.max(...hist) * 1.05;

  const points = hist
    .map((val, i) => {
      const x = (i / Math.max(1, hist.length - 1)) * svgW;
      const y = svgH - ((val - minPrice) / Math.max(0.01, maxPrice - minPrice)) * (svgH - 30) - 15;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div id="neisser-crypto-view" className="space-y-6 pb-24 text-white">
      {/* Top Banner: Portfolio & Market Day Controls */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Twój Portfel Kryptowalut Neisser
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
              <FormatNSD amount={totalCryptoWorth} />
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Dostępne saldo płynne: <FormatNSD amount={currentUser.balanceNSD} />
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2.5 text-right">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400">
                <Clock className="h-3.5 w-3.5 text-purple-400" />
                <span>Auto-aktualizacja (co 5h)</span>
              </div>
              <div className="text-xs font-mono font-bold text-purple-300 mt-0.5">
                Zmiana cen za: {timeLeftStr || '0h 00m 00s'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-4 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected Crypto Interactive Spotlight & Trade Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chart & Stats */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{selectedCrypto.name}</h2>
                <span className="font-mono text-xs rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-neutral-300">
                  {selectedCrypto.symbol}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-xl">
                {selectedCrypto.description}
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-mono font-black text-white">
                <FormatNSD amount={selectedCrypto.currentPrice} showFull />
              </div>
              <div
                className={`text-xs font-bold font-mono inline-flex items-center gap-1 mt-0.5 ${
                  selectedCrypto.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {selectedCrypto.change24h >= 0 ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>+{selectedCrypto.change24h}% (24h)</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>{selectedCrypto.change24h}% (24h)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SVG Price Chart */}
          <div className="relative w-full h-44 overflow-hidden rounded-xl bg-black border border-neutral-900 p-2">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="35" x2={svgW} y2="35" stroke="#222" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2={svgW} y2="75" stroke="#222" strokeDasharray="3 3" />
              <line x1="0" y1="115" x2={svgW} y2="115" stroke="#222" strokeDasharray="3 3" />

              <polyline
                fill="none"
                stroke={selectedCrypto.change24h >= 0 ? '#10b981' : '#ef4444'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
            <div className="absolute top-2 left-3 text-[10px] text-neutral-500 font-mono">
              Historia notowań (14 punktów sesyjnych)
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] text-neutral-500 font-mono">
              Wolumen 24h: {selectedCrypto.volume24h.toLocaleString()} NSD
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-xl border border-neutral-800 bg-black p-2.5">
              <span className="text-[10px] text-neutral-500 block">Kapitalizacja</span>
              <span className="font-bold font-mono">{selectedCrypto.marketCap.toLocaleString()} NSD</span>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black p-2.5">
              <span className="text-[10px] text-neutral-500 block">Twój Stan Posiadania</span>
              <span className="font-bold font-mono">
                {selectedCoinOwned.toFixed(2)} {selectedCrypto.symbol}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-black p-2.5">
              <span className="text-[10px] text-neutral-500 block">Wartość w NSD</span>
              <span className="font-bold font-mono">{selectedCoinValueNSD.toFixed(2)} NSD</span>
            </div>
          </div>
        </div>

        {/* Right: Buy / Sell Panel */}
        <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Zlecenie Handlowe
          </h3>

          <div className="flex rounded-xl border border-neutral-800 bg-black p-1">
            <button
              type="button"
              onClick={() => {
                setTradeAction('buy');
                setErrorMsg('');
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                tradeAction === 'buy'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Kup {selectedCrypto.symbol}
            </button>
            <button
              type="button"
              onClick={() => {
                setTradeAction('sell');
                setErrorMsg('');
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                tradeAction === 'sell'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sprzedaj
            </button>
          </div>

          <form onSubmit={handleExecuteTrade} className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                <span>Ilość jednostek ({selectedCrypto.symbol}):</span>
                {tradeAction === 'sell' && (
                  <button
                    type="button"
                    onClick={() => setTradeAmount(selectedCoinOwned.toString())}
                    className="text-white hover:underline"
                  >
                    Maks ({selectedCoinOwned.toFixed(2)})
                  </button>
                )}
              </div>
              <input
                id="crypto-trade-amount"
                type="number"
                step="any"
                min="0.0001"
                placeholder="0.00"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3 py-2.5 text-sm font-mono text-white focus:border-white focus:outline-none"
                required
              />
            </div>

            {/* Estimated Total Calculation */}
            <div className="rounded-xl border border-neutral-800 bg-black p-3 text-xs space-y-1">
              <div className="flex justify-between text-neutral-400">
                <span>Kurs jednostkowy:</span>
                <span className="font-mono text-neutral-200">
                  {selectedCrypto.currentPrice.toFixed(2)} NSD
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Prowizja giełdowa:</span>
                <span className="font-mono text-neutral-200">0.00 NSD (0%)</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-neutral-900">
                <span>Razem do zapłaty/otrzymania:</span>
                <span className="font-mono">
                  {((parseFloat(tradeAmount) || 0) * selectedCrypto.currentPrice).toFixed(2)} NSD
                </span>
              </div>
            </div>

            <button
              id="crypto-execute-trade-button"
              type="submit"
              className="w-full rounded-xl bg-white py-3 text-sm font-bold text-black transition-colors hover:bg-neutral-200 active:scale-[0.99]"
            >
              {tradeAction === 'buy'
                ? `Kup ${selectedCrypto.symbol} za NSD`
                : `Sprzedaj ${selectedCrypto.symbol} do salda NSD`}
            </button>
          </form>
        </div>
      </div>

      {/* Full 20 Cryptocurrencies Table */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Lista 20 Kryptowalut Społeczności</h3>
            <p className="text-xs text-neutral-400">
              Wszystkie ceny są zsynchronizowane dla wszystkich użytkowników platformy.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Szukaj krypto lub symbolu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2 pl-9 text-xs text-white placeholder-neutral-600 focus:border-white focus:outline-none"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-900 text-neutral-500 font-mono">
                <th className="pb-3 pl-2">#</th>
                <th className="pb-3">Nazwa / Symbol</th>
                <th className="pb-3 text-right">Cena (NSD)</th>
                <th className="pb-3 text-right">Zmiana 24h</th>
                <th className="pb-3 text-right hidden sm:table-cell">Kapitalizacja</th>
                <th className="pb-3 text-right pr-2">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredCryptos.map((coin, index) => {
                const isSelected = selectedCrypto.id === coin.id;
                const isOwned = (userPortfolio[coin.symbol] || 0) > 0;

                return (
                  <tr
                    key={coin.id}
                    onClick={() => setSelectedCryptoId(coin.id)}
                    className={`cursor-pointer transition-colors hover:bg-neutral-900/60 ${
                      isSelected ? 'bg-neutral-900/80 font-bold' : ''
                    }`}
                  >
                    <td className="py-3 pl-2 font-mono text-neutral-500">{index + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{coin.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {coin.symbol}
                        </span>
                        {isOwned && (
                          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] text-white">
                            Portfel: {userPortfolio[coin.symbol]?.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-white">
                      <FormatNSD amount={coin.currentPrice} showFull />
                    </td>
                    <td
                      className={`py-3 text-right font-mono font-bold ${
                        coin.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {coin.change24h >= 0 ? `+${coin.change24h}%` : `${coin.change24h}%`}
                    </td>
                    <td className="py-3 text-right font-mono text-neutral-400 hidden sm:table-cell">
                      {coin.marketCap.toLocaleString()} NSD
                    </td>
                    <td className="py-3 text-right pr-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCryptoId(coin.id);
                        }}
                        className="rounded-lg border border-neutral-800 bg-black px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white hover:text-black transition-colors"
                      >
                        Handluj
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
