"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";

export default function HistoryVoting() {
  const history = [
    { id: "V001", name: "Student Council", date: "2025-03-12", status: "Completed" },
    { id: "V002", name: "Best Developer", date: "2025-05-02", status: "Completed" },
  ];

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(history);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, "VotingHistory.xlsx");
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-emerald-400 mb-6">Voting History</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full border border-emerald-800 rounded-lg overflow-hidden">
          <thead className="bg-emerald-800 text-black">
            <tr>
              <th className="py-3 px-4 text-left">ID</th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr
                key={item.id}
                className="border-t border-emerald-700 hover:bg-emerald-800/30 transition"
              >
                <td className="py-3 px-4">{item.id}</td>
                <td className="py-3 px-4">{item.name}</td>
                <td className="py-3 px-4">{item.date}</td>
                <td className="py-3 px-4">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        onClick={exportToExcel}
        className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold px-6 py-2 rounded-lg"
      >
        Export to Excel
      </Button>
    </div>
  );
}
