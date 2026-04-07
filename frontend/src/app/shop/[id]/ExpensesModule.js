'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Calendar, 
  Download,
  Search,
  Hash
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';

export default function ExpensesModule() {
  const { id: shopId } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'add'
  
  // Date filters
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // New Expense form
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    date: today
  });

  const fetchExpenses = async () => {
    try {
      const resp = await fetch(`${API_BASE}/expenses/?shop=${shopId}`);
      if (resp.ok) {
        setExpenses(await resp.json());
      }
    } catch (err) {
      console.error("Failed to fetch expenses", err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [shopId]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch(`${API_BASE}/expenses/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense)
      });
      if (resp.ok) {
        setNewExpense({ amount: '', description: '', date: today });
        setView('list');
        fetchExpenses();
      }
    } catch (err) {
      console.error("Add Expense failed", err);
    }
  };

  const handleDeleteExpense = async (id) => {
    if(confirm("Are you sure you want to delete this expense?")) {
      try {
        await fetch(`${API_BASE}/expenses/${id}/?shop=${shopId}`, { method: 'DELETE' });
        fetchExpenses();
      } catch (err) {
        console.error("Delete Expense failed", err);
      }
    }
  };

  // Filter logic
  const filteredExpenses = expenses.filter(ex => {
    // If no dates set, show all
    if (!fromDate && !toDate) return true;
    
    let isAfterFrom = true;
    let isBeforeTo = true;

    if (fromDate) isAfterFrom = ex.date >= fromDate;
    if (toDate) isBeforeTo = ex.date <= toDate;

    return isAfterFrom && isBeforeTo;
  });

  // Calculate generic total string for display
  const totalAmountStr = filteredExpenses.reduce((sum, ex) => {
    const numericAmount = parseFloat(ex.amount.replace(/[^0-9.]/g, '')) || 0;
    return sum + numericAmount;
  }, 0);

  // Group and Sort by Date
  const groupedExpenses = filteredExpenses.reduce((acc, ex) => {
    if (!acc[ex.date]) acc[ex.date] = [];
    acc[ex.date].push(ex);
    return acc;
  }, {});

  // Sort dates chronologically (oldest to newest)
  const sortedDates = Object.keys(groupedExpenses).sort((a, b) => new Date(a) - new Date(b));

  // PDF Export
  const generatePDF = () => {
    const doc = new jsPDF();
    const shopName = shopId ? shopId.charAt(0).toUpperCase() + shopId.slice(1) : 'Shop';
    
    doc.setFontSize(22);
    doc.setTextColor(184, 134, 11);
    doc.text(`${shopName} - Expense Report`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${fromDate || 'All'} to ${toDate || 'All'}`, 14, 28);
    doc.text(`Total Amount: PKR ${totalAmountStr.toLocaleString()}`, 14, 34);

    if (filteredExpenses.length === 0) {
      alert("No expenses found for this date range.");
      return;
    }

    let currentY = 44;

    sortedDates.forEach(date => {
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      const dailyExpenses = groupedExpenses[date];
      const dailyTotal = dailyExpenses.reduce((sum, ex) => sum + (parseFloat(ex.amount.replace(/[^0-9.]/g, '')) || 0), 0);

      // Section Header (Date)
      doc.setFontSize(14);
      doc.setTextColor(184, 134, 11);
      doc.text(`Date: ${date} (Total: PKR ${dailyTotal.toLocaleString()})`, 14, currentY);
      currentY += 6;

      const tableData = dailyExpenses.map((ex, index) => [
        index + 1,
        ex.description,
        ex.amount
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Description', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [184, 134, 11], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          2: { fontStyle: 'bold' }
        },
        didDrawPage: (data) => {
           doc.setFontSize(8);
           doc.text(`Page ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    });

    doc.save(`${shopId}_expenses_${fromDate}_to_${toDate}.pdf`);
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-3xl font-black tracking-tighter uppercase italic">Shop <span className="bronze-text">Expenses</span></h3>
          <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.2em] mt-2">Track and Record Daily Expenditures</p>
        </div>
        <div className="flex gap-4">
           {view === 'list' && (
             <button 
               onClick={generatePDF}
               className="flex items-center gap-2 px-6 py-4 rounded-2xl glass hover:bg-white/10 transition-colors font-black text-xs uppercase tracking-widest text-zinc-400 hover:text-primary"
             >
               <Download size={18} />
               Export PDF
             </button>
           )}
           <button 
             onClick={() => setView(view === 'list' ? 'add' : 'list')}
             className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20"
           >
             {view === 'list' ? <Plus size={18} /> : <Search size={18} />}
             {view === 'list' ? 'Add Expense' : 'View Log'}
           </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'add' ? (
          <motion.div
            key="add"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <form onSubmit={handleAddExpense} className="glass rounded-[2rem] border border-white/5 p-8 max-w-2xl">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                  <Receipt size={32} className="text-primary" />
                </div>
                <h4 className="text-xl font-black uppercase mb-8 ml-2 italic tracking-tighter">New Expense Record</h4>
                
                <div className="space-y-6">
                  {/* Date Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={20} />
                      <input 
                        type="date" required
                        className="w-full bg-white/5 border border-border/50 rounded-xl pl-14 pr-5 py-4 focus:border-primary outline-none transition-all font-black"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Amount (e.g. 1500 or PKR 1500)</label>
                    <div className="relative">
                      <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" size={20} />
                      <input 
                        type="text" required
                        className="w-full bg-white/5 border border-border/50 rounded-xl pl-14 pr-5 py-4 focus:border-primary outline-none transition-all font-black"
                        placeholder="PKR 0.00"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Description / Remarks</label>
                    <textarea 
                      required rows={3}
                      className="w-full bg-white/5 border border-border/50 rounded-xl px-5 py-4 focus:border-primary outline-none transition-all font-medium"
                      placeholder="e.g. Bought stationary, paid utility bills..."
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 flex gap-4">
                  <button type="submit" className="flex-1 bg-primary text-primary-foreground py-5 rounded-xl font-black uppercase tracking-[0.2em]">
                    Save Expense
                  </button>
                  <button type="button" onClick={() => setView('list')} className="px-8 py-5 rounded-xl glass text-zinc-400 font-black uppercase">
                    Cancel
                  </button>
                </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Filters & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass rounded-[2rem] p-6 flex flex-col justify-center">
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Found</p>
                 <h2 className="text-4xl font-black text-primary">PKR {totalAmountStr.toLocaleString()}</h2>
                 <p className="text-xs font-semibold text-zinc-400 mt-2">Over {filteredExpenses.length} Records</p>
              </div>
              <div className="glass rounded-[2rem] p-6 col-span-2 flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Filter From Date</label>
                  <input 
                    type="date"
                    className="w-full bg-white/5 border border-border/50 rounded-xl px-5 py-3 focus:border-primary outline-none transition-all font-black text-sm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Filter To Date</label>
                  <input 
                    type="date"
                    className="w-full bg-white/5 border border-border/50 rounded-xl px-5 py-3 focus:border-primary outline-none transition-all font-black text-sm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* List */}
            <div className="glass rounded-[2rem] p-6 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
               {sortedDates.length > 0 ? (
                 <div className="space-y-8">
                   {sortedDates.map(date => {
                     const dailyItems = groupedExpenses[date];
                     const dailyTotal = dailyItems.reduce((sum, ex) => sum + (parseFloat(ex.amount.replace(/[^0-9.]/g, '')) || 0), 0);
                     
                     return (
                       <div key={date} className="space-y-4">
                         <div className="flex items-center justify-between border-b border-white/10 pb-2">
                           <h4 className="text-xl font-black text-primary">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h4>
                           <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">Daily Total: <span className="text-foreground">PKR {dailyTotal.toLocaleString()}</span></span>
                         </div>
                         <div className="divide-y divide-white/5 bg-white/5 rounded-2xl overflow-hidden">
                           {dailyItems.map(ex => (
                             <div key={ex.id} className="grid grid-cols-4 gap-4 p-5 items-center hover:bg-white/10 transition-colors group">
                               <div className="col-span-3 font-medium text-zinc-300 leading-relaxed text-sm pr-4 line-clamp-2">
                                 {ex.description}
                               </div>
                               <div className="flex items-center justify-end gap-6 text-right font-black text-primary">
                                  {ex.amount}
                                  <button 
                                    onClick={() => handleDeleteExpense(ex.id)}
                                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="p-16 text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
                   No Expenses Recorded for this period
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
