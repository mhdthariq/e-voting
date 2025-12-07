"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@radix-ui/react-dialog"; // Ideally use shadcn dialog if available, else custom
import { motion, AnimatePresence } from "framer-motion";

import { useToast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/theme";

interface Candidate {
  id: number;
  name: string;
  vision: string;
  mission: string;
  photoUrl?: string;
}

interface Election {
  id: number;
  title: string;
  candidates: Candidate[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  election: Election | null;
  darkMode: boolean;
  onVoteCast: () => void;
}

export default function VoteModal({
  open,
  onClose,
  election,
  darkMode,
  onVoteCast,
}: Props) {
  const { showToast } = useToast();
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"select" | "confirm">("select");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedCandidate(null);
      setPassphrase("");
    }
  }, [open]);

  if (!open || !election) return null;

  const handleNext = () => {
    if (selectedCandidate) setStep("confirm");
  };

  const handleVote = async () => {
    if (!selectedCandidate) return;
    if (!passphrase) {
      alert("Please enter your key passphrase to sign the vote.");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("accessToken");
      
      // 1. Fetch User Profile for Encrypted Key
      const userRes = await fetch("/api/user/profile", { headers: { Authorization: `Bearer ${token}` } });
      const userData = await userRes.json();
      
      if (!userData.user?.privateKeyEncrypted || !userData.user?.publicKey) {
        alert("No blockchain keys found. Please go to Settings > Keys to generate them first.");
        setLoading(false);
        return;
      }
      
      const { privateKeyEncrypted, publicKey } = userData.user;

      // 2. Decrypt Private Key
      let privateKeyPem;
      try {
        privateKeyPem = await decryptPrivateKey(privateKeyEncrypted, passphrase);
      } catch (e) {
        console.error("Decryption failed", e);
        alert("Incorrect passphrase. Unable to unlock signing key.");
        setLoading(false);
        return;
      }

      // 3. Create Vote & Sign
      const voteId = crypto.randomUUID();
      const timestamp = new Date();
      
      // Canonical Payload for Signing: voteId|electionId|voterPublicKey|candidateId|timestamp
      const payload = [
        voteId,
        election.id.toString(),
        publicKey,
        selectedCandidate.toString(),
        timestamp.toISOString()
      ].join("|");
      
      const signature = await signData(payload, privateKeyPem);
      
      // 4. Send to API
      const voteRes = await fetch("/api/voter/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voteId,
          electionId: election.id,
          candidateId: selectedCandidate,
          timestamp: timestamp.toISOString(),
          signature
        }),
      });
      
      const voteJson = await voteRes.json();
      
      if (voteJson.success) {
        onVoteCast(); 
        onClose();
        showToast("Vote Successfully Cast & Mined!\nBlock Hash: " + voteJson.data.blockHash.substring(0, 10), "success");
      } else {
        showToast("Vote Failed: " + voteJson.message, "error");
      }
      
    } catch (e) {
      console.error(e);
      showToast("Voting error: " + (e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  /** Helper: Decrypt Private Key (PBKDF2 + AES-GCM) */
  const decryptPrivateKey = async (encryptedData: string, password: string) => {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) throw new Error("Invalid key format");
    
    const [saltHex, ivHex, cipherHex] = parts;
    const fromHex = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const salt = fromHex(saltHex);
    const iv = fromHex(ivHex);
    const ciphertext = fromHex(cipherHex);
    
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  };
  
  /** Helper: RSA Sign (RSASSA-PKCS1-v1_5) */
  const signData = async (data: string, privateKeyPem: string) => {
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKeyPem.substring(
      privateKeyPem.indexOf(pemHeader) + pemHeader.length,
      privateKeyPem.indexOf(pemFooter)
    ).replace(/\s/g, "");
    
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
    
    const signature = await window.crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(data)
    );
    
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
          darkMode ? "bg-neutral-900 border border-emerald-900/50" : "bg-white border-gray-200"
        )}
      >
        {/* Header */}
        <div className={cn("p-6 border-b flex justify-between items-center", darkMode ? "border-white/10" : "border-gray-100")}>
           <div>
             <h2 className={cn("text-2xl font-bold font-sans", darkMode ? "text-white" : "text-gray-900")}>
               {step === "select" ? "Cast Your Vote" : "Confirm Vote"}
             </h2>
             <p className="text-brand-primary text-sm font-medium">{election.title}</p>
           </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
             <X size={20} className={darkMode ? "text-gray-400" : "text-gray-500"} />
           </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === "select" ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                  <p className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                    Select a candidate below. This action is irreversible once confirmed.
                  </p>
                  
                  <div className="grid gap-4">
                    {election.candidates.map(candidate => (
                      <motion.div 
                        key={candidate.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedCandidate(candidate.id)}
                        className={cn(
                          "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col md:flex-row gap-4 group",
                          selectedCandidate === candidate.id 
                            ? "border-emerald-500 bg-emerald-500/5 shadow-md"
                            : darkMode ? "border-white/10 hover:border-white/20 hover:bg-white/5" : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                         <div className="flex-shrink-0">
                           <div className={cn(
                             "w-16 h-16 rounded-full border-2 overflow-hidden flex items-center justify-center bg-gray-800",
                             selectedCandidate === candidate.id ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-gray-600"
                           )}>
                              {candidate.photoUrl ? (
                                <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl font-bold text-gray-400">{candidate.name.charAt(0)}</span>
                              )}
                           </div>
                         </div>
                         
                         <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h3 className={cn("font-bold text-lg group-hover:text-emerald-400 transition-colors", darkMode ? "text-white" : "text-gray-900")}>
                                {candidate.name}
                              </h3>
                              {selectedCandidate === candidate.id && (
                                <motion.div 
                                  initial={{ scale: 0 }} 
                                  animate={{ scale: 1 }}
                                  className="bg-emerald-500 text-white p-1 rounded-full shadow-lg"
                                >
                                  <CheckCircle size={16} />
                                </motion.div>
                              )}
                            </div>
                            
                            <div className="mt-2 space-y-2">
                              <div>
                                <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">Vision</p>
                                <p className={cn("text-sm", darkMode ? "text-gray-300" : "text-gray-600")}>{candidate.vision}</p>
                              </div>
                              {candidate.mission && (
                                <div>
                                  <p className="text-xs font-bold uppercase text-gray-500 tracking-wider mt-2">Mission</p>
                                  <p className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-500")}>{candidate.mission}</p>
                                </div>
                              )}
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </div>
              </motion.div>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                 <div className="w-20 h-20 rounded-full bg-brand-primary/20 flex items-center justify-center">
                    <ShieldCheck size={40} className="text-brand-primary" />
                 </div>
                 
                 <div>
                   <h3 className={cn("text-xl font-bold mb-2", darkMode ? "text-white" : "text-gray-900")}>
                     Confirm Choice
                   </h3>
                   <p className={cn("text-sm max-w-xs mx-auto", darkMode ? "text-gray-400" : "text-gray-600")}>
                     You are about to vote for <span className="text-brand-primary font-bold">{election.candidates.find(c => c.id === selectedCandidate)?.name}</span>.
                   </p>
                 </div>

                 <div className="w-full max-w-sm text-left bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
                    <label className={cn("text-xs font-bold uppercase tracking-wider mb-2 block", darkMode ? "text-gray-500" : "text-gray-400")}>
                       Digital Signature
                    </label>
                    <Input
                       type="password"
                       placeholder="Enter your private key passphrase"
                       value={passphrase}
                       onChange={(e) => setPassphrase(e.target.value)}
                       className={cn("w-full", darkMode ? "bg-black/20 border-white/10" : "bg-white")}
                    />
                    <p className="text-xs text-brand-primary mt-2">
                      * This passphrase decrypts your private key locally to sign the vote transaction.
                    </p>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={cn("p-6 border-t flex justify-end gap-3", darkMode ? "border-white/10" : "border-gray-100")}>
           {step === "select" ? (
             <>
               <Button variant="ghost" onClick={onClose}>Cancel</Button>
               <Button onClick={handleNext} disabled={!selectedCandidate}>Continue</Button>
             </>
           ) : (
             <>
               <Button variant="ghost" onClick={() => setStep("select")} disabled={loading}>Back</Button>
               <Button onClick={handleVote} disabled={!passphrase || loading} className="w-40">
                 {loading ? "Signing..." : "Confirm Vote"}
               </Button>
             </>
           )}
        </div>
        
      </motion.div>
    </div>
  );
}

