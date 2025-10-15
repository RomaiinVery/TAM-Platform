"use client";
import { useState } from "react";

export default function TokenizePage() {
  const [form, setForm] = useState({
    propertyName: "",
    location: "",
    totalTokens: "",
    pricePerToken: "",
    image: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Tokenization request:", form);
    // plus tard: interaction avec smart contract
  };

  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Tokenize a Property</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1a1a] p-8 rounded-2xl shadow-md max-w-xl"
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Property Name</span>
            <input
              type="text"
              name="propertyName"
              value={form.propertyName}
              onChange={handleChange}
              placeholder="Ex: Modern Loft in Paris"
              className="p-2 bg-[#121212] border border-[#2a2a2a] rounded-md text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Location</span>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Paris, France"
              className="p-2 bg-[#121212] border border-[#2a2a2a] rounded-md text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Total Tokens</span>
            <input
              type="number"
              name="totalTokens"
              value={form.totalTokens}
              onChange={handleChange}
              placeholder="10000"
              className="p-2 bg-[#121212] border border-[#2a2a2a] rounded-md text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Price per Token (€)</span>
            <input
              type="number"
              name="pricePerToken"
              value={form.pricePerToken}
              onChange={handleChange}
              placeholder="50"
              className="p-2 bg-[#121212] border border-[#2a2a2a] rounded-md text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-gray-400 text-sm mb-1">Property Image URL</span>
            <input
              type="text"
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://..."
              className="p-2 bg-[#121212] border border-[#2a2a2a] rounded-md text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </label>

          <button
            type="submit"
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
          >
            Tokenize Property
          </button>
        </div>
      </form>
    </div>
  );
}
