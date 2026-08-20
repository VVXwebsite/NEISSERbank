import React, { useState, useEffect, useRef } from 'react';
import { User, MarketplaceItem, MarketplaceChat, MarketplaceMessage, Invoice } from '../types';
import { FormatNSD } from './CurrencySymbol';
import {
  getMarketplaceChats,
  getOrCreateMarketplaceChat,
  sendMarketplaceMessage,
  saveMarketplaceChats,
  updateUser,
  addTransaction,
  addInvoice,
  getUsers,
} from '../data/storage';
import {
  X,
  Send,
  MessageSquare,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  User as UserIcon,
  Tag,
  Sparkles,
} from 'lucide-react';
import { InvoiceModal } from './InvoiceModal';

interface MarketplaceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MarketplaceItem | null;
  currentUser: User;
  onRefreshUser: () => void;
  onViewInvoice?: (invoice: Invoice) => void;
}

export function MarketplaceChatModal({
  isOpen,
  onClose,
  item,
  currentUser,
  onRefreshUser,
  onViewInvoice,
}: MarketplaceChatModalProps) {
  const [chat, setChat] = useState<MarketplaceChat | null>(null);
  const [messageText, setMessageText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      const activeChat = getOrCreateMarketplaceChat(item, currentUser);
      setChat(activeChat);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, item, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages, isTyping]);

  if (!isOpen || !item || !chat) return null;

  const isSeller = currentUser.id === item.sellerId;
  const isAffordable = currentUser.balanceNSD >= item.priceNSD;

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || messageText).trim();
    if (!text) return;

    setErrorMsg('');
    const updated = sendMarketplaceMessage(
      chat.id,
      currentUser.id,
      `${currentUser.name} ${currentUser.surname}`,
      text,
      false
    );

    if (updated) {
      setChat({ ...updated });
      setMessageText('');

      // If user is talking with a non-current user seller, simulate a helpful automated seller reply
      if (!isSeller && item.sellerId !== currentUser.id) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          let replyText = 'Dziękuję za wiadomość! Tak, oferta jest w 100% aktualna. Po sfinalizowaniu zakupu przyciskiem powyżej natychmiast przystąpię do realizacji!';
          const lower = text.toLowerCase();
          if (lower.includes('cześć') || lower.includes('dzień dobry') || lower.includes('hej')) {
            replyText = `Dzień dobry ${currentUser.name}! Cieszę się z Twojego zainteresowania. Oferta "${item.title}" jest dostępna od ręki. Możesz bezpiecznie sfinalizować transakcję.`;
          } else if (lower.includes('rabat') || lower.includes('taniej') || lower.includes('zniżka')) {
            replyText = `Cena ${item.priceNSD.toFixed(2)} NSD jest już promocyjna dla społeczności Neisser, ale gwarantuję najwyższą jakość i szybką realizację!`;
          } else if (lower.includes('kiedy') || lower.includes('czas') || lower.includes('realizacja') || lower.includes('wysyłka')) {
            replyText = item.type === 'digital' || item.type === 'service'
              ? 'Dostęp / realizacja jest natychmiastowa po zaksięgowaniu płatności w NSD.'
              : 'Wysyłka / przekazanie nastąpi w ciągu 24h od potwierdzenia zakupu!';
          }

          const sellerUpdated = sendMarketplaceMessage(
            chat.id,
            item.sellerId,
            item.sellerName,
            replyText,
            false
          );
          if (sellerUpdated) {
            setChat({ ...sellerUpdated });
          }
        }, 1200);
      }
    }
  };

  const handleFinalizePurchase = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (isSeller) {
      setErrorMsg('Nie możesz kupić własnej oferty.');
      return;
    }

    if (currentUser.balanceNSD < item.priceNSD) {
      setErrorMsg(`Niewystarczające saldo NSD. Posiadasz ${currentUser.balanceNSD.toFixed(2)} NSD, a oferta kosztuje ${item.priceNSD.toFixed(2)} NSD.`);
      return;
    }

    // Process payment
    // Deduct from buyer
    updateUser({
      id: currentUser.id,
      balanceNSD: currentUser.balanceNSD - item.priceNSD,
    });

    // Credit seller
    const allUsers = getUsers();
    const seller = allUsers.find((u) => u.id === item.sellerId);
    if (seller) {
      updateUser({
        id: seller.id,
        balanceNSD: seller.balanceNSD + item.priceNSD,
      });
    }

    // Record transaction
    addTransaction({
      senderId: currentUser.id,
      senderName: `${currentUser.name} ${currentUser.surname}`,
      receiverId: item.sellerId,
      receiverName: item.sellerName,
      amount: item.priceNSD,
      title: `Płatność Marketplace (czat): ${item.title}`,
      category: 'marketplace',
      type: 'instant',
      status: 'completed',
    });

    // Generate official invoice
    const newInvoice = addInvoice({
      issuerId: item.sellerId,
      issuerName: item.sellerName,
      issuerCity: seller?.city || 'Neisser',
      recipientId: currentUser.id,
      recipientName: `${currentUser.name} ${currentUser.surname}`,
      recipientCity: currentUser.city,
      items: [
        {
          name: item.title,
          quantity: 1,
          unitPriceNSD: item.priceNSD,
          totalNSD: item.priceNSD,
        },
      ],
      totalAmountNSD: item.priceNSD,
      dueDate: new Date().toISOString().slice(0, 10),
      notes: `Transakcja Marketplace sfinalizowana po uzgodnieniach na czacie. Kategoria: ${item.category}.`,
    });

    // Update chat status & log system confirmation
    const chats = getMarketplaceChats();
    const cIdx = chats.findIndex((c) => c.id === chat.id);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const sysMsg: MarketplaceMessage = {
      id: 'msg-success-' + Date.now(),
      senderId: 'system',
      senderName: 'System Neisser',
      text: `🎉 Transakcja została pomyślnie sfinalizowana! Przelano ${item.priceNSD.toFixed(2)} NSD do sprzedawcy ${item.sellerName}. Wystawiono fakturę nr ${newInvoice.invoiceNumber}.`,
      timestamp: nowStr,
      isSystem: true,
    };

    if (cIdx !== -1) {
      chats[cIdx].isPurchased = true;
      chats[cIdx].messages.push(sysMsg);
      chats[cIdx].updatedAt = nowStr;
      saveMarketplaceChats(chats);
      setChat({ ...chats[cIdx] });
    }

    setActiveInvoice(newInvoice);
    setSuccessMsg(`Pomyślnie zakupiono "${item.title}" za ${item.priceNSD.toFixed(2)} NSD! Faktura została wygenerowana.`);
    onRefreshUser();
  };

  const quickPrompts = [
    '👋 Dzień dobry, czy oferta jest aktualna?',
    '🚀 Chcę sfinalizować zakup i przelać NSD',
    '📦 Kiedy możliwa jest realizacja?',
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm">
        <div className="relative flex flex-col w-full max-w-2xl h-[90vh] max-h-[720px] rounded-2xl border border-neutral-800 bg-neutral-950 text-white shadow-2xl overflow-hidden">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-4 py-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-950 border border-purple-800 text-purple-300 font-mono font-bold text-xs shrink-0">
                {item.sellerName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">
                    Czat ze sprzedawcą: {item.sellerName}
                  </h3>
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300 font-mono shrink-0">
                    {item.type}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
                  <span className="text-white font-medium truncate">{item.title}</span>
                  <span>•</span>
                  <span className="text-purple-300 font-mono font-bold">{item.priceNSD.toFixed(2)} NSD</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Item Offer Action Banner (Top Pin) */}
          <div className="border-b border-neutral-800 bg-black/60 px-4 py-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">{item.title}</span>
                  <span className="text-[10px] text-neutral-400">({item.category})</span>
                </div>
                <div className="text-xs text-neutral-400">
                  Cena: <strong className="text-white font-mono">{item.priceNSD.toFixed(2)} NSD</strong>
                  {' • '}
                  Twoje saldo: <span className="font-mono text-neutral-300">{currentUser.balanceNSD.toFixed(2)} NSD</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {chat.isPurchased ? (
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Zakupiono</span>
                  </div>
                ) : isSeller ? (
                  <div className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300">
                    Twoja oferta
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalizePurchase}
                    disabled={!isAffordable}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      isAffordable
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 active:scale-95'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Sfinalizuj zakup ({item.priceNSD.toFixed(2)} NSD)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error / Success alerts */}
            {errorMsg && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800 p-2 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-950/50 border border-emerald-800 p-2 text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
                {activeInvoice && (
                  <button
                    onClick={() => {
                      if (onViewInvoice) onViewInvoice(activeInvoice);
                    }}
                    className="underline text-emerald-200 hover:text-white ml-2 text-[11px] font-bold shrink-0"
                  >
                    Zobacz fakturę →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-950">
            {chat.messages.map((msg) => {
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="max-w-md rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 text-center text-xs text-neutral-300 flex items-center gap-2 shadow-sm">
                      <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
                      <span>{msg.text}</span>
                    </div>
                  </div>
                );
              }

              const isMe = msg.senderId === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-neutral-500">
                    <span className="font-medium text-neutral-400">{msg.senderName}</span>
                    <span>•</span>
                    <span>{msg.timestamp.slice(11, 16) || msg.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      isMe
                        ? 'bg-purple-600 text-white rounded-br-none shadow-md'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 italic p-1">
                <div className="flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>{item.sellerName} pisze odpowiedź...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="border-t border-neutral-900 bg-neutral-950 px-4 pt-2.5 pb-1 flex flex-wrap gap-1.5 shrink-0">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Message Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="border-t border-neutral-800 bg-neutral-900/90 p-3 shrink-0 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Napisz wiadomość do ${item.sellerName}...`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 rounded-xl border border-neutral-800 bg-black px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white transition-colors hover:bg-purple-500 disabled:bg-neutral-800 disabled:text-neutral-600"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {activeInvoice && (
        <InvoiceModal
          isOpen={!!activeInvoice}
          onClose={() => setActiveInvoice(null)}
          currentUser={currentUser}
          onRefresh={onRefreshUser}
          initialTab="view"
        />
      )}
    </>
  );
}
