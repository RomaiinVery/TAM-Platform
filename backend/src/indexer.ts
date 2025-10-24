// import { ethers } from "ethers";
// import dotenv from "dotenv";
// // import prisma from "./db.js";

// dotenv.config();

// // --- CONSTANTES --- //
// const ERC20_CONTRACT = process.env.ERC20_CONTRACT!;
// const ERC721_CONTRACT = process.env.ERC721_CONTRACT!;
// const providerURL = process.env.RPC_URL!;
// let provider = new ethers.WebSocketProvider(providerURL);

// const transferTopic = ethers.id("Transfer(address,address,uint256)");
// const iface = new ethers.Interface([
//   "event Transfer(address indexed from, address indexed to, uint256 value)",
//   "event PropertyTokenized(uint256 indexed propertyId, string name, string location, uint256 totalTokens)"
// ]);

// // --- UTILS --- //
// async function parseLog(log: any, provider: ethers.Provider) {
//   const decoded = iface.parseLog(log);
//   const block = await provider.getBlock(log.blockNumber);

//   return {
//     address: log.address,
//     eventName: decoded.name,
//     args: decoded.args,
//     txHash: log.transactionHash,
//     blockNumber: log.blockNumber,
//     timestamp: block?.timestamp ?? 0
//   };
// }

// // --- SAVE --- //
// async function saveEvent(event: any) {
// //   await prisma.event.create({
// //     data: {
// //       txHash: event.txHash,
// //       contractAddress: event.address,
// //       eventName: event.eventName,
// //       args: JSON.stringify(event.args),
// //       blockNumber: event.blockNumber,
// //       timestamp: event.timestamp
// //     }
// //   });
//   console.log(`✅ Saved event: ${event.eventName} (${event.txHash})`);
// }

// // --- LISTEN --- //
// function listen() {
//   console.log("🔄 Listening to ERC20 + ERC721 events...");

//   provider.on(
//     { address: [ERC20_CONTRACT, ERC721_CONTRACT], topics: [transferTopic] },
//     async (log) => {
//       const event = await parseLog(log, provider);
//       console.log("💸 Transfer:", event.args);
//       await saveEvent(event);
//     }
//   );

//   const propertyTokenizedTopic = ethers.id(
//     "PropertyTokenized(uint256,string,string,uint256)"
//   );

//   provider.on({ topics: [propertyTokenizedTopic] }, async (log) => {
//     const event = await parseLog(log, provider);
//     console.log("🏠 Property Tokenized:", event.args);
//     await saveEvent(event);
//   });

//   provider.on("error", (err) => {
//     console.error("Provider error:", err);
//     reconnect();
//   });
// }

// function reconnect() {
//   console.log("Reconnecting...");
//   provider = new ethers.WebSocketProvider(providerURL);
//   listen();
// }

// async function main() {
//   const blockNumber = await provider.getBlockNumber();
//   console.log("Connected. Current block:", blockNumber);
//   listen();
// }

// main();
