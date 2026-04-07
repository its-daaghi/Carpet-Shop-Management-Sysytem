'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { 
  Search, 
  Trash2, 
  User, 
  Phone, 
  Calendar, 
  CreditCard, 
  Receipt, 
  ChevronRight, 
  Plus, 
  Package,
  Printer,
  History as HistoryIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';

export default function BillingModule() {
  const { id: shopId } = useParams();
  const [step, setStep] = useState(1); // 1: Select Stock, 2: Customer & Payment, 3: Success
  
  const [stock, setStock] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [customer, setCustomer] = useState({
    name: '',
    mobile: '',
    sale_type: 'Cash',
    paid_amount: 0,
    remarks: ''
  });

  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(false);

  const fetchStock = async () => {
    try {
      const resp = await fetch(`${API_BASE}/rolls/?shop=${shopId}`);
      if (resp.ok) {
        const data = await resp.json();
        setStock(data.filter(r => r.status === 'In Stock'));
      }
    } catch (err) {
      console.error("Failed to fetch stock", err);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [shopId]);

  // History moved to HistoryModule

  const addToCart = (roll) => {
    if (!cart.find(c => c.id === roll.id)) {
      setCart([...cart, { 
        ...roll, 
        unit_price: 0, 
        length: roll.length > 0 ? 0 : 1, 
        width: (roll.category === 'carpet' || roll.category === 'sheet' || roll.category === 'prayers' || roll.category === 'cut-pieces') ? (roll.length > 0 ? 12 : 1) : 1
      }]);
    }
  };

  // Helper: is this item area-based (length × width) or piece-based (just quantity)?
  const isAreaBased = (item) => 
    (item.category === 'carpet' || item.category === 'sheet' || item.category === 'prayers' || item.category === 'cut-pieces');

  // Calculate subtotal for one cart item
  const itemSubtotal = (item) => {
    if (isAreaBased(item)) {
      return (item.length || 0) * (item.width || 0) * (item.unit_price || 0);
    } else {
      // Piece-based: 'length' field holds the quantity
      return (item.length || 0) * (item.unit_price || 0);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateCartPrice = (id, price) => {
    setCart(cart.map(item => item.id === id ? { ...item, unit_price: parseFloat(price) || 0 } : item));
  };

  const updateCartLength = (id, length) => {
    setCart(cart.map(item => item.id === id ? { ...item, length: parseFloat(length) || 0 } : item));
  };

  const updateCartWidth = (id, width) => {
    setCart(cart.map(item => item.id === id ? { ...item, width: parseFloat(width) || 0 } : item));
  };

  const totalAmount = cart.reduce((sum, item) => sum + itemSubtotal(item), 0);
  const balanceAmount = totalAmount - customer.paid_amount;

  const handleSubmitSale = async () => {
    if (cart.length === 0) return alert("Please add items to cart");
    if (!customer.name) return alert("Please enter customer name");

    setLoading(true);
    const saleData = {
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      total_amount: totalAmount,
      paid_amount: customer.sale_type === 'Cash' ? totalAmount : parseFloat(customer.paid_amount) || 0,
      balance_amount: customer.sale_type === 'Cash' ? 0 : balanceAmount,
      sale_type: customer.sale_type,
      status: customer.sale_type === 'Cash' ? 'Paid' : (customer.paid_amount > 0 ? 'Partial' : 'Unpaid'),
      date: new Date().toISOString().split('T')[0],
      remarks: customer.remarks,
      items: cart.map(item => ({
        roll: item.id,
        length: item.length || 0,
        width: item.width || 0,
        unit_price: item.unit_price || 0,
        subtotal: itemSubtotal(item)
      }))
    };

    try {
      const resp = await fetch(`${API_BASE}/sales/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });

      if (resp.ok) {
        const result = await resp.json();
        setStep(3);
        fetchStock();
      } else {
        alert("Failed to save sale. Check console.");
      }
    } catch (err) {
      console.error("Sale submission failed", err);
    } finally {
      setLoading(false);
    }
  };

  // generateInvoice moved to HistoryModule

  const categories = ['All', ...new Set(stock.map(s => s.category || 'Uncategorized'))];

  const filteredStock = stock.filter(item => {
    const matchesSearch = (item.roll_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.product_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.design || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || (item.category || 'Uncategorized') === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">
            Sales & <span className="bronze-text">Billing</span>
          </h2>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-2">Professional Transaction Management</p>
        </div>
      </header>

      <AnimatePresence mode="wait">
          <motion.div 
            key="create" 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Side: Step Content */}
            <div className="lg:col-span-8 space-y-8">
              {step === 1 && (
                <div className="glass rounded-[3rem] p-8 border border-white/5 min-h-[600px] flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black uppercase italic tracking-tight">Step 1: <span className="bronze-text">Select Stock</span></h3>
                    <div className="relative w-64">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                      <input 
                        type="text" placeholder="Search by Roll ID..."
                        className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary transition-all text-sm font-bold"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-6 mb-2 scrollbar-none">
                    {categories.map(cat => (
                      <button 
                        key={cat} onClick={() => setActiveCategory(cat)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeCategory === cat ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white hover:border-white/20'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[450px] pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                    {filteredStock.map(item => {
                      const isInCart = cart.some(c => c.id === item.id);
                      return (
                        <div 
                          key={item.id} onClick={() => !isInCart && addToCart(item)}
                          className={`p-6 rounded-3xl border transition-all cursor-pointer group ${isInCart ? 'bg-emerald-500/10 border-emerald-500/50 opacity-50' : 'bg-white/5 border-white/5 hover:border-primary/50'}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center bronze-text font-black text-xs">
                              <Package size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{item.status}</span>
                          </div>
                          <h5 className="font-black uppercase tracking-tight text-sm">{item.roll_id}</h5>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{item.product_type} • {item.design}</p>
                          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{item.length}m x {item.width}m</span>
                            <div className={`p-2 rounded-lg ${isInCart ? 'bg-emerald-500 text-white' : 'bg-primary/10 bronze-text group-hover:bg-primary group-hover:text-black'} transition-all`}>
                               {isInCart ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {filteredStock.length === 0 && (
                      <div className="col-span-2 py-20 text-center text-zinc-600 italic font-black uppercase tracking-[0.3em]">No items found in active stock</div>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Customer Info */}
                  <div className="glass rounded-[3rem] p-8 border border-white/5">
                    <h3 className="text-xl font-black uppercase italic tracking-tight mb-8">Customer <span className="bronze-text">Details</span></h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Client Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                          <input 
                            type="text" placeholder="Enter name..."
                            className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-primary transition-all font-black text-sm"
                            value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Mobile Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                          <input 
                            type="text" placeholder="03xx-xxxxxxx"
                            className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-primary transition-all font-black text-sm"
                            value={customer.mobile} onChange={(e) => setCustomer({...customer, mobile: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 pt-4">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Remarks</label>
                        <textarea 
                          rows={3} placeholder="Add any specific notes..."
                          className="w-full bg-black/20 border border-white/5 rounded-xl p-4 outline-none focus:border-primary transition-all font-medium text-xs h-32"
                          value={customer.remarks} onChange={(e) => setCustomer({...customer, remarks: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="glass rounded-[3rem] p-8 border border-white/5">
                    <h3 className="text-xl font-black uppercase italic tracking-tight mb-8">Payment <span className="bronze-text">Type</span></h3>
                    <div className="grid grid-cols-3 gap-3 mb-10">
                      {['Cash', 'Advance', 'Udhar'].map(t => (
                        <button 
                          key={t} onClick={() => setCustomer({...customer, sale_type: t})}
                          className={`py-6 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${customer.sale_type === t ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-white'}`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-6">
                      {customer.sale_type === 'Advance' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Advance Amount Paid</label>
                          <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={18} />
                            <input 
                              type="number" placeholder="0.00"
                              className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-4 outline-none focus:border-primary transition-all font-black text-sm"
                              value={customer.paid_amount} onChange={(e) => setCustomer({...customer, paid_amount: e.target.value})}
                            />
                          </div>
                        </div>
                      )}

                      <div className="p-8 rounded-[2rem] bg-black/30 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                          <span className="text-zinc-500">Gross Sale</span>
                          <span>PKR {totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] border-t border-white/5 pt-4">
                          <span className="text-zinc-500">Total Paid</span>
                          <span className="text-emerald-500">PKR {customer.sale_type === 'Cash' ? totalAmount.toLocaleString() : (parseFloat(customer.paid_amount) || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] border-t border-white/5 pt-4">
                          <span className="text-zinc-500">Net Balance</span>
                          <span className="text-red-500">PKR {(customer.sale_type === 'Cash' ? 0 : balanceAmount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="glass rounded-[3rem] p-16 border border-emerald-500/20 flex flex-col items-center text-center justify-center min-h-[600px] animate-in zoom-in-95 duration-700">
                  <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/20 flex items-center justify-center mb-8">
                    <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={3} />
                  </div>
                  <h3 className="text-5xl font-black italic uppercase tracking-tighter bronze-text mb-4">Transaction Successful</h3>
                  <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.4em] max-w-sm">The sale record has been securely committed to the database and inventory levels updated.</p>
                  
                  <div className="flex gap-4 mt-12 w-full max-w-md">
                    <button 
                      onClick={() => { setStep(1); }}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-2xl py-5 font-black uppercase text-[10px] tracking-widest border border-white/10 transition-all flex items-center justify-center gap-3"
                    >
                      <HistoryIcon size={18} />
                      Go Back
                    </button>
                    <button 
                      onClick={() => setStep(1)}
                      className="flex-1 bg-primary text-black rounded-2xl py-5 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/30 transition-all flex items-center justify-center gap-3"
                    >
                      <Plus size={18} strokeWidth={3} />
                      New Transaction
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Cart Summary (Sticky) */}
            {step !== 3 && (
              <div className="lg:col-span-4 space-y-6">
                <div className="glass rounded-[3rem] p-8 border border-white/5 sticky top-24">
                  <div className="flex items-center gap-3 mb-8">
                    <Receipt size={24} className="bronze-text" />
                    <h4 className="text-xl font-black uppercase italic tracking-tight">Checkout <span className="bronze-text">Summary</span></h4>
                  </div>

                  <div className="space-y-4 mb-10 min-h-[100px] max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/5">
                    {cart.map(item => (
                      <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 group relative">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{item.roll_id}</p>
                        <div className="mt-4 flex flex-col gap-2">
                          
                          {(item.category === 'carpet' || item.category === 'sheet' || item.category === 'prayers' || item.category === 'cut-pieces') && stock.find(s => s.id === item.id)?.length > 0 ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-zinc-400">Length (Feet)</span>
                                <input 
                                  type="number" step="0.1" placeholder="0.0"
                                  className="w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-right font-black text-xs bronze-text outline-none focus:border-primary transition-all"
                                  value={item.length} onChange={(e) => updateCartLength(item.id, e.target.value)}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-zinc-400">Width (Feet)</span>
                                <input 
                                  type="number" step="0.1" placeholder="12.0"
                                  className="w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-right font-black text-xs bronze-text outline-none focus:border-primary transition-all"
                                  value={item.width} onChange={(e) => updateCartWidth(item.id, e.target.value)}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-zinc-400">Quantity (Pieces)</span>
                              <input 
                                type="number" step="1" placeholder="1"
                                className="w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-right font-black text-xs bronze-text outline-none focus:border-primary transition-all"
                                value={item.length} onChange={(e) => updateCartLength(item.id, e.target.value)}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-zinc-400">Unit Price</span>
                            <input 
                              type="number" placeholder="0.00"
                              className="w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-right font-black text-xs bronze-text outline-none focus:border-primary transition-all"
                              value={item.unit_price} onChange={(e) => updateCartPrice(item.id, e.target.value)}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                             <span className="text-[9px] font-bold text-zinc-400">Subtotal</span>
                             <span className="text-[10px] font-black text-emerald-500">PKR {Number(itemSubtotal(item).toFixed(2)).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <div className="py-12 text-center text-zinc-700 italic font-black uppercase text-[10px] tracking-widest">Cart is empty</div>
                    )}
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] italic">
                      <span className="text-zinc-500">Subtotal</span>
                      <span>PKR {totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-black uppercase tracking-tighter italic bronze-text pt-2">
                      <span>Grand Total</span>
                      <span>PKR {totalAmount.toLocaleString()}</span>
                    </div>
                    
                    <button 
                      onClick={() => setStep(step === 1 ? 2 : 1)}
                      disabled={cart.length === 0}
                      className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-4 flex items-center justify-center gap-3 transition-all ${cart.length === 0 ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      {step === 1 ? 'Configure Client & Payment' : 'Back to Stock Selection'}
                      <ChevronRight size={18} />
                    </button>
                    
                    {step === 2 && (
                      <button 
                        onClick={handleSubmitSale}
                        disabled={loading || !customer.name}
                        className="w-full bg-primary text-black py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                        {loading ? 'Processing...' : 'Complete & Finalize Bill'}
                        {!loading && <CheckCircle2 size={18} strokeWidth={3} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
