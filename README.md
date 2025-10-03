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

## Prérequis
1. Node.js 20 LTS (obligatoire pour Next 15 + tooling)
2. npm
3. Foundry : ```foundryup``` puis ```forge --version```
4. direnv (recommandé) pour charger auto les variables par dossier ```brew install direnv && echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc```

## Cloner + submodules Foundry
1. ```git clone <REPO_URL>```
2. ```cd TAM-Platform```
3. ```git submodule update --init --recursive```

## Environnements (jamais de secrets en git)
1. ```cp .env.example .env```
2. ```backend/.env.example backend/.env```
3. ```frontend/.env.example frontend/.env.local```  
Valeurs clés :
- Racine : SEPOLIA_RPC_URL (Alchemy/Infura), PRIVATE_KEY (wallet Sepolia de déploiement), ETHERSCAN_API_KEY (optionnel)
- Backend : ALCHEMY_RPC_URL, KYC_REGISTRY, RWA_ERC20, RWA_ERC721, ADMIN_ADDRESS, ADMIN_API_KEY (secret), DATABASE_URL (si Postgres)
- Frontend : NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_RPC_URL, NEXT_PUBLIC_API_URL, adresses publiques des contrats
- Puis ```direnv allow``` (à la racine)

## Installer les dépendances
```
# Frontend
cd frontend && npm i && cd ..

# Backend
cd backend && npm i && cd ..
```

## Contrats — build & tests (Foundry)
```
cd contracts
forge build
forge test -vv
```

## Déploiement Sepolia
- Dry-run (simulation, ne publie rien) :
```
cd contracts
forge script script/Deploy.s.sol --rpc-url sepolia
```

Broadcast (réel) :
```
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --private-key $PRIVATE_KEY
```

Sanity checks :
```
# Adresse du wallet d’après la clé
cast wallet address --private-key $PRIVATE_KEY

# KYC du deployer (0=NONE / 1=WHITELISTED / 2=BLACKLISTED)
cast call <KYC_ADDR> "getStatus(address)(uint8)" <DEPLOYER> --rpc-url sepolia

# Solde ERC20
cast call <ERC20_ADDR> "balanceOf(address)(uint256)" <DEPLOYER> --rpc-url sepolia

# Propriétaire du NFT #1
cast call <ERC721_ADDR> "ownerOf(uint256)(address)" 1 --rpc-url sepolia

```

Vérification Etherscan :
```
forge verify-contract \
  --rpc-url sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  <KYC_ADDR> \
  src/KYCRegistry.sol:KYCRegistry \
  --constructor-args $(cast abi-encode "constructor(address)" <DEPLOYER>) \
  --chain-id 11155111

forge verify-contract \
  --rpc-url sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  <ERC20_ADDR> \
  src/GatedERC20.sol:GatedERC20 \
  --constructor-args $(cast abi-encode "constructor(string,string,address,address)" "RWA Share" "RWA" <KYC_ADDR> <DEPLOYER>) \
  --chain-id 11155111

forge verify-contract \
  --rpc-url sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  <ERC721_ADDR> \
  src/GatedERC721.sol:GatedERC721 \
  --constructor-args $(cast abi-encode "constructor(string,string,address,address,string)" "RWA721" "RWA721" <KYC_ADDR> <DEPLOYER> "ipfs://base/") \
  --chain-id 11155111
```

## Lancer en local
Backend (Nest) :
```
cd backend
npm i
# backend/.env doit contenir ALCHEMY_RPC_URL + adresses des contrats
npm run start:dev
# → http://localhost:4000  (ex: GET /status)
```

Frontend (Next.js 15) :
```
cd frontend
npm i
# frontend/.env.local doit contenir NEXT_PUBLIC_* + adresses des contrats
npm run dev
# → http://localhost:3000
```
