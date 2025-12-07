"use client";

import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const dataBar = [
  { name: 'Election A', votes: 400 },
  { name: 'Election B', votes: 300 },
  { name: 'Election C', votes: 200 },
  { name: 'Election D', votes: 278 },
  { name: 'Election E', votes: 189 },
];

const dataPie = [
  { name: 'Voted', value: 400 },
  { name: 'Not Voted', value: 100 },
];

const COLORS = ['#10b981', '#374151']; // Emerald-500 and Gray-700

export default function OrganizationAnalytics() {
  return (
    <div className="space-y-6">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voting Participation (Pie) */}
          <GlassCard className="p-6">
             <h3 className="text-lg font-bold text-white mb-4">Overall Voter Turnout</h3>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={dataPie}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={80}
                         fill="#8884d8"
                         paddingAngle={5}
                         dataKey="value"
                      >
                         {dataPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                         itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </GlassCard>

          {/* Votes per Election (Bar) */}
          <GlassCard className="p-6">
             <h3 className="text-lg font-bold text-white mb-4">Votes per Election</h3>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart
                      data={dataBar}
                      margin={{
                         top: 5,
                         right: 30,
                         left: 20,
                         bottom: 5,
                      }}
                   >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip 
                         cursor={{fill: 'transparent'}}
                         contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                      />
                      <Bar dataKey="votes" fill="#10b981" radius={[4, 4, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </GlassCard>
       </div>
    </div>
  );
}
