export type UserRole = 'user' | 'premium' | 'developer';

export interface User {
  id: string; // Unique card number format: "4820 XXXX XXXX XXXX"
  name: string;
  surname: string;
  city: string;
  email: string;
  pin: string; // 6-digit PIN
  password?: string;
  role: UserRole;
  balanceNSD: number;
  level: number; // 1 to 5
  avatarUrl: string;
  bio: string;
  createdAt: string;
  expressTransfersRemainingToday: number;
  lastTransferDate?: string;
  friends: string[]; // List of user IDs
  ownedCatCards: string[]; // List of CatCard IDs
  cryptoPortfolio: { [cryptoSymbol: string]: number }; // Symbol -> amount owned
}

export interface Transaction {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  title: string;
  category: 'transfer' | 'gift' | 'crypto' | 'marketplace' | 'cat_card' | 'lottery' | 'level_upgrade' | 'invoice' | 'premium';
  type: 'instant' | 'standard'; // standard = 1 day pending, instant = immediate
  status: 'completed' | 'pending';
  date: string;
  giftMessage?: string;
  invoiceId?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  date: string;
}

export interface CryptoCurrency {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number; // in NSD
  initialPrice: number;
  change24h: number; // percentage
  history: number[]; // Last 14 price points
  marketCap: number;
  volume24h: number;
  description: string;
  isSpecialMoon?: boolean; // The one that skyrockets like Bitcoin and later drops
  stage?: number; // Lifecycle stage for the special moon crypto
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  title: string;
  description: string;
  priceNSD: number;
  category: string;
  subCategory: string;
  type: 'service' | 'physical' | 'digital' | 'other';
  imagePlaceholder: string;
  createdAt: string;
  soldCount: number;
  isSpecialPremiumPass?: boolean;
}

export interface MarketplaceMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface MarketplaceChat {
  id: string;
  itemId: string;
  itemTitle: string;
  itemPriceNSD: number;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  messages: MarketplaceMessage[];
  createdAt: string;
  updatedAt: string;
  isPurchased?: boolean;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPriceNSD: number;
  totalNSD: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. FV/2026/08/001
  issuerId: string;
  issuerName: string;
  issuerCity: string;
  issuerTaxId?: string;
  recipientId: string;
  recipientName: string;
  recipientCity: string;
  recipientTaxId?: string;
  items: InvoiceItem[];
  totalAmountNSD: number;
  issueDate: string;
  dueDate: string;
  status: 'unpaid' | 'paid' | 'cancelled';
  notes?: string;
}

export interface CatCard {
  id: string;
  number: number; // 1 to 50
  name: string;
  title: string;
  rarity: 'Zwykły' | 'Rzadki' | 'Epicki' | 'Legendarny' | 'Mityczny';
  purrPower: number; // 1 - 100
  agility: number; // 1 - 100
  wealth: number; // 1 - 100
  cunning: number; // 1 - 100
  description: string;
  visualEmoji: string;
  cardColor: string;
}

export interface Lottery {
  id: string;
  title: string;
  organizerName: string;
  prizePoolNSD: number;
  ticketPriceNSD: number;
  participants: { userId: string; userName: string; ticketsCount: number }[];
  status: 'active' | 'drawn' | 'cancelled';
  winnerName?: string;
  winnerId?: string;
  endDate: string;
}

export interface LevelConfig {
  level: number;
  name: string;
  costNSD: number;
  badge: string;
  perks: string[];
}

export interface SavingsVault {
  id: string;
  userId: string;
  name: string;
  amountNSD: number;
  lockedUntil: number; // timestamp ms
  lockDays: number;
  createdAt: number; // timestamp ms
  interestRatePercent: number; // Bonus yield e.g. 8% for 7 days
  status: 'locked' | 'unlocked' | 'withdrawn';
  iconEmoji: string;
  notes?: string;
}
