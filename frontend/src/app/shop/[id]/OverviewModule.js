'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { 
  TrendingUp, 
  Package, 
  Users, 
  Wallet, 
  Factory,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Layers,
  BarChart3,
  Receipt,
  Plus
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';

const MetricCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass rounded-[2rem] p-6 relative overflow-hidden group border border-white/5"
  >
    <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}>
      <Icon size={80} />
    </div>
    <div className="relative z-10">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${colorClass} bg-opacity-10`}>
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
          transition={{ duration: 1, ease: "easeOut" }}
          className={`w-full ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity rounded-t-xl`}
        />
        <div className="absolute top-2 w-full text-center text-[8px] font-black text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
          {value.toLocaleString()}
        </div>
      </div>
      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center h-4">{label}</span>
    </div>
  );
};

export default function OverviewModule({ onNavigate }) {
  const { id: shopId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    sales: { today: 0, weekly: 0, monthly: 0, dailyHistory: [] },
    expenses: { today: 0, weekly: 0, monthly: 0, dailyHistory: [] },
    counts: { rolls: 0, employees: 0, factories: 0 }
  });

  const fetchData = async () => {
    try {
      const shopParam = `?shop=${shopId}`;
      const [rolls, expenses, sales, employees, factories] = await Promise.all([
        fetch(`${API_BASE}/rolls/${shopParam}`).then(r => r.json()),
        fetch(`${API_BASE}/expenses/${shopParam}`).then(r => r.json()),
        fetch(`${API_BASE}/sales/${shopParam}`).then(r => r.json()),
        fetch(`${API_BASE}/employees/${shopParam}`).then(r => r.json()),
        fetch(`${API_BASE}/factories/`).then(r => r.json())
      ]);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const processMetrics = (items) => {
        let todayVal = 0, weeklyVal = 0, monthlyVal = 0;
        const history = {};

        items.forEach(item => {
          const itemDate = new Date(item.date);
          const amount = parseFloat(item.total_amount || item.amount.replace(/[^0-9.]/g, '')) || 0;
          const dateStr = item.date;

          // Today
          if (dateStr === todayStr) todayVal += amount;

          // Weekly (last 7 days)
          const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) weeklyVal += amount;

          // Monthly (current calendar month)
          if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) {
            monthlyVal += amount;
          }

          // Daily History (last 7 days for graph)
          if (diffDays <= 7) {
            history[dateStr] = (history[dateStr] || 0) + amount;
          }
        });

        // Fill missing days in history
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const s = d.toISOString().split('T')[0];
          last7Days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), value: history[s] || 0 });
        }

        return { today: todayVal, weekly: weeklyVal, monthly: monthlyVal, dailyHistory: last7Days };
      };

      setData({
        sales: processMetrics(Array.isArray(sales) ? sales : []),
        expenses: processMetrics(Array.isArray(expenses) ? expenses : []),
        counts: { rolls: rolls.length, employees: employees.length, factories: factories.length }
      });
      setLoading(false);
    } catch (err) {
      console.error("Dashboard failed", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [shopId]);

  if (loading) return <div className="p-20 text-center font-black bronze-text animate-pulse italic uppercase tracking-[0.5em]">Synchronizing Intelligence...</div>;

  const maxSale = Math.max(...data.sales.dailyHistory.map(d => d.value), 100);
  const maxExpense = Math.max(...data.expenses.dailyHistory.map(d => d.value), 100);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
            Business <span className="bronze-text underline decoration-primary/20 underline-offset-8">Metrics</span>
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[9px] tracking-[0.4em] mt-6 flex items-center gap-3">
            <Activity size={12} className="bronze-text" />
            Live ecosystem data for {shopId === 'usman' ? 'Usman Carpet' : 'Hanif Carpet'}
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => onNavigate('Billing')}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Receipt size={18} strokeWidth={3} />
            Generate Bill
          </button>
        </div>
      </header>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Sales Dashboard */}
        <div className="glass rounded-[3rem] p-8 border border-emerald-500/10 bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp size={24} className="text-emerald-500" />
              </div>
              <h4 className="text-xl font-black uppercase italic tracking-tight">Sales <span className="text-emerald-500">Analytics</span></h4>
            </div>
            <BarChart3 size={20} className="text-zinc-700" />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Today</p>
              <p className="text-lg font-black text-emerald-500 italic">PKR {data.sales.today.toLocaleString()}</p>
            </div>
            <div className="space-y-1 border-x border-white/5 px-4">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Weekly</p>
              <p className="text-lg font-black italic">PKR {data.sales.weekly.toLocaleString()}</p>
            </div>
            <div className="space-y-1 pl-4">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Monthly</p>
              <p className="text-lg font-black italic">PKR {data.sales.monthly.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-4 group">
            {data.sales.dailyHistory.map((d, i) => (
              <ChartBar key={i} label={d.label} value={d.value} maxValue={maxSale} colorClass="bg-emerald-500" />
            ))}
          </div>
        </div>

        {/* Expenses Dashboard */}
        <div className="glass rounded-[3rem] p-8 border border-red-500/10 bg-red-500/[0.02]">
           <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <Wallet size={24} className="text-red-500" />
              </div>
              <h4 className="text-xl font-black uppercase italic tracking-tight">Expense <span className="text-red-500">Log</span></h4>
            </div>
            <BarChart3 size={20} className="text-zinc-700" />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Today</p>
              <p className="text-lg font-black text-red-500 italic">PKR {data.expenses.today.toLocaleString()}</p>
            </div>
            <div className="space-y-1 border-x border-white/5 px-4">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Weekly</p>
              <p className="text-lg font-black italic">PKR {data.expenses.weekly.toLocaleString()}</p>
            </div>
            <div className="space-y-1 pl-4">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Monthly</p>
              <p className="text-lg font-black italic">PKR {data.expenses.monthly.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-4 group">
            {data.expenses.dailyHistory.map((d, i) => (
              <ChartBar key={i} label={d.label} value={d.value} maxValue={maxExpense} colorClass="bg-red-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard 
          title="Warehouse Stock"
          value={`${data.counts.rolls} Units`}
          subtext="Available Inventory"
          icon={Package}
          colorClass="bronze-text"
        />
        <MetricCard 
          title="Team Strength"
          value={data.counts.employees}
          subtext="Active Employees"
          icon={Users}
          colorClass="text-blue-500"
        />
        <MetricCard 
          title="Factory Network"
          value={data.counts.factories}
          subtext="Supply Chain Partners"
          icon={Factory}
          colorClass="text-amber-500"
        />
      </div>

      <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center animate-pulse">
             <Activity size={28} className="bronze-text" />
          </div>
          <div>
            <h5 className="text-xs font-black uppercase tracking-[0.2em] italic">Operational Status: <span className="bronze-text">Optimal</span></h5>
            <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">All system logs are synchronized within 0.5s latency.</p>
          </div>
        </div>
        <div className="flex -space-x-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[10px] font-black bronze-text">
              {i}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
