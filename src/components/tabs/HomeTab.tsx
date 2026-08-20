import React, { useState } from 'react';
import { User, Transaction, CryptoCurrency } from '../../types';
import { FormatNSD } from '../CurrencySymbol';
import { BalloonLogo } from '../BalloonLogo';
import { Eye, EyeOff, ShoppingBag, ArrowUpRight, ArrowDownLeft, Gift } from 'lucide-react';
import { TabType } from '../BottomBar';

interface HomeTabProps {
  currentUser: User;
  transactions: Transaction[];
  cryptos: CryptoCurrency[];
  onNavigate: (tab: TabType) => void;
  onOpenQuickTransfer?: () => void;
  onOpenInvoiceModal?: () => void;
  onBuyCatPack?: () => void;
}

export function HomeTab({
  currentUser,
  transactions,
  cryptos,
}: HomeTabProps) {
  const [hideBalance, setHideBalance] = useState(false);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | '1y'>('7d');
  const [txFilter, setTxFilter] = useState<'all' | 'transfer' | 'crypto' | 'marketplace' | 'gift' | 'cat_card'>('all');
  const [searchTx, setSearchTx] = useState('');

  // Calculate user total portfolio value (balance + crypto value)
  const cryptoAssetsValue = Object.entries(currentUser.cryptoPortfolio || {}).reduce(
    (acc, [sym, amount]) => {
      const coin = cryptos.find((c) => c.symbol === sym);
      return acc + (coin ? coin.currentPrice * amount : 0);
    },
    0
  );
  const totalNetWorth = currentUser.balanceNSD + cryptoAssetsValue;

  // Chart data simulation based on timeframe and crypto performance
  // Dynamic calculation for gain/loss trend
  const isPositiveTrend = cryptos.some((c) => c.isSpecialMoon && c.change24h >= 0) || cryptoAssetsValue > 100;
  // Dynamic percentage trend
  const trendChangePct = isPositiveTrend ? +18.4 : -6.2;

  const chartPoints = isPositiveTrend
    ? [80, 85, 82, 94, 90, 105, 112, 118, 125, 140, 155]
    : [150, 142, 138, 140, 130, 125, 120, 110, 105, 98, 92];

  // SVG Chart path calculation
  const svgWidth = 400;
  const svgHeight = 120;
  const minVal = Math.min(...chartPoints) * 0.9;
  const maxVal = Math.max(...chartPoints) * 1.1;

  const pointsString = chartPoints
    .map((val, idx) => {
      const x = (idx / (chartPoints.length - 1)) * svgWidth;
      const y = svgHeight - ((val - minVal) / (maxVal - minVal)) * (svgHeight - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');

  // Filter transactions related to user
  const userTransactions = transactions.filter(
    (tx) => tx.senderId === currentUser.id || tx.receiverId === currentUser.id
  );

  const filteredTransactions = userTransactions.filter((tx) => {
    if (txFilter !== 'all' && tx.category !== txFilter) return false;
    if (searchTx.trim()) {
      const query = searchTx.toLowerCase();
      const matchTitle = tx.title.toLowerCase().includes(query);
      const matchName = tx.senderName.toLowerCase().includes(query) || tx.receiverName.toLowerCase().includes(query);
      return matchTitle || matchName;
    }
    return true;
  });

  return (
    <div id="neisser-home-view" className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* 1. Account Summary & Quick Stats */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Dostępne Saldo Konta
          </span>
          <button
            type="button"
            onClick={() => setHideBalance(!hideBalance)}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{hideBalance ? 'Pokaż' : 'Ukryj'}</span>
          </button>
        </div>

        <div className="mt-2 flex items-baseline gap-3">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
            {hideBalance ? '•••••• NSD' : <FormatNSD amount={currentUser.balanceNSD} />}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
          <span>
            Wartość portfela z krypto:{' '}
            <strong className="text-neutral-200">
              {hideBalance ? '••••••' : <FormatNSD amount={totalNetWorth} />}
            </strong>
          </span>
          <span>•</span>
          <span>
            Przelewy Express dzisiaj:{' '}
            <strong className="text-white">
              {currentUser.role === 'premium' || currentUser.role === 'developer'
                ? 'Nielimitowane (VIP)'
                : `${currentUser.expressTransfersRemainingToday} / 2`}
            </strong>
          </span>
        </div>
      </div>

      {/* 2. Interactive Earnings & Crypto Chart */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Wykres Zarobków i Portfela</h3>
            {/* Dynamic Status Icon: Sad vs Happy face */}
            {trendChangePct >= 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 text-xs font-bold text-emerald-400">
                <span>😊</span>
                <span>+{trendChangePct}%</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-950/80 border border-red-800/80 px-2 py-0.5 text-xs font-bold text-red-400">
                <span>☹️</span>
                <span>{trendChangePct}%</span>
              </span>
            )}
          </div>

          {/* Timeframe selector */}
          <div className="flex rounded-lg border border-neutral-800 bg-black p-0.5 text-[11px]">
            {(['24h', '7d', '30d', '1y'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeframe(t)}
                className={`rounded-md px-2 py-1 font-medium transition-colors ${
                  timeframe === t ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Sparkline / Line chart */}
        <div className="relative w-full h-32 overflow-hidden rounded-xl bg-black/60 border border-neutral-900 p-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            <line x1="0" y1="30" x2={svgWidth} y2="30" stroke="#262626" strokeDasharray="3 3" />
            <line x1="0" y1="65" x2={svgWidth} y2="65" stroke="#262626" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2={svgWidth} y2="100" stroke="#262626" strokeDasharray="3 3" />

            {/* Polyline: Green for growth, Red for drop */}
            <polyline
              fill="none"
              stroke={trendChangePct >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />

            {/* Last Point Indicator */}
            {chartPoints.length > 0 && (
              <circle
                cx={svgWidth}
                cy={
                  svgHeight -
                  ((chartPoints[chartPoints.length - 1] - minVal) / (maxVal - minVal)) *
                    (svgHeight - 20) -
                  10
                }
                r="4"
                fill={trendChangePct >= 0 ? '#10b981' : '#ef4444'}
                className="animate-ping"
              />
            )}
          </svg>

          <div className="absolute bottom-2 left-3 text-[10px] text-neutral-500 font-mono">
            Trend {timeframe}: {trendChangePct >= 0 ? 'Wzrost aktywów' : 'Korekta rynkowa'}
          </div>
        </div>
      </div>

      {/* 3. Virtual Neisser Debit Card */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-black to-neutral-950 p-6 shadow-xl text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <BalloonLogo size="md" />
            <span className="font-bold tracking-wider text-sm">NEISSER DEBIT</span>
          </div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
            {currentUser.role === 'developer'
              ? '👑 Założyciel'
              : currentUser.role === 'premium'
              ? '⭐ VIP Card'
              : 'Standard Card'}
          </span>
        </div>

        {/* EMV Chip & Contactless */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-7 w-10 rounded-md border border-amber-600/70 bg-amber-500/20 p-1 flex items-center justify-center">
            <div className="h-4 w-6 border border-amber-400/40 rounded-sm" />
          </div>
          <span className="text-xs text-neutral-500 font-mono tracking-widest">
            ))) BEZSTYKOWA
          </span>
        </div>

        {/* Card Number ID */}
        <div className="text-lg sm:text-xl font-mono tracking-[0.2em] font-bold text-neutral-100">
          {currentUser.id}
        </div>

        {/* Cardholder & Expiry */}
        <div className="mt-4 flex justify-between items-end text-xs text-neutral-300">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-neutral-500">
              Właściciel Karty
            </div>
            <div className="font-bold font-sans uppercase">
              {currentUser.name} {currentUser.surname}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-neutral-500">Ważność</div>
            <div className="font-mono font-bold">08/29</div>
          </div>
        </div>
      </div>

      {/* 4. Transactions & Purchase History */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white">Historia Transakcji i Zakupów</h3>
          <input
            type="text"
            placeholder="Szukaj w historii..."
            value={searchTx}
            onChange={(e) => setSearchTx(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-black px-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:border-white focus:outline-none w-full sm:w-48"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Wszystkie' },
            { id: 'transfer', label: 'Przelewy' },
            { id: 'marketplace', label: 'Marketplace' },
            { id: 'gift', label: 'Prezenty' },
            { id: 'crypto', label: 'Krypto' },
            { id: 'cat_card', label: 'Karty Kotów' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTxFilter(f.id as any)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                txFilter === f.id
                  ? 'bg-white text-black font-bold'
                  : 'border border-neutral-800 bg-black text-neutral-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="divide-y divide-neutral-900">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Brak zarejestrowanych transakcji w wybranej kategorii.
            </div>
          ) : (
            filteredTransactions.slice(0, 10).map((tx) => {
              const isIncome = tx.receiverId === currentUser.id;
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        isIncome
                          ? 'border-neutral-700 bg-neutral-900 text-white'
                          : 'border-neutral-800 bg-black text-neutral-400'
                      }`}
                    >
                      {tx.category === 'gift' ? (
                        <Gift className="h-4 w-4" />
                      ) : tx.category === 'cat_card' ? (
                        <span>🐱</span>
                      ) : tx.category === 'marketplace' ? (
                        <ShoppingBag className="h-4 w-4" />
                      ) : isIncome ? (
                        <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-neutral-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{tx.title}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {isIncome ? `Od: ${tx.senderName}` : `Do: ${tx.receiverName}`} • {tx.date}
                      </div>
                      {tx.giftMessage && (
                        <div className="mt-1 rounded bg-neutral-900 p-1.5 text-[10px] text-neutral-300 italic border border-neutral-800">
                          "{tx.giftMessage}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-mono font-bold ${
                        isIncome ? 'text-white' : 'text-neutral-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      <FormatNSD amount={tx.amount} />
                    </div>
                    <div className="text-[9px] text-neutral-500 capitalize">{tx.type}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
