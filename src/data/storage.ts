import {
  CatCard,
  CryptoCurrency,
  FriendRequest,
  Invoice,
  Lottery,
  MarketplaceChat,
  MarketplaceItem,
  MarketplaceMessage,
  Transaction,
  User,
  SavingsVault,
} from '../types';
import { CAT_CARDS_DATABASE, INITIAL_CRYPTOS, INITIAL_MARKETPLACE_ITEMS, INITIAL_USERS } from './initialData';
import {
  dbDeleteMarketplaceItem,
  dbDeleteUser,
  dbDeleteSavingsVault,
  dbFetchFriendRequests,
  dbFetchInvoices,
  dbFetchLotteries,
  dbFetchMarketplaceChats,
  dbFetchMarketplaceItems,
  dbFetchSavingsVaults,
  dbFetchTransactions,
  dbFetchUsers,
  dbInsertTransaction,
  dbUpsertFriendRequest,
  dbUpsertInvoice,
  dbUpsertLottery,
  dbUpsertMarketplaceChat,
  dbUpsertMarketplaceItem,
  dbUpsertSavingsVault,
  dbUpsertUser,
  setupSupabaseRealtimeSync,
} from '../lib/supabaseService';

const USERS_KEY = 'neisser_users_v1';
const CURRENT_USER_ID_KEY = 'neisser_current_user_id_v1';
const TRANSACTIONS_KEY = 'neisser_transactions_v1';
const CRYPTOS_KEY = 'neisser_cryptos_v1';
const MARKETPLACE_KEY = 'neisser_marketplace_v1';
const MARKETPLACE_CHATS_KEY = 'neisser_marketplace_chats_v1';
const INVOICES_KEY = 'neisser_invoices_v1';
const FRIEND_REQUESTS_KEY = 'neisser_friend_requests_v1';
const LOTTERIES_KEY = 'neisser_lotteries_v1';
const SAVINGS_VAULTS_KEY = 'neisser_savings_vaults_v1';
const MARKET_DAY_KEY = 'neisser_market_day_v1';
const FRESH_CLEAN_RELEASE_KEY = 'neisser_fresh_release_v3_clean_slate';

// Ensure 100% fresh clean state for initial launch / publication
(function checkCleanFreshSlate() {
  try {
    const isCleaned = localStorage.getItem(FRESH_CLEAN_RELEASE_KEY);
    if (!isCleaned) {
      localStorage.setItem(FRESH_CLEAN_RELEASE_KEY, 'true');
      localStorage.removeItem(CURRENT_USER_ID_KEY);
      localStorage.setItem(USERS_KEY, JSON.stringify([]));
      localStorage.setItem(MARKETPLACE_KEY, JSON.stringify([]));
      localStorage.setItem(MARKETPLACE_CHATS_KEY, JSON.stringify([]));
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([]));
      localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
      localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify([]));
      localStorage.setItem(LOTTERIES_KEY, JSON.stringify([]));
      localStorage.setItem(SAVINGS_VAULTS_KEY, JSON.stringify([]));
      localStorage.setItem(CRYPTOS_KEY, JSON.stringify(INITIAL_CRYPTOS));
      localStorage.setItem(MARKET_DAY_KEY, '1');
      localStorage.setItem('neisser_last_market_update_ts_v1', String(Date.now()));
    }
  } catch (e) {
    console.error('Fresh slate init error:', e);
  }
})();

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyStoreUpdate() {
  // Asynchronous dispatch ensures state updates never clash with React render cycles
  setTimeout(() => {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Store subscriber notification error:', err);
      }
    });
  }, 0);
}

// Helper: Pure reading from localStorage with fallback
function getStored<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

// Helper: Writing to localStorage and notifying listeners
function setStored<T>(key: string, val: T) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    notifyStoreUpdate();
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// ----------------------------------------------------
// SUPABASE AUTO INITIAL HYDRATION & REALTIME SYNC
// ----------------------------------------------------
let isInitialSyncDone = false;

export async function syncAllWithSupabase(): Promise<void> {
  try {
    const [
      remoteUsers,
      remoteItems,
      remoteChats,
      remoteTxs,
      remoteInvoices,
      remoteFreqs,
      remoteLots,
      remoteVaults,
    ] = await Promise.all([
      dbFetchUsers(),
      dbFetchMarketplaceItems(),
      dbFetchMarketplaceChats(),
      dbFetchTransactions(),
      dbFetchInvoices(),
      dbFetchFriendRequests(),
      dbFetchLotteries(),
      dbFetchSavingsVaults(),
    ]);

    if (remoteUsers !== null) {
      localStorage.setItem(USERS_KEY, JSON.stringify(remoteUsers));
    }
    if (remoteItems !== null) {
      localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(remoteItems));
    }
    if (remoteChats !== null) {
      localStorage.setItem(MARKETPLACE_CHATS_KEY, JSON.stringify(remoteChats));
    }
    if (remoteTxs !== null) {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(remoteTxs));
    }
    if (remoteInvoices !== null) {
      localStorage.setItem(INVOICES_KEY, JSON.stringify(remoteInvoices));
    }
    if (remoteFreqs !== null) {
      localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(remoteFreqs));
    }
    if (remoteLots !== null) {
      localStorage.setItem(LOTTERIES_KEY, JSON.stringify(remoteLots));
    }
    if (remoteVaults !== null) {
      localStorage.setItem(SAVINGS_VAULTS_KEY, JSON.stringify(remoteVaults));
    }

    notifyStoreUpdate();
  } catch (e) {
    console.warn('Initial Supabase sync skipped/fallback:', e);
  }
}

if (typeof window !== 'undefined' && !isInitialSyncDone) {
  isInitialSyncDone = true;
  // Background initial fetch
  syncAllWithSupabase();
  // Listen for realtime changes across devices
  setupSupabaseRealtimeSync(() => {
    syncAllWithSupabase();
  });
}


// Users
export function getUsers(): User[] {
  let users = getStored<User[] | null>(USERS_KEY, null);
  if (users === null) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    } catch {}
    return INITIAL_USERS;
  }

  // Developer fairness rule: developer must not cheat and starts with 75 NSD
  let hasMod = false;
  users = users.map((u) => {
    if (u.role === 'developer' && u.balanceNSD > 1000) {
      hasMod = true;
      return {
        ...u,
        balanceNSD: 75.0,
        level: 1,
        expressTransfersRemainingToday: 2,
        ownedCatCards: u.ownedCatCards?.length ? u.ownedCatCards : ['cat-4'],
        cryptoPortfolio: {},
      };
    }
    return u;
  });

  if (hasMod) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {}
  }

  return users;
}

export function saveUsers(users: User[]) {
  setStored(USERS_KEY, users);
}

export function getCurrentUser(): User | null {
  const currentId = localStorage.getItem(CURRENT_USER_ID_KEY);
  if (!currentId) {
    return null;
  }
  const users = getUsers();
  const found = users.find((u) => u.id === currentId);
  if (!found) {
    localStorage.removeItem(CURRENT_USER_ID_KEY);
    return null;
  }
  return found;
}

export function setCurrentUser(userId: string | null) {
  if (userId) {
    localStorage.setItem(CURRENT_USER_ID_KEY, userId);
  } else {
    localStorage.removeItem(CURRENT_USER_ID_KEY);
  }
  notifyStoreUpdate();
}

export function updateUser(updated: Partial<User> & { id: string }) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === updated.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updated };
    saveUsers(users);
    dbUpsertUser(users[idx]);
  }
}

export function deleteUser(userId: string) {
  const users = getUsers();
  const filtered = users.filter((u) => u.id !== userId);
  // Also clean up this user from anyone's friends list
  filtered.forEach((u) => {
    if (u.friends && u.friends.includes(userId)) {
      u.friends = u.friends.filter((fid) => fid !== userId);
    }
  });
  saveUsers(filtered);
  dbDeleteUser(userId);
}

// Transactions
export function getTransactions(): Transaction[] {
  const txs = getStored<Transaction[] | null>(TRANSACTIONS_KEY, null);
  if (txs === null) {
    return [];
  }
  return txs;
}

export function addTransaction(tx: Omit<Transaction, 'id' | 'date'> & { date?: string }) {
  const txs = getTransactions();
  const newTx: Transaction = {
    ...tx,
    id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    date: tx.date || new Date().toISOString().replace('T', ' ').slice(0, 16),
  };
  txs.unshift(newTx);
  setStored(TRANSACTIONS_KEY, txs);
  dbInsertTransaction(newTx);
  return newTx;
}


// ==========================================
// GLOBALLY SYNCHRONIZED CRYPTO MARKET ENGINE
// ==========================================
// Synchronized to a global 5-hour UTC epoch grid starting on Day 1.
// Every user across all browsers/devices sees the exact same prices, charts, and countdown.
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000; // 5 hours in ms
// Fixed UTC epoch anchor calibrated for Day 1 (August 2026 launch)
const GENESIS_ANCHOR_TIME = 1787220000000;

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getGlobalMarketCycle(): number {
  const now = Date.now();
  if (now <= GENESIS_ANCHOR_TIME) return 0;
  return Math.floor((now - GENESIS_ANCHOR_TIME) / FIVE_HOURS_MS);
}

export function getMarketDay(): number {
  return getGlobalMarketCycle() + 1;
}

export function getLastMarketUpdate(): number {
  const cycle = getGlobalMarketCycle();
  return GENESIS_ANCHOR_TIME + cycle * FIVE_HOURS_MS;
}

export function getNextMarketUpdateTime(): number {
  const cycle = getGlobalMarketCycle();
  return GENESIS_ANCHOR_TIME + (cycle + 1) * FIVE_HOURS_MS;
}

export function checkAndAutoUpdateMarket(): boolean {
  // Driven automatically by global UTC epoch clock
  return true;
}

function computeCryptoPriceAtCycle(coin: CryptoCurrency, targetCycle: number): { price: number; stage?: number } {
  if (coin.isSpecialMoon) {
    const moonStages = [5.20, 24.80, 112.50, 680.00, 3450.00, 16800.00, 42500.00, 67800.00, 12400.00, 4200.00, 450.00, 50.00];
    const stageIdx = targetCycle % moonStages.length;
    return {
      price: moonStages[stageIdx],
      stage: stageIdx + 1,
    };
  }

  // Deterministic simulation from initial price up to targetCycle
  let current = coin.initialPrice;
  const baseSeed = stringToSeed(coin.id || coin.symbol);

  // We simulate last max 50 cycles for speed and consistency
  const startCycle = Math.max(0, targetCycle - 50);
  for (let c = startCycle; c <= targetCycle; c++) {
    if (c === 0) {
      current = coin.initialPrice;
      continue;
    }
    const rng = mulberry32(baseSeed + c * 1009);
    const r = rng(); // 0 to 1
    // Fluctuation between -6.5% and +8.5%
    const pct = (r * 15.0 - 6.5) / 100;
    current = Math.max(0.50, Math.round(current * (1 + pct) * 100) / 100);
  }

  return { price: current };
}

// Cryptos (Synchronized globally)
export function getCryptos(): CryptoCurrency[] {
  const currentCycle = getGlobalMarketCycle();

  return INITIAL_CRYPTOS.map((coin) => {
    // Generate history for past 14 cycles
    const history: number[] = [];
    for (let c = Math.max(0, currentCycle - 13); c <= currentCycle; c++) {
      const res = computeCryptoPriceAtCycle(coin, c);
      history.push(res.price);
    }

    // Pad if history has fewer than 14 entries
    while (history.length < 14) {
      history.unshift(coin.initialPrice);
    }

    const currentPrice = history[history.length - 1];
    const prevPrice = history.length > 1 ? history[history.length - 2] : coin.initialPrice;
    const change24h = prevPrice > 0 ? Math.round(((currentPrice - prevPrice) / prevPrice) * 1000) / 10 : 0.0;

    const res = computeCryptoPriceAtCycle(coin, currentCycle);

    return {
      ...coin,
      currentPrice,
      change24h,
      history,
      stage: res.stage,
    };
  });
}

export function saveCryptos(cryptos: CryptoCurrency[]) {
  setStored(CRYPTOS_KEY, cryptos);
}

export function resetMarketToDay1() {
  notifyStoreUpdate();
}

export function simulateNextMarketDay() {
  // Manual trigger if needed
  notifyStoreUpdate();
}

// Marketplace
export function getMarketplaceItems(): MarketplaceItem[] {
  const items = getStored<MarketplaceItem[] | null>(MARKETPLACE_KEY, null);
  if (items === null) {
    return INITIAL_MARKETPLACE_ITEMS;
  }
  return items;
}

export function saveMarketplaceItems(items: MarketplaceItem[]) {
  setStored(MARKETPLACE_KEY, items);
}

export function addMarketplaceItem(item: Omit<MarketplaceItem, 'id' | 'createdAt' | 'soldCount'>) {
  const items = getMarketplaceItems();
  const newItem: MarketplaceItem = {
    ...item,
    id: 'mkt-' + Date.now(),
    createdAt: new Date().toISOString().slice(0, 10),
    soldCount: 0,
  };
  items.unshift(newItem);
  saveMarketplaceItems(items);
  dbUpsertMarketplaceItem(newItem);
  return newItem;
}

export function deleteMarketplaceItem(itemId: string) {
  const items = getMarketplaceItems();
  const filtered = items.filter((i) => i.id !== itemId);
  saveMarketplaceItems(filtered);
  dbDeleteMarketplaceItem(itemId);
}

// Marketplace Chats (Conversation with Seller before purchase)
export function getMarketplaceChats(): MarketplaceChat[] {
  const chats = getStored<MarketplaceChat[] | null>(MARKETPLACE_CHATS_KEY, null);
  if (chats === null) {
    return [];
  }
  return chats;
}

export function saveMarketplaceChats(chats: MarketplaceChat[]) {
  setStored(MARKETPLACE_CHATS_KEY, chats);
}

export function getOrCreateMarketplaceChat(item: MarketplaceItem, buyer: User): MarketplaceChat {
  const chats = getMarketplaceChats();
  const existing = chats.find((c) => c.itemId === item.id && c.buyerId === buyer.id);
  if (existing) {
    return existing;
  }

  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const newChat: MarketplaceChat = {
    id: 'mkt-chat-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    itemId: item.id,
    itemTitle: item.title,
    itemPriceNSD: item.priceNSD,
    sellerId: item.sellerId,
    sellerName: item.sellerName,
    buyerId: buyer.id,
    buyerName: `${buyer.name} ${buyer.surname}`,
    createdAt: nowStr,
    updatedAt: nowStr,
    isPurchased: false,
    messages: [
      {
        id: 'msg-init-1',
        senderId: 'system',
        senderName: 'System Neisser',
        text: `Rozpoczęto bezpieczny czat transakcyjny dotyczący oferty "${item.title}" (${item.priceNSD.toFixed(2)} NSD). Porozmawiaj ze sprzedawcą przed finalizacją zakupu.`,
        timestamp: nowStr,
        isSystem: true,
      },
    ],
  };

  chats.unshift(newChat);
  saveMarketplaceChats(chats);
  dbUpsertMarketplaceChat(newChat);
  return newChat;
}

export function sendMarketplaceMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  isSystem: boolean = false
): MarketplaceChat | null {
  const chats = getMarketplaceChats();
  const chatIdx = chats.findIndex((c) => c.id === chatId);
  if (chatIdx === -1) return null;

  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const newMsg: MarketplaceMessage = {
    id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    senderId,
    senderName,
    text,
    timestamp: nowStr,
    isSystem,
  };

  chats[chatIdx].messages.push(newMsg);
  chats[chatIdx].updatedAt = nowStr;

  saveMarketplaceChats(chats);
  dbUpsertMarketplaceChat(chats[chatIdx]);
  return chats[chatIdx];
}

export function deleteMarketplaceChat(chatId: string) {
  const chats = getMarketplaceChats();
  const filtered = chats.filter((c) => c.id !== chatId);
  saveMarketplaceChats(filtered);
}

// Invoices
export function getInvoices(): Invoice[] {
  const invoices = getStored<Invoice[] | null>(INVOICES_KEY, null);
  if (invoices === null) {
    return [];
  }
  return invoices;
}

export function saveInvoices(invoices: Invoice[]) {
  setStored(INVOICES_KEY, invoices);
}

export function addInvoice(invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'issueDate' | 'status'>) {
  const invoices = getInvoices();
  const num = String(invoices.length + 1).padStart(4, '0');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const newInv: Invoice = {
    ...invoice,
    id: 'inv-' + Date.now(),
    invoiceNumber: `FV/${year}/${month}/${num}`,
    issueDate: dateStr,
    status: 'unpaid',
  };
  invoices.unshift(newInv);
  saveInvoices(invoices);
  dbUpsertInvoice(newInv);
  return newInv;
}

export function updateInvoiceStatus(invoiceId: string, status: 'paid' | 'unpaid' | 'cancelled') {
  const invoices = getInvoices();
  const idx = invoices.findIndex((i) => i.id === invoiceId);
  if (idx !== -1) {
    invoices[idx].status = status;
    saveInvoices(invoices);
    dbUpsertInvoice(invoices[idx]);
  }
}

// Friend Requests
export function getFriendRequests(): FriendRequest[] {
  const reqs = getStored<FriendRequest[] | null>(FRIEND_REQUESTS_KEY, null);
  if (reqs === null) {
    return [];
  }
  return reqs;
}

export function saveFriendRequests(reqs: FriendRequest[]) {
  setStored(FRIEND_REQUESTS_KEY, reqs);
}

export function sendFriendRequest(fromUser: User, toUserId: string) {
  const reqs = getFriendRequests();
  const newReq: FriendRequest = {
    id: 'freq-' + Date.now(),
    fromUserId: fromUser.id,
    fromUserName: `${fromUser.name} ${fromUser.surname}`,
    fromUserAvatar: fromUser.avatarUrl,
    toUserId,
    status: 'pending',
    date: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };
  reqs.unshift(newReq);
  saveFriendRequests(reqs);
  dbUpsertFriendRequest(newReq);
}

export function respondFriendRequest(requestId: string, accept: boolean) {
  const reqs = getFriendRequests();
  const req = reqs.find((r) => r.id === requestId);
  if (!req) return;

  req.status = accept ? 'accepted' : 'rejected';
  saveFriendRequests(reqs);
  dbUpsertFriendRequest(req);

  if (accept) {
    const users = getUsers();
    const u1 = users.find((u) => u.id === req.fromUserId);
    const u2 = users.find((u) => u.id === req.toUserId);
    if (u1 && u2) {
      if (!u1.friends.includes(u2.id)) u1.friends.push(u2.id);
      if (!u2.friends.includes(u1.id)) u2.friends.push(u1.id);
      saveUsers(users);
      dbUpsertUser(u1);
      dbUpsertUser(u2);
    }
  }
}

// Lotteries
export function getLotteries(): Lottery[] {
  const lots = getStored<Lottery[] | null>(LOTTERIES_KEY, null);
  if (lots === null) {
    return [];
  }
  return lots;
}

export function saveLotteries(lots: Lottery[]) {
  setStored(LOTTERIES_KEY, lots);
  lots.forEach((lot) => dbUpsertLottery(lot));
}


export function buyLotteryTickets(lotteryId: string, user: User, count: number) {
  const lotteries = getLotteries();
  const lottery = lotteries.find((l) => l.id === lotteryId);
  if (!lottery || lottery.status !== 'active') return { success: false, msg: 'Loteria nieaktywna' };

  const totalCost = lottery.ticketPriceNSD * count;
  if (user.balanceNSD < totalCost) return { success: false, msg: 'Niewystarczające saldo NSD' };

  // Deduct balance
  updateUser({ id: user.id, balanceNSD: user.balanceNSD - totalCost });

  // Add transaction
  addTransaction({
    senderId: user.id,
    senderName: `${user.name} ${user.surname}`,
    receiverId: 'lottery-pool',
    receiverName: lottery.title,
    amount: totalCost,
    title: `Zakup ${count} losów na: ${lottery.title}`,
    category: 'lottery',
    type: 'instant',
    status: 'completed',
  });

  // Add tickets
  const existing = lottery.participants.find((p) => p.userId === user.id);
  if (existing) {
    existing.ticketsCount += count;
  } else {
    lottery.participants.push({
      userId: user.id,
      userName: `${user.name} ${user.surname}`,
      ticketsCount: count,
    });
  }
  lottery.prizePoolNSD += totalCost;
  saveLotteries(lotteries);

  return { success: true, msg: `Kupiono ${count} losów za ${totalCost} NSD!` };
}

export function drawLotteryWinner(lotteryId: string) {
  const lotteries = getLotteries();
  const lottery = lotteries.find((l) => l.id === lotteryId);
  if (!lottery || lottery.status !== 'active') return null;

  const ticketsPool: { userId: string; userName: string }[] = [];
  lottery.participants.forEach((p) => {
    for (let i = 0; i < p.ticketsCount; i++) {
      ticketsPool.push({ userId: p.userId, userName: p.userName });
    }
  });

  if (ticketsPool.length === 0) {
    lottery.status = 'cancelled';
    saveLotteries(lotteries);
    return null;
  }

  const winner = ticketsPool[Math.floor(Math.random() * ticketsPool.length)];
  lottery.status = 'drawn';
  lottery.winnerId = winner.userId;
  lottery.winnerName = winner.userName;
  saveLotteries(lotteries);

  // Credit winner
  const users = getUsers();
  const winnerUser = users.find((u) => u.id === winner.userId);
  if (winnerUser) {
    winnerUser.balanceNSD += lottery.prizePoolNSD;
    saveUsers(users);

    addTransaction({
      senderId: 'lottery-system',
      senderName: 'Loteria Neisser',
      receiverId: winner.userId,
      receiverName: winner.userName,
      amount: lottery.prizePoolNSD,
      title: `Główna wygrana w loterii: ${lottery.title}! 🏆`,
      category: 'lottery',
      type: 'instant',
      status: 'completed',
    });
  }

  return winner;
}

// Cat Card Gacha Pack (cost: 20 NSD)
export function buyCatCardPack(user: User): { success: boolean; card?: CatCard; msg: string } {
  const COST = 20;
  if (user.balanceNSD < COST) {
    return { success: false, msg: 'Potrzebujesz 20 NSD, aby kupić paczkę kart z kotem!' };
  }

  // Pick a random cat card out of 50
  const randomCard = CAT_CARDS_DATABASE[Math.floor(Math.random() * CAT_CARDS_DATABASE.length)];

  // Deduct 20 NSD
  const updatedCards = [...(user.ownedCatCards || [])];
  if (!updatedCards.includes(randomCard.id)) {
    updatedCards.push(randomCard.id);
  }

  updateUser({
    id: user.id,
    balanceNSD: user.balanceNSD - COST,
    ownedCatCards: updatedCards,
  });

  addTransaction({
    senderId: user.id,
    senderName: `${user.name} ${user.surname}`,
    receiverId: 'cat-cards-vault',
    receiverName: 'Skarbiec Kart Kotów Neisser',
    amount: COST,
    title: `Zakup karty kota #${randomCard.number}: ${randomCard.name}`,
    category: 'cat_card',
    type: 'instant',
    status: 'completed',
  });

  return { success: true, card: randomCard, msg: `Wylosowano kota: ${randomCard.name} (${randomCard.rarity})!` };
}

// ==========================================
// SAVINGS VAULTS (SKARBONKA Z BLOKADĄ CZASOWĄ)
// ==========================================
export function getSavingsVaults(userId?: string): SavingsVault[] {
  const allVaults = getStored<SavingsVault[]>(SAVINGS_VAULTS_KEY, []);
  if (userId) {
    return allVaults.filter((v) => v.userId === userId);
  }
  return allVaults;
}

export function saveSavingsVaults(vaults: SavingsVault[]) {
  setStored(SAVINGS_VAULTS_KEY, vaults);
  vaults.forEach((v) => dbUpsertSavingsVault(v));
}

export function createSavingsVault(params: {
  userId: string;
  name: string;
  amountNSD: number;
  lockDays: number;
  interestRatePercent: number;
  iconEmoji: string;
  notes?: string;
}): { success: boolean; vault?: SavingsVault; error?: string } {
  const users = getUsers();
  const user = users.find((u) => u.id === params.userId);
  if (!user) return { success: false, error: 'Nie znaleziono użytkownika.' };

  if (params.amountNSD <= 0) {
    return { success: false, error: 'Wprowadź poprawną kwotę wkładu do skarbonki.' };
  }

  if (user.balanceNSD < params.amountNSD) {
    return { success: false, error: 'Niewystarczające saldo NSD w portfelu głównym.' };
  }

  const now = Date.now();
  const lockDurationMs = params.lockDays * 24 * 60 * 60 * 1000;
  const lockedUntil = now + lockDurationMs;

  const newVault: SavingsVault = {
    id: `vault-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: params.userId,
    name: params.name.trim() || `Skarbonka ${params.lockDays} dni`,
    amountNSD: params.amountNSD,
    lockedUntil,
    lockDays: params.lockDays,
    createdAt: now,
    interestRatePercent: params.interestRatePercent,
    status: 'locked',
    iconEmoji: params.iconEmoji || '🐷',
    notes: params.notes?.trim() || undefined,
  };

  // Deduct from user
  user.balanceNSD -= params.amountNSD;
  saveUsers(users);
  dbUpsertUser(user);

  // Save vault
  const allVaults = getStored<SavingsVault[]>(SAVINGS_VAULTS_KEY, []);
  allVaults.unshift(newVault);
  setStored(SAVINGS_VAULTS_KEY, allVaults);
  dbUpsertSavingsVault(newVault);

  // Add transaction log
  addTransaction({
    senderId: user.id,
    senderName: `${user.name} ${user.surname}`,
    receiverId: newVault.id,
    receiverName: `Skarbonka z blokadą: ${newVault.name} (${newVault.lockDays}d)`,
    amount: params.amountNSD,
    title: `Zdeponowano środki w Skarbonce Terminowej (${params.lockDays} dni)`,
    category: 'transfer',
    type: 'instant',
    status: 'completed',
  });

  return { success: true, vault: newVault };
}

export function withdrawFromSavingsVault(vaultId: string, user: User): {
  success: boolean;
  totalWithdrawn?: number;
  bonusEarned?: number;
  error?: string;
} {
  const allVaults = getStored<SavingsVault[]>(SAVINGS_VAULTS_KEY, []);
  const vaultIndex = allVaults.findIndex((v) => v.id === vaultId && v.userId === user.id);

  if (vaultIndex === -1) {
    return { success: false, error: 'Nie odnaleziono skarbonki.' };
  }

  const vault = allVaults[vaultIndex];

  if (vault.status === 'withdrawn') {
    return { success: false, error: 'Środki z tej skarbonki zostały już wcześniej wypłacone.' };
  }

  const now = Date.now();
  if (now < vault.lockedUntil) {
    const remainingHours = Math.ceil((vault.lockedUntil - now) / (1000 * 60 * 60));
    return {
      success: false,
      error: `Skarbonka jest zablokowana! Pozostało jeszcze około ${remainingHours} godz. do odblokowania.`,
    };
  }

  // Calculate profit bonus
  const bonus = (vault.amountNSD * vault.interestRatePercent) / 100;
  const totalPayout = vault.amountNSD + bonus;

  // Update user
  const users = getUsers();
  const u = users.find((item) => item.id === user.id);
  if (u) {
    u.balanceNSD += totalPayout;
    saveUsers(users);
    dbUpsertUser(u);
  }

  // Mark vault as withdrawn
  vault.status = 'withdrawn';
  allVaults[vaultIndex] = vault;
  setStored(SAVINGS_VAULTS_KEY, allVaults);
  dbUpsertSavingsVault(vault);

  // Add transaction
  addTransaction({
    senderId: vault.id,
    senderName: `Skarbonka Terminowa (${vault.name})`,
    receiverId: user.id,
    receiverName: `${user.name} ${user.surname}`,
    amount: totalPayout,
    title: `Wypłata z odblokowanej Skarbonki (+${bonus.toFixed(2)} NSD premii za oszczędzanie!)`,
    category: 'transfer',
    type: 'instant',
    status: 'completed',
  });

  return { success: true, totalWithdrawn: totalPayout, bonusEarned: bonus };
}

export function depositMoreToSavingsVault(
  vaultId: string,
  extraAmount: number,
  user: User
): { success: boolean; error?: string } {
  if (extraAmount <= 0) return { success: false, error: 'Wprowadź poprawną kwotę.' };
  if (user.balanceNSD < extraAmount) {
    return { success: false, error: 'Niewystarczające saldo NSD na koncie.' };
  }

  const allVaults = getStored<SavingsVault[]>(SAVINGS_VAULTS_KEY, []);
  const vault = allVaults.find((v) => v.id === vaultId && v.userId === user.id);
  if (!vault || vault.status === 'withdrawn') {
    return { success: false, error: 'Skarbonka nie istnieje lub została zamknięta.' };
  }

  // Deduct from user
  const users = getUsers();
  const u = users.find((item) => item.id === user.id);
  if (u) {
    u.balanceNSD -= extraAmount;
    saveUsers(users);
    dbUpsertUser(u);
  }

  // Update vault
  vault.amountNSD += extraAmount;
  setStored(SAVINGS_VAULTS_KEY, allVaults);
  dbUpsertSavingsVault(vault);

  addTransaction({
    senderId: user.id,
    senderName: `${user.name} ${user.surname}`,
    receiverId: vault.id,
    receiverName: `Skarbonka (${vault.name})`,
    amount: extraAmount,
    title: `Dopłata do zablokowanej Skarbonki: ${vault.name}`,
    category: 'transfer',
    type: 'instant',
    status: 'completed',
  });

  return { success: true };
}
