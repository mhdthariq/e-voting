"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Plus, X, ArrowLeft, ArrowRight, Check, Trophy, Calendar, FileText } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

// Tipe untuk kandidat
interface CandidateInput {
  name: string;
  description: string;
}

// Komponen Halaman Create Election (Wizard)
export default function CreateElectionPage() {
  const router = useRouter();
  
  // Wizard State
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [candidates, setCandidates] = useState<CandidateInput[]>([]);
  
  // Local Candidate Input State
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidateDesc, setNewCandidateDesc] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDate(now.toISOString().slice(0, 16));
  }, []);

  const handleAddCandidate = () => {
    if (newCandidateName.trim() && newCandidateDesc.trim()) {
      setCandidates([...candidates, { name: newCandidateName, description: newCandidateDesc }]);
      setNewCandidateName("");
      setNewCandidateDesc("");
    }
  };

  const handleRemoveCandidate = (index: number) => {
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  const nextStep = () => {
     setError(null);
     if (step === 1) {
        if (!title || !description || !startDate || !endDate) {
           setError("Please fill in all election details.");
           return;
        }
     }
     if (step === 2) {
        if (candidates.length < 2) {
           setError("Please add at least 2 candidates.");
           return;
        }
     }
     setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
       setIsLoading(false);
       router.push("/organization/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950 text-white">
       <div className="w-full max-w-4xl space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
             <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2">
                <ArrowLeft size={20} /> Back to Dashboard
             </button>
             <h1 className="text-2xl font-bold text-emerald-500">Create Election Wizard</h1>
          </div>

          <GlassCard className="p-8">
             {/* Progress Bar */}
             <div className="mb-8">
                <div className="flex justify-between mb-2">
                   <span className={`text-sm font-medium ${step >= 1 ? "text-emerald-400" : "text-gray-500"}`}>1. Details</span>
                   <span className={`text-sm font-medium ${step >= 2 ? "text-emerald-400" : "text-gray-500"}`}>2. Candidates</span>
                   <span className={`text-sm font-medium ${step >= 3 ? "text-emerald-400" : "text-gray-500"}`}>3. Review</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                   <motion.div 
                      className="bg-emerald-500 h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(step / totalSteps) * 100}%` }}
                   />
                </div>
             </div>

             {/* Wizard Steps */}
             <AnimatePresence mode="wait">
                {step === 1 && (
                   <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                            <input 
                               type="text" 
                               value={title}
                               onChange={e => setTitle(e.target.value)}
                               className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                               placeholder="Election Title" 
                            />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                            <textarea 
                               value={description}
                               onChange={e => setDescription(e.target.value)}
                               className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none h-24 resize-none"
                               placeholder="Describe the election purpose..." 
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                               <input 
                                  type="datetime-local" 
                                  value={startDate}
                                  onChange={e => setStartDate(e.target.value)}
                                  min={minDate}
                                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm" 
                               />
                            </div>
                            <div>
                               <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                               <input 
                                  type="datetime-local" 
                                  value={endDate}
                                  onChange={e => setEndDate(e.target.value)}
                                  min={startDate || minDate}
                                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm" 
                               />
                            </div>
                         </div>
                      </div>
                   </motion.div>
                )}

                {step === 2 && (
                   <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                      <div className="space-y-4">
                         {candidates.map((cand, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                               <div>
                                  <h4 className="font-bold text-white">{cand.name}</h4>
                                  <p className="text-sm text-gray-400 truncate max-w-md">{cand.description}</p>
                               </div>
                               <button onClick={() => handleRemoveCandidate(idx)} className="text-red-400 hover:text-red-300 p-2">
                                  <X size={20} />
                               </button>
                            </div>
                         ))}

                         <div className="p-4 border border-dashed border-gray-700 rounded-lg space-y-4 bg-gray-900/20">
                            <h4 className="text-sm font-medium text-emerald-400">Add New Candidate</h4>
                            <input 
                               type="text" 
                               value={newCandidateName}
                               onChange={e => setNewCandidateName(e.target.value)}
                               placeholder="Candidate Name" 
                               className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                            />
                            <textarea 
                               value={newCandidateDesc}
                               onChange={e => setNewCandidateDesc(e.target.value)}
                               placeholder="Vision & Mission" 
                               className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm resize-none h-16"
                            />
                            <Button onClick={handleAddCandidate} variant="outline" className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
                               <Plus className="mr-2 h-4 w-4" /> Add Candidate
                            </Button>
                         </div>
                      </div>
                   </motion.div>
                )}

                {step === 3 && (
                   <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 text-center">
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                         <Trophy className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">Ready to Launch?</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                         <div className="p-4 bg-gray-900 rounded-lg">
                            <h3 className="text-gray-500 text-sm mb-1">Title</h3>
                            <p className="text-white font-medium">{title}</p>
                         </div>
                         <div className="p-4 bg-gray-900 rounded-lg">
                            <h3 className="text-gray-500 text-sm mb-1">Candidates</h3>
                            <p className="text-white font-medium">{candidates.length} Candidates Enrolled</p>
                         </div>
                         <div className="p-4 bg-gray-900 rounded-lg">
                            <h3 className="text-gray-500 text-sm mb-1">Start</h3>
                            <p className="text-white font-medium">{startDate.replace("T", " ")}</p>
                         </div>
                         <div className="p-4 bg-gray-900 rounded-lg">
                            <h3 className="text-gray-500 text-sm mb-1">End</h3>
                            <p className="text-white font-medium">{endDate.replace("T", " ")}</p>
                         </div>
                      </div>
                   </motion.div>
                )}
             </AnimatePresence>

             {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm text-center mt-4">
                   {error}
                </motion.p>
             )}

             {/* Footer Actions */}
             <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
                {step > 1 ? (
                   <Button onClick={prevStep} variant="ghost" className="text-gray-300 hover:text-white">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                   </Button>
                ) : (
                   <Button onClick={() => router.back()} variant="ghost" className="text-gray-300 hover:text-white">
                      Cancel
                   </Button>
                )}

                {step < 3 ? (
                   <Button onClick={nextStep} className="bg-emerald-600 hover:bg-emerald-700">
                      Next Step <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
                ) : (
                   <Button onClick={handleSubmit} disabled={isLoading} className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white min-w-[150px]">
                      {isLoading ? "Creating..." : (
                         <><Check className="mr-2 h-4 w-4" /> Create Election</>
                      )}
                   </Button>
                )}
             </div>
          </GlassCard>
       </div>
    </div>
  );
}