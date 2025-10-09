"use client";
import { useState } from "react";

export default function ConnectWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (typeof window.ethereum === "undefined") {
      setError("Metamask not found!");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      setError(null);
    } catch (err: any) {
      // Gestion des erreurs utilisateur ou système
      if (err.code === 4001) {
        // 4001 = "User rejected request"
        setError("Connection request rejected.");
      } else {
        setError("Failed to connect to wallet.");
        console.error("Metamask connection error:", err);
      }
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={connect}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
      >
        {account ? account.slice(0, 6) + "..." + account.slice(-4) : "Connect Wallet"}
      </button>
    </div>
  );
}
