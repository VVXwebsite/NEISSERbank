import { supabase } from './supabase';
import {
  User,
  MarketplaceItem,
  MarketplaceChat,
  Transaction,
  Invoice,
  FriendRequest,
  Lottery,
  SavingsVault,
} from '../types';

export type SyncStatus = 'connected' | 'connecting' | 'fallback' | 'error';

let syncStatus: SyncStatus = 'connecting';
const syncListeners: Set<(status: SyncStatus) => void> = new Set();

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function subscribeToSyncStatus(listener: (status: SyncStatus) => void): () => void {
  syncListeners.add(listener);
  listener(syncStatus);
  return () => syncListeners.delete(listener);
}

function setSyncStatus(status: SyncStatus) {
  syncStatus = status;
  syncListeners.forEach((fn) => {
    try {
      fn(status);
    } catch {}
  });
}

// ----------------------------------------------------
// TRANSFORMERS
// ----------------------------------------------------
function mapUserFromDb(row: any): User {
  return {
    id: row.id,
    name: row.name,
    surname: row.surname,
    city: row.city,
    email: row.email,
    pin: row.pin,
    password: row.password || undefined,
    role: row.role || 'user',
    balanceNSD: Number(row.balance_nsd || 0),
    level: Number(row.level || 1),
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    createdAt: row.created_at,
    expressTransfersRemainingToday: Number(row.express_transfers_remaining_today ?? 2),
    lastTransferDate: row.last_transfer_date || undefined,
    friends: Array.isArray(row.friends) ? row.friends : [],
    ownedCatCards: Array.isArray(row.owned_cat_cards) ? row.owned_cat_cards : ['cat-4'],
    cryptoPortfolio: typeof row.crypto_portfolio === 'object' && row.crypto_portfolio !== null ? row.crypto_portfolio : {},
  };
}

function mapUserToDb(user: User): any {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    city: user.city,
    email: user.email,
    pin: user.pin,
    password: user.password || null,
    role: user.role,
    balance_nsd: user.balanceNSD,
    level: user.level,
    avatar_url: user.avatarUrl,
    bio: user.bio,
    created_at: user.createdAt,
    express_transfers_remaining_today: user.expressTransfersRemainingToday,
    last_transfer_date: user.lastTransferDate || null,
    friends: user.friends,
    owned_cat_cards: user.ownedCatCards,
    crypto_portfolio: user.cryptoPortfolio,
  };
}

function mapMarketplaceItemFromDb(row: any): MarketplaceItem {
  return {
    id: row.id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    sellerRating: Number(row.seller_rating || 5.0),
    title: row.title,
    description: row.description || '',
    priceNSD: Number(row.price_nsd || 0),
    category: row.category,
    subCategory: row.sub_category || '',
    type: row.type || 'service',
    imagePlaceholder: row.image_placeholder || '🛍️',
    createdAt: row.created_at,
    soldCount: Number(row.sold_count || 0),
    isSpecialPremiumPass: Boolean(row.is_special_premium_pass),
  };
}

function mapMarketplaceItemToDb(item: MarketplaceItem): any {
  return {
    id: item.id,
    seller_id: item.sellerId,
    seller_name: item.sellerName,
    seller_rating: item.sellerRating,
    title: item.title,
    description: item.description,
    price_nsd: item.priceNSD,
    category: item.category,
    sub_category: item.subCategory || '',
    type: item.type,
    image_placeholder: item.imagePlaceholder,
    created_at: item.createdAt,
    sold_count: item.soldCount,
    is_special_premium_pass: Boolean(item.isSpecialPremiumPass),
  };
}

function mapChatFromDb(row: any): MarketplaceChat {
  return {
    id: row.id,
    itemId: row.item_id,
    itemTitle: row.item_title,
    itemPriceNSD: Number(row.item_price_nsd || 0),
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    messages: Array.isArray(row.messages) ? row.messages : [],
    isPurchased: Boolean(row.is_purchased),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChatToDb(chat: MarketplaceChat): any {
  return {
    id: chat.id,
    item_id: chat.itemId,
    item_title: chat.itemTitle,
    item_price_nsd: chat.itemPriceNSD,
    seller_id: chat.sellerId,
    seller_name: chat.sellerName,
    buyer_id: chat.buyerId,
    buyer_name: chat.buyerName,
    messages: chat.messages,
    is_purchased: Boolean(chat.isPurchased),
    created_at: chat.createdAt,
    updated_at: chat.updatedAt,
  };
}

function mapTxFromDb(row: any): Transaction {
  return {
    id: row.id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    receiverId: row.receiver_id,
    receiverName: row.receiver_name,
    amount: Number(row.amount || 0),
    title: row.title,
    category: row.category,
    type: row.type || 'instant',
    status: row.status || 'completed',
    date: row.date,
    giftMessage: row.gift_message || undefined,
    invoiceId: row.invoice_id || undefined,
  };
}

function mapTxToDb(tx: Transaction): any {
  return {
    id: tx.id,
    sender_id: tx.senderId,
    sender_name: tx.senderName,
    receiver_id: tx.receiverId,
    receiver_name: tx.receiverName,
    amount: tx.amount,
    title: tx.title,
    category: tx.category,
    type: tx.type,
    status: tx.status,
    date: tx.date,
    gift_message: tx.giftMessage || null,
    invoice_id: tx.invoiceId || null,
  };
}

function mapInvoiceFromDb(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    issuerId: row.issuer_id,
    issuerName: row.issuer_name,
    issuerCity: row.issuer_city,
    issuerTaxId: row.issuer_tax_id || undefined,
    recipientId: row.recipient_id,
    recipientName: row.recipient_name,
    recipientCity: row.recipient_city,
    recipientTaxId: row.recipient_tax_id || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    totalAmountNSD: Number(row.total_amount_nsd || 0),
    issueDate: row.issue_date,
    dueDate: row.due_date,
    status: row.status || 'unpaid',
    notes: row.notes || undefined,
  };
}

function mapInvoiceToDb(inv: Invoice): any {
  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    issuer_id: inv.issuerId,
    issuer_name: inv.issuerName,
    issuer_city: inv.issuerCity,
    issuer_tax_id: inv.issuerTaxId || null,
    recipient_id: inv.recipientId,
    recipient_name: inv.recipientName,
    recipient_city: inv.recipientCity,
    recipient_tax_id: inv.recipientTaxId || null,
    items: inv.items,
    total_amount_nsd: inv.totalAmountNSD,
    issue_date: inv.issueDate,
    due_date: inv.dueDate,
    status: inv.status,
    notes: inv.notes || null,
  };
}

function mapFriendReqFromDb(row: any): FriendRequest {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    fromUserName: row.from_user_name,
    fromUserAvatar: row.from_user_avatar || '',
    toUserId: row.to_user_id,
    status: row.status || 'pending',
    date: row.date,
  };
}

function mapFriendReqToDb(fr: FriendRequest): any {
  return {
    id: fr.id,
    from_user_id: fr.fromUserId,
    from_user_name: fr.fromUserName,
    from_user_avatar: fr.fromUserAvatar,
    to_user_id: fr.toUserId,
    status: fr.status,
    date: fr.date,
  };
}

function mapLotteryFromDb(row: any): Lottery {
  return {
    id: row.id,
    title: row.title,
    organizerName: row.organizer_name,
    prizePoolNSD: Number(row.prize_pool_nsd || 0),
    ticketPriceNSD: Number(row.ticket_price_nsd || 0),
    participants: Array.isArray(row.participants) ? row.participants : [],
    status: row.status || 'active',
    winnerName: row.winner_name || undefined,
    winnerId: row.winner_id || undefined,
    endDate: row.end_date,
  };
}

function mapLotteryToDb(lottery: Lottery): any {
  return {
    id: lottery.id,
    title: lottery.title,
    organizer_name: lottery.organizerName,
    prize_pool_nsd: lottery.prizePoolNSD,
    ticket_price_nsd: lottery.ticketPriceNSD,
    participants: lottery.participants,
    status: lottery.status,
    winner_name: lottery.winnerName || null,
    winner_id: lottery.winnerId || null,
    end_date: lottery.endDate,
  };
}

function mapSavingsVaultFromDb(row: any): SavingsVault {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amountNSD: Number(row.amount_nsd || 0),
    lockedUntil: Number(row.locked_until || 0),
    lockDays: Number(row.lock_days || 7),
    createdAt: Number(row.created_at || Date.now()),
    interestRatePercent: Number(row.interest_rate_percent || 0),
    status: row.status || 'locked',
    iconEmoji: row.icon_emoji || '🐷',
    notes: row.notes || undefined,
  };
}

function mapSavingsVaultToDb(v: SavingsVault): any {
  return {
    id: v.id,
    user_id: v.userId,
    name: v.name,
    amount_nsd: v.amountNSD,
    locked_until: v.lockedUntil,
    lock_days: v.lockDays,
    created_at: v.createdAt,
    interest_rate_percent: v.interestRatePercent,
    status: v.status,
    icon_emoji: v.iconEmoji,
    notes: v.notes || null,
  };
}

// ----------------------------------------------------
// SUPABASE CRUD OPERATIONS
// ----------------------------------------------------

export async function dbFetchUsers(): Promise<User[] | null> {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.warn('Supabase fetch users warning:', error.message);
      setSyncStatus('fallback');
      return null;
    }
    setSyncStatus('connected');
    return (data || []).map(mapUserFromDb);
  } catch (e) {
    console.warn('Supabase fetch users network error:', e);
    setSyncStatus('fallback');
    return null;
  }
}

export async function dbUpsertUser(user: User): Promise<void> {
  try {
    const dbPayload = mapUserToDb(user);
    const { error } = await supabase.from('users').upsert(dbPayload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase upsert user error:', error.message);
    } else {
      setSyncStatus('connected');
    }
  } catch (e) {
    console.warn('Supabase upsert user exception:', e);
  }
}

export async function dbDeleteUser(userId: string): Promise<void> {
  try {
    await supabase.from('users').delete().eq('id', userId);
  } catch (e) {
    console.warn('Supabase delete user exception:', e);
  }
}

// Marketplace Items
export async function dbFetchMarketplaceItems(): Promise<MarketplaceItem[] | null> {
  try {
    const { data, error } = await supabase.from('marketplace_items').select('*').order('created_at', { ascending: false });
    if (error) return null;
    setSyncStatus('connected');
    return (data || []).map(mapMarketplaceItemFromDb);
  } catch {
    return null;
  }
}

export async function dbUpsertMarketplaceItem(item: MarketplaceItem): Promise<void> {
  try {
    const dbPayload = mapMarketplaceItemToDb(item);
    await supabase.from('marketplace_items').upsert(dbPayload, { onConflict: 'id' });
    setSyncStatus('connected');
  } catch (e) {
    console.warn('Supabase upsert item error:', e);
  }
}

export async function dbDeleteMarketplaceItem(itemId: string): Promise<void> {
  try {
    await supabase.from('marketplace_items').delete().eq('id', itemId);
  } catch {}
}

// Marketplace Chats
export async function dbFetchMarketplaceChats(): Promise<MarketplaceChat[] | null> {
  try {
    const { data, error } = await supabase.from('marketplace_chats').select('*').order('updated_at', { ascending: false });
    if (error) return null;
    setSyncStatus('connected');
    return (data || []).map(mapChatFromDb);
  } catch {
    return null;
  }
}

export async function dbUpsertMarketplaceChat(chat: MarketplaceChat): Promise<void> {
  try {
    const dbPayload = mapChatToDb(chat);
    await supabase.from('marketplace_chats').upsert(dbPayload, { onConflict: 'id' });
    setSyncStatus('connected');
  } catch (e) {
    console.warn('Supabase upsert chat error:', e);
  }
}

// Transactions
export async function dbFetchTransactions(): Promise<Transaction[] | null> {
  try {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) return null;
    setSyncStatus('connected');
    return (data || []).map(mapTxFromDb);
  } catch {
    return null;
  }
}

export async function dbInsertTransaction(tx: Transaction): Promise<void> {
  try {
    const dbPayload = mapTxToDb(tx);
    await supabase.from('transactions').upsert(dbPayload, { onConflict: 'id' });
    setSyncStatus('connected');
  } catch (e) {
    console.warn('Supabase insert tx error:', e);
  }
}

// Invoices
export async function dbFetchInvoices(): Promise<Invoice[] | null> {
  try {
    const { data, error } = await supabase.from('invoices').select('*').order('issue_date', { ascending: false });
    if (error) return null;
    setSyncStatus('connected');
    return (data || []).map(mapInvoiceFromDb);
  } catch {
    return null;
  }
}

export async function dbUpsertInvoice(invoice: Invoice): Promise<void> {
  try {
    const dbPayload = mapInvoiceToDb(invoice);
    await supabase.from('invoices').upsert(dbPayload, { onConflict: 'id' });
    setSyncStatus('connected');
  } catch (e) {
    console.warn('Supabase upsert invoice error:', e);
  }
}

// Friend Requests
export async function dbFetchFriendRequests(): Promise<FriendRequest[] | null> {
  try {
    const { data, error } = await supabase.from('friend_requests').select('*');
    if (error) return null;
    setSyncStatus('connected');
    return (data || []).map(mapFriendReqFromDb);
  } catch {
    return null;
  }
}

export async function dbUpsertFriendRequest(req: FriendRequest): Promise<void> {
  try {
    const dbPayload = mapFriendReqToDb(req);
    await supabase.from('friend_requests').upsert(dbPayload, { onConflict: 'id' });
    setSyncStatus('connected');
  } catch (e) {
    console.warn('Supabase upsert friend request error:', e);
  }
}

// Lotteries
export async function dbFetchLotteries(): Promise<Lottery[] | null> {
  try {
    const { data, error } = await supabase.from('lotteries').select('*');
    if (error) return null;
    setSyncStatus('connected');
    return (data || []).map(mapLotteryFromDb);
  } catch {
    return null;
  }
}

export async function dbUpsertLottery(lottery: Lottery): Promise<void> {
  try {
    const dbPayload = mapLotteryToDb(lottery);
    await supabase.from('lotteries').upsert(dbPayload, { onConflict: 'id' });
    setSyncStatus('connected');
  } catch (e) {
    console.warn('Supabase upsert lottery error:', e);
  }
}

// Savings Vaults (Skarbonka z blokadą)
export async function dbFetchSavingsVaults(): Promise<SavingsVault[] | null> {
  try {
    const { data, error } = await supabase.from('savings_vaults').select('*');
    if (error) return null;
    setSyncStatus('connected');
    return (data || []).map(mapSavingsVaultFromDb);
  } catch {
    return null;
  }
}

export async function dbUpsertSavingsVault(vault: SavingsVault): Promise<void> {
  try {
    const dbPayload = mapSavingsVaultToDb(vault);
    await supabase.from('savings_vaults').upsert(dbPayload, { onConflict: 'id' });
    setSyncStatus('connected');
  } catch (e) {
    console.warn('Supabase upsert vault error:', e);
  }
}

export async function dbDeleteSavingsVault(vaultId: string): Promise<void> {
  try {
    await supabase.from('savings_vaults').delete().eq('id', vaultId);
  } catch {}
}

// ----------------------------------------------------
// REALTIME MULTI-DEVICE SYNC ENGINE
// ----------------------------------------------------
let isRealtimeInitialized = false;

export function setupSupabaseRealtimeSync(onRemoteChange: () => void): () => void {
  if (isRealtimeInitialized) return () => {};
  isRealtimeInitialized = true;

  try {
    const channel = supabase
      .channel('neisser-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => onRemoteChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_items' },
        () => onRemoteChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketplace_chats' },
        () => onRemoteChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => onRemoteChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => onRemoteChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests' },
        () => onRemoteChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lotteries' },
        () => onRemoteChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'savings_vaults' },
        () => onRemoteChange()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      isRealtimeInitialized = false;
    };
  } catch (e) {
    console.warn('Supabase realtime subscription failed:', e);
    return () => {};
  }
}
