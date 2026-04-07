'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://127.0.0.1:8000/api/inventory';
import { useParams } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Camera, 
  Phone, 
  IdCard, 
  CreditCard, 
  History as HistoryIcon,
  Plus,
  X,
  ChevronRight,
  Calculator,
  Wallet
} from 'lucide-react';

const EmployeeCard = ({ employee, onSelect }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass rounded-3xl overflow-hidden cursor-pointer group"
    onClick={() => onSelect(employee)}
  >
    <div className="relative h-48 bg-secondary/50 overflow-hidden">
      {employee.image ? (
        <img src={employee.image} alt={employee.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Users size={48} className="text-zinc-700" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-60" />
      <div className="absolute bottom-4 left-4">
        <h4 className="font-black text-xl tracking-tight">{employee.name}</h4>
        <p className="text-xs font-bold bronze-text uppercase tracking-widest">{employee.role || 'Staff'}</p>
      </div>
    </div>
    <div className="p-4 flex justify-between items-center">
      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold">
        <Phone size={14} />
        {employee.mobile}
      </div>
      <button className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-zinc-500 hover:text-primary transition-colors">
        <ChevronRight size={16} />
      </button>
    </div>
  </motion.div>
);

const SalaryRecord = ({ employee, onBack, onDelete, onRefresh }) => {
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [records, setRecords] = useState(employee.payments || []);

  useEffect(() => {
    setRecords(employee.payments || []);
  }, [employee]);

  const shopId = useParams().id;

  const addRecord = async () => {
    if (!amount) return;
    
    try {
      const resp = await fetch(`${API_BASE}/payments/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: employee.id,
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
      console.error("Add payment failed", err);
    }
  };

  const deleteRecord = async (id) => {
    if (window.confirm('Delete this payment record?')) {
      try {
        const resp = await fetch(`${API_BASE}/payments/${id}/?shop=${shopId}`, { method: 'DELETE' });
        if (resp.ok) onRefresh();
      } catch (err) {
        console.error("Delete payment failed", err);
      }
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
      onDelete(employee.id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-bold text-sm uppercase">
          <X size={18} /> Close Details
        </button>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-500/60 hover:text-red-500 transition-colors font-bold text-xs uppercase glass px-4 py-2 rounded-xl"
          >
            Remove Employee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Employee Info Summary */}
        <div className="glass p-8 rounded-[2.5rem] flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-primary/20 mb-6">
            <img src={employee.image} alt={employee.name} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-black tracking-tight mb-1">{employee.name}</h3>
          <p className="text-xs font-bold bronze-text uppercase tracking-widest mb-4">{employee.role}</p>
          <p className="text-zinc-500 font-bold mb-6 italic text-xs">CNIC: {employee.cnic}</p>
          
          <div className="w-full grid grid-cols-1 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl">
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1">Mobile Number</p>
              <p className="text-sm font-bold">{employee.mobile}</p>
            </div>
          </div>
        </div>

        {/* Right: Payment Form */}
        <div className="glass p-8 rounded-[2.5rem] space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <Calculator size={24} className="bronze-text" />
            <h4 className="text-xl font-black uppercase tracking-tight">Post Payment</h4>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Payment Amount (PKR)</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none transition-all font-bold"
                placeholder="e.g. 5000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Remarks / Note</label>
              <input 
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 focus:border-primary outline-none transition-all font-medium"
                placeholder="e.g. Advance for March"
              />
            </div>

            <button 
              onClick={addRecord}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 mt-2 hover:bg-primary/90 transition-all font-black text-xs"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>

      {/* Payment History Log */}
      <div className="glass p-10 rounded-[2.5rem]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Wallet size={24} className="bronze-text" />
            <h4 className="text-2xl font-black tracking-tighter uppercase italic">Payment <span className="bronze-text">Records</span></h4>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {records.map((rec, i) => (
              <motion.div 
                key={rec.id || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-border/50 group hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <HistoryIcon size={20} className="text-zinc-600 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-black text-sm">{rec.remarks}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{rec.date} • {rec.month}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <p className="font-black tracking-tight text-lg bronze-text">{rec.amount}</p>
                  <button 
                    onClick={() => deleteRecord(rec.id)}
                    className="p-2 rounded-lg bg-red-500/5 text-red-500/0 group-hover:text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    title="Delete Record"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {records.length === 0 && (
            <p className="text-center py-10 text-zinc-600 font-bold italic">No records found for this employee.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function EmployeesModule() {
  const { id: shopId } = useParams();
  const [view, setView] = useState('list'); // list, add, details
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({ name: '', mobile: '', cnic: '', role: 'Staff', image: null });

  const fetchEmployees = async () => {
    try {
      const shopParam = shopId ? `?shop=${shopId}` : '';
      const resp = await fetch(`${API_BASE}/employees/${shopParam}`);
      if (resp.ok) {
        const data = await resp.json();
        setEmployees(data);
        // Update selected employee if in details view
        if (selectedEmployee) {
          const updated = data.find(e => e.id === selectedEmployee.id);
          if (updated) setSelectedEmployee(updated);
        }
      }
    } catch (err) {
      console.error("Fetch employees failed", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployee({ ...newEmployee, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch(`${API_BASE}/employees/?shop=${shopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });
      if (resp.ok) {
        fetchEmployees();
        setView('list');
        setNewEmployee({ name: '', mobile: '', cnic: '', role: 'Staff', image: null });
      }
    } catch (err) {
      console.error("Register failed", err);
    }
  };

  const handleDeleteEmployee = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/employees/${id}/?shop=${shopId}`, { method: 'DELETE' });
      if (resp.ok) {
        fetchEmployees();
        setView('list');
        setSelectedEmployee(null);
      }
    } catch (err) {
      console.error("Delete employee failed", err);
    }
  };

  return (
    <div className="w-full">
      {view === 'list' && (
        <div className="space-y-10">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black tracking-tighter italic uppercase">Staff <span className="bronze-text">Directory</span></h3>
            <button 
              onClick={() => setView('add')}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-primary/20"
            >
              <UserPlus size={18} />
              Register New
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {employees.map((emp) => (
              <EmployeeCard 
                key={emp.id} 
                employee={emp} 
                onSelect={(e) => {
                  setSelectedEmployee(e);
                  setView('details');
                }} 
              />
            ))}
          </div>
        </div>
      )}

      {view === 'add' && (
        <div className="max-w-xl mx-auto">
          <div className="glass p-10 rounded-[2.5rem] relative overflow-hidden">
            <button onClick={() => setView('list')} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-black tracking-tight mb-8 uppercase italic">Register <span className="bronze-text">Employee</span></h3>
            
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="flex justify-center mb-8">
                <label className="relative cursor-pointer group">
                  <div className="w-32 h-32 rounded-3xl bg-secondary/50 border-2 border-dashed border-border flex flex-col items-center justify-center p-2 text-center group-hover:border-primary transition-colors overflow-hidden">
                    {newEmployee.image ? (
                      <img src={newEmployee.image} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <>
                        <Camera size={24} className="text-zinc-600 mb-2" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Upload Photo</span>
                      </>
                    )}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} required />
                </label>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3.5 focus:border-primary outline-none transition-all font-medium"
                    placeholder="Enter employee name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Mobile Number</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input 
                      type="tel" 
                      required 
                      className="w-full bg-white/5 border border-border rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-all font-medium"
                      placeholder="03xx-xxxxxxx"
                      value={newEmployee.mobile}
                      onChange={(e) => setNewEmployee({...newEmployee, mobile: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">CNIC Number</label>
                  <div className="relative">
                    <IdCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input 
                      type="text" 
                      required 
                      maxLength="15"
                      className="w-full bg-white/5 border border-border rounded-xl pl-12 pr-4 py-3.5 focus:border-primary outline-none transition-all font-medium"
                      placeholder="xxxxx-xxxxxxx-x"
                      value={newEmployee.cnic}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, ''); // Remove all non-digits
                        if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5);
                        if (value.length > 13) value = value.slice(0, 13) + '-' + value.slice(13, 14);
                        setNewEmployee({...newEmployee, cnic: value});
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Designation / Status</label>
                  <select 
                    className="w-full bg-white/5 border border-border rounded-xl px-4 py-3.5 focus:border-primary outline-none transition-all font-medium appearance-none"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                  >
                    <option value="Staff" className="bg-background">General Staff</option>
                    <option value="Head" className="bg-background">Factory Head</option>
                    <option value="Sales Manager" className="bg-background">Sales Manager</option>
                    <option value="Accountant" className="bg-background">Accountant</option>
                    <option value="Supervisor" className="bg-background">Supervisor</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 mt-4"
              >
                Register Staff Member
              </button>
            </form>
          </div>
        </div>
      )}

      {view === 'details' && selectedEmployee && (
        <SalaryRecord 
          employee={selectedEmployee} 
          onBack={() => setView('list')} 
          onDelete={handleDeleteEmployee}
          onRefresh={fetchEmployees}
        />
      )}
    </div>
  );
}
