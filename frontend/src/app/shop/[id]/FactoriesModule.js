'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import {
  Factory,
  Plus,
  X,
  Phone,
  MapPin,
  ChevronRight,
  Package,
  Receipt,
  History,
  Calculator,
  Wallet,
  Trash2,
  ArrowLeft,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Calendar,
  Hash,
  Layers,
  DollarSign,
  Edit3,
  Save,
  RotateCcw,
  Printer,
  Banknote,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';

const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;

// ─── Factory List Card ────────────────────────────────────────────────────────
const FactoryCard = ({ factory, onSelect, onDelete }) => {
  const balance = factory.balance_due || 0;
  const hasBalance = balance > 0;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="glass rounded-3xl p-6 cursor-pointer group relative overflow-hidden"
      onClick={() => onSelect(factory)}
    >
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Factory size={80} className="bronze-text" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Factory size={28} className="bronze-text" />
          </div>
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${hasBalance ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {hasBalance ? `Baaki: ${fmt(balance)}` : 'Clear'}
          </span>
        </div>

        <h4 className="text-xl font-black tracking-tight uppercase italic mb-3">{factory.name}</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            <Phone size={12} className="bronze-text" /> {factory.mobile}
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
            <MapPin size={12} className="bronze-text" /> {factory.address || 'No Address'}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border/30 grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Rolls</p>
            <p className="text-base font-black bronze-text">{(factory.rolls || []).length}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Paid</p>
            <p className="text-base font-black text-emerald-400">{fmt(factory.total_paid)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Total</p>
            <p className="text-base font-black text-zinc-300">{fmt(factory.total_goods_value)}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(factory.id); }}
            className="p-2.5 rounded-xl bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
            title="Delete Factory"
          >
            <Trash2 size={16} />
          </button>
          <button className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-zinc-500 hover:text-primary transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Factory Detail View ──────────────────────────────────────────────────────
const FactoryDetails = ({ factory, onBack, onRefresh, onDelete }) => {
  const [activeTab, setActiveTab] = useState('maal');
  const [sidePanel, setSidePanel] = useState('payment'); // 'maal' | 'payment'
  const { id: shopId } = useParams();

  // Add Roll form
  const today = new Date().toISOString().split('T')[0];
  const [rollForm, setRollForm] = useState({
    roll_id: '', category: 'carpet', product_type: '', design: '', color: '',
    length: '', width: '', quantity: 1, unit_price: '', received_date: today,
  });
  const [rollLoading, setRollLoading] = useState(false);
  const [rollError, setRollError] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [payDate, setPayDate] = useState(today);
  const [payLoading, setPayLoading] = useState(false);

  // Filter state
  const firstDay = `${today.substring(0, 7)}-01`;
  const [filterStartDate, setFilterStartDate] = useState(firstDay);
  const [filterEndDate, setFilterEndDate] = useState(today);

  // Auto-compute total_price
  const computedTotal = useMemo(() => {
    const up = parseFloat(rollForm.unit_price) || 0;
    const len = parseFloat(rollForm.length) || 0;
    const wid = parseFloat(rollForm.width) || 0;
    const qty = parseInt(rollForm.quantity) || 1;
    const isBulk = ['mate', 'qaleen'].includes(rollForm.category);
    return isBulk ? up * qty : up * len * wid;
  }, [rollForm.unit_price, rollForm.length, rollForm.width, rollForm.quantity, rollForm.category]);

  // Date-wise grouped rolls
  const filteredRolls = useMemo(() => {
    let rolls = factory.rolls || [];
    if (filterStartDate) rolls = rolls.filter(r => (r.received_date || r.created_at) >= filterStartDate);
    if (filterEndDate) rolls = rolls.filter(r => (r.received_date || r.created_at) <= filterEndDate);
    return rolls;
  }, [factory.rolls, filterStartDate, filterEndDate]);

  const dateGroupedRolls = useMemo(() => {
    const groups = {};
    filteredRolls.forEach(r => {
      const d = r.received_date || r.created_at?.split('T')[0] || 'Unknown';
      if (!groups[d]) groups[d] = [];
      groups[d].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredRolls]);

  const filteredPayments = useMemo(() => {
    let pays = factory.payments || [];
    if (filterStartDate) pays = pays.filter(p => p.date >= filterStartDate);
    if (filterEndDate) pays = pays.filter(p => p.date <= filterEndDate);
    return pays;
  }, [factory.payments, filterStartDate, filterEndDate]);

  const totalGoods = factory.total_goods_value || 0;
  const totalPaid = factory.total_paid || 0;
  const balanceDue = factory.balance_due || 0;

  const handleAddRoll = async (e) => {
    e.preventDefault();
    setRollError('');
    if (!rollForm.product_type) { setRollError('Type zaroor darj karein'); return; }
    setRollLoading(true);
    try {
      const isBulk = ['mate', 'qaleen'].includes(rollForm.category);
      const rollId = rollForm.roll_id || `${rollForm.category.toUpperCase()}-${Date.now()}`;
      const body = {
        roll_id: rollId,
        category: rollForm.category,
        product_type: rollForm.product_type,
        design: rollForm.design || '',
        color: rollForm.color || '',
        length: isBulk ? 0 : parseFloat(rollForm.length) || 0,
        width: isBulk ? 0 : parseFloat(rollForm.width) || 0,
        quantity: isBulk ? parseInt(rollForm.quantity) || 1 : 1,
        factory: factory.id,
        unit_price: parseFloat(rollForm.unit_price) || 0,
        total_price: computedTotal,
        received_date: rollForm.received_date || today,
        status: 'In Stock',
      };
      const resp = await fetch(`${API_BASE}/rolls/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        onRefresh();
        setRollForm({ roll_id: '', category: 'carpet', product_type: '', design: '', color: '', length: '', width: '', quantity: 1, unit_price: '', received_date: today });
      } else {
        const err = await resp.json();
        setRollError(Object.values(err).flat().join(', '));
      }
    } catch (err) {
      setRollError('Server se connection fail. Backend chal raha hai?');
    }
    setRollLoading(false);
  };

  const handlePostPayment = async (e) => {
    e.preventDefault();
    if (!payAmount) return;
    setPayLoading(true);
    try {
      const selectedDate = new Date(payDate);
      const resp = await fetch(`${API_BASE}/factory-payments/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factory: factory.id,
          amount: `PKR ${payAmount}`,
          remarks: payRemarks || 'No remarks',
          date: payDate,
          month: selectedDate.toLocaleString('default', { month: 'long' }),
        }),
      });
      if (resp.ok) { onRefresh(); setPayAmount(''); setPayRemarks(''); setPayDate(today); }
    } catch (err) { console.error(err); }
    setPayLoading(false);
  };

  const deletePayment = async (payId) => {
    if (!window.confirm('Yeh payment delete karna chahte hain?')) return;
    await fetch(`${API_BASE}/factory-payments/${payId}/?shop=${shopId}`, { method: 'DELETE' });
    onRefresh();
  };

  const deleteRoll = async (rollId) => {
    if (!window.confirm('Yeh roll delete karna chahte hain?')) return;
    await fetch(`${API_BASE}/rolls/${rollId}/?shop=${shopId}`, { method: 'DELETE' });
    onRefresh();
  };

  const isBulkCategory = ['mate', 'qaleen'].includes(rollForm.category);

  const generateStockPDF = () => {
    const doc = new jsPDF();
    const shopName = shopId === 'usman' ? 'Usman Carpet & Qaleen Center' : 'Hanif Carpet Premium Outlet';
    
    // Header
    doc.setFillColor(184, 134, 11);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName.toUpperCase(), 14, 25);
    doc.setFontSize(10);
    doc.text('FACTORY STOCK / GOODS RECEIVED REPORT', 14, 32);

    // Factory Info
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Factory: ${factory.name}`, 14, 55);
    const dateRange = (filterStartDate || filterEndDate) ? `Period: ${filterStartDate || '...'} to ${filterEndDate || '...'}` : 'Period: All Time';
    doc.text(dateRange, 14, 62);
    const filteredTotal = filteredRolls.reduce((s, r) => s + (r.total_price || 0), 0);
    doc.text(`Filtered Goods Value: PKR ${filteredTotal.toLocaleString()}`, 14, 69);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 160, 55);

    // Maal Received Table
    doc.setFont('helvetica', 'bold');
    doc.text(`GOODS RECEIVED HISTORY (${(filterStartDate || filterEndDate) ? 'FILTERED' : 'ALL TIME'})`, 14, 85);
    const maalRows = filteredRolls.map((r, i) => [
      i + 1,
      r.received_date || '-',
      r.roll_id,
      `${r.category} - ${r.product_type}`,
      r.length > 0 ? `${r.length}x${r.width} ft` : `${r.quantity} pcs`,
      `PKR ${Number(r.unit_price).toLocaleString()}`,
      `PKR ${Number(r.total_price).toLocaleString()}`
    ]);
    autoTable(doc, {
      startY: 78,
      head: [['#', 'Date', 'ID', 'Category/Type', 'Dims/Qty', 'Rate', 'Total']],
      body: maalRows,
      theme: 'striped',
      headStyles: { fillColor: [184, 134, 11] },
      styles: { fontSize: 8 },
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by HM Carpet Management System', 105, 290, { align: 'center' });

    doc.save(`Stock_Report_${factory.name.replace(/\s+/g, '_')}.pdf`);
  };

  const generatePaymentPDF = () => {
    const doc = new jsPDF();
    const shopName = shopId === 'usman' ? 'Usman Carpet & Qaleen Center' : 'Hanif Carpet Premium Outlet';
    
    // Header
    doc.setFillColor(46, 125, 50); // Green for payments
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName.toUpperCase(), 14, 25);
    doc.setFontSize(10);
    doc.text('FACTORY PAYMENT HISTORY STATEMENT', 14, 32);

    // Factory Info
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Factory: ${factory.name}`, 14, 55);
    const dateRange = (filterStartDate || filterEndDate) ? `Period: ${filterStartDate || '...'} to ${filterEndDate || '...'}` : 'Period: All Time';
    doc.text(dateRange, 14, 62);
    const filteredPaid = filteredPayments.reduce((s, p) => {
      const amt = parseFloat(String(p.amount).replace(/[^0-9.]/g, '')) || 0;
      return s + amt;
    }, 0);
    doc.text(`Filtered Paid Total: PKR ${filteredPaid.toLocaleString()}`, 14, 69);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 160, 55);

    // Payment History Table
    doc.setFont('helvetica', 'bold');
    doc.text(`PAYMENT HISTORY TIMELINE (${(filterStartDate || filterEndDate) ? 'FILTERED' : 'ALL TIME'})`, 14, 85);
    const payRows = filteredPayments.map((p, i) => [
      i + 1,
      p.date,
      p.remarks,
      p.amount
    ]);
    autoTable(doc, {
      startY: 83,
      head: [['#', 'Date', 'Remarks', 'Amount Paid']],
      body: payRows,
      theme: 'grid',
      headStyles: { fillColor: [46, 125, 50] },
      styles: { fontSize: 9 },
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by HM Carpet Management System', 105, 290, { align: 'center' });

    doc.save(`Payment_History_${factory.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-primary/20 transition-colors group">
            <ArrowLeft size={22} className="bronze-text group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <h3 className="text-3xl font-black tracking-tighter uppercase italic">{factory.name}</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-0.5">
              {factory.mobile} {factory.address ? `• ${factory.address}` : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button 
            onClick={generateStockPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary shadow-lg shadow-primary/20 text-black hover:scale-105 active:scale-95 transition-all font-black text-[9px] uppercase tracking-widest"
            title="Download Inventory History"
          >
            <Package size={16} />
            Stock PDF
          </button>

          <button 
            onClick={generatePaymentPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20 text-white hover:scale-105 active:scale-95 transition-all font-black text-[9px] uppercase tracking-widest"
            title="Download Payment Account"
          >
            <Banknote size={16} />
            Payments PDF
          </button>

          <button 
            onClick={() => onDelete(factory.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all font-black text-[9px] uppercase tracking-widest"
          >
            <Trash2 size={16} />
          </button>
          
          {/* Tab switcher */}
        <div className="flex gap-2 glass p-1 rounded-2xl">
          <button onClick={() => setActiveTab('maal')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'maal' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
            Maal Received
          </button>
          <button onClick={() => setActiveTab('payments')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payments' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
            Payment History
          </button>
          </div>
        </div>
      </header>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Maal', value: fmt(totalGoods), icon: Package, color: 'text-zinc-300', bg: 'bg-white/5' },
          { label: 'Total Paid', value: fmt(totalPaid), icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
          { label: 'Baaki Amount', value: fmt(balanceDue), icon: AlertCircle, color: balanceDue > 0 ? 'text-red-400' : 'text-emerald-400', bg: balanceDue > 0 ? 'bg-red-500/5' : 'bg-emerald-500/5' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`glass rounded-2xl p-5 ${bg} border border-border/30`}>
            <div className="flex items-center gap-3 mb-3">
              <Icon size={18} className={color} />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
            </div>
            <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Date Filters */}
      <div className="glass p-6 rounded-[2rem] border border-border/30 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar size={18} className="bronze-text" />
          </div>
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">History Filter</h5>
            <p className="text-xs font-black bronze-text">Specific dates ka record check karein</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
            className="bg-white/5 border border-border/30 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-white" />
          <span className="text-[10px] font-black text-zinc-600 uppercase">To</span>
          <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
            className="bg-white/5 border border-border/30 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-primary transition-all text-white" />
          <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} 
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (2/3) */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeTab === 'maal' ? (
              <motion.div key="maal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                className="glass rounded-[2.5rem] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Package size={22} className="bronze-text" />
                  <h4 className="text-xl font-black uppercase tracking-tight italic">
                    Maal <span className="bronze-text">Received</span>
                  </h4>
                  <span className="ml-auto px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                    {(filteredRolls || []).length} Rolls
                  </span>
                </div>

                <div className="space-y-6 max-h-[580px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20">
                  {dateGroupedRolls.length > 0 ? (
                    dateGroupedRolls.map(([date, rolls]) => {
                      const dateTotal = rolls.reduce((s, r) => s + (r.total_price || 0), 0);
                      return (
                        <div key={date}>
                          {/* Date Header */}
                          <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-3">
                              <Calendar size={14} className="text-primary/60" />
                              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{date}</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-border/30 font-bold text-zinc-600">
                                {rolls.length} {rolls.length === 1 ? 'roll' : 'rolls'}
                              </span>
                            </div>
                            <span className="text-xs font-black bronze-text">{fmt(dateTotal)}</span>
                          </div>

                          {/* Rolls for this date */}
                          <div className="space-y-2">
                            {rolls.map((roll) => (
                              <div key={roll.id}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-border/30 group hover:border-primary/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                                  <Layers size={16} className="text-primary/40 group-hover:text-primary transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-sm uppercase tracking-tight">{roll.roll_id}</span>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 font-bold">{roll.category}</span>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${roll.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                                      {roll.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 truncate">
                                    {[roll.product_type, roll.design, roll.color].filter(Boolean).join(' • ')}
                                    {roll.length > 0 ? ` • ${roll.length}×${roll.width} ft` : ''}
                                    {roll.quantity > 1 ? ` • ${roll.quantity} pcs` : ''}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {roll.unit_price > 0 && (
                                    <p className="text-[9px] text-zinc-600 font-bold">
                                      {fmt(roll.unit_price)}/{roll.length > 0 ? 'ft' : 'pc'}
                                    </p>
                                  )}
                                  <p className="font-black text-sm bronze-text">{fmt(roll.total_price)}</p>
                                </div>
                                <button onClick={() => deleteRoll(roll.id)}
                                  className="p-2 rounded-xl bg-red-500/0 text-red-500/0 group-hover:bg-red-500/10 group-hover:text-red-500/60 hover:!text-red-500 transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 rounded-3xl border border-dashed border-border/50">
                      <Package size={48} className="mx-auto text-zinc-700 mb-4 opacity-20" />
                      <p className="text-zinc-500 font-bold italic">Is factory se abhi tak koi maal register nahi hua.</p>
                      <p className="text-zinc-600 text-xs mt-1">Sidebar se "Maal Add Karein" ka form use karein.</p>
                    </div>
                  )}
                </div>

                {/* Grand Total Row */}
                {(factory.rolls || []).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Total Maal Ka Hisaab</span>
                    <span className="text-xl font-black bronze-text">{fmt(totalGoods)}</span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="payments" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-[2.5rem] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <History size={22} className="bronze-text" />
                  <h4 className="text-xl font-black uppercase tracking-tight italic">
                    Payment <span className="bronze-text">History</span>
                  </h4>
                  <span className="ml-auto px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                  {filteredPayments.length} Payments
                  </span>
                </div>

                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20">
                  {filteredPayments.length > 0 ? (
                    [...filteredPayments].reverse().map((pay, i) => (
                      <motion.div key={pay.id || i}
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-border/30 group hover:border-emerald-500/20 transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <Receipt size={20} className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-sm uppercase tracking-tight italic">{pay.remarks}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                            {pay.date} • {pay.month}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-xl font-black text-emerald-400 tracking-tighter">{pay.amount}</p>
                          <button onClick={() => deletePayment(pay.id)}
                            className="p-2 rounded-xl text-red-500/0 group-hover:bg-red-500/10 group-hover:text-red-500/50 hover:!text-red-500 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-20 rounded-3xl border border-dashed border-border/50">
                      <Receipt size={48} className="mx-auto text-zinc-700 mb-4 opacity-20" />
                      <p className="text-zinc-500 font-bold italic">Abhi tak koi payment record nahi ki gayi.</p>
                    </div>
                  )}
                </div>

                {/* Total Paid */}
                {(factory.payments || []).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border/30 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Total Paid</span>
                    <span className="text-xl font-black text-emerald-400">{fmt(totalPaid)}</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Panel Switcher */}
          <div className="flex gap-2 glass p-1 rounded-2xl">
            <button onClick={() => setSidePanel('maal')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sidePanel === 'maal' ? 'bg-primary text-primary-foreground' : 'text-zinc-500 hover:text-white'}`}>
              Maal Add
            </button>
            <button onClick={() => setSidePanel('payment')}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sidePanel === 'payment' ? 'bg-primary text-primary-foreground' : 'text-zinc-500 hover:text-white'}`}>
              Payment
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Add Roll Panel */}
            {sidePanel === 'maal' && (
              <motion.div key="add-maal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="glass p-6 rounded-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none">
                  <Package size={70} className="bronze-text" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Plus size={20} className="bronze-text" />
                    </div>
                    <h4 className="text-base font-black uppercase tracking-tight italic">
                      Maal <span className="bronze-text">Add Karein</span>
                    </h4>
                  </div>

                  <form onSubmit={handleAddRoll} className="space-y-3">
                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Category</label>
                      <select value={rollForm.category}
                        onChange={e => setRollForm({ ...rollForm, category: e.target.value })}
                        className="w-full bg-zinc-900 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none text-sm font-bold transition-all text-white">
                        <option value="carpet" className="bg-zinc-900 text-white">Carpet</option>
                        <option value="qaleen" className="bg-zinc-900 text-white">Qaleen</option>
                        <option value="sheet" className="bg-zinc-900 text-white">Sheet</option>
                        <option value="prayers" className="bg-zinc-900 text-white">Prayer Mat</option>
                        <option value="mate" className="bg-zinc-900 text-white">Mate</option>
                        <option value="cut-pieces" className="bg-zinc-900 text-white">Cut Pieces</option>
                      </select>
                    </div>

                    {/* Roll ID */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Roll ID (Optional)</label>
                      <input type="text" value={rollForm.roll_id}
                        onChange={e => setRollForm({ ...rollForm, roll_id: e.target.value })}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none text-sm font-bold transition-all"
                        placeholder="Auto-generate hoga agar khali raha" />
                    </div>

                    {/* Type */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Type *</label>
                      <input type="text" required value={rollForm.product_type}
                        onChange={e => setRollForm({ ...rollForm, product_type: e.target.value })}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none text-sm font-bold transition-all"
                        placeholder="e.g. Premium, Economy..." />
                    </div>

                    {/* Design & Color in row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Design</label>
                        <input type="text" value={rollForm.design}
                          onChange={e => setRollForm({ ...rollForm, design: e.target.value })}
                          className="w-full bg-white/5 border border-border rounded-xl px-3 py-3 focus:border-primary outline-none text-sm font-bold transition-all"
                          placeholder="Design..." />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Color</label>
                        <input type="text" value={rollForm.color}
                          onChange={e => setRollForm({ ...rollForm, color: e.target.value })}
                          className="w-full bg-white/5 border border-border rounded-xl px-3 py-3 focus:border-primary outline-none text-sm font-bold transition-all"
                          placeholder="Color..." />
                      </div>
                    </div>

                    {/* Length/Width or Quantity */}
                    {isBulkCategory ? (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Quantity (Pieces)</label>
                        <input type="number" min="1" value={rollForm.quantity}
                          onChange={e => setRollForm({ ...rollForm, quantity: e.target.value })}
                          className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none text-sm font-bold transition-all"
                          placeholder="Kitne pieces..." />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Length (ft)</label>
                          <input type="number" step="0.1" value={rollForm.length}
                            onChange={e => setRollForm({ ...rollForm, length: e.target.value })}
                            className="w-full bg-white/5 border border-border rounded-xl px-3 py-3 focus:border-primary outline-none text-sm font-bold transition-all"
                            placeholder="ft" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Width (ft)</label>
                          <input type="number" step="0.1" value={rollForm.width}
                            onChange={e => setRollForm({ ...rollForm, width: e.target.value })}
                            className="w-full bg-white/5 border border-border rounded-xl px-3 py-3 focus:border-primary outline-none text-sm font-bold transition-all"
                            placeholder="ft" />
                        </div>
                      </div>
                    )}

                    {/* Unit Price */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                        Rate (PKR per {isBulkCategory ? 'piece' : 'ft'})
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-500">PKR</span>
                        <input type="number" step="1" value={rollForm.unit_price}
                          onChange={e => setRollForm({ ...rollForm, unit_price: e.target.value })}
                          className="w-full bg-white/5 border border-border rounded-xl pl-14 pr-4 py-3 focus:border-primary outline-none text-sm font-black transition-all"
                          placeholder="0" />
                      </div>
                    </div>

                    {/* Auto Total */}
                    {computedTotal > 0 && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex justify-between items-center">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total Amount</span>
                        <span className="font-black bronze-text text-sm">{fmt(computedTotal)}</span>
                      </div>
                    )}

                    {/* Date */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Received Date</label>
                      <input type="date" value={rollForm.received_date}
                        onChange={e => setRollForm({ ...rollForm, received_date: e.target.value })}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none text-sm font-bold transition-all" />
                    </div>

                    {rollError && (
                      <p className="text-red-400 text-xs font-bold">{rollError}</p>
                    )}

                    <button type="submit" disabled={rollLoading}
                      className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                      {rollLoading ? 'Save Ho Raha Hai...' : 'Maal Register Karein'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Payment Panel */}
            {sidePanel === 'payment' && (
              <motion.div key="add-payment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="glass p-6 rounded-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none">
                  <Calculator size={70} className="bronze-text" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calculator size={20} className="bronze-text" />
                    </div>
                    <h4 className="text-base font-black uppercase tracking-tight italic">
                      Payment <span className="bronze-text">Record Karein</span>
                    </h4>
                  </div>

                  {/* Balance reminder */}
                  {balanceDue > 0 && (
                    <div className="mb-4 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Baaki Amount</p>
                      <p className="text-lg font-black text-red-400 mt-0.5">{fmt(balanceDue)}</p>
                    </div>
                  )}

                  <form onSubmit={handlePostPayment} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Amount (PKR)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-500">PKR</span>
                        <input type="number" value={payAmount}
                          onChange={e => setPayAmount(e.target.value)}
                          className="w-full bg-white/5 border border-border rounded-xl pl-14 pr-4 py-4 focus:border-primary outline-none text-lg font-black transition-all"
                          placeholder="0" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Remarks</label>
                      <textarea value={payRemarks}
                        onChange={e => setPayRemarks(e.target.value)}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none text-sm font-medium h-20 resize-none transition-all"
                        placeholder="e.g. January ka hisaab..." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Payment Date</label>
                      <input type="date" value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                        className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none text-sm font-bold transition-all" />
                    </div>
                    <button type="submit" disabled={!payAmount || payLoading}
                      className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale">
                      {payLoading ? 'Save Ho Raha Hai...' : 'Payment Post Karein'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Account Summary */}
          <div className="glass p-5 rounded-2xl bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-3 mb-4">
              <Wallet size={18} className="text-emerald-500" />
              <h5 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Khata Summary</h5>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Rolls', val: `${(factory.rolls || []).length} rolls` },
                { label: 'Total Maal', val: fmt(totalGoods) },
                { label: 'Total Paid', val: fmt(totalPaid) },
                { label: 'Baaki', val: fmt(balanceDue), highlight: balanceDue > 0 },
              ].map(({ label, val, highlight }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-emerald-500/10 last:border-0">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">{label}</span>
                  <span className={`font-black text-sm ${highlight ? 'text-red-400' : 'text-emerald-400'}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Module ──────────────────────────────────────────────────────────────
export default function FactoriesModule() {
  const { id: shopId } = useParams();
  const [view, setView] = useState('list');
  const [factories, setFactories] = useState([]);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [newFactory, setNewFactory] = useState({ name: '', mobile: '', address: '' });
  const [loading, setLoading] = useState(false);

  const fetchFactories = async () => {
    try {
      const resp = await fetch(`${API_BASE}/factories/?shop=${shopId}`);
      if (resp.ok) {
        const data = await resp.json();
        setFactories(data);
        if (selectedFactory) {
          const updated = data.find(f => f.id === selectedFactory.id);
          if (updated) setSelectedFactory(updated);
        }
      }
    } catch (err) { console.error('Fetch factories failed', err); }
  };

  useEffect(() => { fetchFactories(); }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/factories/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFactory),
      });
      if (resp.ok) {
        await fetchFactories();
        setView('list');
        setNewFactory({ name: '', mobile: '', address: '' });
      }
    } catch (err) { console.error('Register failed', err); }
    setLoading(false);
  };

  const handleDeleteFactory = async (id) => {
    if (!window.confirm("Khabardar! Factory delete karne se iska sara record (maal aur payments) khatam ho jayega. Kya aap waqai delete karna chahte hain?")) return;
    try {
      const resp = await fetch(`${API_BASE}/factories/${id}/?shop=${shopId}`, { method: 'DELETE' });
      if (resp.ok) {
        await fetchFactories();
        setView('list');
        setSelectedFactory(null);
      }
    } catch (err) { console.error('Delete factory failed', err); }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {/* ── LIST ── */}
        {view === 'list' && (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-3xl font-black tracking-tighter uppercase italic">
                  Factory <span className="bronze-text underline decoration-primary/30 underline-offset-8">Partners</span>
                </h3>
                <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2 ml-1">
                  Factories ka maal aur payment record karein
                </p>
              </div>
              <button onClick={() => setView('add')}
                className="bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Plus size={18} strokeWidth={3} /> New Factory
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {factories.map(f => (
                <FactoryCard 
                  key={f.id} 
                  factory={f} 
                  onSelect={(fact) => { setSelectedFactory(fact); setView('details'); }} 
                  onDelete={handleDeleteFactory}
                />
              ))}
              {factories.length === 0 && (
                <div className="col-span-full py-24 text-center glass rounded-[3rem] border-dashed border-2 border-border/50">
                  <Factory size={64} className="mx-auto text-zinc-800 mb-6 opacity-20" />
                  <h4 className="text-xl font-black uppercase text-zinc-600 italic">Koi Factory Register Nahi</h4>
                  <p className="text-zinc-500 text-sm font-medium mt-2">Pehle ek factory register karein phir maal track karein.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── ADD FACTORY ── */}
        {view === 'add' && (
          <motion.div key="add" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-lg mx-auto py-10">
            <div className="glass p-10 rounded-[3rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <Factory size={140} className="bronze-text" />
              </div>
              <button onClick={() => setView('list')} className="absolute top-8 right-8 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors z-20">
                <X size={20} />
              </button>
              <div className="relative z-10">
                <h3 className="text-2xl font-black tracking-tight mb-1 uppercase italic">
                  Register <span className="bronze-text">Factory</span>
                </h3>
                <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-8">Supplier ki poori information darj karein</p>
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Factory Ka Naam *</label>
                    <input type="text" required className="w-full bg-white/5 border border-border rounded-2xl px-5 py-4 focus:border-primary outline-none font-black text-base transition-all"
                      placeholder="e.g. Faisalabad Textile Hub"
                      value={newFactory.name} onChange={e => setNewFactory({ ...newFactory, name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Mobile Number *</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/40" />
                      <input type="tel" required className="w-full bg-white/5 border border-border rounded-2xl pl-14 pr-5 py-4 focus:border-primary outline-none font-bold transition-all"
                        placeholder="03xx-xxxxxxx"
                        value={newFactory.mobile} onChange={e => setNewFactory({ ...newFactory, mobile: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Address</label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-5 top-5 text-primary/40" />
                      <textarea className="w-full bg-white/5 border border-border rounded-2xl pl-14 pr-5 py-4 focus:border-primary outline-none font-medium h-28 resize-none transition-all"
                        placeholder="Factory ka pata..."
                        value={newFactory.address} onChange={e => setNewFactory({ ...newFactory, address: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black uppercase tracking-[0.15em] shadow-2xl shadow-primary/20 mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {loading ? 'Register Ho Raha Hai...' : 'Factory Register Karein'}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── DETAILS ── */}
        {view === 'details' && selectedFactory && (
          <FactoryDetails
            key={`details-${selectedFactory.id}`}
            factory={selectedFactory}
            onBack={() => setView('list')}
            onRefresh={fetchFactories}
            onDelete={handleDeleteFactory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
