'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowLeft
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';

const FactoryCard = ({ factory, onSelect }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass rounded-3xl p-6 cursor-pointer group relative overflow-hidden"
    onClick={() => onSelect(factory)}
  >
    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
      <Factory size={80} className="bronze-text" />
    </div>
    
    <div className="relative z-10">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
        <Factory size={28} className="bronze-text" />
      </div>
      <h4 className="text-xl font-black tracking-tight mb-2 uppercase italic">{factory.name}</h4>
      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
          <Phone size={14} className="bronze-text" />
          {factory.mobile}
        </div>
        <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
          <MapPin size={14} className="bronze-text" />
          {factory.address || 'No Address'}
        </div>
      </div>
      
      <div className="mt-8 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Rolls Received</span>
          <span className="text-lg font-black bronze-text">{(factory.rolls || []).length}</span>
        </div>
        <button className="p-3 rounded-xl bg-white/5 hover:bg-primary/20 text-zinc-500 hover:text-primary transition-all">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  </motion.div>
);

const FactoryDetails = ({ factory, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('Mall'); // Mall, Payments
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const { id: shopId } = useParams();

  const handlePostPayment = async () => {
    if (!amount) return;
    try {
      const resp = await fetch(`${API_BASE}/factory-payments/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factory: factory.id,
          amount: `PKR ${amount}`,
          remarks: remarks || 'No remarks',
          date: new Date().toLocaleDateString(),
          month: new Date().toLocaleString('default', { month: 'long' }),
        })
      });
      if (resp.ok) {
        onRefresh();
        setAmount('');
        setRemarks('');
      }
    } catch (err) {
      console.error("Payment failed", err);
    }
  };

  const deletePayment = async (payId) => {
    if (window.confirm('Delete this payment record?')) {
      try {
        await fetch(`${API_BASE}/factory-payments/${payId}/?shop=${shopId}`, { method: 'DELETE' });
        onRefresh();
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-primary/20 transition-colors group">
            <ArrowLeft size={24} className="bronze-text group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <h3 className="text-3xl font-black tracking-tighter uppercase italic">{factory.name}</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">{factory.mobile} • {factory.address}</p>
          </div>
        </div>
        
        <div className="flex gap-2 glass p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('Mall')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'Mall' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            Mall Detail
          </button>
          <button 
            onClick={() => setActiveTab('Payments')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'Payments' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            Payment History
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'Mall' ? (
            <div className="glass rounded-[2.5rem] p-10">
              <div className="flex items-center gap-4 mb-8">
                <Package size={24} className="bronze-text" />
                <h4 className="text-2xl font-black uppercase tracking-tight italic">Goods <span className="bronze-text">Received</span></h4>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-primary/20">
                {(factory.rolls || []).length > 0 ? (
                  factory.rolls.map((roll, i) => (
                    <div key={roll.id || i} className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-border/50 group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center">
                          <Package size={20} className="text-primary/40 group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight">{roll.roll_id} <span className="text-zinc-500 font-medium lowercase ml-2">({roll.product_type})</span></p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{roll.design} • {roll.color} • {roll.length}x{roll.width}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${roll.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                          {roll.status}
                        </span>
                        <p className="text-[9px] text-zinc-600 font-bold mt-2 uppercase tracking-widest">Added {new Date(roll.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-border">
                    <Package size={48} className="mx-auto text-zinc-700 mb-4 opacity-20" />
                    <p className="text-zinc-500 font-bold italic">No goods have been recorded from this factory yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass rounded-[2.5rem] p-10">
              <div className="flex items-center gap-4 mb-8">
                <History size={24} className="bronze-text" />
                <h4 className="text-2xl font-black uppercase tracking-tight italic">Payment <span className="bronze-text">Archive</span></h4>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-primary/20">
                {(factory.payments || []).length > 0 ? (
                  factory.payments.map((pay, i) => (
                    <motion.div 
                      key={pay.id || i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-border/50 group hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                          <Receipt size={24} className="text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-black text-sm uppercase tracking-tight italic">{pay.remarks}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{pay.date} • {pay.month}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="text-2xl font-black bronze-text tracking-tighter italic">{pay.amount}</p>
                        <button 
                          onClick={() => deletePayment(pay.id)}
                          className="p-2.5 rounded-xl bg-red-500/5 text-red-500/0 group-hover:text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-border">
                    <Receipt size={48} className="mx-auto text-zinc-700 mb-4 opacity-20" />
                    <p className="text-zinc-500 font-bold italic">No payment records found for this factory.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar (1/3) - Actions */}
        <div className="space-y-8">
          <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Calculator size={80} className="bronze-text" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Calculator size={24} className="bronze-text" />
                </div>
                <h4 className="text-xl font-black uppercase tracking-tight italic">Record <span className="bronze-text">Payment</span></h4>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Payment Amount (PKR)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-border rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all font-black text-lg"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Note / Remarks</label>
                  <textarea 
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-white/5 border border-border rounded-2xl px-5 py-4 focus:border-primary outline-none transition-all font-medium text-sm h-32 resize-none"
                    placeholder="e.g. Clearing balance for Jan stock..."
                  />
                </div>
                <button 
                  onClick={handlePostPayment}
                  disabled={!amount}
                  className="w-full bg-primary text-primary-foreground py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
                >
                  Post Payment
                </button>
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-[2.5rem] bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center gap-4 mb-4">
              <Wallet size={20} className="text-emerald-500" />
              <h5 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">Summary Account</h5>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-emerald-500/10">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Total Items</span>
                <span className="font-black text-emerald-500">{(factory.rolls || []).length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-emerald-500/10">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Payments Made</span>
                <span className="font-black text-emerald-500">{(factory.payments || []).length}</span>
              </div>
              <p className="text-[9px] text-zinc-600 font-bold italic mt-4 text-center">System automatically tracks all inventory and financial transactions for audit.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function FactoriesModule() {
  const { id: shopId } = useParams();
  const [view, setView] = useState('list'); // list, add, details
  const [factories, setFactories] = useState([]);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [newFactory, setNewFactory] = useState({ name: '', mobile: '', address: '' });

  const fetchFactories = async () => {
    try {
      const resp = await fetch(`${API_BASE}/factories/`);
      if (resp.ok) {
        const data = await resp.json();
        setFactories(data);
        if (selectedFactory) {
          const updated = data.find(f => f.id === selectedFactory.id);
          if (updated) setSelectedFactory(updated);
        }
      }
    } catch (err) {
      console.error("Fetch factories failed", err);
    }
  };

  useEffect(() => {
    fetchFactories();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch(`${API_BASE}/factories/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFactory)
      });
      if (resp.ok) {
        fetchFactories();
        setView('list');
        setNewFactory({ name: '', mobile: '', address: '' });
      }
    } catch (err) {
      console.error("Register failed", err);
    }
  };

  const handleDeleteFactory = async (id) => {
    if (window.confirm("Are you sure you want to delete this factory?")) {
      try {
        await fetch(`${API_BASE}/factories/${id}/?shop=${shopId}`, { method: 'DELETE' });
        fetchFactories();
        setView('list');
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {view === 'list' && (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black tracking-tighter uppercase italic">Factory <span className="bronze-text underline decoration-primary/30 underline-offset-8">Partners</span></h3>
                <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-3 ml-1">Manage your supply network and payment settlements</p>
              </div>
              <button 
                onClick={() => setView('add')}
                className="bg-primary text-primary-foreground px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center gap-4 shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus size={20} strokeWidth={3} />
                Add New Factory
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {factories.map((f) => (
                <FactoryCard 
                  key={f.id} 
                  factory={f} 
                  onSelect={(fact) => {
                    setSelectedFactory(fact);
                    setView('details');
                  }} 
                />
              ))}
              {factories.length === 0 && (
                <div className="col-span-full py-24 text-center glass rounded-[3rem] border-dashed border-2 border-border/50">
                  <Factory size={64} className="mx-auto text-zinc-800 mb-6 opacity-20" />
                  <h4 className="text-xl font-black uppercase text-zinc-600 italic">No Factories Registered</h4>
                  <p className="text-zinc-500 text-sm font-medium mt-2">Start by registering a factory to track your goods and payments.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'add' && (
          <motion.div 
            key="add"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-xl mx-auto py-10"
          >
            <div className="glass p-12 rounded-[3.5rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Plus size={160} className="bronze-text" />
              </div>
              
              <button onClick={() => setView('list')} className="absolute top-10 right-10 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors z-20">
                <X size={24} />
              </button>
              
              <div className="relative z-10">
                <h3 className="text-3xl font-black tracking-tight mb-2 uppercase italic">Register <span className="bronze-text">Factory</span></h3>
                <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-10">Enter complete supplier information</p>
                
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Factory Full Name</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full bg-white/5 border border-border rounded-2xl px-6 py-4.5 focus:border-primary outline-none transition-all font-black text-lg"
                      placeholder="e.g. Faisalabad Textile Hub"
                      value={newFactory.name}
                      onChange={(e) => setNewFactory({...newFactory, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Contact / Mobile Number</label>
                    <div className="relative">
                      <Phone size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/40" />
                      <input 
                        type="tel" 
                        required 
                        className="w-full bg-white/5 border border-border rounded-2xl pl-16 pr-6 py-4.5 focus:border-primary outline-none transition-all font-bold"
                        placeholder="03xx-xxxxxxx"
                        value={newFactory.mobile}
                        onChange={(e) => setNewFactory({...newFactory, mobile: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Physical Address</label>
                    <div className="relative">
                      <MapPin size={20} className="absolute left-6 top-6 text-primary/40" />
                      <textarea 
                        className="w-full bg-white/5 border border-border rounded-2xl pl-16 pr-6 py-4.5 focus:border-primary outline-none transition-all font-medium h-32 resize-none"
                        placeholder="Complete factory location..."
                        value={newFactory.address}
                        onChange={(e) => setNewFactory({...newFactory, address: e.target.value})}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-primary text-primary-foreground py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 mt-8 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Confirm Registration
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'details' && selectedFactory && (
          <FactoryDetails 
            factory={selectedFactory} 
            onBack={() => setView('list')} 
            onRefresh={fetchFactories}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
