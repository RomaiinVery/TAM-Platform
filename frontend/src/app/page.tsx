export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-4">Dashboard</h2>
      <p className="text-gray-400">Welcome to your Real Estate Tokenization Platform.</p>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] p-6 rounded-2xl shadow">
          <h3 className="text-xl font-bold mb-2">My Real Estate</h3>
          <p className="text-gray-400">1 NFT • 10,000 ERC-20 Tokens</p>
        </div>

        <div className="bg-[#1a1a1a] p-6 rounded-2xl shadow">
          <h3 className="text-xl font-bold mb-2">Total Value</h3>
          <p className="text-white text-2xl">$1,850,000</p>
          <p className="text-gray-400 text-sm">Oracle price: €5,500/m²</p>
        </div>
      </div>
    </div>
  );
}
