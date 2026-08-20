import React, { useState, useEffect } from 'react';
import { User, MarketplaceItem, Invoice } from '../../types';
import { FormatNSD, CurrencySymbol } from '../CurrencySymbol';
import {
  addMarketplaceItem,
  addTransaction,
  deleteMarketplaceItem,
  getInvoices,
  getMarketplaceChats,
  getMarketplaceItems,
  getUsers,
  subscribeToStore,
  updateUser,
} from '../../data/storage';
import {
  Search,
  Plus,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag,
  Star,
  FileText,
  Crown,
  Filter,
  Layers,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { InvoiceModal } from '../InvoiceModal';
import { MarketplaceChatModal } from '../MarketplaceChatModal';

interface MarketplaceTabProps {
  currentUser: User;
  onRefreshUser: () => void;
}

const CATEGORIES = [
  'Wszystkie',
  'Plany i Subskrypcje',
  'Grafika & Design',
  'Gry & Rozrywka',
  'Dzieła Cyfrowe & IT',
  'Usługi & IT',
  'Edukacja & Szkolenia',
  'Dom & Gastronomia',
  'Filmy & Wideo',
  'Książki & E-booki',
  'Rękodzieło & Sztuka',
  'Naprawy & Warsztat',
  'Muzyka & Audio',
  'Sport & Zdrowie',
];

export function MarketplaceTab({ currentUser, onRefreshUser }: MarketplaceTabProps) {
  const [items, setItems] = useState<MarketplaceItem[]>(getMarketplaceItems());
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [searchQuery, setSearchQuery] = useState('');
  const [sellerSearch, setSellerSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'service' | 'digital' | 'physical'>('all');

  // Modals
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedChatItem, setSelectedChatItem] = useState<MarketplaceItem | null>(null);
  const [showActiveChatsModal, setShowActiveChatsModal] = useState(false);

  // New Item form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceNSD, setPriceNSD] = useState('');
  const [category, setCategory] = useState(CATEGORIES[2]);
  const [subCategory, setSubCategory] = useState('');
  const [type, setType] = useState<'service' | 'digital' | 'physical'>('service');

  // Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const unsub = subscribeToStore(() => {
      setItems(getMarketplaceItems());
    });
    return () => unsub();
  }, []);

  const invoices = getInvoices();
  const userInvoices = invoices.filter(
    (inv) => inv.issuerId === currentUser.id || inv.recipientId === currentUser.id
  );

  const allChats = getMarketplaceChats();
  const userChats = allChats.filter(
    (c) => c.buyerId === currentUser.id || c.sellerId === currentUser.id
  );

  const refreshList = () => {
    setItems(getMarketplaceItems());
  };

  const filteredItems = items.filter((it) => {
    if (selectedCategory !== 'Wszystkie' && it.category !== selectedCategory) return false;
    if (selectedType !== 'all' && it.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = it.title.toLowerCase().includes(q);
      const matchDesc = it.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (sellerSearch.trim()) {
      const q = sellerSearch.toLowerCase();
      if (!it.sellerName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleStartPurchaseChat = (item: MarketplaceItem) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (item.sellerId === currentUser.id) {
      setErrorMsg('Nie możesz kupić własnej oferty.');
      return;
    }

    // Check special Premium pass direct buy option
    if (item.isSpecialPremiumPass) {
      if (currentUser.balanceNSD < item.priceNSD) {
        setErrorMsg(`Niewystarczające saldo NSD. Potrzebujesz ${item.priceNSD} NSD.`);
        return;
      }
      updateUser({
        id: currentUser.id,
        balanceNSD: currentUser.balanceNSD - item.priceNSD,
        role: 'premium',
        expressTransfersRemainingToday: 999,
      });

      addTransaction({
        senderId: currentUser.id,
        senderName: `${currentUser.name} ${currentUser.surname}`,
        receiverId: 'neisser-system',
        receiverName: 'Neisser Official',
        amount: item.priceNSD,
        title: 'Zakup subskrypcji Neisser Premium VIP',
        category: 'premium',
        type: 'instant',
        status: 'completed',
      });

      setSuccessMsg('Gratulacje! Twój profil uzyskał status Neisser Premium (Nielimitowane przelewy ekspresowe, złota odznaka VIP)!');
      onRefreshUser();
      return;
    }

    // For all standard items: Open Seller Chat first as requested!
    setSelectedChatItem(item);
    setShowChatModal(true);
  };

  const handleDeleteItem = (itemId: string, itemTitle: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (window.confirm(`Czy na pewno chcesz bezpowrotnie usunąć ofertę "${itemTitle}"?`)) {
      deleteMarketplaceItem(itemId);
      setSuccessMsg(`Oferta "${itemTitle}" została usunięta.`);
      refreshList();
    }
  };

  const handleCreateListing = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const price = parseFloat(priceNSD.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      setErrorMsg('Wprowadź prawidłową cenę w NSD.');
      return;
    }

    const emojiMap: Record<string, string> = {
      service: '🛠️',
      digital: '💻',
      physical: '📦',
    };

    addMarketplaceItem({
      sellerId: currentUser.id,
      sellerName: `${currentUser.name} ${currentUser.surname}`,
      sellerRating: 5.0,
      title: title.trim(),
      description: description.trim(),
      priceNSD: price,
      category,
      subCategory: subCategory.trim() || category,
      type,
      imagePlaceholder: emojiMap[type] || '✨',
    });

    setShowNewItemModal(false);
    setTitle('');
    setDescription('');
    setPriceNSD('');
    setSubCategory('');
    refreshList();
    setSuccessMsg('Oferta została pomyślnie dodana do Marketplace!');
  };

  return (
    <div id="neisser-marketplace-view" className="space-y-6 pb-24 text-white">
      {/* Top Banner with Action Buttons */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Marketplace Neisser
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Rynek usług, dóbr fizycznych i dzieł cyfrowych (gry, filmy, design) za walutę NSD.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowActiveChatsModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-black px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-purple-400" />
              <span>Czaty ({userChats.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-black px-3.5 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Faktury ({userInvoices.length})</span>
            </button>

            <button
              id="open-create-listing-modal-btn"
              type="button"
              onClick={() => setShowNewItemModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200 transition-colors shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Wystaw Ofertę</span>
            </button>
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

      {/* Search & Filters */}
      <div className="rounded-2xl border border-neutral-900 bg-neutral-950 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Szukaj ofert, usług, gier, filmów..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2 pl-9 text-xs text-white placeholder-neutral-600 focus:border-white focus:outline-none"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Filtruj po sprzedawcy (np. Kasia, Janek, Anna)..."
              value={sellerSearch}
              onChange={(e) => setSellerSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-black px-3.5 py-2 pl-9 text-xs text-white placeholder-neutral-600 focus:border-white focus:outline-none"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          </div>
        </div>

        {/* Categories Bar */}
        <div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-white text-black font-bold'
                    : 'border border-neutral-800 bg-black text-neutral-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Listings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-16 px-4 text-center rounded-2xl border border-neutral-900 bg-neutral-950/80 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-400">
              <ShoppingBag className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-sm font-bold text-white">Rynek Marketplace jest gotowy</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Brak aktywnych ofert w tej chwili. Bądź pierwszym przedsiębiorcą i wystaw swój produkt, usługę lub plik cyfrowy za walutę NSD!
            </p>
            <button
              type="button"
              onClick={() => setShowNewItemModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200 transition-all shadow-sm mt-2"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Wystaw pierwszą ofertę</span>
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOwner = item.sellerId === currentUser.id;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                  item.isSpecialPremiumPass
                    ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/30 to-neutral-950 shadow-xl'
                    : 'border-neutral-900 bg-neutral-950 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-black text-xl">
                        {item.imagePlaceholder}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-300">
                          <span>{item.sellerName}</span>
                          <span className="flex items-center text-amber-400 text-[10px]">
                            ★ {item.sellerRating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-white">
                        <FormatNSD amount={item.priceNSD} />
                      </div>
                      <span className="text-[9px] text-neutral-500 capitalize">{item.type}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                  <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed mb-4">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-900 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Sprzedano: {item.soldCount} szt.
                  </span>

                  <div className="flex items-center gap-2">
                    {(currentUser.role === 'developer' || isOwner) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 bg-red-950/40 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-900/50 hover:text-red-200 transition-colors"
                        title={currentUser.role === 'developer' ? 'Usuń ofertę (Uprawnienie Dewelopera)' : 'Usuń swoją ofertę'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Usuń</span>
                      </button>
                    )}

                    {isOwner ? (
                      <span className="rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-xs text-neutral-400 font-medium">
                        Twoja oferta
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartPurchaseChat(item)}
                        className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                          item.isSpecialPremiumPass
                            ? 'bg-amber-400 text-black hover:bg-amber-300'
                            : 'bg-white text-black hover:bg-neutral-200 shadow-sm'
                        }`}
                      >
                        {!item.isSpecialPremiumPass && <MessageSquare className="h-3.5 w-3.5 text-purple-600" />}
                        <span>{item.isSpecialPremiumPass ? 'Kup Status Premium' : 'Czat ze sprzedawcą i zakup'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create Listing */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Wystaw Nową Ofertę w Marketplace</h3>

            <form onSubmit={handleCreateListing} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Tytuł oferty</label>
                <input
                  type="text"
                  placeholder="np. Gra cyfrowa Cyber Runner lub Naprawa laptopa"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black p-2.5 text-xs text-white focus:border-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Główna Kategoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-black p-2.5 text-xs text-white focus:border-white focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'Wszystkie').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1">Typ oferty</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full rounded-lg border border-neutral-800 bg-black p-2.5 text-xs text-white focus:border-white focus:outline-none"
                  >
                    <option value="service">Usługa</option>
                    <option value="digital">Dzieło Cyfrowe (Plik/Gra/Film)</option>
                    <option value="physical">Przedmiot Fizyczny</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Cena w NSD</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="np. 35.00"
                  value={priceNSD}
                  onChange={(e) => setPriceNSD(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black p-2.5 text-xs font-mono text-white focus:border-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Szczegółowy opis</label>
                <textarea
                  rows={3}
                  placeholder="Opisz co oferujesz, czas realizacji, warunki dostawy/pobrania..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black p-2.5 text-xs text-white focus:border-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewItemModal(false)}
                  className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-black hover:bg-neutral-200"
                >
                  Opublikuj Ofertę
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Chats Modal */}
      {showActiveChatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative flex flex-col w-full max-w-lg max-h-[80vh] rounded-2xl border border-neutral-800 bg-neutral-950 text-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Twoje Czaty Transakcyjne ({userChats.length})</h3>
              </div>
              <button
                onClick={() => setShowActiveChatsModal(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {userChats.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  Nie masz jeszcze żadnych aktywnych rozmów ze sprzedawcami. Kliknij "Czat ze sprzedawcą i zakup" przy dowolnej ofercie!
                </div>
              ) : (
                userChats.map((c) => {
                  const targetItem = items.find((it) => it.id === c.itemId) || {
                    id: c.itemId,
                    title: c.itemTitle,
                    priceNSD: c.itemPriceNSD,
                    sellerId: c.sellerId,
                    sellerName: c.sellerName,
                    sellerRating: 5.0,
                    category: 'Marketplace',
                    type: 'service',
                    description: '',
                    imagePlaceholder: '🛍️',
                    createdAt: c.createdAt,
                    soldCount: 0,
                  } as MarketplaceItem;

                  const lastMessage = c.messages[c.messages.length - 1];

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedChatItem(targetItem);
                        setShowActiveChatsModal(false);
                        setShowChatModal(true);
                      }}
                      className="cursor-pointer rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3 hover:border-purple-800/80 hover:bg-neutral-900 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-xs text-white truncate">{c.itemTitle}</span>
                          <span className="text-[10px] font-mono text-purple-300 shrink-0 font-bold">
                            {c.itemPriceNSD.toFixed(2)} NSD
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mb-1 truncate">
                          <span>Rozmówca: <strong className="text-neutral-200">{c.buyerId === currentUser.id ? c.sellerName : c.buyerName}</strong></span>
                          <span>•</span>
                          <span>{c.updatedAt.slice(11, 16) || c.updatedAt}</span>
                        </div>
                        {lastMessage && (
                          <div className="text-[11px] text-neutral-500 truncate italic">
                            {lastMessage.senderName}: {lastMessage.text}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center">
                        {c.isPurchased ? (
                          <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                            Kupiono
                          </span>
                        ) : (
                          <span className="rounded bg-purple-950 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-800">
                            W toku
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seller Chat & Buy Modal */}
      {selectedChatItem && (
        <MarketplaceChatModal
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedChatItem(null);
          }}
          item={selectedChatItem}
          currentUser={currentUser}
          onRefreshUser={() => {
            onRefreshUser();
            refreshList();
          }}
        />
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        currentUser={currentUser}
        onRefresh={() => {
          onRefreshUser();
          refreshList();
        }}
      />
    </div>
  );
}
