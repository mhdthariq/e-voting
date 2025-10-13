"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ✅ Define a strong type for candidates
type Candidate = {
  id: number;
  name: string;
  position: string;
  votes: number;
  image: string;
  bio: string;
};

export default function CandidatesPage() {
  const candidates: Candidate[] = [
    {
      id: 1,
      name: "Alice Johnson",
      position: "President",
      votes: 120,
      image: "https://picsum.photos/seed/alice/300/300",
      bio: "Alice is a passionate leader who has served as class representative for 2 years and advocates for student empowerment.",
    },
    {
      id: 2,
      name: "Bob Smith",
      position: "Vice President",
      votes: 98,
      image: "https://picsum.photos/seed/bob/300/300",
      bio: "Bob focuses on community growth and has organized multiple tech workshops and student meetups.",
    },
    {
      id: 3,
      name: "Charlie Nguyen",
      position: "Secretary",
      votes: 75,
      image: "https://picsum.photos/seed/charlie/300/300",
      bio: "Charlie is detail-oriented, ensuring transparency in student organization documentation and event planning.",
    },
  ];

  // ✅ Use proper typing for state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  return (
    <div className="p-6 relative">
      <h2 className="text-3xl font-bold text-emerald-400 mb-6 text-center">
        Candidates
      </h2>

      {/* Candidate Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((c, index) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.03 }}
            className="bg-neutral-900 border border-emerald-800 rounded-xl p-6 flex flex-col items-center text-center hover:shadow-lg hover:shadow-emerald-700/30 transition cursor-pointer"
            onClick={() => setSelectedCandidate(c)}
          >
            <img
              src={c.image}
              alt={c.name}
              className="w-28 h-28 object-cover rounded-full border-4 border-emerald-700 mb-4"
            />
            <h3 className="text-xl font-bold text-emerald-300">{c.name}</h3>
            <p className="text-gray-400">{c.position}</p>
            <p className="mt-2 text-sm text-gray-500">Votes: {c.votes}</p>
          </motion.div>
        ))}
      </div>

      {/* Candidate Modal */}
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
              <div className="flex flex-col items-center text-center">
                <img
                  src={selectedCandidate.image}
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
                <p className="text-gray-300 leading-relaxed">
                  {selectedCandidate.bio}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
