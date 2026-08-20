-- =========================================================
-- NEISSER 2026 - SUPABASE DATABASE SCHEMA INITIALIZATION
-- Run this script in your Supabase SQL Editor (supabase.com)
-- =========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  city TEXT NOT NULL,
  email TEXT NOT NULL,
  pin TEXT NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  balance_nsd NUMERIC NOT NULL DEFAULT 75.00,
  level INTEGER NOT NULL DEFAULT 1,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  express_transfers_remaining_today INTEGER NOT NULL DEFAULT 2,
  last_transfer_date TEXT,
  friends JSONB DEFAULT '[]'::jsonb,
  owned_cat_cards JSONB DEFAULT '[]'::jsonb,
  crypto_portfolio JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. MARKETPLACE ITEMS
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  seller_rating NUMERIC DEFAULT 5.0,
  title TEXT NOT NULL,
  description TEXT,
  price_nsd NUMERIC NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT DEFAULT '',
  type TEXT NOT NULL,
  image_placeholder TEXT DEFAULT '🛍️',
  created_at TEXT NOT NULL,
  sold_count INTEGER NOT NULL DEFAULT 0,
  is_special_premium_pass BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. MARKETPLACE CHATS
CREATE TABLE IF NOT EXISTS public.marketplace_chats (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_title TEXT NOT NULL,
  item_price_nsd NUMERIC NOT NULL,
  seller_id TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  is_purchased BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 4. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  date TEXT NOT NULL,
  gift_message TEXT,
  invoice_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  issuer_id TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  issuer_city TEXT NOT NULL,
  issuer_tax_id TEXT,
  recipient_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_city TEXT NOT NULL,
  recipient_tax_id TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount_nsd NUMERIC NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. FRIEND REQUESTS
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  from_user_name TEXT NOT NULL,
  from_user_avatar TEXT DEFAULT '',
  to_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. LOTTERIES
CREATE TABLE IF NOT EXISTS public.lotteries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  prize_pool_nsd NUMERIC NOT NULL,
  ticket_price_nsd NUMERIC NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  winner_name TEXT,
  winner_id TEXT,
  end_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ENABLE ROW LEVEL SECURITY (RLS) BUT ALLOW PUBLIC ANON ACCESS FOR DEMO/APPLET
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotteries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write marketplace_items" ON public.marketplace_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write marketplace_chats" ON public.marketplace_chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write friend_requests" ON public.friend_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write lotteries" ON public.lotteries FOR ALL USING (true) WITH CHECK (true);

-- ENABLE SUPABASE REALTIME REPLICATION FOR LIVE MULTI-USER EXPERIENCE
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lotteries;
