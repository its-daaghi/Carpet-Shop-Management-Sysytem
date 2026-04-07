'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';
import { useParams } from 'next/navigation';
import { 
  Package, 
  Grid, 
  Layers, 
  FileText, 
  Users, 
  Plus, 
  X, 
  ChevronRight, 
  Search, 
  Hash, 
  Maximize2, 
  Palette,
  ArrowLeft,
  ScanLine,
  Trash2,
  CheckSquare,
  Square,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CategoryCard = ({ title, icon: Icon, count, onClick, color = "bronze" }) => (
  <motion.div 
    whileHover={{ y: -8, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="glass rounded-[2rem] p-8 cursor-pointer group relative overflow-hidden h-64 flex flex-col justify-between"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full translate-x-8 -translate-y-8 group-hover:bg-primary/10 transition-colors pointer-events-none`} />
    
    <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-6">
      <Icon size={32} className="bronze-text group-hover:scale-110 transition-transform" />
    </div>

    <div>
      <h4 className="text-2xl font-black tracking-tighter uppercase italic">{title}</h4>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{count} Items in Stock</span>
        <ChevronRight size={18} className="text-zinc-700 group-hover:text-primary transition-colors" />
      </div>
    </div>
  </motion.div>
);

export default function StockModule() {
  const { id: shopId } = useParams();
  const [view, setView] = useState('categories'); // categories, carpet-manager
  const [subView, setSubView] = useState('rolls'); // rolls, designs, add-roll, add-registry
  const [registryStep, setRegistryStep] = useState('type'); // type, design, color
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRolls, setSelectedRolls] = useState([]);
  const [confirmingDelete, setConfirmingDelete] = useState(null); // { type: 'roll'|'design', id: string }
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inventory States
  const [productTypes, setProductTypes] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [productCombinations, setProductCombinations] = useState([]);
  const [rolls, setRolls] = useState([]);
  const [factories, setFactories] = useState([]);

  // Form States
  const [newType, setNewType] = useState('');
  const [newDesign, setNewDesign] = useState({ product_type: '', name: '' });
  const [newColorEntry, setNewColorEntry] = useState({ product_type: '', design: '', colors: '' });
  const [newRoll, setNewRoll] = useState({ id: '', product_type: '', design: '', color: '', length: '', width: '', quantity: 1, factory: '' });

  const categories = [
    { id: 'carpet', title: 'Carpet', icon: Layers, count: rolls.filter(r => r.category === 'carpet').length },
    ...(shopId !== 'hanif' ? [{ id: 'qaleen', title: 'Qaleen', icon: Grid, count: rolls.filter(r => r.category === 'qaleen').length }] : []),
    { id: 'sheet', title: 'Sheet', icon: FileText, count: rolls.filter(r => r.category === 'sheet').length },
    { id: 'prayers', title: 'Prayers', icon: Users, count: rolls.filter(r => r.category === 'prayers').length },
    { id: 'mate', title: 'Mate', icon: Package, count: rolls.filter(r => r.category === 'mate').length },
    { id: 'cut-pieces', title: 'Cut Pieces', icon: Plus, count: rolls.filter(r => r.category === 'cut-pieces').length },
  ];
  
  const fetchAllData = async () => {
    try {
      const shopParam = shopId ? `?shop=${shopId}` : '';
      const respRolls = await fetch(`${API_BASE}/rolls/${shopParam}`);
      const respTypes = await fetch(`${API_BASE}/types/${shopParam}`);
      const respDesigns = await fetch(`${API_BASE}/designs/${shopParam}`);
      const respFactories = await fetch(`${API_BASE}/factories/`);
      
      if (respRolls.ok) setRolls(await respRolls.json());
      if (respFactories.ok) setFactories(await respFactories.json());
      if (respTypes.ok) {
        const tData = await respTypes.json();
        setProductTypes(tData); // Store full objects now
      }
      if (respDesigns.ok) {
         const dData = await respDesigns.json();
         setDesigns(dData.map(d => ({ 
           id: d.id, 
           product_type: d.product_type_name || d.product_type, 
           name: d.name,
           category: d.product_type_category || '' 
         })));
         
         setProductCombinations(dData.map(d => ({
           id: d.id,
           product_type: d.product_type_name || d.product_type,
           design: d.name,
           colors: d.colors ? d.colors.map(c => c.name) : []
         })));
      }
    } catch (err) {
      console.error("Failed to fetch data from API", err);
    }
  };

  // Sync localStorage to DB once on mount if empty
  useEffect(() => {
    const syncData = async () => {
      await fetchAllData();
      
      const localRolls = localStorage.getItem('hm_rolls');
      if (localRolls) {
        const parsed = JSON.parse(localRolls);
        // Only sync if DB is empty to avoid duplicates
        if (rolls.length === 0 && parsed.length > 0) {
          for (const r of parsed) {
            await fetch(`${API_BASE}/rolls/?shop=${shopId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roll_id: r.id,
                product_type: r.type,
                design: r.design,
                color: r.color,
                length: r.length,
                width: r.width,
                status: r.status
              })
            });
          }
          await fetchAllData();
          localStorage.removeItem('hm_rolls');
        }
      }
    };
    syncData();
  }, []);

  const handleAddType = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch(`${API_BASE}/types/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newType, category: selectedCategory.id })
      });
      if (resp.ok) {
        await fetchAllData();
        setNewType('');
        setRegistryStep('design');
      }
    } catch (err) {
      console.error("Add Type failed", err);
    }
  };

  const handleAddDesign = async (e) => {
    e.preventDefault();
    // Logic to find type ID
    try {
      const shopParam = shopId ? `?shop=${shopId}` : '';
      const typeResp = await fetch(`${API_BASE}/types/${shopParam}`);
      const types = await typeResp.json();
      const typeId = types.find(t => t.name === newDesign.product_type)?.id;

      if (!typeId) {
        console.error("Type not found in DB");
        return;
      }

      const resp = await fetch(`${API_BASE}/designs/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: typeId, name: newDesign.name })
      });
      if (resp.ok) {
        await fetchAllData();
        setNewDesign({ product_type: '', name: '' });
        setRegistryStep('color');
      }
    } catch (err) {
      console.error("Add Design failed", err);
    }
  };

  const handleAddColorEntry = async (e) => {
    e.preventDefault();
    try {
      const shopParam = shopId ? `?shop=${shopId}` : '';
      const designResp = await fetch(`${API_BASE}/designs/${shopParam}`);
      const designsData = await designResp.json();
      const designId = designsData.find(d => d.name === newColorEntry.design && (d.product_type_name === newColorEntry.product_type || d.product_type === newColorEntry.product_type))?.id;

      if (!designId) {
        console.error("Design not found in DB");
        return;
      }

      const colors = newColorEntry.colors.split(',').map(c => c.trim());
      for (const colorName of colors) {
        await fetch(`${API_BASE}/colors/?shop=${shopId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ design: designId, name: colorName })
        });
      }
      await fetchAllData();
      setSubView('rolls');
      setNewColorEntry({ product_type: '', design: '', colors: '' });
    } catch (err) {
      console.error("Add Color failed", err);
    }
  };

  const handleAddRoll = async (e) => {
    e.preventDefault();
    try {
      // For Mate: auto-generate roll_id if not provided
      const rollId = newRoll.id || (selectedCategory?.id === 'mate' 
        ? `MATE-${Date.now()}` 
        : newRoll.id);

      const resp = await fetch(`${API_BASE}/rolls/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roll_id: rollId,
          category: selectedCategory.id,
          product_type: newRoll.product_type || (selectedCategory.id === 'mate' ? 'Mate' : ''),
          design: newRoll.design || (selectedCategory.id === 'mate' ? 'N/A' : ''),
          color: newRoll.color || (selectedCategory.id === 'mate' ? 'N/A' : ''),
          length: parseFloat(newRoll.length) || 0,
          width: parseFloat(newRoll.width) || 0,
          quantity: parseInt(newRoll.quantity) || 1,
          factory: newRoll.factory || null,
          status: 'In Stock'
        })
      });
      if (resp.ok) {
        await fetchAllData();
        setSubView('rolls');
        setNewRoll({ id: '', product_type: '', design: '', color: '', length: '', width: '', quantity: 1, factory: '' });
      } else {
        let errorMsg = 'Could not save entry.';
        try {
          const errorData = await resp.json();
          // Show field-specific errors in plain language
          const fieldErrors = Object.entries(errorData)
            .map(([field, msgs]) => `• ${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join('\n');
          errorMsg = fieldErrors || errorMsg;
        } catch (_) {}
        alert(`❌ Error:\n${errorMsg}`);
      }
    } catch (err) {
      console.error('Add Roll failed', err);
      alert('❌ Server connection failed. Is the backend running? (127.0.0.1:8000)');
    }
  };

  const handleDeleteRoll = async (id) => {
    // Note: id in rolls is now the database ID
    const rollToDelete = rolls.find(r => r.roll_id === id || r.id === id);
    if (!rollToDelete) return;

    if (confirmingDelete?.id === id && confirmingDelete?.type === 'roll') {
      try {
        const resp = await fetch(`${API_BASE}/rolls/${rollToDelete.id}/?shop=${shopId}`, { method: 'DELETE' });
        if (resp.ok) {
          await fetchAllData();
          setSelectedRolls(prev => prev.filter(rid => rid !== id));
          setConfirmingDelete(null);
        }
      } catch (err) {
        console.error("Delete Roll failed", err);
      }
    } else {
      setConfirmingDelete({ type: 'roll', id });
      setTimeout(() => setConfirmingDelete(prev => prev?.id === id ? null : prev), 3000);
    }
  };

  const handleDeleteMultipleRolls = async () => {
    if (!selectedRolls.length) return;
    if (confirmingDelete?.type === 'bulk') {
      try {
        for (const rid of selectedRolls) {
          const rObj = rolls.find(r => r.roll_id === rid || r.id === rid);
          if (rObj) await fetch(`${API_BASE}/rolls/${rObj.id}/?shop=${shopId}`, { method: 'DELETE' });
        }
        await fetchAllData();
        setSelectedRolls([]);
        setConfirmingDelete(null);
      } catch (err) {
        console.error("Bulk delete failed", err);
      }
    } else {
      setConfirmingDelete({ type: 'bulk', id: 'bulk' });
      setTimeout(() => setConfirmingDelete(prev => prev?.type === 'bulk' ? null : prev), 3000);
    }
  };

  const handleDeleteDesign = async (id) => {
    if (confirmingDelete?.id === id && confirmingDelete?.type === 'design') {
      try {
        const resp = await fetch(`${API_BASE}/designs/${id}/?shop=${shopId}`, { method: 'DELETE' });
        if (resp.ok) {
          await fetchAllData();
          setConfirmingDelete(null);
        }
      } catch (err) {
         console.error("Delete Design failed", err);
      }
    } else {
      setConfirmingDelete({ type: 'design', id });
      setTimeout(() => setConfirmingDelete(prev => prev?.id === id ? null : prev), 3000);
    }
  };

  const toggleRollSelection = (id) => {
    setSelectedRolls(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const filteredRolls = rolls.filter(roll => {
    if (roll.category !== selectedCategory?.id) return false;
    const query = searchQuery.toLowerCase();
    return (
      (roll.roll_id || '').toLowerCase().includes(query) ||
      (roll.product_type || '').toLowerCase().includes(query) ||
      (roll.design || '').toLowerCase().includes(query) ||
      (roll.color || '').toLowerCase().includes(query)
    );
  });

  const generateStockPDF = () => {
    try {
      const doc = new jsPDF();
      const shopName = shopId ? shopId.charAt(0).toUpperCase() + shopId.slice(1) : 'Shop';
      const categoryName = selectedCategory?.title || 'Inventory';
      
      // Add Header
      doc.setFontSize(22);
      doc.setTextColor(184, 134, 11); // Bronze color
      doc.text(`${shopName} ${categoryName} Stock Report`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
      
      const totalQuantity = filteredRolls.reduce((sum, r) => sum + (r.quantity || 1), 0);
      doc.text(`Total Items: ${filteredRolls.length} (${totalQuantity} pieces)`, 14, 34);

      if (filteredRolls.length === 0) {
        alert("No items found in this category to export.");
        return;
      }

      const tableData = [];
      
      // Group data for the table similar to the UI grouping
      const grouped = filteredRolls.reduce((acc, roll) => {
        const type = roll.product_type || 'Uncategorized';
        if (!acc[type]) acc[type] = {};
        const design = roll.design || 'Natural';
        if (!acc[type][design]) acc[type][design] = [];
        acc[type][design].push(roll);
        return acc;
      }, {});

      Object.entries(grouped).forEach(([type, designs]) => {
        Object.entries(designs).forEach(([design, items]) => {
          items.forEach((roll, index) => {
            tableData.push([
              index === 0 ? type : '', // Only show Type on first row of group
              index === 0 ? design : '', // Only show Design on first row of group
              roll.roll_id,
              roll.color,
              selectedCategory?.id === 'mate' ? `${roll.quantity || 1} Pcs` : `${roll.length} x ${roll.width}`,
              roll.status
            ]);
          });
        });
      });

      autoTable(doc, {
        startY: 40,
        head: [['Type', 'Design', 'ID', 'Color', selectedCategory?.id === 'mate' ? 'Quantity' : 'Dimensions', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [184, 134, 11], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { fontStyle: 'italic' }
        },
        didDrawPage: (data) => {
          // Footer
          doc.setFontSize(8);
          doc.text(`Page ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
      });

      doc.save(`${shopId || 'shop'}_${selectedCategory?.id || 'stock'}_inventory.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("PDF download failed. Please check if your stock has data and try again.");
    }
  };

  const generateAllStockPDF = () => {
    try {
      const doc = new jsPDF();
      const shopName = shopId ? shopId.charAt(0).toUpperCase() + shopId.slice(1) : 'Shop';
      
      // Add Header
      doc.setFontSize(22);
      doc.setTextColor(184, 134, 11); // Bronze color
      doc.text(`${shopName} Complete Stock Report`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
      
      const totalQuantity = rolls.reduce((sum, r) => sum + (r.quantity || 1), 0);
      doc.text(`Total Items: ${rolls.length} (${totalQuantity} pieces)`, 14, 34);

      if (rolls.length === 0) {
        alert("No items found in stock to export.");
        return;
      }

      const tableData = [];
      
      // Group data: Category -> Type -> Design -> Items
      const grouped = rolls.reduce((acc, roll) => {
        const cat = categories.find(c => c.id === roll.category)?.title || roll.category || 'Uncategorized';
        const type = roll.product_type || 'Uncategorized';
        const design = roll.design || 'Natural';
        
        if (!acc[cat]) acc[cat] = {};
        if (!acc[cat][type]) acc[cat][type] = {};
        if (!acc[cat][type][design]) acc[cat][type][design] = [];
        acc[cat][type][design].push(roll);
        return acc;
      }, {});

      let currentY = 44;

      Object.entries(grouped).forEach(([cat, types]) => {
        // Add page if needed
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }

        // Draw Category Heading
        doc.setFontSize(14);
        doc.setTextColor(184, 134, 11); // Bronze 
        doc.text(`Category: ${cat.toUpperCase()}`, 14, currentY);
        currentY += 6;

        const tableData = [];
        Object.entries(types).forEach(([type, designs]) => {
          Object.entries(designs).forEach(([design, items]) => {
            items.forEach((roll, index) => {
              tableData.push([
                index === 0 ? type : '',
                index === 0 ? design : '',
                roll.roll_id,
                roll.color,
                roll.category === 'mate' ? `${roll.quantity || 1} Pcs` : `${roll.length} ft x ${roll.width} ft`,
                roll.status
              ]);
            });
          });
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Type', 'Design', 'ID', 'Color', 'Dimensions/Qty', 'Status']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [184, 134, 11], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3 },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { fontStyle: 'italic' }
          },
          didDrawPage: (data) => {
            doc.setFontSize(8);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
          }
        });

        currentY = doc.lastAutoTable.finalY + 15;
      });

      doc.save(`${shopId || 'shop'}_complete_inventory.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("PDF download failed. Please check if your stock has data and try again.");
    }
  };

  const renderCategories = () => (
    <div className="space-y-12">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black tracking-tighter uppercase italic">Inventory <span className="bronze-text">Stock</span></h3>
          <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.2em] mt-2">Select a category to manage individual items</p>
        </div>
        <button 
          onClick={generateAllStockPDF}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-primary hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest"
        >
          <Download size={18} />
          Export All PDF
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map((cat) => (
          <CategoryCard 
            key={cat.id}
            {...cat}
            onClick={() => {
              setSelectedCategory(cat);
              setView('category-details');
            }}
          />
        ))}
      </div>
    </div>
  );

  const [showEntryOptions, setShowEntryOptions] = useState(false);

  const renderCategoryDetails = () => (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => { setView('categories'); setShowEntryOptions(false); }}
            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            <ArrowLeft size={24} className="bronze-text" />
          </button>
          <div className="flex flex-col">
            <h3 className="text-2xl font-black tracking-tighter uppercase italic">{selectedCategory?.title} <span className="bronze-text opacity-40 italic ml-2">Stock Inventory</span></h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) 
                ? `Listing all registered ${selectedCategory?.title} rolls` 
                : ['mate', 'qaleen'].includes(selectedCategory?.id)
                ? `Managing ${selectedCategory?.title} pieces in bulk`
                : `Managing ${selectedCategory?.title} inventory items`}
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) && (
            <div className="glass p-1 rounded-2xl flex opacity-40 hover:opacity-100 transition-opacity">
              <button 
                onClick={() => { setSubView('rolls'); setShowEntryOptions(false); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'rolls' ? 'bg-primary text-primary-foreground' : 'text-zinc-500'}`}
              >
                Rolls
              </button>
              <button 
                onClick={() => { setSubView('designs'); setShowEntryOptions(false); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'designs' ? 'bg-primary text-primary-foreground' : 'text-zinc-500'}`}
              >
                Hierarchy
              </button>
            </div>
          )}

          <button 
            onClick={generateStockPDF}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 hover:text-primary hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest"
          >
            <Download size={18} />
            Export PDF
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowEntryOptions(!showEntryOptions)}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20"
            >
              <Plus size={18} strokeWidth={3} className={showEntryOptions ? 'rotate-45 transition-transform' : 'transition-transform'} />
              Stock Entry
            </button>

            <AnimatePresence>
              {showEntryOptions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-56 glass border border-primary/20 rounded-3xl p-3 z-50 shadow-2xl"
                >
                  <button 
                    onClick={() => { setSubView('add-roll'); setShowEntryOptions(false); }}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-primary/10 text-zinc-300 hover:text-primary transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20">
                      <Hash size={18} />
                    </div>
                      <span className="font-bold text-xs uppercase tracking-widest">{['mate', 'qaleen'].includes(selectedCategory?.id) ? 'Piece' : 'Roll'} Entry</span>
                  </button>
                  
                  {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) && (
                    <button 
                      onClick={() => { setSubView('add-registry'); setRegistryStep('type'); setShowEntryOptions(false); }}
                      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-primary/10 text-zinc-300 hover:text-primary transition-all group mt-1"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20">
                        <Palette size={18} />
                      </div>
                      <span className="font-bold text-xs uppercase tracking-widest">Type Entry</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {subView === 'rolls' && (
        <div className="relative space-y-6">
          <div className="flex items-center gap-4 max-w-md">
            <div className="relative flex-1 group">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="Search by Type, Design, or Roll ID..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-5 py-4 focus:border-primary outline-none transition-all font-bold text-sm placeholder:text-zinc-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X size={12} className="text-zinc-400" />
                </button>
              )}
            </div>
          </div>

          <div className="glass rounded-[2.5rem] overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <table className="w-full text-left">
              <thead>
              <tr className="bg-white/5 border-b border-border/50">
                <th className="px-6 py-4 w-12">
                  <button 
                    onClick={() => {
                      if (selectedRolls.length === rolls.length) setSelectedRolls([]);
                      else setSelectedRolls(rolls.map(r => r.id));
                    }}
                    className="text-zinc-600 hover:text-primary transition-colors"
                  >
                    {selectedRolls.length === rolls.length ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="px-8 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? 'Roll ID' : 'Item ID'}
                </th>
                <th className="px-8 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? 'Color / Detail' : 'Information'}
                </th>
                <th className="px-8 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? 'Dimensions' : 'Quantity'}
                </th>
                <th className="px-8 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? (
                // Grouped View for Hierarchical Categories
                Object.entries(
                  filteredRolls.reduce((acc, roll) => {
                    const type = roll.product_type || 'Uncategorized';
                    if (!acc[type]) acc[type] = {};
                    const design = roll.design || 'Natural';
                    if (!acc[type][design]) acc[type][design] = [];
                    acc[type][design].push(roll);
                    return acc;
                  }, {})
                ).map(([type, designs]) => (
                  <React.Fragment key={type}>
                    {/* Type Header */}
                    <tr className="bg-primary/5">
                      <td className="px-6 py-2"></td>
                      <td colSpan={5} className="px-8 py-2">
                        <span className="text-[10px] font-black bronze-text uppercase tracking-[0.3em] italic">{type}</span>
                      </td>
                    </tr>
                    {Object.entries(designs).map(([design, items]) => (
                      <React.Fragment key={design}>
                        {/* Design Sub-header */}
                        <tr className="bg-white/5 border-b border-border/10">
                          <td className="px-6 py-2"></td>
                          <td colSpan={5} className="px-10 py-2">
                             <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{design}</span>
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black bronze-text">
                                {items.length} {selectedCategory?.id === 'mate' ? (items.length === 1 ? 'Type' : 'Types') : (items.length === 1 ? 'Roll' : 'Rolls')}
                              </span>
                              {['mate', 'qaleen'].includes(selectedCategory?.id) && (
                                <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[9px] font-black text-primary">
                                  {items.reduce((sum, r) => sum + (r.quantity || 1), 0)} Pieces Total
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {items.map((roll) => (
                          <tr key={roll.id} className={`border-b border-border/10 hover:bg-white/[0.02] transition-colors group ${selectedRolls.includes(roll.id) ? 'bg-primary/5' : ''}`}>
                            <td className="px-6 py-3">
                              <button 
                                onClick={() => toggleRollSelection(roll.id)}
                                className={`transition-colors ${selectedRolls.includes(roll.id) ? 'text-primary' : 'text-zinc-700 group-hover:text-zinc-500'}`}
                              >
                                {selectedRolls.includes(roll.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                              </button>
                            </td>
                            <td className="px-10 py-3">
                              <div className="flex items-center gap-3">
                                <Hash size={14} className="text-primary opacity-50" />
                                <span className="font-black text-sm tracking-tight">{roll.roll_id}</span>
                              </div>
                            </td>
                            <td className="px-8 py-3">
                              <span className="font-bold text-sm tracking-tight text-zinc-300">{roll.color}</span>
                            </td>
                            <td className="px-8 py-3">
                              <div className="flex items-center gap-3">
                                {['mate', 'qaleen'].includes(selectedCategory?.id) ? (
                                  <span className="text-xs font-black text-primary">{roll.quantity || 1} <span className="text-[9px] opacity-70">PCS</span></span>
                                ) : (
                                  <>
                                    <span className="text-xs font-bold bg-secondary/30 px-2 py-0.5 rounded border border-border/50">{roll.length} <span className="text-[9px] opacity-60">ft</span></span>
                                    <X size={10} className="text-zinc-700" />
                                    <span className="text-xs font-bold bg-secondary/30 px-2 py-0.5 rounded border border-border/50">{roll.width} <span className="text-[9px] opacity-60">ft</span></span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-3">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${roll.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                                {roll.status}
                              </span>
                            </td>
                            <td className="px-8 py-3">
                              <div className="flex items-center gap-2">
                                <button className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-zinc-500 hover:text-primary transition-all">
                                  <ChevronRight size={14} />
                                </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRoll(roll.roll_id); }}
                                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 border ${
                                      confirmingDelete?.id === roll.roll_id && confirmingDelete?.type === 'roll'
                                        ? 'bg-red-500 text-white border-red-600 scale-110 shadow-lg' 
                                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'
                                    }`}
                                    title={confirmingDelete?.id === roll.roll_id ? "Click again to confirm" : "Delete Roll"}
                                  >
                                    {confirmingDelete?.id === roll.roll_id && confirmingDelete?.type === 'roll' ? (
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Confirm?</span>
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                // Flat List for Simplified Categories
                filteredRolls.map((roll) => (
                  <tr key={roll.id} className={`border-b border-border/20 hover:bg-white/[0.02] transition-colors group ${selectedRolls.includes(roll.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleRollSelection(roll.id)}
                        className={`transition-colors ${selectedRolls.includes(roll.id) ? 'text-primary' : 'text-zinc-700 group-hover:text-zinc-500'}`}
                      >
                        {selectedRolls.includes(roll.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <Hash size={16} className="text-primary opacity-50" />
                        <span className="font-black tracking-tight">{roll.roll_id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <p className="font-bold text-sm tracking-tight">{roll.design || 'Item Detail'}</p>
                    </td>
                    {['mate', 'qaleen'].includes(selectedCategory?.id) && (
                      <td className="px-8 py-4">
                        <span className="text-sm font-black text-primary">{roll.quantity || 1} <span className="text-[9px] opacity-70">PCS</span></span>
                      </td>
                    )}
                    <td className="px-8 py-4">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${roll.status === 'In Stock' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                        {roll.status}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 text-zinc-500 hover:text-primary transition-all">
                          <ChevronRight size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteRoll(roll.roll_id); }}
                          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 border ${
                            confirmingDelete?.id === roll.roll_id && confirmingDelete?.type === 'roll'
                              ? 'bg-red-500 text-white border-red-600 scale-105 shadow-xl' 
                              : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'
                          }`}
                          title={confirmingDelete?.id === roll.roll_id ? "Click again to confirm" : "Delete Item"}
                        >
                          {confirmingDelete?.id === roll.roll_id && confirmingDelete?.type === 'roll' ? (
                            <span className="text-[10px] font-black uppercase tracking-widest">Really Delete?</span>
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
          </div>

          <AnimatePresence>
            {selectedRolls.length > 0 && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 z-[100]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckSquare size={18} className="text-primary" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest text-zinc-300">
                    {selectedRolls.length} Rolls Selected
                  </span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <button 
                  onClick={handleDeleteMultipleRolls}
                  className={`flex items-center gap-3 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                    confirmingDelete?.type === 'bulk'
                      ? 'bg-red-500 text-white border-red-600 animate-pulse' 
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'
                  }`}
                >
                  <Trash2 size={16} />
                  {confirmingDelete?.type === 'bulk' ? 'Are you sure? Click again' : 'Delete Selected'}
                </button>
                <button 
                  onClick={() => setSelectedRolls([])}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {subView === 'designs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {productCombinations.filter(c => {
            const relatedType = productTypes.find(t => t.name === c.product_type);
            return relatedType?.category === selectedCategory?.id;
          }).map((combo) => (
            <div key={combo.id} className="glass p-8 rounded-[2rem] border-primary/10 hover:border-primary/30 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center">
                  <Palette size={28} className="bronze-text" />
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-zinc-600 hover:text-white transition-colors">
                    <Maximize2 size={18} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteDesign(combo.id); }}
                    className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 border ${
                      confirmingDelete?.id === combo.id && confirmingDelete?.type === 'design'
                        ? 'bg-red-500 text-white border-red-600 scale-105 shadow-xl' 
                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'
                    }`}
                    title={confirmingDelete?.id === combo.id ? "Click again to confirm" : "Delete Design"}
                  >
                    {confirmingDelete?.id === combo.id && confirmingDelete?.type === 'design' ? (
                      <span className="text-[10px] font-black uppercase tracking-widest">Confirm?</span>
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h4 className="text-2xl font-black tracking-tight tracking-tighter uppercase italic">{combo.design}</h4>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">{combo.product_type}</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                  <span className="text-lg font-black bronze-text leading-none">
                    {rolls.filter(r => r.product_type === combo.product_type && r.design === combo.design).length}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-tight text-zinc-500">Rolls</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                {combo.colors.map(color => (
                  <span key={color} className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-zinc-400 border border-border/50">{color}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {subView === 'add-registry' && (
        <div className="max-w-3xl mx-auto glass p-12 rounded-[3.5rem] border border-primary/5">
          {/* Registry Stepper */}
          <div className="flex items-center justify-center gap-10 mb-12">
            {[
              { id: 'type', label: '1. Type Entry' },
              { id: 'design', label: '2. Design Entry' },
              { id: 'color', label: '3. Color Entry' }
            ].map((step) => (
              <button 
                key={step.id} 
                onClick={() => setRegistryStep(step.id)}
                className="flex flex-col items-center gap-3 group outline-none"
              >
                <div className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${registryStep === step.id ? 'text-primary' : 'text-zinc-600 group-hover:text-zinc-400'}`}>{step.label}</div>
                <div className={`h-1.5 w-24 rounded-full transition-all ${registryStep === step.id ? 'bg-primary shadow-[0_0_10px_#c5a059]' : 'bg-white/5 group-hover:bg-white/10'}`} />
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {registryStep === 'type' && (
              <motion.div
                key="type-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-10">
                  <h4 className="text-3xl font-black italic uppercase italic">Register <span className="bronze-text">Product Type</span></h4>
                  <p className="text-zinc-500 text-xs font-bold mt-2 uppercase tracking-widest italic leading-relaxed max-sm mx-auto">Enter a new category type like Flora, Graphic, Silk, etc.</p>
                </div>
                <form onSubmit={handleAddType} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Type Name</label>
                    <input 
                      type="text" required
                      className="w-full bg-white/5 border border-border/50 rounded-2xl px-6 py-5 focus:border-primary outline-none transition-all font-black text-lg placeholder:text-zinc-700"
                      placeholder="e.g. Flora Silk"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-4 mt-4">
                    <button type="submit" className="flex-1 bg-primary text-primary-foreground py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 group">
                      Save & Next Step
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (newType && !productTypes.includes(newType)) {
                          setProductTypes([...productTypes, newType]);
                          setNewType('');
                        }
                        setSubView('rolls');
                      }}
                      className="px-8 bg-white/5 hover:bg-white/10 text-zinc-400 py-5 rounded-2xl font-black uppercase tracking-widest transition-all"
                    >
                      Finish
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {registryStep === 'design' && (
              <motion.div
                key="design-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-10">
                  <h4 className="text-3xl font-black italic uppercase italic">Register <span className="bronze-text">Design</span></h4>
                  <p className="text-zinc-500 text-xs font-bold mt-2 uppercase tracking-widest italic leading-relaxed max-w-sm mx-auto">Link a specific design pattern to a product type.</p>
                </div>
                <form onSubmit={handleAddDesign} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Select Type</label>
                      <select 
                        required
                        className="w-full bg-white/5 border border-border/50 rounded-2xl px-6 py-5 focus:border-primary outline-none transition-all font-black appearance-none text-lg"
                        value={newDesign.product_type}
                        onChange={(e) => setNewDesign({...newDesign, product_type: e.target.value})}
                      >
                        <option value="" className="bg-background">Choose Type...</option>
                        {productTypes.map(t => <option key={t.id || t} value={t.name || t} className="bg-background">{t.name || t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Design Name</label>
                      <input 
                        type="text" required
                        className="w-full bg-white/5 border border-border/50 rounded-2xl px-6 py-5 focus:border-primary outline-none transition-all font-black text-lg"
                        placeholder="e.g. Persian Royal V2"
                        value={newDesign.name}
                        onChange={(e) => setNewDesign({...newDesign, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <button type="submit" className="flex-1 bg-primary text-primary-foreground py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20">
                      Save & Next Step
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (newDesign.product_type && newDesign.name) {
                          setDesigns([...designs, { ...newDesign, id: Date.now() }]);
                          setNewDesign({ product_type: '', name: '' });
                        }
                        setSubView('rolls');
                      }}
                      className="px-8 bg-white/5 hover:bg-white/10 text-zinc-400 py-5 rounded-2xl font-black uppercase tracking-widest transition-all"
                    >
                      Finish
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {registryStep === 'color' && (
              <motion.div
                key="color-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-10">
                  <h4 className="text-3xl font-black italic uppercase italic">Register <span className="bronze-text">Colors</span></h4>
                  <p className="text-zinc-500 text-xs font-bold mt-2 uppercase tracking-widest italic leading-relaxed max-w-sm mx-auto">Assign specific colors to your Type and Design combination.</p>
                </div>
                <form onSubmit={handleAddColorEntry} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Select Type</label>
                      <select 
                        required
                        className="w-full bg-white/5 border border-border/50 rounded-2xl px-6 py-5 focus:border-primary outline-none transition-all font-black appearance-none"
                        value={newColorEntry.product_type}
                        onChange={(e) => setNewColorEntry({...newColorEntry, product_type: e.target.value, design: ''})}
                      >
                        <option value="" className="bg-background">Choose Type...</option>
                        {productTypes.map(t => <option key={t.id || t} value={t.name || t} className="bg-background">{t.name || t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Select Design</label>
                      <select 
                        required
                        disabled={!newColorEntry.product_type}
                        className="w-full bg-white/5 border border-border/50 rounded-2xl px-6 py-5 focus:border-primary outline-none transition-all font-black appearance-none disabled:opacity-30"
                        value={newColorEntry.design}
                        onChange={(e) => setNewColorEntry({...newColorEntry, design: e.target.value})}
                      >
                        <option value="" className="bg-background">Choose Design...</option>
                        {designs.filter(d => d.product_type === newColorEntry.product_type).map(d => (
                          <option key={d.id} value={d.name} className="bg-background">{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-2">Available Colors (Comma separated)</label>
                    <input 
                      type="text" required
                      className="w-full bg-white/5 border border-border/50 rounded-2xl px-6 py-5 focus:border-primary outline-none transition-all font-black"
                      placeholder="e.g. Ruby Red, Emerald Blue, Sand Beige"
                      value={newColorEntry.colors}
                      onChange={(e) => setNewColorEntry({...newColorEntry, colors: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-4 mt-4">
                    <button type="submit" className="flex-1 bg-primary text-primary-foreground py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20">
                      Complete & Exit
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (newColorEntry.product_type && newColorEntry.design && newColorEntry.colors) {
                          setProductCombinations([...productCombinations, { 
                            ...newColorEntry, 
                            id: Date.now(), 
                            colors: newColorEntry.colors.split(',').map(c => c.trim()) 
                          }]);
                          setNewColorEntry({ product_type: '', design: '', colors: '' });
                        }
                        setSubView('rolls');
                      }}
                      className="px-8 bg-white/5 hover:bg-white/10 text-zinc-400 py-5 rounded-2xl font-black uppercase tracking-widest transition-all"
                    >
                      Just Finish
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {subView === 'add-roll' && (
        <div className="max-w-2xl mx-auto glass p-12 rounded-[3.5rem] border border-primary/5">
          <div className="text-center mb-8">
            <h4 className="text-3xl font-black italic uppercase italic">
              {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? 'Register ' : 'Add '}
              <span className="bronze-text">
                {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? 'New Roll' : 'Inventory Item'}
              </span>
            </h4>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">
              {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) 
                ? 'Physical Entry into warehouse' 
                : 'Log new stock for the selected category'}
            </p>
          </div>
          <form onSubmit={handleAddRoll} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Purchased From (Factory)</label>
              <select 
                className="w-full bg-white/5 border border-border/50 rounded-2xl px-6 py-4.5 focus:border-primary outline-none transition-all font-black appearance-none text-primary italic"
                value={newRoll.factory}
                onChange={(e) => setNewRoll({...newRoll, factory: e.target.value})}
              >
                <option value="" className="bg-background">Internal Stock / No Factory</option>
                {factories.map(f => (
                  <option key={f.id} value={f.id} className="bg-background">{f.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Roll ID / Number</label>
                <div className="relative">
                  <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input 
                    type="text" {... (selectedCategory?.id !== 'mate' ? {required: true} : {})}
                    className="w-full bg-white/5 border border-border/50 rounded-xl pl-14 pr-5 py-4 focus:border-primary outline-none transition-all font-black"
                    placeholder={['mate', 'qaleen'].includes(selectedCategory?.id) ? 'Optional ID' : 'e.g. R-505'}
                    value={newRoll.id}
                    onChange={(e) => setNewRoll({...newRoll, id: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                  {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? 'Select Type & Design' : 'Design Name'}
                </label>
                {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? (
                  <select 
                    className="w-full bg-white/5 border border-border/50 rounded-xl px-5 py-4 focus:border-primary outline-none transition-all font-black appearance-none truncate"
                    value={newRoll.product_type && newRoll.design ? `${newRoll.product_type}|${newRoll.design}` : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                         setNewRoll({...newRoll, design: '', product_type: '', color: ''});
                         return;
                      }
                      const combo = productCombinations.find(c => `${c.product_type}|${c.design}` === val);
                      setNewRoll({...newRoll, design: combo?.design || '', product_type: combo?.product_type || '', color: ''});
                    }}
                    required
                  >
                    <option value="" className="bg-background italic">Choose Combo...</option>
                    {productCombinations.filter(c => {
                      const relatedType = productTypes.find(t => t.name === c.product_type);
                      return relatedType?.category === selectedCategory?.id;
                    }).map(c => (
                      <option key={c.id} value={`${c.product_type}|${c.design}`} className="bg-background">{c.product_type} / {c.design}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text"
                    className="w-full bg-white/5 border border-border/50 rounded-xl px-5 py-4 focus:border-primary outline-none transition-all font-black"
                    placeholder="e.g. Traditional Pattern (Optional)"
                    value={newRoll.design}
                    onChange={(e) => setNewRoll({...newRoll, design: e.target.value})}
                  />
                )}
              </div>
            </div>

            {/* Piece-based: Color + Quantity + Length + Width — all in one flat row */}
            {['mate', 'qaleen'].includes(selectedCategory?.id) ? (
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Color Name (Optional)</label>
                  <input 
                    type="text"
                    className="w-full bg-white/5 border border-border/50 rounded-xl px-4 py-4 focus:border-primary outline-none transition-all font-black"
                    placeholder="e.g. Beige"
                    value={newRoll.color}
                    onChange={(e) => setNewRoll({...newRoll, color: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Quantity</label>
                  <input 
                    type="number" min="1"
                    className="w-full bg-white/5 border border-border/50 rounded-xl px-4 py-4 focus:border-primary outline-none transition-all font-black text-primary"
                    placeholder="Pieces"
                    value={newRoll.quantity}
                    onChange={(e) => setNewRoll({...newRoll, quantity: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Length (Optional)</label>
                  <input 
                    type="text"
                    className="w-full bg-white/5 border border-border/50 rounded-xl px-4 py-4 focus:border-primary outline-none transition-all font-black"
                    placeholder="e.g. 3ft"
                    value={newRoll.length}
                    onChange={(e) => setNewRoll({...newRoll, length: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Width (Optional)</label>
                  <input 
                    type="text"
                    className="w-full bg-white/5 border border-border/50 rounded-xl px-4 py-4 focus:border-primary outline-none transition-all font-black"
                    placeholder="e.g. 2ft"
                    value={newRoll.width}
                    onChange={(e) => setNewRoll({...newRoll, width: e.target.value})}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
                    {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? 'Select Color' : 'Color Entry'}
                  </label>
                  {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? (
                    <select 
                      disabled={!newRoll.design || !newRoll.product_type}
                      className="w-full bg-white/5 border border-border/50 rounded-xl px-5 py-4 focus:border-primary outline-none transition-all font-black appearance-none disabled:opacity-30"
                      value={newRoll.color}
                      onChange={(e) => setNewRoll({...newRoll, color: e.target.value})}
                      required
                    >
                      <option value="" className="bg-background">Choose Color...</option>
                      {productCombinations.find(c => c.design === newRoll.design && c.product_type === newRoll.product_type)?.colors.map(color => (
                        <option key={color} value={color} className="bg-background">{color}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" required
                      className="w-full bg-white/5 border border-border/50 rounded-xl px-5 py-4 focus:border-primary outline-none transition-all font-black"
                      placeholder="e.g. Crimson Red"
                      value={newRoll.color}
                      onChange={(e) => setNewRoll({...newRoll, color: e.target.value})}
                    />
                  )}
                </div>
                {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Length</label>
                      <input 
                        type="text" required
                        className="w-full bg-white/5 border border-border/50 rounded-xl px-4 py-4 focus:border-primary outline-none transition-all font-black"
                        placeholder="50ft"
                        value={newRoll.length}
                        onChange={(e) => setNewRoll({...newRoll, length: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Width</label>
                      <input 
                        type="text" required
                        className="w-full bg-white/5 border border-border/50 rounded-xl px-4 py-4 focus:border-primary outline-none transition-all font-black"
                        placeholder="12ft"
                        value={newRoll.width}
                        onChange={(e) => setNewRoll({...newRoll, width: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <button type="submit" className="w-full bg-primary text-primary-foreground py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 mt-4">
              {['carpet', 'sheet', 'prayers', 'cut-pieces'].includes(selectedCategory?.id) ? 'Add Roll to Stock' : ['mate', 'qaleen'].includes(selectedCategory?.id) ? 'Add Pieces to Stock' : 'Add Item to Stock'}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        <motion.div
           key={view === 'categories' ? 'categories' : (selectedCategory?.id || 'details')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {view === 'categories' ? renderCategories() : renderCategoryDetails()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
