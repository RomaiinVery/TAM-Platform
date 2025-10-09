"use client";
import { useState } from "react";

export default function TradePage() {
  const [balance] = useState(2500); // plus tard => valeur réelle depuis blockchain
  const [pricePerToken] = useState(55); // depuis oracle
  const [amount, setAmount] = useState("");

  const handleBuy = () => {
    console.log(`Buying ${amount} tokens...`);
  };

  const handleSell = () => {
    console.log(`Selling ${amount} tokens...`);
  };

  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Trade Real Estate Tokens</h2>

      <div className="bg-[#1a1a1a] p-8 rounded-2xl shadow-md max-w-xl flex flex-col gap-6">
        <div>
          <p className="text-gray-400 text-sm">Your Current Balance</p>
          <p className="text-2xl font-semibold text-white">{balance} tokens</p>
          <p className="text-gray-500 text-sm mt-1">
            (~€{(balance * pricePerToken).toLocaleString()})
          </p>
        </div>

        <div>
          <p className="text-gray-400 text-sm mb-1">Price per Token</p>
          <p className="text-lg text-white">€{pricePerToken}</p>
        </div>

        <div className="flex flex-col gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="p-2 bg-[#121212] border border-[#2a2a2a] rounded-md text-gray-200 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleBuy}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition"
            >
              Buy
            </button>
            <button
              onClick={handleSell}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition"
            >
              Sell
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
