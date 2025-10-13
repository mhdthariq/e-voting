"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sun, Moon, LogIn, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { login } from "@/utils/auth";

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  

  // ✅ Dummy login logic
  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  const result = await login(username, password);

  if (result.success) {
    setError("");
    router.push("/dashboard");
  } else {
    setError(result.message || "Invalid username or password");
  }
};


  return (
    <div
      className={`relative min-h-screen flex flex-col md:flex-row transition-colors duration-500 ${
        darkMode ? "bg-black text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* 🌗 Theme Toggle */}
      <motion.button
        whileTap={{ rotate: 180, scale: 0.9 }}
        onClick={() => setDarkMode(!darkMode)}
        className={`absolute top-6 right-6 p-3 rounded-full shadow-md transition-all border z-20 ${
          darkMode
            ? "bg-neutral-900 border-emerald-800 hover:bg-emerald-800 text-emerald-300"
            : "bg-white border-gray-300 hover:bg-emerald-100 text-emerald-700"
        }`}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </motion.button>

      {/* 🌀 MOBILE FLIP CONTAINER */}
      <div className="flex-1 flex md:hidden justify-center items-center perspective-[1200px] relative overflow-hidden">
        <motion.div
          key={showLogin ? "login" : "info"}
          initial={{ rotateY: showLogin ? 180 : -180, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: showLogin ? -180 : 180, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="w-full absolute backface-hidden"
        >
          {!showLogin ? (
            // Info side
            <motion.div className="flex flex-col justify-center items-center text-center px-6 py-16 bg-gradient-to-br from-emerald-700 to-black text-white rounded-2xl mx-4">
              <h1 className="text-4xl font-extrabold mb-3 text-emerald-400">
                Welcome to BlockVote
              </h1>
              <p className="text-base mb-6 max-w-sm opacity-90">
                A secure blockchain-based voting system — designed for trust and transparency.
              </p>
              <ul className="text-emerald-200 text-sm mb-6 space-y-2">
                <li>🔐 Secure and verifiable</li>
                <li>🗳️ Blockchain-backed voting</li>
                <li>🌍 Transparent results</li>
              </ul>
              <Button
                onClick={() => setShowLogin(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-6 py-2 rounded-full flex items-center gap-2"
              >
                <LogIn size={18} /> Go to Login
              </Button>
            </motion.div>
          ) : (
            // Login side
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`w-full max-w-sm mx-auto rounded-2xl shadow-2xl border ${
                darkMode
                  ? "bg-neutral-900 border-emerald-800"
                  : "bg-white border-gray-300"
              } p-8`}
            >
              <h2
                className={`text-3xl font-bold mb-6 text-center ${
                  darkMode ? "text-emerald-400" : "text-emerald-700"
                }`}
              >
                Login
              </h2>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    className={`block font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:outline-none ${
                      darkMode
                        ? "bg-black border-emerald-800 text-white focus:ring-emerald-500"
                        : "border-gray-300 focus:ring-emerald-500"
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:outline-none ${
                      darkMode
                        ? "bg-black border-emerald-800 text-white focus:ring-emerald-500"
                        : "border-gray-300 focus:ring-emerald-500"
                    }`}
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-2 rounded-lg font-semibold"
                  type="submit"
                >
                  Login
                </Button>
              </form>

              <Button
                onClick={() => setShowLogin(false)}
                className="mt-6 w-full text-emerald-400 hover:text-emerald-500 flex justify-center items-center gap-2"
                variant="outline"
              >
                <ArrowLeft size={18} /> Back
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* 💻 DESKTOP LAYOUT */}
      <div className="hidden md:flex flex-1">
        {/* Left Info */}
        <motion.div
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 flex flex-col justify-center bg-gradient-to-br from-emerald-700 to-black text-white p-16"
        >
          <h1 className="text-5xl font-extrabold mb-4 text-emerald-400">
            Welcome to BlockVote
          </h1>
          <p className="text-lg mb-6 max-w-md opacity-90">
            A secure, decentralized voting system built on blockchain technology.
            Designed for trust, transparency, and digital democracy.
          </p>
          <ul className="space-y-3 text-base list-disc list-inside text-emerald-200">
            <li>🔐 Blockchain-backed vote integrity</li>
            <li>🗳️ Tamper-proof, verifiable sessions</li>
            <li>🌍 Accessible for any organization</li>
          </ul>
        </motion.div>

        {/* Right Login */}
        <motion.div
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 flex justify-center items-center p-16"
        >
          <div
            className={`w-full max-w-md rounded-2xl shadow-2xl border ${
              darkMode
                ? "bg-neutral-900 border-emerald-800"
                : "bg-white border-gray-300"
            } p-8`}
          >
            <h2
              className={`text-3xl font-bold mb-6 text-center ${
                darkMode ? "text-emerald-400" : "text-emerald-700"
              }`}
            >
              Login to BlockVote
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label
                  className={`block font-medium mb-1 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your Username"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:outline-none ${
                    darkMode
                      ? "bg-black border-emerald-800 text-white focus:ring-emerald-500"
                      : "border-gray-300 focus:ring-emerald-500"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block font-medium mb-1 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:outline-none ${
                    darkMode
                      ? "bg-black border-emerald-800 text-white focus:ring-emerald-500"
                      : "border-gray-300 focus:ring-emerald-500"
                  }`}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-2 rounded-lg font-semibold transition-all"
                type="submit"
              >
                Login
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
