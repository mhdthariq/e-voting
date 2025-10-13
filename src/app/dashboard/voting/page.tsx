"use client";

export default function VotingPage() {
  const dummyRooms = [
    { id: "VOTE001", name: "Student Council Election", status: "Open" },
    { id: "VOTE002", name: "Best Developer 2025", status: "Upcoming" },
    { id: "VOTE003", name: "Favorite Project Award", status: "Closed" },
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-emerald-400 mb-6">Voting Rooms</h2>
      <div className="overflow-x-auto">
        <table className="w-full border border-emerald-800 rounded-lg overflow-hidden">
          <thead className="bg-emerald-800 text-black">
            <tr>
              <th className="py-3 px-4 text-left">ID</th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {dummyRooms.map((room) => (
              <tr
                key={room.id}
                className="border-t border-emerald-700 hover:bg-emerald-800/30 transition"
              >
                <td className="py-3 px-4">{room.id}</td>
                <td className="py-3 px-4">{room.name}</td>
                <td className="py-3 px-4">{room.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
