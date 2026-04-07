'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Store, ArrowRight, ShieldCheck, Settings, LogOut } from 'lucide-react';

const ShopCard = ({ name, description, shopId, delay }) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -10, scale: 1.02 }}
    onClick={() => window.location.href = `/shop/${shopId}`}
    className="glass p-10 rounded-[2.5rem] group text-left relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
      <Store size={120} className="bronze-text" />
    </div>
    
    <div className="relative z-10">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 border border-primary/20 group-hover:bg-primary/20 transition-colors">
        <Store size={32} className="bronze-text" />
      </div>
      <h3 className="text-3xl font-black tracking-tight mb-3 group-hover:bronze-text transition-colors">{name}</h3>
      <p className="text-zinc-500 font-medium mb-8 max-w-[280px]">{description}</p>
      
      <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em] bronze-text">
        Enter Workspace
        <div className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
          <ArrowRight size={18} />
        </div>
      </div>
    </div>
  </motion.button>
);

export default function MasterDashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col p-8 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/3 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <header className="flex justify-between items-center mb-20 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-black italic text-primary-foreground">HM</div>
          <h1 className="text-xl font-black tracking-tighter italic">HM <span className="bronze-text">SYSTEM</span></h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 glass px-4 py-2 rounded-2xl border-emerald-500/20">
            <ShieldCheck size={18} className="text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-widest">Master Admin</span>
          </div>
          <button className="p-3 rounded-xl hover:bg-white/5 transition-colors"><Settings size={20} className="text-zinc-500" /></button>
          <button onClick={() => window.location.href = '/login'} className="p-3 rounded-xl hover:bg-red-500/10 transition-colors group">
            <LogOut size={20} className="text-zinc-500 group-hover:text-red-500" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-black uppercase tracking-[0.4em] bronze-text mb-4 block">Select Operational Hub</span>
          <h2 className="text-6xl font-black tracking-tighter max-w-2xl mx-auto leading-tight">
            Seamlessly Manage Your <span className="italic">Retail Network</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full mb-20">
          <ShopCard 
            name="Usman Carpet" 
            description="Qaleen Center & Retail Hub. Manage stock, employees and specialized billing."
            shopId="usman"
            delay={0.2}
          />
          <ShopCard 
            name="Hanif Carpet" 
            description="Premium Retail Outlet. Track inventory trends and branch expenses."
            shopId="hanif"
            delay={0.4}
          />
        </div>

        <div className="flex items-center gap-2 text-zinc-600 font-bold text-[10px] uppercase tracking-[0.2em]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
          System Operational & Secure
        </div>
      </main>
    </div>
  );
}
