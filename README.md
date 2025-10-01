# Tokenized Asset Management Platform (EVM / Sepolia)

Plateforme testnet permettant de :
- Tokeniser des actifs réels (ERC-20 parts / ERC-721 unique)
- Faire respecter la compliance **on-chain** (KYC whitelist/blacklist)
- Échanger via **Uniswap v3** (pool + liquidité initiale)
- Rester synchronisé grâce à un **indexer** (polling viem + SSE/WS)
- Afficher un **prix** via Chainlink (ou oracle maison)

## Pile technique
- EVM Sepolia • Solidity • Foundry
- Uniswap v3 • Chainlink (ou Oracle maison)
- Frontend: Next.js (Rabby)
- Backend: NestJS + Prisma + Postgres
- Infra: Vercel (front) • Railway (back + DB) • Alchemy (RPC) • GitHub Actions (CI)

## Démarrage rapide (Étape 0)
1. Copier `.env.example` en `.env` (à la racine et dans `backend`/`frontend` si besoin).
2. Pousser ce repo et activer GitHub Actions.
3. Créer les comptes: **Alchemy**, **Railway**, **Vercel**, un **compte Sepolia** (faucet).
