import React, { useState } from 'react';
import { Invoice, InvoiceItem, User } from '../types';
import { addInvoice, addTransaction, getUsers, updateInvoiceStatus, updateUser } from '../data/storage';
import { FormatNSD, CurrencySymbol } from './CurrencySymbol';
import { BalloonLogo } from './BalloonLogo';
import { FileText, Plus, Trash2, CheckCircle2, Download, Printer, X, ShieldCheck } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onRefresh: () => void;
  initialTab?: 'create' | 'view';
}

export function InvoiceModal({ isOpen, onClose, currentUser, onRefresh, initialTab = 'view' }: InvoiceModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'view'>(initialTab);
  const allUsers = getUsers();

  // Create form state
  const [recipientId, setRecipientId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { name: 'Usługa programistyczna / doradztwo', quantity: 1, unitPriceNSD: 50, totalNSD: 50 },
  ]);
  const [notes, setNotes] = useState('Płatność w walucie NSD Neisser. Termin płatności 7 dni.');
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: '', quantity: 1, unitPriceNSD: 10, totalNSD: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };
    item.totalNSD = item.quantity * item.unitPriceNSD;
    updated[index] = item;
    setItems(updated);
  };

  const totalInvoiceAmount = items.reduce((acc, it) => acc + (it.totalNSD || 0), 0);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = allUsers.find((u) => u.id === recipientId) || allUsers[1];

    const inv = addInvoice({
      issuerId: currentUser.id,
      issuerName: `${currentUser.name} ${currentUser.surname}`,
      issuerCity: currentUser.city,
      issuerTaxId: `PL-${currentUser.id.replace(/\s/g, '').slice(0, 10)}`,
      recipientId: recipient.id,
      recipientName: `${recipient.name} ${recipient.surname}`,
      recipientCity: recipient.city,
      recipientTaxId: `PL-${recipient.id.replace(/\s/g, '').slice(0, 10)}`,
      items: items.filter((it) => it.name.trim()),
      totalAmountNSD: totalInvoiceAmount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      notes,
    });

    setCreatedInvoice(inv);
    setActiveTab('view');
    setSuccessMsg(`Faktura ${inv.invoiceNumber} została pomyślnie wystawiona!`);
    onRefresh();
  };

  const handlePayInvoice = (inv: Invoice) => {
    if (currentUser.balanceNSD < inv.totalAmountNSD) {
      alert('Niewystarczające saldo NSD na opłacenie faktury.');
      return;
    }

    // Deduct from buyer, credit issuer
    updateUser({ id: currentUser.id, balanceNSD: currentUser.balanceNSD - inv.totalAmountNSD });
    const issuer = allUsers.find((u) => u.id === inv.issuerId);
    if (issuer) {
      updateUser({ id: issuer.id, balanceNSD: issuer.balanceNSD + inv.totalAmountNSD });
    }

    updateInvoiceStatus(inv.id, 'paid');
    addTransaction({
      senderId: currentUser.id,
      senderName: `${currentUser.name} ${currentUser.surname}`,
      receiverId: inv.issuerId,
      receiverName: inv.issuerName,
      amount: inv.totalAmountNSD,
      title: `Opłacenie faktury ${inv.invoiceNumber}`,
      category: 'invoice',
      type: 'instant',
      status: 'completed',
      invoiceId: inv.id,
    });

    setCreatedInvoice({ ...inv, status: 'paid' });
    onRefresh();
  };

  return (
    <div
      id="invoice-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold">Oficjalny Moduł Faktur Neisser</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl border border-neutral-800 bg-black p-1 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === 'create' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Wystaw Nową Fakturę
          </button>
          {createdInvoice && (
            <button
              type="button"
              onClick={() => setActiveTab('view')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                activeTab === 'view' ? 'bg-white text-black shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Podgląd Faktury ({createdInvoice.invoiceNumber})
            </button>
          )}
        </div>

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-neutral-900 bg-black p-3 space-y-2">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider block">
                  Sprzedawca (Wystawca)
                </span>
                <div className="text-neutral-300">
                  <div className="font-bold text-white">
                    {currentUser.name} {currentUser.surname}
                  </div>
                  <div>Miasto: {currentUser.city}</div>
                  <div className="font-mono text-[10px] text-neutral-500">ID: {currentUser.id}</div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-900 bg-black p-3 space-y-2">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider block">
                  Nabywca (Klient)
                </span>
                <select
                  id="invoice-recipient-select"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white focus:border-white focus:outline-none"
                  required
                >
                  <option value="">-- Wybierz klienta ze społeczności --</option>
                  {allUsers
                    .filter((u) => u.id !== currentUser.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.surname} ({u.city}) • {u.id}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-neutral-900 bg-black p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                  Pozycje na fakturze
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-[11px] font-bold text-white hover:underline"
                >
                  <Plus className="h-3 w-3" /> Dodaj pozycję
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <input
                      type="text"
                      placeholder="Nazwa towaru / usługi..."
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:border-white focus:outline-none"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Ilość"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)
                      }
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs font-mono text-white text-center focus:border-white focus:outline-none"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      placeholder="Cena NSD"
                      value={item.unitPriceNSD}
                      onChange={(e) =>
                        handleItemChange(idx, 'unitPriceNSD', parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs font-mono text-white text-right focus:border-white focus:outline-none"
                      required
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1 text-neutral-500 hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-neutral-900 flex justify-between items-center text-sm font-bold">
                <span>Razem do zapłaty:</span>
                <span className="font-mono text-white">
                  <FormatNSD amount={totalInvoiceAmount} />
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Uwagi / Warunki</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-xs text-white focus:border-white focus:outline-none"
              />
            </div>

            <button
              id="submit-create-invoice-button"
              type="submit"
              className="w-full rounded-xl bg-white py-3 text-sm font-bold text-black hover:bg-neutral-200"
            >
              Generuj Fakturę VAT Neisser
            </button>
          </form>
        )}

        {/* VIEW TAB: High-contrast printable document layout */}
        {activeTab === 'view' && createdInvoice && (
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-800 bg-white p-6 text-black shadow-inner font-sans">
              {/* Document Title Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BalloonLogo size="sm" />
                    <span className="text-xl font-black tracking-tight">FAKTURA VAT</span>
                  </div>
                  <div className="text-xs font-mono font-bold mt-1 text-neutral-700">
                    NR: {createdInvoice.invoiceNumber}
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div>Data wystawienia: <strong>{createdInvoice.issueDate}</strong></div>
                  <div>Termin płatności: <strong>{createdInvoice.dueDate}</strong></div>
                  <div className="mt-1">
                    Status:{' '}
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        createdInvoice.status === 'paid'
                          ? 'bg-black text-white'
                          : 'bg-neutral-200 text-black border border-black'
                      }`}
                    >
                      {createdInvoice.status === 'paid' ? 'OPŁACONO' : 'OCZEKUJE NA PŁATNOŚĆ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                <div className="border border-neutral-300 rounded p-2.5">
                  <div className="font-bold text-[10px] uppercase text-neutral-500 mb-1">Sprzedawca:</div>
                  <div className="font-bold text-sm">{createdInvoice.issuerName}</div>
                  <div>{createdInvoice.issuerCity}</div>
                  <div className="font-mono text-[10px] text-neutral-600">ID: {createdInvoice.issuerId}</div>
                  <div className="font-mono text-[10px] text-neutral-600">NIP: {createdInvoice.issuerTaxId}</div>
                </div>

                <div className="border border-neutral-300 rounded p-2.5">
                  <div className="font-bold text-[10px] uppercase text-neutral-500 mb-1">Nabywca:</div>
                  <div className="font-bold text-sm">{createdInvoice.recipientName}</div>
                  <div>{createdInvoice.recipientCity}</div>
                  <div className="font-mono text-[10px] text-neutral-600">ID: {createdInvoice.recipientId}</div>
                  <div className="font-mono text-[10px] text-neutral-600">NIP: {createdInvoice.recipientTaxId}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs mb-6">
                <thead>
                  <tr className="border-b border-black text-[10px] font-bold uppercase">
                    <th className="py-1.5">Lp.</th>
                    <th className="py-1.5">Nazwa towaru / usługi</th>
                    <th className="py-1.5 text-center">Ilość</th>
                    <th className="py-1.5 text-right">Cena jedn.</th>
                    <th className="py-1.5 text-right">Wartość</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {createdInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 text-neutral-500">{idx + 1}</td>
                      <td className="py-2 font-medium">{it.name}</td>
                      <td className="py-2 text-center font-mono">{it.quantity}</td>
                      <td className="py-2 text-right font-mono">{it.unitPriceNSD.toFixed(2)} NSD</td>
                      <td className="py-2 text-right font-mono font-bold">{it.totalNSD.toFixed(2)} NSD</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Box */}
              <div className="flex justify-end border-t-2 border-black pt-3">
                <div className="text-right">
                  <div className="text-xs text-neutral-600">Suma należności (Waluta NSD):</div>
                  <div className="text-2xl font-black font-mono mt-0.5">
                    {createdInvoice.totalAmountNSD.toFixed(2)} NSD
                  </div>
                </div>
              </div>

              {createdInvoice.notes && (
                <div className="mt-4 pt-3 border-t border-neutral-200 text-[10px] text-neutral-600">
                  <strong>Uwagi:</strong> {createdInvoice.notes}
                </div>
              )}
            </div>

            {/* Actions for current viewer */}
            <div className="flex flex-wrap gap-2 justify-end">
              {createdInvoice.status === 'unpaid' && createdInvoice.recipientId === currentUser.id && (
                <button
                  type="button"
                  onClick={() => handlePayInvoice(createdInvoice)}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-emerald-400"
                >
                  Opłać Fakturę Teraz ({createdInvoice.totalAmountNSD} NSD)
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                <Printer className="h-4 w-4" />
                <span>Drukuj / Pobierz PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
