'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { 
  TrendingUp, 
  Package, 
  Users, 
  Wallet, 
  Factory,
  Activity,
  BarChart3,
  Receipt,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  FileText,
  Tag
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';

const MetricCard = ({ title, value, subtext, icon: Icon, colorClass, onClick }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    onClick={onClick}
    className={`glass rounded-[2rem] p-6 relative overflow-hidden group border border-white/5 ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity`}>
      <Icon size={80} className={colorClass} />
    </div>
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-white/5">
        <Icon size={24} className={colorClass} />
      </div>
      <div className="space-y-1">
        <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">{title}</h4>
        <span className="text-2xl font-black tracking-tighter italic">{value}</span>
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-3 italic">{subtext}</p>
      </div>
    </div>
  </motion.div>
);

const ChartBar = ({ label, value, maxValue, colorClass }) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <div className="relative w-full h-40 bg-white/5 rounded-2xl overflow-hidden flex flex-col justify-end">
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`w-full ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity rounded-t-xl`}
        />
        {value > 0 && (
          <div className="absolute top-2 w-full text-center text-[8px] font-black text-zinc-400">
            {value.toLocaleString()}
          </div>
        )}
      </div>
      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center h-4">{label}</span>
    </div>
  );
};

export default function OverviewModule({ onNavigate }) {
  const { id: shopId } = useParams();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const shopParam = `?shop=${shopId}`;
        
        // Use a more robust fetch helper
        const safeFetch = async (url) => {
          try {
            const r = await fetch(url);
            if (!r.ok) return [];
            return await r.json();
          } catch (e) {
            console.error(`Fetch failed for ${url}`, e);
            return [];
          }
        };

        const [rolls, expenses, sales, employees, factories] = await Promise.all([
          safeFetch(`${API_BASE}/rolls/${shopParam}`),
          safeFetch(`${API_BASE}/expenses/${shopParam}`),
          safeFetch(`${API_BASE}/sales/${shopParam}`),
          safeFetch(`${API_BASE}/employees/${shopParam}`),
          safeFetch(`${API_BASE}/factories/`)
        ]);

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Sales — exclude returned
        const activeSales = Array.isArray(sales) ? sales.filter(s => s.status !== 'Returned') : [];
        const returnedSales = Array.isArray(sales) ? sales.filter(s => s.status === 'Returned') : [];

        const salesDailyMap = {};
        let salesToday = 0, salesWeekly = 0, salesMonthly = 0;
        let additionalStockToday = 0;
        const todaySalesList = [];

        activeSales.forEach(sale => {
          const grossAmount = parseFloat(sale.total_amount || 0);
          const discountAmount = parseFloat(sale.discount || 0);
          const netAmount = grossAmount - discountAmount;
          const addStockAmount = (sale.additional_stocks || []).reduce((s, st) => s + parseFloat(st.total_payment || 0), 0);
          const d = new Date(sale.date);
          const diffDays = (now - d) / (1000 * 60 * 60 * 24);

          if (sale.date === todayStr) {
            salesToday += netAmount;
            additionalStockToday += addStockAmount;
            todaySalesList.push(sale);
          }
          if (diffDays <= 7) salesWeekly += netAmount;
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) salesMonthly += netAmount;
          if (diffDays <= 7) salesDailyMap[sale.date] = (salesDailyMap[sale.date] || 0) + netAmount;
        });

        // Expenses
        const expDailyMap = {};
        let expToday = 0, expWeekly = 0, expMonthly = 0;
        const todayExpensesList = [];

        (Array.isArray(expenses) ? expenses : []).forEach(exp => {
          const amount = parseFloat(String(exp.amount).replace(/[^0-9.]/g, '')) || 0;
          const d = new Date(exp.date);
          const diffDays = (now - d) / (1000 * 60 * 60 * 24);

          if (exp.date === todayStr) {
            expToday += amount;
            todayExpensesList.push(exp);
          }
          if (diffDays <= 7) expWeekly += amount;
          if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) expMonthly += amount;
          if (diffDays <= 7) expDailyMap[exp.date] = (expDailyMap[exp.date] || 0) + amount;
        });

        // Build 7-day charts
        const buildHistory = (map) => {
          const result = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const s = d.toISOString().split('T')[0];
            result.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), value: map[s] || 0 });
          }
          return result;
        };

        const inStockRolls = (Array.isArray(rolls) ? rolls : []).filter(r => r.status === 'In Stock' && !r.factory).length;
        const totalOutstanding = activeSales.reduce((sum, s) => sum + (s.status === 'Paid' ? 0 : (s.balance_amount || 0)), 0);
        const totalSaleValue = activeSales.reduce((sum, s) => sum + (parseFloat(s.total_amount || 0) - parseFloat(s.discount || 0)), 0);
        const totalDiscount = activeSales.reduce((sum, s) => sum + parseFloat(s.discount || 0), 0);

        setStats({
          sales: {
            today: salesToday,
            todayAdditional: additionalStockToday,
            weekly: salesWeekly,
            monthly: salesMonthly,
            dailyHistory: buildHistory(salesDailyMap),
            totalValue: totalSaleValue,
            totalDiscount: totalDiscount,
            outstanding: totalOutstanding,
          },
          expenses: {
            today: expToday,
            weekly: expWeekly,
            monthly: expMonthly,
            dailyHistory: buildHistory(expDailyMap),
          },
          counts: {
            rolls: inStockRolls,
            employees: (Array.isArray(employees) ? employees : []).length,
            factories: (Array.isArray(factories) ? factories : []).length,
            returned: returnedSales.length,
          },
          todayDetails: {
            sales: todaySalesList,
            expenses: todayExpensesList
          }
        });
        setLoading(false);
      } catch (err) {
        console.error('Dashboard failed', err);
        setLoading(false);
        // Set empty stats instead of null to allow rendering
        setStats({
          sales: { today: 0, todayAdditional: 0, weekly: 0, monthly: 0, dailyHistory: [], totalValue: 0, totalDiscount: 0, outstanding: 0 },
          expenses: { today: 0, weekly: 0, monthly: 0, dailyHistory: [] },
          counts: { rolls: 0, employees: 0, factories: 0, returned: 0 },
          todayDetails: { sales: [], expenses: [] }
        });
      }
    };

    fetchData();
  }, [shopId]);

  const generateTodayPDF = () => {
    if (!stats || !stats.todayDetails) return;
    
    const doc = new jsPDF();
    const shopName = shopId === 'usman' ? 'Usman Carpet & Qaleen Center' : 'Hanif Carpet Premium Outlet';
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    const { today: salesToday, todayAdditional } = stats.sales;
    const { today: expToday } = stats.expenses;
    const { sales: todaySalesList, expenses: todayExpensesList } = stats.todayDetails;
    
    const grossSalesWithAdditional = salesToday + todayAdditional;
    const netCash = grossSalesWithAdditional - todayAdditional - expToday;

    doc.setFillColor(184, 134, 11);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text(shopName.toUpperCase(), 14, 20);
    doc.setFontSize(10);
    doc.text(`TODAY'S BUSINESS SUMMARY - ${todayStr}`, 14, 26);
    doc.setTextColor(0);

    let currentY = 40;

    // --- SALES TABLE ---
    if (todaySalesList.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Today's Sales", 14, currentY);
      currentY += 5;

      const salesBody = [];
      todaySalesList.forEach(sale => {
        const netAmount = parseFloat(sale.total_amount || 0) - parseFloat(sale.discount || 0);
        let itemsDesc = '';
        if (sale.items && sale.items.length > 0) {
           itemsDesc = sale.items.map(item => {
              const dim = (item.length > 0 || item.width > 0) ? `${item.length || 0}x${item.width || 0}` : '';
              return `${item.roll_product_type || ''} ${item.roll_design || ''} ${item.roll_color || ''} ${dim}`.trim();
           }).filter(Boolean).join('\n');
        } else {
           itemsDesc = 'No items';
        }
        
        let remarks = sale.remarks && sale.remarks !== 'No remarks' ? `\nNote: ${sale.remarks}` : '';

        salesBody.push([
          sale.bill_number || sale.id,
          sale.customer_name || 'Walk-in',
          `${itemsDesc}${remarks}`.trim(),
          sale.sale_type,
          `PKR ${netAmount.toLocaleString()}`
        ]);
        
        // Also add additional stocks if any
        if (sale.additional_stocks && sale.additional_stocks.length > 0) {
            sale.additional_stocks.forEach(st => {
                const dim = (st.length > 0 || st.width > 0) ? `${st.length || 0}x${st.width || 0}` : '';
                const stDesc = `${st.stock_type || ''} ${st.design || ''} ${st.color || ''} ${dim}`.trim();
                salesBody.push([
                    `Add-on (${sale.bill_number || sale.id})`,
                    sale.customer_name || 'Walk-in',
                    stDesc,
                    'Additional',
                    `PKR ${parseFloat(st.total_payment || 0).toLocaleString()}`
                ]);
            });
        }
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Bill #', 'Customer Name', 'Items (Type, Design, Color, Size)', 'Type', 'Net Amount']],
        body: salesBody,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40] },
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
        columnStyles: { 2: { cellWidth: 70 }, 4: { halign: 'right' } }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("No sales recorded today.", 14, currentY);
      currentY += 10;
    }

    // --- EXPENSES TABLE ---
    if (todayExpensesList.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Today's Expenses", 14, currentY);
      currentY += 5;

      const expBody = todayExpensesList.map(exp => {
        const amount = parseFloat(String(exp.amount).replace(/[^0-9.]/g, '')) || 0;
        return [
          exp.description || 'No description',
          `PKR ${amount.toLocaleString()}`
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Expense Description', 'Amount']],
        body: expBody,
        theme: 'grid',
        headStyles: { fillColor: [180, 50, 50] },
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 140 }, 1: { halign: 'right' } }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("No expenses recorded today.", 14, currentY);
      currentY += 10;
    }

    // --- SUMMARY TABLE ---
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Financial Summary", 14, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [['Description', 'Amount']],
      body: [
        ['Total Sales (Gross + Additional)', `PKR ${grossSalesWithAdditional.toLocaleString()}`],
        ['Less: Additional Stock Cost', `- PKR ${todayAdditional.toLocaleString()}`],
        ["Less: Today's Expenses", `- PKR ${expToday.toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [184, 134, 11] },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right' } }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 120, 60);
    doc.text('Net Cash (To Shop Owner):', 14, finalY);
    doc.text(`PKR ${netCash.toLocaleString()}`, 196, finalY, { align: 'right' });

    doc.save(`Today_Summary_${shopId}_${todayStr}.pdf`);
  };

  if (loading) return (
    <div className="p-20 text-center font-black bronze-text animate-pulse italic uppercase tracking-[0.5em]">
      Synchronizing Intelligence...
    </div>
  );
  if (!stats) return null;

  const maxSale = Math.max(...stats.sales.dailyHistory.map(d => d.value), 100);
  const maxExpense = Math.max(...stats.expenses.dailyHistory.map(d => d.value), 100);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
            Business <span className="bronze-text underline decoration-primary/20 underline-offset-8">Metrics</span>
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[9px] tracking-[0.4em] mt-6 flex items-center gap-3">
            <Activity size={12} className="bronze-text" />
            Live data for {shopId === 'usman' ? 'Usman Carpet' : 'Hanif Carpet'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={generateTodayPDF}
            className="bg-zinc-800 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all border border-white/10 shadow-xl"
          >
            <FileText size={16} />
            Today Details
          </button>
          <button 
            onClick={() => onNavigate('Billing')}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Receipt size={18} strokeWidth={3} />
            Generate Bill
          </button>
        </div>
      </header>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Sales Analytics */}
        <div className="glass rounded-[3rem] p-8 border border-emerald-500/10 bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp size={24} className="text-emerald-500" />
              </div>
              <h4 className="text-xl font-black uppercase italic tracking-tight">
                Sales <span className="text-emerald-500">Analytics</span>
              </h4>
            </div>
            <BarChart3 size={20} className="text-zinc-700" />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Today</p>
              <p className="text-lg font-black text-emerald-500 italic">PKR {stats.sales.today.toLocaleString()}</p>
            </div>
            <div className="space-y-1 border-x border-white/5 px-4">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Weekly</p>
              <p className="text-lg font-black italic">PKR {stats.sales.weekly.toLocaleString()}</p>
            </div>
            <div className="space-y-1 pl-4">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Monthly</p>
              <p className="text-lg font-black italic">PKR {stats.sales.monthly.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-4 group">
            {stats.sales.dailyHistory.map((d, i) => (
              <ChartBar key={i} label={d.label} value={d.value} maxValue={maxSale} colorClass="bg-emerald-500" />
            ))}
          </div>
        </div>

        {/* Expense Log */}
        <div className="glass rounded-[3rem] p-8 border border-red-500/10 bg-red-500/[0.02]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <Wallet size={24} className="text-red-500" />
              </div>
              <h4 className="text-xl font-black uppercase italic tracking-tight">
                Expense <span className="text-red-500">Log</span>
              </h4>
            </div>
            <BarChart3 size={20} className="text-zinc-700" />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Today</p>
              <p className="text-lg font-black text-red-500 italic">PKR {stats.expenses.today.toLocaleString()}</p>
            </div>
            <div className="space-y-1 border-x border-white/5 px-4">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Weekly</p>
              <p className="text-lg font-black italic">PKR {stats.expenses.weekly.toLocaleString()}</p>
            </div>
            <div className="space-y-1 pl-4">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Monthly</p>
              <p className="text-lg font-black italic">PKR {stats.expenses.monthly.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-4 group">
            {stats.expenses.dailyHistory.map((d, i) => (
              <ChartBar key={i} label={d.label} value={d.value} maxValue={maxExpense} colorClass="bg-red-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <MetricCard 
          title="In Stock"
          value={`${stats.counts.rolls}`}
          subtext="Available Rolls"
          icon={Package}
          colorClass="bronze-text"
        />
        <MetricCard 
          title="Discounts"
          value={`PKR ${stats.sales.totalDiscount.toLocaleString()}`}
          subtext="Total Given"
          icon={Tag}
          colorClass="text-amber-500"
        />
        <MetricCard 
          title="Employees"
          value={stats.counts.employees}
          subtext="Active Staff"
          icon={Users}
          colorClass="text-blue-500"
        />
        <MetricCard 
          title="Factories"
          value={stats.counts.factories}
          subtext="Supply Partners"
          icon={Factory}
          colorClass="text-amber-500"
        />
      </div>

      {/* Status Bar */}
      <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
            <Activity size={28} className="bronze-text" />
          </div>
          <div>
            <h5 className="text-xs font-black uppercase tracking-[0.2em] italic">
              Operational Status: <span className="bronze-text">Optimal</span>
            </h5>
            <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">
              All data is live from backend — Sales, Returns, Stock & Expenses.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
        </div>
      </div>
    </div>
  );
}
