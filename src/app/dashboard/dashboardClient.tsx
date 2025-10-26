"use client";

import { motion } from "framer-motion";

interface UserPayload {
  name: string;
  email?: string;
}

export default function DashboardClient({ user }: { user: UserPayload }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      <h2 className="text-3xl font-bold text-emerald-400">
        Welcome, {user.name ?? "Voter!"}
      </h2>
      <p className="text-gray-300">
        Here’s your voting overview. Stay informed and make your vote count.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-emerald-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-emerald-300">Active Sessions</h3>
          <p className="text-3xl font-bold mt-2">3</p>
        </div>
        <div className="bg-neutral-900 border border-emerald-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-emerald-300">Votes Cast</h3>
          <p className="text-3xl font-bold mt-2">12</p>
        </div>
        <div className="bg-neutral-900 border border-emerald-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-emerald-300">Completed</h3>
          <p className="text-3xl font-bold mt-2">5</p>
        </div>
      </div>
    </motion.div>
  );
}
