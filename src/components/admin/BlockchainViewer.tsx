"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Clock,
  Database,
  Link as LinkIcon,
  Lock,
} from "lucide-react";

interface VoteTransaction {
  voteId: string;
  voterPublicKey: string;
  candidateId: number;
  timestamp: string;
  signature: string;
}

interface Block {
  id: number;
  blockIndex: number;
  previousHash: string;
  hash: string;
  merkleRoot: string;
  nonce: number;
  timestamp: string;
  electionId: number;
  election: {
    title: string;
  };
  voteCount: number;
  parsedVotes: VoteTransaction[];
}

interface BlockchainViewerProps {
  blocks: Block[];
  loading: boolean;
}

export default function BlockchainViewer({
  blocks,
  loading,
}: BlockchainViewerProps) {
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="text-center py-12 opacity-50 border-2 border-dashed border-gray-700 rounded-xl">
        <Database size={48} className="mx-auto mb-4 opacity-50" />
        <p>No blocks found in the chain.</p>
        <p className="text-sm mt-2">
          New blocks are mined when votes are cast.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Visual Connector Line */}
        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-linear-to-b from-emerald-500/20 to-emerald-500/5 -z-10 hidden md:block"></div>

        <div className="space-y-6">
          {blocks.map((block, index) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-xl border transition-all ${
                block.blockIndex === 0
                  ? "bg-emerald-900/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "bg-neutral-900/50 border-emerald-900/50 hover:border-emerald-700"
              }`}
            >
              {/* Card Header */}
              <div
                className="p-4 sm:p-6 cursor-pointer"
                onClick={() =>
                  setExpandedBlock(expandedBlock === block.id ? null : block.id)
                }
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 p-2 rounded-lg ${block.blockIndex === 0 ? "bg-emerald-500 text-black" : "bg-emerald-900/40 text-emerald-400"}`}
                    >
                      <Hash size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">
                          Block #{block.blockIndex}
                        </h3>
                        {block.blockIndex === 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500 text-black">
                            Genesis
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase border border-gray-700 text-gray-400">
                          Nonce: {block.nonce}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 flex items-center gap-2">
                        <Database size={12} className="text-emerald-500" />
                        Election:{" "}
                        <span className="text-emerald-400">
                          {block.election.title}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs sm:text-sm text-gray-500 font-mono">
                    <div
                      className="flex items-center gap-1.5"
                      title={new Date(block.timestamp).toLocaleString()}
                    >
                      <Clock size={14} />
                      {new Date(block.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-neutral-900 border border-gray-800">
                      <Lock size={12} />
                      {block.voteCount} Votes
                    </div>
                    {expandedBlock === block.id ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </div>
                </div>

                {/* Hash Visuals */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] md:text-xs font-mono bg-black/20 p-3 rounded-lg border border-white/5">
                  <div className="truncate">
                    <span className="text-gray-500 block mb-1">
                      Previous Hash (Parent Link)
                    </span>
                    <span className="text-emerald-700/70">
                      {block.previousHash}
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="text-gray-500 block mb-1">
                      Block Hash (Integrity Proof)
                    </span>
                    <span className="text-emerald-400">{block.hash}</span>
                  </div>
                </div>
              </div>

              {/* Expanded Details (Transactions) */}
              <AnimatePresence>
                {expandedBlock === block.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-emerald-900/30 bg-black/20"
                  >
                    <div className="p-4 sm:p-6 space-y-4">
                      <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                        <LinkIcon size={14} /> Merkle Root & Transactions
                      </h4>

                      <div className="p-2 bg-neutral-950 rounded border border-gray-800 font-mono text-xs text-gray-400 break-all">
                        Merkle Root: {block.merkleRoot}
                      </div>

                      <div className="space-y-2 max-h-75 overflow-y-auto pr-2 custom-scrollbar">
                        {block.parsedVotes.map((vote, i) => (
                          <div
                            key={i}
                            className="p-3 rounded bg-neutral-900 border border-gray-800 text-xs hover:border-emerald-900/50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-emerald-500">
                                Vote #{i + 1}
                              </span>
                              <span className="text-gray-600">
                                {new Date(vote.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-1 text-gray-500 font-mono text-[10px]">
                              <div className="truncate">ID: {vote.voteId}</div>
                              <div className="truncate">
                                Sig: {vote.signature.substring(0, 32)}...
                              </div>
                            </div>
                          </div>
                        ))}
                        {block.parsedVotes.length === 0 && (
                          <p className="text-center py-4 text-xs opacity-50">
                            No transactions in this block.
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
