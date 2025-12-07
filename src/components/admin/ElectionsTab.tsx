"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, Check, Plus, Trophy, Users } from "lucide-react";

// Mock Data for demonstration before backend hook integration
const mockElections = [
  { id: 1, title: "Student Council 2024", status: "Active", votes: 450, endDate: "2024-12-20" },
  { id: 2, title: "IT Club Chairman", status: "Ended", votes: 120, endDate: "2024-11-15" },
];

export default function ElectionsTab() {
  const [view, setView] = useState<"list" | "create">("list");

  // Wizard State
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    candidates: [{ name: "", description: "" }, { name: "", description: "" }]
  });

  const handleCreateClick = () => {
    setView("create");
    setStep(1);
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="space-y-6">
      {view === "list" ? (
        <>
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold text-white">Election Management</h2>
             <Button onClick={handleCreateClick} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Create Election
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {mockElections.map(election => (
                <GlassCard key={election.id} className="p-6 relative group">
                   <div className="absolute top-4 right-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${election.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}>
                         {election.status}
                      </span>
                   </div>
                   <h3 className="text-lg font-bold text-white mb-2">{election.title}</h3>
                   <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1"><Users className="w-4 h-4" /> {election.votes} Votes</div>
                      <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Ends {election.endDate}</div>
                   </div>
                   <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400">Manage</Button>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">View Results</Button>
                   </div>
                </GlassCard>
             ))}
          </div>
        </>
      ) : (
        <GlassCard className="p-8 max-w-3xl mx-auto">
          {/* Wizard Header */}
          <div className="mb-8">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Create New Election</h2>
                <span className="text-emerald-500 font-bold">Step {step} of 3</span>
             </div>
             <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                   className="bg-emerald-500 h-full transition-all duration-300" 
                   style={{ width: `${(step / 3) * 100}%` }}
                ></div>
             </div>
          </div>

          {/* Wizard Content */}
          <AnimatePresence mode="wait">
             {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                   <div className="space-y-4">
                      <div>
                         <label className="block text-sm font-medium text-gray-300 mb-1">Election Title</label>
                         <input 
                            type="text" 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            placeholder="e.g. Annual General Election 2025"
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})}
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                            <input type="datetime-local" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm" />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                            <input type="datetime-local" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm" />
                         </div>
                      </div>
                   </div>
                </motion.div>
             )}

             {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                   <div className="space-y-4">
                      <h3 className="text-lg font-medium text-white mb-4">Add Candidates</h3>
                      {formData.candidates.map((cand, idx) => (
                         <div key={idx} className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg space-y-3">
                            <div className="flex justify-between items-center text-sm text-emerald-400 font-semibold">Candidate {idx + 1}</div>
                            <input 
                               type="text" 
                               placeholder="Full Name" 
                               className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white text-sm"
                            />
                            <textarea 
                               placeholder="Vision & Mission" 
                               className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white text-sm h-20 resize-none"
                            />
                         </div>
                      ))}
                      <Button variant="outline" className="w-full border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500">
                         <Plus className="w-4 h-4 mr-2" /> Add Another Candidate
                      </Button>
                   </div>
                </motion.div>
             )}

             {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                   <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                         <Trophy className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Ready to Launch?</h3>
                      <p className="text-gray-400 max-w-md mx-auto">
                         Review your election details. Once launched, users will be invited immediately.
                      </p>
                      <div className="bg-gray-900 p-4 rounded-lg text-left max-w-md mx-auto text-sm space-y-2">
                         <div className="flex justify-between"><span className="text-gray-500">Title:</span> <span className="text-white font-medium">{formData.title || "Untitled Election"}</span></div>
                         <div className="flex justify-between"><span className="text-gray-500">Candidates:</span> <span className="text-white font-medium">{formData.candidates.length}</span></div>
                      </div>
                   </div>
                </motion.div>
             )}
          </AnimatePresence>

          {/* Wizard Footer */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
             {step > 1 ? (
                <Button onClick={prevStep} variant="ghost" className="text-gray-300">
                   <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
             ) : (
                <Button onClick={() => setView("list")} variant="ghost" className="text-gray-300">
                   Cancel
                </Button>
             )}

             {step < 3 ? (
                <Button onClick={nextStep} className="bg-emerald-600 hover:bg-emerald-700">
                   Next Step <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
             ) : (
                <Button onClick={() => setView("list")} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25">
                   <Check className="mr-2 h-4 w-4" /> Launch Election
                </Button>
             )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
