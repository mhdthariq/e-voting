"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Users, List, Clock, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUser, logout, UserInfo } from "@/utils/auth"; // import UserInfo

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null); // use correct type

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push("/"); // not authenticated
      } else {
        setUser(currentUser);
      }

      setIsLoading(false);
    }

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-emerald-400">
        Checking authentication...
      </div>
    );
  }

  const menu = [
    { name: "Dashboard", icon: Home, path: "/dashboard" },
    { name: "Voting Room", icon: List, path: "/dashboard/voting" },
    { name: "History", icon: Clock, path: "/dashboard/history" },
    { name: "Candidates", icon: Users, path: "/dashboard/candidates" },
  ];

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-black text-white relative">
      {/* Sidebar for Desktop */}
      <motion.aside
        initial={{ x: -100 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex md:flex-col md:w-64 bg-gradient-to-b from-emerald-800 to-black h-full justify-between shadow-xl"
      >
        <div>
          <div className="p-6 text-2xl font-extrabold text-emerald-300 border-b border-emerald-700">
            BlockVote
          </div>
          <nav className="p-4 space-y-2">
            {menu.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    active
                      ? "bg-emerald-600 text-black font-semibold"
                      : "hover:bg-emerald-700/40"
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-4 text-emerald-300 hover:bg-emerald-700/30 transition-colors border-t border-emerald-700"
        >
          <LogOut size={18} />
          Logout
        </button>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="flex justify-between items-center px-6 py-4 border-b border-emerald-800 bg-black/80 sticky top-0 z-10 md:hidden">
          <h1 className="text-xl font-semibold text-emerald-400">BlockVote</h1>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 p-6 pb-24 md:pb-6 bg-neutral-950"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Navbar */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-emerald-900/80 backdrop-blur-lg border-t border-emerald-700 flex justify-around py-2 z-50"
      >
        {menu.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex flex-col items-center text-xs ${
                active
                  ? "text-emerald-300 font-semibold"
                  : "text-gray-400 hover:text-emerald-300"
              }`}
            >
              <Icon size={20} />
              {item.name.split(" ")[0]}
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center text-xs text-gray-400 hover:text-red-400"
        >
          <LogOut size={20} />
          Logout
        </button>
      </motion.nav>
    </div>
  );
}
