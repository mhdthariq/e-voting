"use client";

import { useState } from "react";
import { X, User as UserIcon, Shield, Key, Loader2, Upload, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  user: {
    username: string;
    fullName: string | null;
    profileImage?: string | null;
  } | null;
}

export default function ProfileSettingsModal({ open, onClose, darkMode, user }: Props) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "keys">("profile");
  
  // Profile State
  const [username, setUsername] = useState(user?.username || "");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  
  // Security State
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  
  // Key State
  const [keyStatus, setKeyStatus] = useState<"none" | "generating" | "generated" | "saved">("none");
  const [publicKey, setPublicKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  /** Convert file to base64 */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large. Max 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /** Save Profile Data */
  const handleSaveProfile = async () => {
    if (!username) {
      showToast("Username is required", "error");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          fullName,
          profileImage, 
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast("Profile updated successfully", "success");
        // Optionally update parent state or context? For now just close or stay.
      } else {
        showToast(json.message || "Failed to update profile", "error");
      }
    } catch (error) {
       showToast("An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  /** Change Password */
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast("Please fill in all fields", "error");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/user/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast("Password changed successfully", "success");
        setNewPassword("");
        setCurrentPassword("");
      } else {
        showToast(json.message || "Failed to change password", "error");
      }
    } catch (error) {
      showToast("Failed to change password", "error");
    } finally {
      setLoading(false);
    }
  };

  /** Generate Blockchain Keys */
  const handleGenerateKeys = async () => {
    if (!passphrase) {
       showToast("Passphrase is required to encrypt your private key", "error");
       return;
    }

    try {
      setKeyStatus("generating");
      setLoading(true);
      
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      );

      const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const publicPem = toPem(exportedPublic, "PUBLIC KEY");
      setPublicKey(publicPem);

      const exportedPrivate = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      const privatePem = toPem(exportedPrivate, "PRIVATE KEY");
      
      const encryptedPrivate = await encryptPrivateKey(privatePem, passphrase);
      
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/user/profile", {
         method: "PUT",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${token}`,
         },
         body: JSON.stringify({
           publicKey: publicPem,
           privateKeyEncrypted: encryptedPrivate
         }),
      });
      
      const json = await res.json();
      
      if (res.ok && json.success) {
        setKeyStatus("saved");
        showToast("Blockchain keys generated and saved!", "success");
      } else {
        showToast(json.message || "Failed to save keys to server", "error");
        setKeyStatus("generated");
      }
      
    } catch (e) {
      console.error(e);
      showToast("Failed to generate keys", "error");
      setKeyStatus("none");
    } finally {
      setLoading(false);
    }
  };

  const toPem = (buffer: ArrayBuffer, type: string) => {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const chunks = base64.match(/.{1,64}/g)!.join("\n");
    return `-----BEGIN ${type}-----\n${chunks}\n-----END ${type}-----`;
  };

  const encryptPrivateKey = async (data: string, password: string) => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    
    // Use fresh salt
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(data)
    );
    
    const toHex = (buf: ArrayBuffer | Uint8Array) => {
      const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      return Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');
    };
    
    return `${toHex(salt)}:${toHex(iv)}:${toHex(encrypted)}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          "relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
          darkMode ? "bg-neutral-900 border border-emerald-900/50" : "bg-white border-gray-200"
        )}
      >
        <div className={cn("p-6 border-b flex justify-between items-center", darkMode ? "border-white/10" : "border-gray-100")}>
           <h2 className={cn("text-xl font-bold", darkMode ? "text-white" : "text-gray-900")}>Account Settings</h2>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
             <X size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} />
           </button>
        </div>

        <div className={cn("flex border-b", darkMode ? "border-white/10" : "border-gray-100")}>
            {[
              { id: "profile", label: "Profile", icon: UserIcon },
              { id: "security", label: "Security", icon: Shield },
              { id: "keys", label: "Voting Keys", icon: Key },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "profile" | "security" | "keys")}
                className={cn(
                  "flex-1 py-4 text-sm font-medium transition-colors flex justify-center items-center gap-2",
                  activeTab === tab.id
                    ? "text-brand-primary border-b-2 border-brand-primary bg-brand-primary/5"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                 <div className="flex flex-col items-center">
                    <div className="relative group cursor-pointer">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-neutral-800 shadow-lg">
                        <img 
                          src={profileImage || "https://ui-avatars.com/api/?name=User&background=10b981&color=fff"} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity cursor-pointer">
                        <Upload size={24} className="text-white" />
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Click to change avatar</p>
                 </div>

                 <div className="space-y-4">
                   <div>
                     <label className="text-sm font-medium mb-1.5 block">Username</label>
                     <Input 
                       value={username} 
                       onChange={(e) => setUsername(e.target.value)}
                       className={darkMode ? "bg-black/20" : ""}
                     />
                   </div>
                   <div>
                     <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                     <Input 
                       value={fullName} 
                       onChange={(e) => setFullName(e.target.value)}
                       className={darkMode ? "bg-black/20" : ""}
                     />
                   </div>
                 </div>

                 <div className="pt-4">
                   <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
                     {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Save Changes
                   </Button>
                 </div>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm">
                   Ensure your password is strong. It protects your voting account and keys.
                </div>
                
                <div className="space-y-4">
                   <div>
                     <label className="text-sm font-medium mb-1.5 block">Current Password</label>
                     <Input 
                       type="password"
                       value={currentPassword} 
                       onChange={(e) => setCurrentPassword(e.target.value)}
                       className={darkMode ? "bg-black/20" : ""}
                     />
                   </div>
                   <div>
                     <label className="text-sm font-medium mb-1.5 block">New Password</label>
                     <Input 
                       type="password"
                       value={newPassword} 
                       onChange={(e) => setNewPassword(e.target.value)}
                       className={darkMode ? "bg-black/20" : ""}
                     />
                   </div>
                 </div>

                 <div className="pt-4">
                   <Button onClick={handleChangePassword} disabled={loading} className="w-full">
                     {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Update Password
                   </Button>
                 </div>
              </motion.div>
            )}

            {activeTab === "keys" && (
              <motion.div 
                key="keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                 <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm">
                   <h4 className="font-bold flex items-center gap-2 mb-1"><Shield size={14}/> Secure Voting Keys</h4>
                   <p>Your keys identify you on the blockchain. The private key never leaves your device unencrypted.</p>
                 </div>

                 {keyStatus === "saved" && (
                   <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm flex items-center gap-2">
                     <ShieldCheck className="h-4 w-4" /> Keys are active and saved.
                   </div>
                 )}

                 <div className="space-y-4">
                   <div>
                     <label className="text-sm font-medium mb-1.5 block text-brand-primary">Encryption Passphrase</label>
                     <Input 
                       type="password"
                       placeholder="Enter a secure passphrase..."
                       value={passphrase} 
                       onChange={(e) => setPassphrase(e.target.value)}
                       className={darkMode ? "bg-black/20 border-brand-primary/50" : ""}
                     />
                     <p className="text-xs text-red-500 mt-1.5">
                       * Important: This passphrase encrypts your private key. If lost, you cannot cast votes.
                     </p>
                   </div>
                 </div>

                 <div className="pt-2">
                   <Button 
                     onClick={handleGenerateKeys} 
                     disabled={loading || !passphrase || keyStatus === "generating"} 
                     className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                   >
                     {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                     {keyStatus === "saved" ? "Regenerate Keys" : "Generate & Save Keys"}
                   </Button>
                 </div>
                 
                 {publicKey && (
                    <div className="mt-4">
                      <label className="text-xs font-mono opacity-50 block mb-1">Public Key Fingerprint</label>
                      <div className="text-[10px] font-mono p-3 rounded bg-black/5 dark:bg-black/30 break-all border border-black/10 dark:border-white/10 max-h-24 overflow-y-auto custom-scrollbar">
                        {publicKey}
                      </div>
                    </div>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
