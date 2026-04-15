'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { 
  Phone, 
  Calendar, 
  History as HistoryIcon,
  Printer,
  Plus,
  Check,
  Banknote,
  Search,
  Package,
  Layers,
  RotateCcw
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';

export default function HistoryModule() {
  const { id: shopId } = useParams();
  const [salesHistory, setSalesHistory] = useState([]);
  const [expensesHistory, setExpensesHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('All'); // 'All', 'Cash', 'Credit'
  const [searchQuery, setSearchQuery] = useState('');
  const today = new Date().toLocaleDateString('en-CA'); // Outputs YYYY-MM-DD natively
  const startOfMonth = `${today.substring(0, 7)}-01`;
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  const fetchSalesHistory = async () => {
    try {
      const resp = await fetch(`${API_BASE}/sales/?shop=${shopId}`);
      if (resp.ok) {
        setSalesHistory(await resp.json());
      }
    } catch (err) {
      console.error("Failed to fetch sales history", err);
    }
  };

  const fetchExpensesHistory = async () => {
    try {
      const resp = await fetch(`${API_BASE}/expenses/?shop=${shopId}`);
      if (resp.ok) {
        setExpensesHistory(await resp.json());
      }
    } catch (err) {
      console.error("Failed to fetch expenses", err);
    }
  };

  useEffect(() => {
    fetchSalesHistory();
    fetchExpensesHistory();
  }, [shopId]);

  const [paymentInputs, setPaymentInputs] = useState({});
  const [returningId, setReturningId] = useState(null);

  const handleReturnSale = async (saleId) => {
    if (!confirm('Are you sure you want to return this sale? The inventory will be restored automatically.')) return;
    setReturningId(saleId);
    try {
      const resp = await fetch(`${API_BASE}/sales/${saleId}/return_sale/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await resp.json();
      if (resp.ok) {
        fetchSalesHistory();
      } else {
        alert(data.error || 'Failed to return sale.');
      }
    } catch (err) {
      console.error('Return sale failed:', err);
      alert('Network error. Please try again.');
    } finally {
      setReturningId(null);
    }
  };

  const handlePaymentUpdate = async (saleId) => {
    const amount = parseFloat(paymentInputs[saleId]);
    if (!amount || amount <= 0) return alert("Please enter a valid amount");

    try {
      const resp = await fetch(`${API_BASE}/sales/${saleId}/add_payment/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await resp.json();

      if (resp.ok) {
        setPaymentInputs(prev => ({ ...prev, [saleId]: '' }));
        fetchSalesHistory();
      } else {
        console.error("Payment error from server:", data);
        alert(data.error || `Server error (${resp.status}). Check console for details.`);
      }
    } catch (err) {
      console.error("Network error during payment update:", err);
      alert("Network error. Please check your connection.");
    }
  };

  const generateInvoice = (sale) => {
    const doc = new jsPDF();
    const shopName = shopId === 'usman' ? 'Usman Carpet & Qaleen Center' : 'Hanif Carpet Premium Outlet';
    const stockList = sale.additional_stocks || [];
    const additionalTotal = stockList.reduce((sum, s) => sum + parseFloat(s.total_payment || 0), 0);
    const grandTotal = (sale.total_amount || 0) + additionalTotal;

    // Header
    doc.setFillColor(184, 134, 11);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(24);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName.toUpperCase(), 14, 25);
    doc.setFontSize(10);
    doc.text('PREMIUM FLOORING SOLUTIONS', 14, 32);

    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text('INVOICE / BILL', 14, 55);
    doc.setFontSize(10);
    doc.text(`Invoice No: ${sale.bill_number || `#SALE-${sale.id}`}`, 14, 65);
    doc.text(`Date: ${sale.date}`, 14, 70);
    doc.text(`Payment Type: ${sale.sale_type}`, 14, 75);

    doc.text('BILL TO:', 120, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(sale.customer_name, 120, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.customer_mobile || '', 120, 75);

    // Unified table rows — stock items + additional stock, no distinction
    const tableRows = [];

    sale.items.forEach((item, index) => {
      const type = item.roll_product_type || '';
      const design = item.roll_design || '';
      const color = item.roll_color || '';
      const isArea = (item.width || 0) > 1;
      const dims = isArea
        ? `${item.length || 0} x ${item.width || 0} ft`
        : `${item.length || 0} Pcs`;
      tableRows.push([
        index + 1,
        type,
        design,
        color,
        dims,
        `PKR ${Number(item.subtotal || 0).toLocaleString()}`
      ]);
    });

    stockList.forEach((s, i) => {
      const dims = (s.length > 0 || s.width > 0)
        ? `${s.length || 0} x ${s.width || 0} ft`
        : '-';
      tableRows.push([
        sale.items.length + i + 1,
        s.stock_type || '',
        s.design || '',
        s.color || '',
        dims,
        `PKR ${Number(s.total_payment || 0).toLocaleString()}`
      ]);
    });

    autoTable(doc, {
      startY: 90,
      head: [['#', 'Type', 'Design', 'Color', 'Dimensions', 'Amount']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [184, 134, 11] },
      styles: { fontSize: 9 },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    const isFullyPaid = sale.sale_type === 'Cash' || sale.status === 'Paid';
    const effectivePaid = isFullyPaid ? grandTotal : (sale.paid_amount + additionalTotal);
    const balanceDue = Math.max(0, grandTotal - effectivePaid);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Paid Amount:', 130, finalY);
    doc.text(`PKR ${Number(effectivePaid).toLocaleString()}`, 196, finalY, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total:', 130, finalY + 10);
    doc.text(`PKR ${Number(grandTotal).toLocaleString()}`, 196, finalY + 10, { align: 'right' });
    doc.text('Balance Due:', 130, finalY + 20);
    doc.text(`PKR ${Number(balanceDue).toLocaleString()}`, 196, finalY + 20, { align: 'right' });

    if (sale.payment_history && sale.payment_history.length > 0) {
      const paymentY = finalY + 35;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('PAYMENT TIMELINE', 14, paymentY);
      const paymentData = sale.payment_history.map((payment, index) => [
        `Deposit #${index + 1}`,
        payment.date,
        `PKR ${Number(payment.amount).toLocaleString()}`
      ]);
      autoTable(doc, {
        startY: paymentY + 5,
        head: [['Ref', 'Date', 'Amount']],
        body: paymentData,
        theme: 'grid',
        headStyles: { fillColor: [184, 134, 11] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business! This is a system-generated invoice.', 105, 280, { align: 'center' });

    doc.save(`Invoice_${sale.customer_name}_${sale.date}.pdf`);
  };

  const filteredHistory = salesHistory.filter(sale => {
    // 1. Type Filter
    let matchesType = true;
    if (historyFilter === 'Returned') {
      matchesType = sale.status === 'Returned';
    } else {
      // By default (All / Cash / Credit), hide returned sales
      if (sale.status === 'Returned') return false;
      if (historyFilter === 'Cash') {
        matchesType = sale.sale_type === 'Cash' || sale.status === 'Paid';
      } else if (historyFilter === 'Credit') {
        matchesType = (sale.sale_type === 'Advance' || sale.sale_type === 'Udhar') && sale.status !== 'Paid';
      }
    }
    if (!matchesType) return false;

    // 2. Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = (sale.customer_name || '').toLowerCase().includes(query);
      const mobileMatch = (sale.customer_mobile || '').toLowerCase().includes(query);
      const billMatch = (sale.bill_number || `SALE-${sale.id}`).toLowerCase().includes(query);
      if (!nameMatch && !mobileMatch && !billMatch) return false;
    }

    // 3. Date Range
    if (startDate && new Date(sale.date) < new Date(startDate)) return false;
    if (endDate && new Date(sale.date) > new Date(endDate)) return false;

    return true;
  });

  const activeSales = filteredHistory.filter(s => s.status !== 'Returned');
  const totalSalesAmount = activeSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalPaidAmount = activeSales.reduce((sum, sale) => sum + (sale.status === 'Paid' ? sale.total_amount : sale.paid_amount), 0);
  const totalBalanceDue = activeSales.reduce((sum, sale) => sum + (sale.status === 'Paid' ? 0 : sale.balance_amount), 0);
  const totalAdditionalStockCost = activeSales.reduce((sum, sale) => {
    const stockCost = (sale.additional_stocks || []).reduce((s, stock) => s + parseFloat(stock.total_payment || 0), 0);
    return sum + stockCost;
  }, 0);
  const netSalesAmount = totalSalesAmount - totalAdditionalStockCost;
  const totalReturnedSales = salesHistory.filter(s => s.status === 'Returned').length;
  const totalReturnedValue = salesHistory.filter(s => s.status === 'Returned').reduce((sum, s) => sum + s.total_amount, 0);

  const generateReportPDF = () => {
    const doc = new jsPDF();
    const shopName = shopId === 'usman' ? 'Usman Carpet & Qaleen Center' : 'Hanif Carpet Premium Outlet';
    
    // Header
    doc.setFillColor(184, 134, 11);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(24);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName.toUpperCase(), 14, 25);
    doc.setFontSize(10);
    doc.text('SALES HISTORY REPORT', 14, 32);

    doc.setTextColor(0);
    doc.setFontSize(12);
    const dateText = (startDate && endDate) ? `${startDate} to ${endDate}` : (startDate ? `From ${startDate}` : (endDate ? `Until ${endDate}` : 'All Time'));
    doc.text(`Duration: ${dateText}`, 14, 55);
    if (historyFilter !== 'All') {
      doc.text(`Filter: ${historyFilter}`, 14, 62);
    }

    const tableData = filteredHistory.slice().reverse().map((sale, index) => {
      const paid = sale.status === 'Paid' ? sale.total_amount : sale.paid_amount;
      const bal = sale.status === 'Paid' ? 0 : sale.balance_amount;
      const addStock = (sale.additional_stocks || []).reduce((s, st) => s + parseFloat(st.total_payment || 0), 0);
      return [
        index + 1,
        sale.bill_number || `#SALE-${sale.id}`,
        sale.date,
        sale.customer_name,
        sale.sale_type,
        `PKR ${paid.toLocaleString()}`,
        `PKR ${bal.toLocaleString()}`,
        `PKR ${(sale.total_amount + addStock).toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: 70,
      head: [['#', 'Bill No', 'Date', 'Customer', 'Type', 'Received', 'Balance', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [184, 134, 11] },
      styles: { fontSize: 8 }
    });

    // --- Report Summary ---
    const finalY = doc.lastAutoTable.finalY + 15;

    let totalGrossWithAdditional = 0;
    let computedTotalAdditionalStock = 0;
    let computedTotalDue = 0;

    filteredHistory.filter(s => s.status !== 'Returned').forEach((sale) => {
      const addStock = (sale.additional_stocks || []).reduce((s, st) => s + parseFloat(st.total_payment || 0), 0);
      totalGrossWithAdditional += sale.total_amount + addStock;
      computedTotalAdditionalStock += addStock;
      computedTotalDue += sale.status === 'Paid' ? 0 : sale.balance_amount;
    });

    let totalExpensesAmount = 0;
    expensesHistory.forEach(exp => {
      if (startDate && new Date(exp.date) < new Date(startDate)) return;
      if (endDate && new Date(exp.date) > new Date(endDate)) return;
      const amount = parseFloat(String(exp.amount).replace(/[^0-9.]/g, '')) || 0;
      totalExpensesAmount += amount;
    });

    const netSalesAmount = totalGrossWithAdditional - computedTotalAdditionalStock - computedTotalDue - totalExpensesAmount;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('REPORT SUMMARY', 14, finalY);

    // Draw summary box
    let boxHeight = 22;
    if (computedTotalAdditionalStock > 0) boxHeight += 9;
    if (computedTotalDue > 0) boxHeight += 9;
    if (totalExpensesAmount > 0) boxHeight += 9;
    boxHeight += 9; // For the final Net Cash Line
    
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(0.5);
    doc.rect(14, finalY + 5, 182, boxHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Total Sales (Stock + Additional Stock):', 20, finalY + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PKR ${totalGrossWithAdditional.toLocaleString()}`, 192, finalY + 14, { align: 'right' });

    let currentY = finalY + 14;

    if (computedTotalAdditionalStock > 0) {
      currentY += 9;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 100, 0);
      doc.text('Less: Additional Stock Cost:', 20, currentY);
      doc.setFont('helvetica', 'bold');
      doc.text(`- PKR ${computedTotalAdditionalStock.toLocaleString()}`, 192, currentY, { align: 'right' });
    }

    if (computedTotalDue > 0) {
      currentY += 9;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 0, 0);
      doc.text('Less: Outstanding Due Amount:', 20, currentY);
      doc.setFont('helvetica', 'bold');
      doc.text(`- PKR ${computedTotalDue.toLocaleString()}`, 192, currentY, { align: 'right' });
    }

    if (totalExpensesAmount > 0) {
      currentY += 9;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 50, 50);
      doc.text('Less: Total Expenses:', 20, currentY);
      doc.setFont('helvetica', 'bold');
      doc.text(`- PKR ${totalExpensesAmount.toLocaleString()}`, 192, currentY, { align: 'right' });
    }

    // Net Sales / Received Line
    currentY += 4;
    doc.setDrawColor(0, 150, 80);
    doc.setLineWidth(0.3);
    doc.line(20, currentY, 192, currentY);
    
    currentY += 7;
    doc.setTextColor(0, 120, 60);
    doc.setFontSize(11);
    doc.text('Net Cash Received:', 20, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`PKR ${netSalesAmount.toLocaleString()}`, 192, currentY, { align: 'right' });

    doc.save(`Sales_Report_${shopId}_${new Date().toLocaleDateString('en-CA')}.pdf`);
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">
            Sales <span className="bronze-text">History</span>
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Transaction Archive & Invoicing</p>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[3rem] p-10 border border-white/5"
      >
         <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <HistoryIcon size={24} className="bronze-text" />
             </div>
             <h3 className="text-2xl font-black uppercase italic tracking-tight">Sale <span className="bronze-text">History Archive</span></h3>
           </div>
           
           <div className="flex flex-wrap items-center gap-4 w-full md:w-auto overflow-hidden justify-end">
             {/* Search Field */}
             <div className="relative flex-grow md:flex-grow-0">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
               <input 
                 type="text" 
                 placeholder="Search by Bill, Name..."
                 className="w-full md:w-48 bg-black/20 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-[10px] font-black outline-none focus:border-primary transition-all text-white placeholder-zinc-600"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>

             {/* Date Filters */}
             <div className="flex items-center gap-2">
               <input 
                 type="date"
                 className="bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black outline-none focus:border-primary transition-all text-white min-w-[110px]"
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 title="Start Date"
               />
               <span className="text-zinc-600 font-black text-[10px]">TO</span>
               <input 
                 type="date"
                 className="bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black outline-none focus:border-primary transition-all text-white min-w-[110px]"
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 title="End Date"
               />
               {(startDate || endDate) && (
                 <button 
                   onClick={() => { setStartDate(''); setEndDate(''); }}
                   className="ml-2 text-zinc-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest bg-white/5 px-3 py-2 rounded-xl"
                 >
                   Clear
                 </button>
               )}
             </div>

             <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 font-black text-[9px] uppercase tracking-widest hidden lg:flex">
               {['All', 'Cash', 'Credit', 'Returned'].map(filterOption => (
                 <button 
                   key={filterOption}
                   onClick={() => setHistoryFilter(filterOption)}
                   className={`px-4 py-2 rounded-xl transition-all ${
                     historyFilter === filterOption 
                       ? filterOption === 'Returned' 
                         ? 'bg-zinc-600 text-white shadow-lg' 
                         : 'bg-primary text-black shadow-lg shadow-primary/20' 
                       : 'text-zinc-500 hover:text-white'
                   }`}
                 >
                   {filterOption === 'Credit' ? 'Adv/Udhar' : filterOption}
                   {filterOption === 'Returned' && totalReturnedSales > 0 && (
                     <span className="ml-1.5 bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-md text-[8px]">{totalReturnedSales}</span>
                   )}
                 </button>
               ))}
             </div>
           </div>
         </div>

         {/* Totals Summary */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
           <div className="bg-black/20 p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Gross Sales</p>
             <p className="text-2xl font-black italic bronze-text">PKR {totalSalesAmount.toLocaleString()}</p>
           </div>
           <div className="bg-black/20 p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Received</p>
             <p className="text-2xl font-black italic text-emerald-500">PKR {totalPaidAmount.toLocaleString()}</p>
           </div>
           <div className="bg-black/20 p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Outstanding</p>
             <p className="text-2xl font-black italic text-red-500">PKR {totalBalanceDue.toLocaleString()}</p>
           </div>
           <div className="grid grid-cols-2 gap-3">
             <button
               onClick={() => setHistoryFilter('Returned')}
               className="bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 hover:border-zinc-500 transition-all p-4 rounded-2xl flex flex-col items-center justify-center gap-1 group"
             >
               <RotateCcw size={18} className="text-zinc-400 group-hover:text-white group-hover:rotate-180 transition-transform duration-500" />
               <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">Returns</span>
               <span className="text-xl font-black text-zinc-300">{totalReturnedSales}</span>
             </button>
             <button 
               onClick={generateReportPDF}
               className="bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary text-primary hover:text-black transition-all p-4 rounded-2xl flex flex-col items-center justify-center gap-2 group shadow-xl"
             >
               <Printer size={20} className="group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black uppercase tracking-widest">PDF Report</span>
             </button>
           </div>
         </div>

         <div className="overflow-y-auto max-h-[700px] pr-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
           {filteredHistory.slice().reverse().map((sale) => (
             <div key={sale.id} className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all group mb-4">
               <div 
                 className="flex flex-wrap items-center justify-between gap-6 cursor-pointer"
                 onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
               >
                 <div className="flex items-center gap-6">
                   <div className="w-14 h-14 rounded-2xl bg-black/20 flex flex-col items-center justify-center border border-white/5 shadow-inner">
                      <span className="text-[7px] font-black uppercase text-zinc-500 leading-none mb-1 text-center px-1">BILL&nbsp;NO</span>
                      <span className="text-[10px] font-black text-primary italic text-center px-1 break-all line-clamp-1">{sale.bill_number || `SALE-${sale.id}`}</span>
                   </div>
                   <div>
                     <h5 className="font-black uppercase tracking-tight text-lg">{sale.customer_name}</h5>
                     <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                       <Phone size={10} className="bronze-text" /> {sale.customer_mobile || 'No Mobile'}
                       <span className="text-zinc-800 mx-2">|</span>
                       <Calendar size={10} className="bronze-text" /> {sale.date}
                     </p>
                   </div>
                 </div>

                 <div className="flex items-center gap-12" onClick={e => e.stopPropagation()}>
                    {sale.status !== 'Paid' && sale.status !== 'Returned' && (
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
                        <div className="relative">
                          <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input 
                            type="number"
                            placeholder="Amount"
                            className="w-24 bg-black/20 border border-white/5 rounded-xl pl-8 pr-3 py-2 text-[10px] font-black outline-none focus:border-primary transition-all text-white"
                            value={paymentInputs[sale.id] || ''}
                            onChange={(e) => setPaymentInputs({...paymentInputs, [sale.id]: e.target.value})}
                          />
                        </div>
                        <button 
                          onClick={() => handlePaymentUpdate(sale.id)}
                          className="bg-primary text-black p-2 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                          title="Confirm Payment"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    )}

                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                        {sale.status === 'Paid' ? 'Total Amount' : 'Remaining Balance'}
                      </p>
                      <p className={`font-black italic text-lg tracking-tighter ${sale.status !== 'Paid' ? 'text-red-500' : ''}`}>
                        PKR {sale.status === 'Paid' ? sale.total_amount.toLocaleString() : sale.balance_amount.toLocaleString()}
                      </p>
                      {sale.status !== 'Paid' && (
                        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                          Total: PKR {sale.total_amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right border-l border-white/5 pl-6 sm:pl-12 min-w-[100px] sm:min-w-[150px]">
                      <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${
                        sale.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 
                        sale.status === 'Partial' ? 'bg-amber-500/10 text-amber-500' : 
                        sale.status === 'Returned' ? 'bg-zinc-500/10 text-zinc-400 line-through' : 
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {sale.status}
                      </span>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-3">{sale.sale_type}</p>
                    </div>

                    <button 
                      onClick={() => generateInvoice(sale)}
                      className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-primary hover:text-black transition-all flex items-center justify-center text-zinc-500 shadow-lg border border-white/5"
                    >
                      <Printer size={20} />
                    </button>

                    {sale.status !== 'Returned' && (
                      <button
                        onClick={() => handleReturnSale(sale.id)}
                        disabled={returningId === sale.id}
                        className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all flex items-center justify-center text-zinc-600 shadow-lg border border-white/5"
                        title="Return this sale"
                      >
                        <RotateCcw size={18} className={returningId === sale.id ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </div>
               </div>
               
               {/* Expanded Details View */}
               <AnimatePresence>
                 {expandedSaleId === sale.id && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="mt-6 pt-6 border-t border-white/5 overflow-hidden"
                   >
                     <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                           <Package size={16} className="bronze-text" />
                           <h4 className="text-sm font-black uppercase italic tracking-widest text-zinc-400">Order Items</h4>
                        </div>
                        <div className="space-y-2">
                           {sale.items?.map((item, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest gap-4">
                                 <div className="flex items-center gap-4">
                                     <span className="text-zinc-500 w-4">#{idx + 1}</span>
                                     <span className="text-white text-xs">Roll: {item.roll_id_str || item.roll || ''}</span>
                                 </div>
                                 <div className="flex flex-wrap items-center gap-6 text-zinc-400 justify-end flex-grow">
                                     <span className="bg-black/30 px-3 py-1 rounded-lg">Dims: {(item.width || 0) > 1 ? `${item.length} ft x ${item.width} ft` : `${item.length} Pcs`}</span>
                                     <span>Price: PKR {Number(item.unit_price || 0).toLocaleString()}</span>
                                     <span className="text-emerald-500 font-black text-xs">Subtotal: PKR {Number(item.subtotal || 0).toLocaleString()}</span>
                                 </div>
                              </div>
                           ))}
                           {(!sale.items || sale.items.length === 0) && (
                               <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">No items found for this record</p>
                           )}
                        </div>
                        
                         {sale.payment_history && sale.payment_history.length > 0 && (
                           <div className="mt-6 border-t border-white/5 pt-6">
                             <div className="flex items-center gap-3 mb-4">
                                <Banknote size={16} className="text-emerald-500" />
                                <h4 className="text-sm font-black uppercase italic tracking-widest text-zinc-400">Payment Timeline</h4>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {sale.payment_history.map((payment, idx) => (
                                   <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 hover:border-emerald-500/30 transition-all">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Deposit #{idx + 1}</span>
                                        <span className="text-[10px] font-bold text-zinc-400">{payment.date}</span>
                                      </div>
                                      <p className="text-lg font-black italic text-emerald-500 tracking-tight">PKR {Number(payment.amount).toLocaleString()}</p>
                                   </div>
                                ))}
                             </div>
                           </div>
                         )}

                         {/* Additional Stock Section */}
                         {sale.additional_stocks && sale.additional_stocks.length > 0 && (
                           <div className="mt-6 border-t border-amber-500/10 pt-6">
                             <div className="flex items-center gap-3 mb-4">
                                <Layers size={16} className="text-amber-400" />
                                <h4 className="text-sm font-black uppercase italic tracking-widest text-zinc-400">Additional Stock</h4>
                                <span className="ml-auto text-[10px] font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                                  Cost: PKR {(sale.additional_stocks || []).reduce((s, st) => s + parseFloat(st.total_payment || 0), 0).toLocaleString()}
                                </span>
                             </div>
                             <div className="space-y-2">
                                {sale.additional_stocks.map((stock, idx) => (
                                   <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] font-black uppercase tracking-widest gap-3 hover:border-amber-500/30 transition-all">
                                      <div className="flex items-center gap-4">
                                         <span className="text-zinc-500 w-4">#{idx + 1}</span>
                                         <div>
                                           <span className="text-amber-400 text-xs">{stock.stock_type}</span>
                                           <p className="text-zinc-500 text-[9px] mt-0.5 normal-case font-bold tracking-normal">
                                             {stock.design && <span>{stock.design}</span>}
                                             {stock.color && <span> • {stock.color}</span>}
                                             {stock.length > 0 && stock.width > 0 && <span> • {stock.length} x {stock.width}</span>}
                                           </p>
                                         </div>
                                      </div>
                                      <span className="text-amber-400 font-black text-sm">PKR {Number(stock.total_payment).toLocaleString()}</span>
                                   </div>
                                ))}
                             </div>
                           </div>
                         )}

                        {sale.remarks && sale.remarks !== 'No remarks' && (
                          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
                             <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-2">Remarks / Notes</p>
                             <p className="text-sm font-medium text-zinc-300 capitalize">{sale.remarks}</p>
                          </div>
                        )}
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           ))}
           {filteredHistory.length === 0 && (
             <div className="py-40 text-center text-zinc-700 italic font-black uppercase tracking-[0.5em]">No transactions found</div>
           )}
         </div>
      </motion.div>
    </div>
  );
}
