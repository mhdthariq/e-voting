"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { User, Lock, Mail, Camera, Save, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsTab() {
  const [activeSection, setActiveSection] = useState<"profile" | "password" | "system">("profile");
  const [isLoading, setIsLoading] = useState(false);

  const [profile, setProfile] = useState({
     username: "renhoshizora",
     email: "admin@blockvote.com",
     role: "Administrator"
  });

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
       {/* Settings Sidebar */}
       <div className="md:col-span-1 space-y-2">
          {[
             { id: "profile", label: "Profile Settings", icon: User },
             { id: "password", label: "Security", icon: Lock },
             { id: "system", label: "System Config", icon: RefreshCw },
          ].map((item) => (
             <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                   activeSection === item.id 
                   ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                   : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
             >
                <item.icon size={18} />
                <span>{item.label}</span>
             </button>
          ))}
       </div>

       {/* Settings Content */}
       <div className="md:col-span-3">
          <GlassCard className="p-8">
             {activeSection === "profile" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                   <div className="flex items-center gap-6 pb-6 border-b border-white/10">
                      <div className="relative group">
                         <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
                            <span className="text-2xl font-bold text-gray-500">RH</span>
                         </div>
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                            <Camera className="text-white" />
                         </div>
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-white">Profile Picture</h3>
                         <p className="text-sm text-gray-400 mb-2">Upload a new avatar (Max 2MB)</p>
                         <Button size="sm" variant="outline" className="border-gray-600 text-gray-300 hover:text-white">Upload New</Button>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                         <div className="relative">
                            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                            <input 
                               type="text" 
                               value={profile.username}
                               onChange={(e) => setProfile({...profile, username: e.target.value})}
                               className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                         </div>
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                         <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                            <input 
                               type="email" 
                               value={profile.email}
                               disabled
                               className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-gray-500 cursor-not-allowed"
                            />
                         </div>
                      </div>
                   </div>
                </motion.div>
             )}

             {activeSection === "password" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                   <h3 className="text-lg font-bold text-white mb-4">Change Password</h3>
                   <div className="space-y-4 max-w-md">
                      <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                         <input type="password" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                         <input type="password" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                         <input type="password" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                      </div>
                   </div>
                </motion.div>
             )}

             <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <Button onClick={handleSave} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]">
                   {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                   ) : (
                      <Save className="w-4 h-4 mr-2" />
                   )}
                   Save Changes
                </Button>
             </div>
          </GlassCard>
       </div>
    </div>
  );
}
