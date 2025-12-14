"use client";

import { useState } from "react";
import {
  X,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
}

export default function ChangePasswordModal({
  open,
  onClose,
  darkMode,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    message: string;
  }>({ isOpen: false, type: "success", message: "" });

  if (!open) return null;

  const handleChangePassword = async () => {
    setError(null);
    if (!currentPassword || !newPassword) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      // Menggunakan endpoint yang sama karena backend membedakan user dari token
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
        setNotificationModal({
          isOpen: true,
          type: "success",
          message: "Password changed successfully!",
        });
        setNewPassword("");
        setCurrentPassword("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setTimeout(() => {
          setNotificationModal({ isOpen: false, type: "success", message: "" });
          onClose();
        }, 2000);
      } else {
        setError(json.message || "Failed to change password");
      }
    } catch {
      setError("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-10000"
        onClick={onClose}
      ></div>
      <div className="fixed inset-0 z-10001 flex items-center justify-center pointer-events-none p-4">
        <div
          className={`pointer-events-auto w-full max-w-md rounded-xl p-6 shadow-2xl border relative ${
            darkMode
              ? "bg-neutral-900 border-emerald-700 text-emerald-100"
              : "bg-white border-gray-200 text-gray-900"
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Change Password</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-500/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm opacity-70 block mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className={`w-full px-3 py-2 pr-10 rounded-md border outline-none focus:ring-1 focus:ring-emerald-500 ${
                    darkMode
                      ? "bg-neutral-800 border-emerald-700"
                      : "bg-white border-gray-300"
                  }`}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100"
                >
                  {showCurrentPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm opacity-70 block mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className={`w-full px-3 py-2 pr-10 rounded-md border outline-none focus:ring-1 focus:ring-emerald-500 ${
                    darkMode
                      ? "bg-neutral-800 border-emerald-700"
                      : "bg-white border-gray-300"
                  }`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md hover:bg-gray-500/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Update Password
            </button>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <AnimatePresence>
        {notificationModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10002 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
