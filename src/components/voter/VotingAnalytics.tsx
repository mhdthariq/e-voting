"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";

// Mock data (replace with props later)
const resultsData = [
  { name: "Candidate A", votes: 450, fill: "#10B981" },
  { name: "Candidate B", votes: 300, fill: "#3B82F6" },
  { name: "Candidate C", votes: 150, fill: "#F59E0B" },
];

const turnoutData = [
  { name: "Voted", value: 900, fill: "#10B981" },
  { name: "Remaining", value: 100, fill: "#374151" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-white font-bold">{label}</p>
        <p className="text-emerald-400 text-sm">
          {payload[0].value} Votes
        </p>
      </div>
    );
  }
  return null;
};

export default function VotingAnalytics() {
  const [activeIndex, setActiveIndex] = useState(-1);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vote Distribution */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-6">Live Vote Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resultsData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#ffffff" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
                <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={20} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Turnout */}
        <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Voter Turnout</h3>
                <span className="text-2xl font-bold text-emerald-400">90%</span>
            </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={turnoutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                >
                  {turnoutData.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={entry.fill} 
                        stroke="rgba(0,0,0,0)"
                        style={{
                            filter: index === activeIndex ? "drop-shadow(0 0 8px rgba(255,255,255,0.3))" : "none",
                            transition: "all 0.3s ease"
                        }}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold">Votes</p>
                    <p className="text-xl font-bold text-white">900</p>
                </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
