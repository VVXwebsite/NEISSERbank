import React, { useState } from 'react';
import { User, CatCard, Lottery } from '../../types';
import { FormatNSD, CurrencySymbol } from '../CurrencySymbol';
import { CAT_CARDS_DATABASE, LEVEL_CONFIGS } from '../../data/initialData';
import {
  addTransaction,
  buyCatCardPack,
  buyLotteryTickets,
  deleteUser,
  drawLotteryWinner,
  getLotteries,
  getUsers,
  saveLotteries,
  subscribeToStore,
  updateUser,
} from '../../data/storage';
import {
  User as UserIcon,
  Crown,
  Sparkles,
  Shield,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Ticket,
  Users,
  Mail,
  Coins,
  ArrowUpCircle,
  Package,
  Layers,
  Star,
  Zap,
  Trash2,
} from 'lucide-react';

interface ProfileTabProps {
  currentUser: User;
  onRefreshUser: () => void;
}

export function ProfileTab({ currentUser, onRefreshUser }: ProfileTabProps) {
  const [activeSection, setActiveSection] = useState<'profile' | 'levels' | 'cat_cards' | 'lottery' | 'dev_panel'>('profile');

  // Profile edit states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(currentUser.bio || '');

  // Cat Cards Gacha state
  const [selectedCatCard, setSelectedCatCard] = useState<CatCard | null>(null);
  const [drawnCatCard, setDrawnCatCard] = useState<CatCard | null>(null);
  const [catFilter, setCatFilter] = useState<'all' | 'owned' | 'missing'>('all');

  // Developer panel states
  const [devNewLotteryTitle, setDevNewLotteryTitle] = useState('');
  const [devNewLotteryPrize, setDevNewLotteryPrize] = useState('');
  const [devNewLotteryTicket, setDevNewLotteryTicket] = useState('');

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [allUsers, setAllUsers] = useState<User[]>(getUsers());
  const [lotteries, setLotteries] = useState<Lottery[]>(getLotteries());

  React.useEffect(() => {
    const unsub = subscribeToStore(() => {
      setAllUsers(getUsers());
      setLotteries(getLotteries());
    });
    return () => unsub();
  }, []);

  const ownedCardsCount = currentUser.ownedCatCards?.length || 0;

  const handleSaveBio = () => {
    updateUser({
      id: currentUser.id,
      bio: bioInput.trim(),
    });
    setIsEditingBio(false);
    setSuccessMsg('Opis profilu został pomyślnie zaktualizowany.');
    onRefreshUser();
  };

  const handleUpgradeLevel = (targetLevel: number, cost: number) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (currentUser.balanceNSD < cost) {
      setErrorMsg(`Niewystarczające saldo NSD. Potrzebujesz ${cost} NSD.`);
      return;
    }

    updateUser({
      id: currentUser.id,
      balanceNSD: currentUser.balanceNSD - cost,
      level: targetLevel,
    });

    addTransaction({
      senderId: currentUser.id,
      senderName: `${currentUser.name} ${currentUser.surname}`,
      receiverId: 'neisser-level-registry',
      receiverName: 'Rejestr Poziomów Obywatelskich',
      amount: cost,
      title: `Awans na Poziom ${targetLevel} (${LEVEL_CONFIGS[targetLevel - 1].name})`,
      category: 'level_upgrade',
      type: 'instant',
      status: 'completed',
    });

    setSuccessMsg(`Gratulacje! Awansowałeś na Poziom ${targetLevel}!`);
    onRefreshUser();
  };

  const handleBuyCatPack = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const res = buyCatCardPack(currentUser);
    if (!res.success) {
      setErrorMsg(res.msg);
    } else {
      setDrawnCatCard(res.card || null);
      setSuccessMsg(res.msg);
      onRefreshUser();
    }
  };

  const handleBuyLotteryTicket = (lotteryId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    const res = buyLotteryTickets(lotteryId, currentUser, 1);
    if (!res.success) {
      setErrorMsg(res.msg);
    } else {
      setSuccessMsg(res.msg);
      onRefreshUser();
    }
  };

  const handleDrawLottery = (lotteryId: string) => {
    const winner = drawLotteryWinner(lotteryId);
    if (winner) {
      setSuccessMsg(`Wylosowano zwycięzcę loterii: ${winner.userName}! Środki zostały przekazane.`);
      onRefreshUser();
    }
  };

  const handleCreateLotteryAsDev = (e: React.FormEvent) => {
    e.preventDefault();
    const prize = parseFloat(devNewLotteryPrize);
    const ticket = parseFloat(devNewLotteryTicket);
    if (!devNewLotteryTitle.trim() || isNaN(prize) || isNaN(ticket)) {
      setErrorMsg('Wprowadź prawidłowe dane nowej loterii.');
      return;
    }

    const currentLots = getLotteries();
    const newLot: Lottery = {
      id: 'lottery-' + Date.now(),
      title: devNewLotteryTitle.trim(),
      organizerName: `${currentUser.name} ${currentUser.surname}`,
      prizePoolNSD: prize,
      ticketPriceNSD: ticket,
      participants: [],
      status: 'active',
      endDate: '2026-09-01',
    };
    currentLots.unshift(newLot);
    saveLotteries(currentLots);

    setDevNewLotteryTitle('');
    setDevNewLotteryPrize('');
    setDevNewLotteryTicket('');
    setSuccessMsg(`Utworzono nową oficjalną loterię: ${newLot.title}!`);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (userId === currentUser.id) {
      setErrorMsg('Nie możesz usunąć własnego konta dewelopera.');
      return;
    }
    if (window.confirm(`Czy na pewno chcesz bezpowrotnie usunąć konto użytkownika "${userName}"?`)) {
      deleteUser(userId);
      setSuccessMsg(`Konto użytkownika ${userName} zostało bezpowrotnie usunięte.`);
      onRefreshUser();
    }
  };

  return (
    <div id="neisser-profile-view" className="space-y-6 pb-24 text-white">
      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-neutral-900 bg-neutral-950 p-1.5 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSection('profile')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
            activeSection === 'profile' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <UserIcon className="h-4 w-4" />
          <span>Konto & Bio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('levels')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
            activeSection === 'levels' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Crown className="h-4 w-4 text-amber-400" />
          <span>Poziomy Obywatelskie</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('cat_cards')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
            activeSection === 'cat_cards' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span className="text-sm">🐱</span>
          <span>50 Kart z Kotami ({ownedCardsCount}/50)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('lottery')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
            activeSection === 'lottery' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Ticket className="h-4 w-4 text-purple-400" />
          <span>Loterie Społeczności</span>
        </button>

        {currentUser.role === 'developer' && (
          <button
            type="button"
            onClick={() => setActiveSection('dev_panel')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
              activeSection === 'dev_panel'
                ? 'bg-purple-600 text-white shadow'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Panel Dewelopera 👑</span>
          </button>
        )}
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

      {/* SECTION 1: PROFILE & BIO EDIT */}
      {activeSection === 'profile' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 font-mono text-2xl font-bold text-white shadow-lg">
                {currentUser.name.charAt(0)}{currentUser.surname.charAt(0)}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl font-bold text-white">
                    {currentUser.name} {currentUser.surname}
                  </h2>
                  {currentUser.role === 'developer' && (
                    <span className="rounded-md border border-purple-500/40 bg-purple-950/60 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      👑 ZAŁOŻYCIEL
                    </span>
                  )}
                  {currentUser.role === 'premium' && (
                    <span className="rounded-md border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      ⭐ VIP PREMIUM
                    </span>
                  )}
                </div>

                <div className="text-xs text-neutral-400 font-mono">
                  Miasto: <strong className="text-neutral-200">{currentUser.city}</strong> • E-mail: <strong className="text-neutral-200">{currentUser.email}</strong>
                </div>

                <div className="text-xs text-neutral-400 font-mono">
                  ID Karty: <span className="text-white font-bold">{currentUser.id}</span>
                </div>
              </div>
            </div>

            {/* Bio Editor */}
            <div className="rounded-xl border border-neutral-900 bg-black p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Opis Profilu (Bio)
                </span>
                {!isEditingBio && (
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(true)}
                    className="text-xs text-neutral-300 hover:text-white font-medium flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" /> Edytuj
                  </button>
                )}
              </div>

              {isEditingBio ? (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white focus:border-white focus:outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(false)}
                      className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-400"
                    >
                      Anuluj
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-neutral-200"
                    >
                      Zapisz zmiany
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-neutral-300 leading-relaxed italic">
                  "{currentUser.bio || 'Brak ustawionego opisu profilu.'}"
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LEVELS UPGRADE */}
      {activeSection === 'levels' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-2">
            <h3 className="text-lg font-bold">Poziomy Obywatelskie Neissera</h3>
            <p className="text-xs text-neutral-400">
              Awansuj na wyższe poziomy za saldo NSD, aby odblokować unikalne przywileje, wyższe limity przelewów i odznaki widoczne dla wszystkich użytkowników.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LEVEL_CONFIGS.map((lvl) => {
              const isCurrent = currentUser.level === lvl.level;
              const isUnlocked = currentUser.level >= lvl.level;
              const canAfford = currentUser.balanceNSD >= lvl.costNSD;

              return (
                <div
                  key={lvl.level}
                  className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                    isCurrent
                      ? 'border-white bg-neutral-900 shadow-xl'
                      : isUnlocked
                      ? 'border-neutral-800 bg-black opacity-80'
                      : 'border-neutral-900 bg-neutral-950'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-black">{lvl.badge}</span>
                      <span className="text-xs font-mono font-bold">
                        {lvl.costNSD === 0 ? 'Darmowy' : `${lvl.costNSD} NSD`}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-2">{lvl.name}</h4>

                    <div className="space-y-1.5 text-xs text-neutral-400 mb-4">
                      {lvl.perks.map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-900">
                    {isCurrent ? (
                      <span className="block text-center rounded-xl bg-white/20 py-2 text-xs font-bold text-white">
                        Twój Aktualny Poziom
                      </span>
                    ) : isUnlocked ? (
                      <span className="block text-center rounded-xl bg-neutral-900 py-2 text-xs text-neutral-500">
                        Odblokowany
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpgradeLevel(lvl.level, lvl.costNSD)}
                        disabled={!canAfford}
                        className="w-full rounded-xl bg-white py-2 text-xs font-bold text-black hover:bg-neutral-200 disabled:opacity-40"
                      >
                        Awansuj za {lvl.costNSD} NSD
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: 50 CAT CARDS GACHA & ALBUM */}
      {activeSection === 'cat_cards' && (
        <div className="space-y-6">
          {/* Gacha Banner */}
          <div className="rounded-2xl border border-purple-900/60 bg-gradient-to-r from-purple-950/40 via-neutral-950 to-neutral-950 p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300">
                Grywalizacja & Kolekcje
              </span>
              <h3 className="text-xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
                <span>Album 50 Wirtualnych Kart z Kotami</span>
              </h3>
              <p className="text-xs text-neutral-400 max-w-lg">
                Kupuj losowe paczki za <strong>20 NSD</strong> i zbierz wszystkie 50 unikalnych kotów Neissera (od zwykłych po mityczne karty Genesis)!
              </p>
              <div className="text-xs text-neutral-300 font-mono pt-1">
                Twoja kolekcja: <strong>{ownedCardsCount}</strong> z 50 kart ({Math.round((ownedCardsCount / 50) * 100)}%)
              </div>
            </div>

            <button
              id="buy-cat-card-pack-button"
              type="button"
              onClick={handleBuyCatPack}
              className="rounded-2xl bg-purple-600 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white hover:bg-purple-500 shadow-xl shadow-purple-900/50 active:scale-95 transition-all shrink-0 flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              <span>Otwórz Paczkę (20 NSD)</span>
            </button>
          </div>

          {/* Newly Drawn Card Reveal Animation Card */}
          {drawnCatCard && (
            <div className="rounded-2xl border-2 border-fuchsia-500 bg-neutral-950 p-6 text-center shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <span className="text-xs uppercase tracking-wider font-bold text-fuchsia-400">
                🎉 Wylosowano nową kartę kota!
              </span>
              <div className="text-5xl my-2">{drawnCatCard.visualEmoji}</div>
              <h4 className="text-xl font-bold text-white">
                #{drawnCatCard.number} {drawnCatCard.name}
              </h4>
              <p className="text-xs text-neutral-400 italic">"{drawnCatCard.description}"</p>
              <div className="flex justify-center gap-2 text-xs font-mono font-bold">
                <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-1">
                  Rzadkość: {drawnCatCard.rarity}
                </span>
                <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-1">
                  Mruczenie: {drawnCatCard.purrPower}/100
                </span>
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'Wszystkie 50 Kart' },
              { id: 'owned', label: `Posiadane (${ownedCardsCount})` },
              { id: 'missing', label: `Brakujące (${50 - ownedCardsCount})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCatFilter(f.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  catFilter === f.id
                    ? 'bg-white text-black font-bold'
                    : 'border border-neutral-800 bg-black text-neutral-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 50 Cat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {CAT_CARDS_DATABASE.filter((c) => {
              const isOwned = currentUser.ownedCatCards?.includes(c.id);
              if (catFilter === 'owned') return isOwned;
              if (catFilter === 'missing') return !isOwned;
              return true;
            }).map((card) => {
              const isOwned = currentUser.ownedCatCards?.includes(card.id);

              return (
                <div
                  key={card.id}
                  onClick={() => isOwned && setSelectedCatCard(card)}
                  className={`rounded-2xl border p-3 flex flex-col justify-between transition-all select-none ${
                    isOwned
                      ? `${card.cardColor} bg-neutral-900/90 cursor-pointer hover:scale-105 shadow-md`
                      : 'border-neutral-900 bg-black/50 opacity-40 grayscale'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start text-[10px] font-mono text-neutral-400">
                      <span>#{card.number}</span>
                      <span className="font-bold">{card.rarity}</span>
                    </div>

                    <div className="text-3xl text-center my-3">{card.visualEmoji}</div>

                    <h5 className="text-xs font-bold text-white text-center truncate">
                      {isOwned ? card.name : '??? Nieodkryty'}
                    </h5>
                    <p className="text-[10px] text-neutral-400 text-center truncate">
                      {isOwned ? card.title : 'Kup paczkę za 20 NSD'}
                    </p>
                  </div>

                  {isOwned && (
                    <div className="mt-3 pt-2 border-t border-neutral-800 grid grid-cols-2 gap-1 text-[9px] text-neutral-400 font-mono">
                      <div>Mru: {card.purrPower}</div>
                      <div>Zwin: {card.agility}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cat Card Detail Modal */}
          {selectedCatCard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
              <div className="w-full max-w-sm rounded-2xl border-2 border-purple-500 bg-neutral-950 p-6 text-white shadow-2xl text-center space-y-4">
                <div className="text-6xl">{selectedCatCard.visualEmoji}</div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400">
                    Karta Kolekcjonerska #{selectedCatCard.number} • {selectedCatCard.rarity}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedCatCard.name}</h3>
                  <p className="text-xs text-neutral-300 font-medium">{selectedCatCard.title}</p>
                </div>

                <p className="text-xs text-neutral-400 italic bg-black p-3 rounded-xl border border-neutral-900 leading-relaxed">
                  "{selectedCatCard.description}"
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="rounded-lg bg-neutral-900 p-2 border border-neutral-800">
                    Mruczenie: <strong>{selectedCatCard.purrPower}/100</strong>
                  </div>
                  <div className="rounded-lg bg-neutral-900 p-2 border border-neutral-800">
                    Zwinność: <strong>{selectedCatCard.agility}/100</strong>
                  </div>
                  <div className="rounded-lg bg-neutral-900 p-2 border border-neutral-800">
                    Bogactwo: <strong>{selectedCatCard.wealth}/100</strong>
                  </div>
                  <div className="rounded-lg bg-neutral-900 p-2 border border-neutral-800">
                    Spryt: <strong>{selectedCatCard.cunning}/100</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCatCard(null)}
                  className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-black hover:bg-neutral-200"
                >
                  Zamknij
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: LOTTERIES */}
      {activeSection === 'lottery' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-2">
            <h3 className="text-lg font-bold">Loterie Społecznościowe Neisser</h3>
            <p className="text-xs text-neutral-400">
              Kupuj losy na oficjalne loterie organizowane przez Dewelopera. Cała pula nagród trafia do wylosowanego zwycięzcy!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lotteries.map((lot) => {
              const totalTickets = lot.participants.reduce((acc, p) => acc + p.ticketsCount, 0);
              const userTickets =
                lot.participants.find((p) => p.userId === currentUser.id)?.ticketsCount || 0;

              return (
                <div
                  key={lot.id}
                  className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                        Organizator: {lot.organizerName}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          lot.status === 'active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-neutral-900 text-neutral-400'
                        }`}
                      >
                        {lot.status === 'active' ? 'Aktywna' : 'Rozstrzygnięta'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white mb-2">{lot.title}</h4>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono my-3">
                      <div className="rounded-xl border border-neutral-900 bg-black p-2.5">
                        <span className="text-[10px] text-neutral-500 block">Pula Nagród</span>
                        <span className="text-base font-bold text-white font-mono">
                          {lot.prizePoolNSD} NSD
                        </span>
                      </div>
                      <div className="rounded-xl border border-neutral-900 bg-black p-2.5">
                        <span className="text-[10px] text-neutral-500 block">Cena Losu</span>
                        <span className="text-base font-bold text-white font-mono">
                          {lot.ticketPriceNSD} NSD
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-400 space-y-1">
                      <div>Sprzedane losy: <strong>{totalTickets} szt.</strong></div>
                      <div>Twoje losy: <strong>{userTickets} szt.</strong></div>
                      {lot.winnerName && (
                        <div className="text-emerald-400 font-bold">
                          🏆 Zwycięzca: {lot.winnerName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-900 flex gap-2">
                    {lot.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleBuyLotteryTicket(lot.id)}
                        className="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-black hover:bg-neutral-200"
                      >
                        Kup Los za {lot.ticketPriceNSD} NSD
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-500 w-full text-center py-2">
                        Loteria została zakończona.
                      </span>
                    )}

                    {currentUser.role === 'developer' && lot.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleDrawLottery(lot.id)}
                        className="rounded-xl bg-purple-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-purple-500"
                      >
                        Rozstrzygnij 🎲
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 5: DEVELOPER PANEL (Założyciel Neisser) */}
      {activeSection === 'dev_panel' && currentUser.role === 'developer' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-purple-500/60 bg-purple-950/20 p-5 space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-400" />
              Panel Główny Dewelopera (Założyciel Neissera)
            </h3>
            <p className="text-xs text-purple-200">
              Dostęp do bazy zarejestrowanych użytkowników, zarządzania kontami oraz organizowania oficjalnych loterii społeczności.
            </p>
          </div>

          {/* All Users Email & Account Management */}
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Baza Użytkowników i Kont ({allUsers.length})
              </h4>
              <span className="text-[11px] text-neutral-500 font-mono">Zarządzanie kontami</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-900 text-neutral-500 font-mono">
                    <th className="pb-2">Użytkownik</th>
                    <th className="pb-2">Adres E-mail</th>
                    <th className="pb-2">Miasto</th>
                    <th className="pb-2 text-right">Saldo NSD</th>
                    <th className="pb-2 text-right">Rola</th>
                    <th className="pb-2 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 font-mono">
                  {allUsers.map((u) => (
                    <tr key={u.id} className="py-2.5">
                      <td className="py-2 font-sans font-bold text-white">
                        {u.name} {u.surname}
                      </td>
                      <td className="py-2 text-neutral-300">{u.email}</td>
                      <td className="py-2 text-neutral-400 font-sans">{u.city}</td>
                      <td className="py-2 text-right font-bold text-white">
                        <FormatNSD amount={u.balanceNSD} />
                      </td>
                      <td className="py-2 text-right uppercase text-[10px] text-purple-300">
                        {u.role}
                      </td>
                      <td className="py-2 text-right font-sans">
                        {u.id === currentUser.id ? (
                          <span className="text-[10px] text-neutral-500 italic">Twoje konto</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, `${u.name} ${u.surname}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 bg-red-950/40 px-2.5 py-1 text-[11px] font-medium text-red-400 hover:bg-red-900/50 hover:text-red-200 transition-colors"
                            title="Usuń konto tego użytkownika"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Usuń</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create New Official Lottery */}
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Ticket className="h-4 w-4 text-purple-400" />
              Zorganizuj Nową Loterię na NSD
            </h4>

            <form onSubmit={handleCreateLotteryAsDev} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-neutral-400 mb-1">Tytuł Loterii:</label>
                <input
                  type="text"
                  placeholder="np. Letnia Loteria Społeczności Neisser 2026"
                  value={devNewLotteryTitle}
                  onChange={(e) => setDevNewLotteryTitle(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Pula Początkowa (NSD):</label>
                <input
                  type="number"
                  placeholder="np. 1500"
                  value={devNewLotteryPrize}
                  onChange={(e) => setDevNewLotteryPrize(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Cena Losu (NSD):</label>
                <input
                  type="number"
                  placeholder="np. 15"
                  value={devNewLotteryTicket}
                  onChange={(e) => setDevNewLotteryTicket(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-black hover:bg-neutral-200"
                >
                  Opublikuj Loterię
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
