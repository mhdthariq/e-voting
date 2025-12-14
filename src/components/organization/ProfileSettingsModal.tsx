"use client";

import { useState, useEffect } from "react";
import {
  X,
  Camera,
  LogOut,
  Lock,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChangePasswordModal from "./ChangePasswordModal";

interface Props {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  user: {
    username: string;
    email: string;
    profileImage?: string | null;
  } | null;
  onLogout: () => void;
  // --- TAMBAHKAN BARIS INI ---
  onUpdateSuccess?: () => void;
}

export default function ProfileSettingsModal({
  open,
  onClose,
  darkMode,
  user,
  onLogout,
  onUpdateSuccess,
}: Props) {
  const [username, setUsername] = useState(user?.username || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    message: string;
  }>({ isOpen: false, type: "success", message: "" });

  // Sync state saat modal dibuka atau user berubah
  useEffect(() => {
    if (open && user) {
      setUsername(user.username);
      setProfileImage(user.profileImage || "");
    }
  }, [open, user]);

  if (!open) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
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
          profileImage,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNotificationModal({
          isOpen: true,
          type: "success",
          message: "Organization profile updated successfully!",
        });

        // --- PANGGIL CALLBACK DISINI ---
        if (onUpdateSuccess) {
          onUpdateSuccess();
        }
      } else {
        setNotificationModal({
          isOpen: true,
          type: "error",
          message: json.message,
        });
      }
    } catch {
      setNotificationModal({
        isOpen: true,
        type: "error",
        message: "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-9998" onClick={onClose}></div>
      <div className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none p-4">
        <div
          className={`pointer-events-auto w-full max-w-md rounded-2xl p-6 shadow-2xl border relative flex flex-col max-h-[90vh] overflow-y-auto
          ${darkMode ? "bg-neutral-900 border-emerald-700 text-emerald-100" : "bg-white border-gray-200 text-gray-900"}
        `}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Organization Profile</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-neutral-800 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-black"}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Image Upload */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer">
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    profileImage ||
                    `https://ui-avatars.com/api/?name=${username}&background=10a37f&color=fff`
                  }
                  alt="profile"
                  className={`w-24 h-24 rounded-full object-cover border-4 ${darkMode ? "border-emerald-800" : "border-emerald-100"}`}
                />
              </>
              <label className="absolute bottom-0 right-0 bg-emerald-600 p-2 rounded-full text-white cursor-pointer shadow-lg hover:bg-emerald-700 transition-colors">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p
              className={`mt-3 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Organization Logo
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-sm font-medium opacity-80 mb-1 block">
                Organization Name
              </label>
              <input
                className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all ${
                  darkMode
                    ? "bg-neutral-800 border-emerald-800 text-emerald-100 focus:border-emerald-500"
                    : "bg-gray-50 border-gray-300 text-gray-900 focus:border-emerald-500"
                }`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium opacity-80 mb-1 block">
                Email
              </label>
              <input
                disabled
                className={`w-full px-4 py-2.5 rounded-lg border opacity-60 cursor-not-allowed ${
                  darkMode
                    ? "bg-neutral-800 border-emerald-800 text-emerald-100"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
                value={user?.email || ""}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                darkMode
                  ? "bg-neutral-800/50 border-emerald-800 hover:bg-neutral-800 hover:border-emerald-600"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-md ${darkMode ? "bg-neutral-700 text-emerald-400" : "bg-white text-emerald-600 shadow-sm"}`}
                >
                  <Lock size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold">
                    Change Password
                  </span>
                  <span className="block text-xs opacity-60">
                    Update security credentials
                  </span>
                </div>
              </div>
              <span className="text-xs opacity-50">Edit</span>
            </button>

            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all group ${
                darkMode
                  ? "bg-red-900/10 border-red-900/30 text-red-400 hover:bg-red-900/20 hover:border-red-900/50"
                  : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-md ${darkMode ? "bg-red-900/20" : "bg-white shadow-sm"}`}
                >
                  <LogOut size={18} />
                </div>
                <span className="text-sm font-semibold">Log Out</span>
              </div>
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Save Changes
          </button>

          <ChangePasswordModal
            open={isPasswordModalOpen}
            onClose={() => setIsPasswordModalOpen(false)}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-10000"
            onClick={() => setIsLogoutModalOpen(false)}
          ></div>
          <div className="fixed inset-0 z-10001 flex items-center justify-center pointer-events-none p-4">
            <div
              className={`pointer-events-auto w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${
                darkMode
                  ? "bg-neutral-900 border-red-900/50 text-white"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div
                  className={`p-3 rounded-full ${
                    darkMode ? "bg-red-900/20" : "bg-red-50"
                  }`}
                >
                  <AlertTriangle
                    size={32}
                    className={darkMode ? "text-red-400" : "text-red-600"}
                  />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-center mb-2">
                Are you sure you want to logout?
              </h3>

              {/* Message */}
              <p
                className={`text-sm text-center mb-6 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                You will be redirected to the login page.
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                    darkMode
                      ? "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIsLogoutModalOpen(false);
                    onLogout();
                  }}
                  className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-all"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notification Modal */}
      <AnimatePresence>
        {notificationModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() =>
              setNotificationModal({ ...notificationModal, isOpen: false })
            }
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-xl shadow-2xl border overflow-hidden ${darkMode ? "bg-neutral-900 border-emerald-800" : "bg-white border-gray-200"}`}
            >
              <div
                className={`p-6 border-b ${darkMode ? "border-emerald-800/30" : "border-gray-200"}`}
              >
                <div className="flex items-center gap-3">
                  {notificationModal.type === "success" ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle size={24} className="text-emerald-500" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertCircle size={24} className="text-red-500" />
                    </div>
                  )}
                  <div>
                    <h3
                      className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {notificationModal.type === "success"
                        ? "Success"
                        : "Error"}
                    </h3>
                    <p className="text-sm opacity-60">
                      {notificationModal.type === "success"
                        ? "Operation completed"
                        : "Something went wrong"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p
                  className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                >
                  {notificationModal.message}
                </p>
              </div>
              <div
                className={`p-4 border-t flex justify-end ${darkMode ? "border-emerald-800/30" : "border-gray-200"}`}
              >
                <button
                  onClick={() =>
                    setNotificationModal({
                      ...notificationModal,
                      isOpen: false,
                    })
                  }
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    notificationModal.type === "success"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
