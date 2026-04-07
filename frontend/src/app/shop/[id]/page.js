'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Factory, 
  Receipt, 
  History, 
  Plus, 
  Search,
  ChevronRight,
  TrendingUp,
  ReceiptText
} from 'lucide-react';

import EmployeesModule from './EmployeesModule';
import StockModule from './StockModule';
import ExpensesModule from './ExpensesModule';
import FactoriesModule from './FactoriesModule';
import OverviewModule from './OverviewModule';
import BillingModule from './BillingModule';
import HistoryModule from './HistoryModule';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all group relative ${
      active 
      ? 'bg-primary/10 text-primary' 
      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
    }`}
  >
    <Icon size={18} className={active ? 'text-primary' : 'group-hover:text-primary transition-colors'} />
    <span className="font-bold text-[13px] tracking-wide uppercase">{label}</span>
    {active && (
      <motion.div 
        layoutId="activeTab"
        className="absolute -bottom-1 left-4 right-4 h-0.5 bg-primary shadow-[0_0_10px_#c5a059]" 
      />
    )}
  </button>
);

export default function ShopWorkspace() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Overview');
  
  const shopName = id === 'usman' ? 'Usman Carpet & Qaleen Center' : 'Hanif Carpet Premium Outlet';

  const renderModule = () => {
    switch (activeTab) {
      case 'Overview':
        return <OverviewModule onNavigate={setActiveTab} />;
      case 'Billing':
        return <BillingModule />;
      case 'History':
        return <HistoryModule />;
      case 'Employees':
        return <EmployeesModule />;
      case 'Stock':
        return <StockModule />;
      case 'Expenses':
        return <ExpensesModule />;
      case 'Factories':
        return <FactoriesModule />;
      default:
        return (
          <div className="glass rounded-[2rem] p-12 min-h-[500px] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6">
              <TrendingUp size={40} className="bronze-text opacity-40" />
            </div>
            <h3 className="text-xl font-black tracking-tight mb-4">{activeTab} Module</h3>
            <p className="text-zinc-500 max-w-md font-medium text-sm">
              This management interface for **{activeTab}** is specifically configured for the current shop. 
              Core data integration from Django will appear here.
            </p>
          </div>
        );
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Overview' },
    { icon: ReceiptText, label: 'Billing' },
    { icon: Package, label: 'Stock' },
    { icon: Users, label: 'Employees' },
    { icon: Factory, label: 'Factories' },
    { icon: Receipt, label: 'Expenses' },
    { icon: History, label: 'History' },
  ];

  return (
    <div dir="ltr" className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <header className="h-20 glass border-b border-border/50 px-8 flex items-center justify-between z-50 sticky top-0 backdrop-blur-xl">
        {/* Shop Logo & Name - Back to Left */}
        <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => window.location.href = '/dashboard'}>
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center font-black italic text-primary-foreground shadow-lg shadow-primary/20">
            {id?.[0]?.toUpperCase() || 'H'}
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight leading-none uppercase">{id} <span className="bronze-text italic">Shop</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Navigation Links - Moved to Right */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavItem 
                key={item.label} 
                icon={item.icon} 
                label={item.label} 
                active={activeTab === item.label}
                onClick={() => setActiveTab(item.label)}
              />
            ))}
          </nav>

          {/* Global Actions - Right after Nav */}
          <div className="flex items-center pl-6 ml-4 border-l border-border/30 h-8">
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest whitespace-nowrap"
            >
              Switch Shop
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-12 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto">
          {/* Modules Rendering */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1"
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
