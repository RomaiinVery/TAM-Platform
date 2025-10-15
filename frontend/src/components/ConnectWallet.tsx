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

    setError(null);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
    } catch (err: any) {
      if (err.code === 4001) setError("Connection request rejected.");
      else setError("Failed to connect to wallet.");
      console.error("Metamask connection error:", err);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={connect}
        className={`
          relative px-5 py-2 rounded-md font-medium
          text-white
          bg-gradient-to-r from-blue-600 to-blue-800
          hover:from-blue-500 hover:to-blue-700
          transition-all duration-300
          shadow-[0_0_10px_#2563eb50]
          hover:shadow-[0_0_20px_#2563ebaa]
          focus:outline-none
          after:content-[''] after:absolute after:inset-0 after:rounded-md
          after:transition-all after:duration-300 after:bg-blue-500/10 hover:after:bg-blue-500/20
        `}
      >
        {account
          ? `${account.slice(0, 6)}...${account.slice(-4)}`
          : "Connect Wallet"}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
