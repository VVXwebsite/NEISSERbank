import React, { useState } from 'react';
import { User, Transaction, FriendRequest } from '../../types';
import { FormatNSD, CurrencySymbol } from '../CurrencySymbol';
import {
  addTransaction,
  getFriendRequests,
  getUsers,
  respondFriendRequest,
  sendFriendRequest,
  updateUser,
} from '../../data/storage';
import {
  Send,
  Gift,
  Search,
  UserPlus,
  Users,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Mail,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

interface TransfersTabProps {
  currentUser: User;
  onRefreshUser: () => void;
}

export function TransfersTab({ currentUser, onRefreshUser }: TransfersTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'send' | 'gift' | 'friends'>('send');

  // Transfer Form State
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [transferType, setTransferType] = useState<'instant' | 'standard'>('instant');
  const [giftLetterMessage, setGiftLetterMessage] = useState('');

  // Status feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Friends & Search state
  const [searchUsersQuery, setSearchUsersQuery] = useState('');
  const allUsers = getUsers();
  const friendRequests = getFriendRequests();

  // Filter possible recipients
  const matchedUsers = allUsers.filter((u) => {
    if (u.id === currentUser.id) return false;
    if (!recipientSearch.trim()) return false;
    const query = recipientSearch.toLowerCase();
    const matchName = `${u.name} ${u.surname}`.toLowerCase().includes(query);
    const matchCard = u.id.toLowerCase().includes(query);
    return matchName || matchCard;
  });

  // User's friends objects
  const userFriends = allUsers.filter((u) => currentUser.friends?.includes(u.id));

  // Incoming pending friend requests for current user
  const incomingFriendRequests = friendRequests.filter(
    (req) => req.toUserId === currentUser.id && req.status === 'pending'
  );

  // Check transfer limits
  const isPremiumOrDev = currentUser.role === 'premium' || currentUser.role === 'developer';
  const hasExpressRemaining = isPremiumOrDev || currentUser.expressTransfersRemainingToday > 0;

  const handleSelectRecipient = (u: User) => {
    setSelectedRecipient(u);
    setRecipientSearch(`${u.name} ${u.surname} (${u.id})`);
    setErrorMsg('');
  };

  const handleSendTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Wprowadź poprawną kwotę w NSD.');
      return;
    }

    if (numAmount > currentUser.balanceNSD) {
      setErrorMsg('Niewystarczające saldo NSD na koncie.');
      return;
    }

    if (!selectedRecipient) {
      setErrorMsg('Wybierz odbiorcę przelewu z listy lub wpisz numer karty.');
      return;
    }

    if (transferType === 'instant' && !hasExpressRemaining) {
      setErrorMsg('Wykorzystałeś limit 2 darmowych przelewów natychmiastowych na dziś. Wybierz przelew standardowy (1 dzień) lub kup Plan Premium w Marketplace.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Deduct from sender
      const updatedSenderBalance = currentUser.balanceNSD - numAmount;
      const updatedExpressCount =
        transferType === 'instant' && !isPremiumOrDev
          ? Math.max(0, currentUser.expressTransfersRemainingToday - 1)
          : currentUser.expressTransfersRemainingToday;

      updateUser({
        id: currentUser.id,
        balanceNSD: updatedSenderBalance,
        expressTransfersRemainingToday: updatedExpressCount,
      });

      // Add to receiver
      updateUser({
        id: selectedRecipient.id,
        balanceNSD: selectedRecipient.balanceNSD + numAmount,
      });

      // Add transaction record
      addTransaction({
        senderId: currentUser.id,
        senderName: `${currentUser.name} ${currentUser.surname}`,
        receiverId: selectedRecipient.id,
        receiverName: `${selectedRecipient.name} ${selectedRecipient.surname}`,
        amount: numAmount,
        title: title.trim() || (activeSubTab === 'gift' ? 'Prezent w NSD' : 'Przelew środków'),
        category: activeSubTab === 'gift' ? 'gift' : 'transfer',
        type: transferType,
        status: 'completed',
        giftMessage: activeSubTab === 'gift' ? giftLetterMessage.trim() : undefined,
      });

      setIsSubmitting(false);
      setSuccessMsg(
        activeSubTab === 'gift'
          ? `Wysłano prezent z dedykacją (${numAmount} NSD) do ${selectedRecipient.name}!`
          : `Przelano ${numAmount} NSD do ${selectedRecipient.name} ${selectedRecipient.surname}!`
      );

      // Reset form
      setAmount('');
      setTitle('');
      setGiftLetterMessage('');
      setSelectedRecipient(null);
      setRecipientSearch('');
      onRefreshUser();
    }, 600);
  };

  const handleSendFriendInvitation = (targetUser: User) => {
    sendFriendRequest(currentUser, targetUser.id);
    setSuccessMsg(`Wysłano zaproszenie do znajomych do ${targetUser.name} ${targetUser.surname}!`);
    onRefreshUser();
  };

  const handleRespondInvitation = (requestId: string, accept: boolean) => {
    respondFriendRequest(requestId, accept);
    onRefreshUser();
  };

  return (
    <div id="neisser-transfers-view" className="space-y-6 pb-24">
      {/* Tab Switcher */}
      <div className="flex rounded-xl border border-neutral-900 bg-neutral-950 p-1">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('send');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
            activeSubTab === 'send'
              ? 'bg-white text-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Przelew NSD</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('gift');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
            activeSubTab === 'gift'
              ? 'bg-white text-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Gift className="h-4 w-4" />
          <span>Prezent w Liście</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('friends');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all relative ${
            activeSubTab === 'friends'
              ? 'bg-white text-black shadow-md'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Znajomi</span>
          {incomingFriendRequests.length > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[9px] font-bold text-white">
              {incomingFriendRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Notifications */}
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

      {/* SUB-TAB 1 & 2: Transfer Form & Gift Letter */}
      {(activeSubTab === 'send' || activeSubTab === 'gift') && (
        <div className="space-y-6">
          {/* Quick Friends Selector */}
          {userFriends.length > 0 && (
            <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block mb-3">
                Szybki wybór ze znajomych:
              </span>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {userFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => handleSelectRecipient(friend)}
                    className={`flex flex-col items-center min-w-[76px] rounded-xl border p-2 text-center transition-all ${
                      selectedRecipient?.id === friend.id
                        ? 'border-white bg-neutral-900 text-white'
                        : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-white mb-1">
                      {friend.name.charAt(0)}
                    </div>
                    <span className="text-[11px] font-bold truncate max-w-[64px]">{friend.name}</span>
                    <span className="text-[9px] text-neutral-500">{friend.city}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSendTransfer}
            className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4 text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                {activeSubTab === 'gift' ? (
                  <>
                    <Gift className="h-4 w-4 text-purple-400" />
                    Wyślij Prezent w Liście z Dedykacją
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Nowy Przelew Obywatelski
                  </>
                )}
              </h3>
              <span className="text-xs text-neutral-400">
                Saldo: <FormatNSD amount={currentUser.balanceNSD} />
              </span>
            </div>

            {/* Recipient Search Input */}
            <div className="relative">
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Odbiorca (Imię, Nazwisko lub Numer Karty ID)
              </label>
              <div className="relative">
                <input
                  id="transfer-recipient-input"
                  type="text"
                  placeholder="np. Anna Nowak lub 4820 ..."
                  value={recipientSearch}
                  onChange={(e) => {
                    setRecipientSearch(e.target.value);
                    if (selectedRecipient) setSelectedRecipient(null);
                  }}
                  className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 pl-10 text-sm text-white placeholder-neutral-600 focus:border-white focus:outline-none"
                  required
                />
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
              </div>

              {/* Autocomplete Dropdown */}
              {!selectedRecipient && matchedUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-1 shadow-2xl divide-y divide-neutral-900">
                  {matchedUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectRecipient(u)}
                      className="w-full flex items-center justify-between p-2.5 text-left hover:bg-neutral-900 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-[10px] font-mono font-bold text-white">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {u.name} {u.surname}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">{u.id}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-sans">{u.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Kwota transferu
              </label>
              <div className="relative">
                <input
                  id="transfer-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-3 text-lg font-bold font-mono text-white placeholder-neutral-600 focus:border-white focus:outline-none"
                  required
                />
                <span className="absolute right-3.5 top-3.5 text-sm font-bold text-neutral-400 font-mono">
                  NSD
                </span>
              </div>
            </div>

            {/* Title / Description */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                {activeSubTab === 'gift' ? 'Tytuł okazji (np. Urodziny, Podziękowanie)' : 'Tytuł przelewu'}
              </label>
              <input
                id="transfer-title-input"
                type="text"
                placeholder={activeSubTab === 'gift' ? 'np. Wszystkiego najlepszego!' : 'np. Rozliczenie za zakupy'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white focus:outline-none"
              />
            </div>

            {/* Gift Dedication Letter (Special Feature) */}
            {activeSubTab === 'gift' && (
              <div className="rounded-xl border border-purple-900/50 bg-purple-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Mail className="h-4 w-4" />
                  <span>List i życzenia w kopercie prezentowej:</span>
                </div>
                <textarea
                  id="gift-letter-message"
                  rows={3}
                  placeholder="Napisz miłe słowa dla znajomego... Odbiorca zobaczy animowaną kopertę z Twoim listem i załączoną kwotą NSD!"
                  value={giftLetterMessage}
                  onChange={(e) => setGiftLetterMessage(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black p-3 text-xs text-white placeholder-neutral-600 focus:border-white focus:outline-none"
                  required
                />
              </div>
            )}

            {/* Transfer Speed / Limits */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-2">
                Typ realizacji i limity:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTransferType('instant')}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    transferType === 'instant'
                      ? 'border-white bg-neutral-900 text-white'
                      : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span>Ekspresowy (Natychmiast)</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">
                    {isPremiumOrDev
                      ? 'Nielimitowane (Konto VIP)'
                      : `Pozostało dzisiaj: ${currentUser.expressTransfersRemainingToday} / 2 darmowe`}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferType('standard')}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    transferType === 'standard'
                      ? 'border-white bg-neutral-900 text-white'
                      : 'border-neutral-800 bg-black text-neutral-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <span>Standardowy (1 dzień)</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">
                    Nielimitowane dla każdego obywatela
                  </div>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="transfer-submit-button"
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-colors hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Wykonywanie operacji bankowej...</span>
                ) : (
                  <>
                    <span>
                      {activeSubTab === 'gift' ? 'Zapakuj i wyślij prezent' : 'Autoryzuj i wyślij przelew'}
                    </span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: Friends Management & Invitations */}
      {activeSubTab === 'friends' && (
        <div className="space-y-6">
          {/* Pending Invitations */}
          {incomingFriendRequests.length > 0 && (
            <div className="rounded-2xl border border-purple-900/60 bg-purple-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
                <Users className="h-4 w-4" />
                <span>Oczekujące zaproszenia do znajomych ({incomingFriendRequests.length})</span>
              </div>

              <div className="divide-y divide-purple-900/40">
                {incomingFriendRequests.map((req) => (
                  <div key={req.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 border border-purple-500/40 text-xs font-mono font-bold text-purple-300">
                        {req.fromUserName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{req.fromUserName}</div>
                        <div className="text-[10px] text-neutral-400">{req.date}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(req.id, true)}
                        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-neutral-200"
                      >
                        Akceptuj
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(req.id, false)}
                        className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-white"
                      >
                        Odrzuć
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Friends List */}
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Twoi Znajomi w Neisserze ({userFriends.length})
              </h3>
            </div>

            {userFriends.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">
                Nie masz jeszcze dodanych znajomych. Wyszukaj członków rodziny lub społeczności poniżej!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {userFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between rounded-xl border border-neutral-800 bg-black p-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-white shrink-0">
                        {friend.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {friend.name} {friend.surname}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono truncate">
                          {friend.id}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectRecipient(friend);
                        setActiveSubTab('send');
                      }}
                      className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white hover:text-black transition-colors shrink-0 ml-2"
                    >
                      Przelew
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Find & Invite new users */}
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Znajdź nowych mieszkańców</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Szukaj po imieniu, nazwisku, mieście lub ID karty..."
                value={searchUsersQuery}
                onChange={(e) => setSearchUsersQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2.5 pl-10 text-xs text-white placeholder-neutral-600 focus:border-white focus:outline-none"
              />
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
            </div>

            <div className="divide-y divide-neutral-900">
              {allUsers
                .filter((u) => u.id !== currentUser.id)
                .filter((u) => {
                  if (!searchUsersQuery.trim()) return true;
                  const q = searchUsersQuery.toLowerCase();
                  return (
                    `${u.name} ${u.surname}`.toLowerCase().includes(q) ||
                    u.id.toLowerCase().includes(q) ||
                    u.city.toLowerCase().includes(q)
                  );
                })
                .slice(0, 8)
                .map((u) => {
                  const isFriend = currentUser.friends?.includes(u.id);
                  return (
                    <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-white shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {u.name} {u.surname}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {u.city} • {u.id}
                          </div>
                        </div>
                      </div>

                      {isFriend ? (
                        <span className="text-[11px] text-neutral-500 font-medium">
                          ✓ Znajomy
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendFriendInvitation(u)}
                          className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-900"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Dodaj</span>
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
