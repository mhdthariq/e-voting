"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Candidate = {
  id: number;
  name: string;
  position?: string;
  votes?: number;
  image?: string;
  bio?: string;
  description?: string;
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);

  // ✅ Load all candidates
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await fetch("/api/data/candidate", { credentials: "include" });
        const data = await res.json();
        if (data.success) setCandidates(data.data);
      } catch (err) {
        console.error("❌ Error fetching candidates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, []);

  // ✅ Function to fetch candidate detail
  const handleCandidateClick = async (candidateId: number) => {
    try {
      setModalLoading(true);
      const res = await fetch(`/api/data/candidate/${candidateId}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        setSelectedCandidate(data.data);
      } else {
        console.error("Candidate detail fetch failed:", data.message);
      }
    } catch (error) {
      console.error("❌ Error fetching candidate detail:", error);
    } finally {
      setModalLoading(false);
    }
  };

  // ✅ Loading UI
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-gray-400">
        Loading candidates...
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-gray-400">
        No candidates found.
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 text-center">
        Candidates
      </h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((c, index) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.03 }}
            className="bg-neutral-900 border border-emerald-800 rounded-xl p-6 flex flex-col items-center text-center hover:shadow-lg hover:shadow-emerald-700/30 transition cursor-pointer"
            onClick={() => handleCandidateClick(c.id)}
          >
            <img
              src={c.image ?? "/default-avatar.png"}
              alt={c.name}
              className="w-28 h-28 object-cover rounded-full border-4 border-emerald-700 mb-4"
            />
            <h3 className="text-xl font-bold text-emerald-300">{c.name}</h3>
            <p className="text-gray-400">{c.position}</p>
            <p className="mt-2 text-sm text-gray-500">Votes: {c.votes}</p>
          </motion.div>
        ))}
      </div>

      {/* ✅ Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCandidate(null)}
          >
            <motion.div
              className="bg-neutral-900 border border-emerald-700 rounded-2xl p-8 w-[90%] max-w-md relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-emerald-400 transition"
              >
                ✕
              </button>

              {modalLoading ? (
                <div className="text-gray-400 text-center py-10">Loading details...</div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <img
                    src={selectedCandidate.image ?? "/default-avatar.png"}
                    alt={selectedCandidate.name}
                    className="w-32 h-32 object-cover rounded-full border-4 border-emerald-600 mb-4"
                  />
                  <h3 className="text-2xl font-bold text-emerald-300">
                    {selectedCandidate.name}
                  </h3>
                  <p className="text-gray-400 mb-2">{selectedCandidate.position}</p>
                  <p className="text-gray-500 mb-4 text-sm">
                    Votes: {selectedCandidate.votes}
                  </p>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {selectedCandidate.bio || selectedCandidate.description || "No bio available."}
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
