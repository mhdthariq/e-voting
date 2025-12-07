"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  Sun,
  Moon,
  LogIn,
  ArrowLeft,
  User,
  Lock,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast, ToastProvider } from "@/components/ui/toast";
import { useLogin } from "@/hooks/useAuth";
import { cn } from "@/lib/theme";

// --- Schema ---
const loginSchema = z.object({
  identifier: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [darkMode, setDarkMode] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // --- Auth Redirect Check ---
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      // Basic check, ideally verify token validity
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role) router.push(`/${user.role}/dashboard`);
      }
    }
  }, [router]);

  // --- React Query Mutation ---
  const { mutate: login, isPending } = useLogin();

  // --- React Hook Form ---
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login(data, {
      onSuccess: (res: any) => {
        if (res.success && res.tokens?.accessToken) {
          localStorage.setItem("accessToken", res.tokens.accessToken);
          localStorage.setItem("user", JSON.stringify(res.user));
          
          showToast("Login successful! Redirecting...", "success");
          
          setTimeout(() => {
            const role = res.user.role;
             if (role === "admin") router.push("/admin/dashboard");
             else if (role === "organization") router.push("/organization/dashboard");
             else router.push("/voter/dashboard");
          }, 800);
        } else {
          showToast(res.message || "Login failed", "error");
        }
      },
      onError: (err: any) => {
        showToast(err.message || "An error occurred", "error");
      },
    });
  };

  return (
    <div
      className={cn(
        "relative min-h-screen flex flex-col md:flex-row transition-colors duration-500 overflow-hidden",
        darkMode ? "bg-neutral-950 text-white" : "bg-gray-50 text-gray-900"
      )}
    >
      {/* Theme Toggle */}
      <motion.button
        whileTap={{ rotate: 180, scale: 0.9 }}
        onClick={() => setDarkMode(!darkMode)}
        className={cn(
          "absolute top-6 right-6 p-3 rounded-full shadow-lg transition-all border z-50",
          darkMode
            ? "bg-neutral-900 border-white/10 hover:bg-neutral-800 text-emerald-400"
            : "bg-white border-gray-200 hover:bg-emerald-50 text-emerald-600"
        )}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </motion.button>

      {/* MOBILE Layout */}
      <div className="flex-1 flex md:hidden justify-center items-center perspective-[1200px] relative p-4">
        <AnimatePresence mode="wait">
          {!showLogin ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full"
            >
               <GlassCard className="p-8 flex flex-col items-center text-center bg-gradient-to-br from-brand-primary/20 via-black/40 to-black/60 border-brand-primary/20">
                <h1 className="text-4xl font-extrabold mb-4 text-brand-primary drop-shadow-md">
                   BlockVote
                 </h1>
                 <p className="text-sm opacity-80 mb-6">Securing Democracy with Blockchain</p>
                 <Button onClick={() => setShowLogin(true)} size="lg" className="w-full">
                   <LogIn className="mr-2" size={18} /> Get Started
                 </Button>
               </GlassCard>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full"
            >
               {/* Mobile Form */}
                <GlassCard className="p-8">
                  <h2 className="text-2xl font-bold mb-6 text-center text-brand-primary">Login</h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input 
                       {...register("identifier")} 
                       placeholder="Username" 
                       icon={<User size={16} />}
                       className={darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white"}
                    />
                    {errors.identifier && <p className="text-xs text-red-400 ml-1">{errors.identifier.message}</p>}

                    <Input 
                       {...register("password")} 
                       type="password" 
                       placeholder="Password" 
                       icon={<Lock size={16} />} 
                       className={darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white"}
                    />
                    {errors.password && <p className="text-xs text-red-400 ml-1">{errors.password.message}</p>}

                    <Button type="submit" className="w-full mt-2" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                  </form>
                  <Button variant="ghost" className="w-full mt-4" onClick={() => setShowLogin(false)}>
                    <ArrowLeft className="mr-2" size={16} /> Back
                  </Button>
                </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DESKTOP Layout */}
      <div className="hidden md:flex flex-1">
        {/* Left: Info Section */}
        <motion.div
           initial={{ opacity: 0, x: -50 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8 }}
           className="flex-1 flex flex-col justify-center items-start p-16 md:p-24 bg-gradient-to-br from-emerald-900/40 to-black relative overflow-hidden"
        >
           {/* Background Accents */}
           <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
             <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-primary blur-[128px] rounded-full" />
             <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 blur-[128px] rounded-full" />
           </div>

           <div className="z-10">
             <h1 className="text-6xl font-black mb-6 tracking-tight text-white">
               Vote with <br />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-emerald-200">
                 Confidence
               </span>
             </h1>
             <p className="text-xl text-gray-300 max-w-lg leading-relaxed mb-8">
               A decentralized voting platform ensuring integrity, transparency, and immutability for every ballot cast.
             </p>
             
             <div className="flex gap-4">
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-sm font-medium text-emerald-200">Blockchain Active</span>
               </div>
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                 <span className="text-sm font-medium text-blue-200">256-bit Encryption</span>
               </div>
             </div>
           </div>
        </motion.div>

        {/* Right: Login Form */}
        <div className="flex-1 flex justify-center items-center p-12 bg-neutral-950/50 backdrop-blur-3xl">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="w-full max-w-md"
          >
            <GlassCard className="p-10 border-white/5 bg-neutral-900/60 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-gray-400">Sign in to access your dashboard</p>
              </div>

               <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Username</label>
                    <Input 
                       {...register("identifier")} 
                       placeholder="Enter your username" 
                       icon={<User size={18} />}
                       className="bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-brand-primary/50 h-12"
                    />
                    {errors.identifier && <p className="text-xs text-red-400 ml-1">{errors.identifier.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                    <Input 
                       {...register("password")} 
                       type="password" 
                       placeholder="••••••••" 
                       icon={<Lock size={18} />} 
                       className="bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-brand-primary/50 h-12"
                    />
                     {errors.password && <p className="text-xs text-red-400 ml-1">{errors.password.message}</p>}
                  </div>

                  <Button type="submit" size="lg" className="w-full text-base mt-2" disabled={isPending}>
                       {isPending ? (
                          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...</>
                       ) : (
                          "Sign In"
                       )}
                  </Button>
               </form>
            </GlassCard>
            
            <p className="text-center text-xs text-gray-600 mt-8">
              &copy; 2025 BlockVote. Secure Election System.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Wrap with Provider
export default function LoginPage() {
  return (
    <ToastProvider>
       {/* React Query Provider should theoretically be at root, but for now we wrap here if missing or rely on global */}
       {/* Assuming global QueryClientProvider exists in layout. If not, this might fail unless we wrap it. */}
       {/* Let's wrap LoginContent assuming standard hierarchy */}
       <LoginContent />
    </ToastProvider>
  );
}

