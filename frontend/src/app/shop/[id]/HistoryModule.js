'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { 
  Phone, 
  Calendar, 
  History as HistoryIcon,
  Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';

export default function HistoryModule() {
  const { id: shopId } = useParams();
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('All'); // 'All', 'Cash', 'Credit'

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

  useEffect(() => {
    fetchSalesHistory();
  }, [shopId]);

  const generateInvoice = (sale) => {
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
    doc.text('PREMIUM FLOORING SOLUTIONS', 14, 32);

    // Bill Info
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text('INVOICE / BILL', 14, 55);
    
    doc.setFontSize(10);
    doc.text(`Invoice No: #SALE-${sale.id}`, 14, 65);
    doc.text(`Date: ${sale.date}`, 14, 70);
    doc.text(`Payment Type: ${sale.sale_type}`, 14, 75);

    // Customer Info
    doc.text('BILL TO:', 120, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(sale.customer_name, 120, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(sale.customer_mobile || 'N/A', 120, 75);

    // Items Table
    const tableData = sale.items.map((item, index) => {
      const sqft = (item.length || 0) * (item.width || 0);
      return [
        index + 1,
        `Roll: ${item.roll_id_str || item.roll || 'N/A'}`,
        `${item.length || 0} ft x ${item.width || 0} ft (${sqft} sqft)`,
        `PKR ${Number(item.unit_price || 0).toLocaleString()}`,
        `PKR ${Number(item.subtotal || 0).toLocaleString()}`
      ];
    });

    autoTable(doc, {
      startY: 90,
      head: [['#', 'Description', 'Dimensions', 'Unit Price', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [184, 134, 11] },
      margin: { left: 14, right: 14 }
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text('Total Amount:', 140, finalY);
    doc.text(`PKR ${sale.total_amount.toLocaleString()}`, 180, finalY, { align: 'right' });
    
    doc.text('Paid Amount:', 140, finalY + 7);
    doc.text(`PKR ${sale.paid_amount.toLocaleString()}`, 180, finalY + 7, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', 140, finalY + 16);
    doc.text(`PKR ${sale.balance_amount.toLocaleString()}`, 180, finalY + 16, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business! This is a system-generated invoice.', 105, 280, { align: 'center' });

    doc.save(`Invoice_${sale.customer_name}_${sale.date}.pdf`);
  };

  const filteredHistory = salesHistory.filter(sale => {
    if (historyFilter === 'Cash') return sale.sale_type === 'Cash';
    if (historyFilter === 'Credit') return sale.sale_type === 'Advance' || sale.sale_type === 'Udhar';
    return true;
  });

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
         <div className="flex items-center justify-between mb-10">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <HistoryIcon size={24} className="bronze-text" />
             </div>
             <h3 className="text-2xl font-black uppercase italic tracking-tight">Sale <span className="bronze-text">History Archive</span></h3>
           </div>
           
           <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 font-black text-[9px] uppercase tracking-widest overflow-hidden">
             {['All', 'Cash', 'Credit'].map(filterOption => (
               <button 
                 key={filterOption}
                 onClick={() => setHistoryFilter(filterOption)}
                 className={`px-6 py-2 rounded-xl transition-all ${historyFilter === filterOption ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-white'}`}
               >
                 {filterOption === 'Credit' ? 'Advance/Udhar' : filterOption}
               </button>
             ))}
           </div>
         </div>

         <div className="space-y-4">
           {filteredHistory.slice().reverse().map((sale) => (
             <div key={sale.id} className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all group">
               <div className="flex flex-wrap items-center justify-between gap-6">
                 <div className="flex items-center gap-6">
                   <div className="w-14 h-14 rounded-2xl bg-black/20 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-black uppercase text-zinc-500 leading-none">ID</span>
                      <span className="text-sm font-black text-primary italic">#{sale.id}</span>
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

                 <div className="flex items-center gap-12">
                   <div className="text-right">
                     <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Total Amount</p>
                     <p className="font-black italic text-lg tracking-tighter">PKR {sale.total_amount.toLocaleString()}</p>
                   </div>
                   
                   <div className="text-right border-l border-white/5 pl-12 min-w-[150px]">
                     <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${sale.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                       {sale.status}
                     </span>
                     <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-3">{sale.sale_type}</p>
                   </div>

                   <button 
                     onClick={() => generateInvoice(sale)}
                     className="w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-primary group-hover:text-black transition-all flex items-center justify-center text-zinc-500 shadow-lg border border-white/5"
                   >
                     <Printer size={20} />
                   </button>
                 </div>
               </div>
             </div>
           ))}
           {filteredHistory.length === 0 && (
             <div className="py-40 text-center text-zinc-700 italic font-black uppercase tracking-[0.5em]">No transactions recorded in history archive</div>
           )}
         </div>
      </motion.div>
    </div>
  );
}
