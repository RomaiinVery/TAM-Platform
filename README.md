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

## Endpoints
```
STATUT
GET /statut
{ "ok": true, "service": "backend", "ts": 1759608329851 }


KYC
GET /kyc/0x1234...ABCD
{ "address": "0x1234...ABCD", "status": 1 } // statut = 0, 1 ou 2

POST /kyc/set | body : { "address": "0x1234...ABCD", "status": 1 }
{ "ok": true, "txHash": "0x..." }


DEX
GET /dex/quote-spot?pool=$POOL&tokenIn=$TOKENIN&tokenOut=TOKENOUT&amountIn=10000000000000000"
// TokenIn = token que tu donnes
// TokenOut = token que tu reçois
{
  "ok": true,
  "pool": "0x...",
  "feePpm": 3000,
  "sqrtPriceX96": "2505414483750479311864138015",
  "tick": -69082,
  "liquidity": "448350710494259114283",
  "token0": "0x...",
  "token1": "0x...",
  "tokenInIsToken0": true,
  "decimalsIn": 18,
  "decimalsOut": 18,
  "amountIn": "10000000000000000",
  "amountOut": "9970000000000",
  "midPriceToken1PerToken0": 0.001,
  "midPriceToken0PerToken1": 1000,
  "warnings": ["Quote spot approximative (arrondi float→bigint)"]
}

POST /dex/swap-calldata
/dex/swap-calldata \
  -H 'Content-Type: application/json' \
  -d '{
    "sender":    "0xe3d6B7f90b17E5175C0B4C8a25F8539c0C6958a7",
    "recipient": "0xe3d6B7f90b17E5175C0B4C8a25F8539c0C6958a7",
    "pool":      "0x5A9C1dA3068DD5c69E298BeA01e32dF62d863a09",
    "tokenIn":   "0x1a7008B9461deffA9a3176d864dEB6c24a64C580",
    "tokenOut":  "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    "amountIn":  "10000000000000000",
    "fee":       3000,
    "slippageBps": 50,
    "deadlineSec": 900
  }' | jq
{
  "ok": true,
  "router": "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b",
  "chainId": 11155111,
  "to": "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b",
  "data": "0x3593564c...",
  "value": "0",
  "deadline": "900",
  "feePpm": 3000,
  "amountIn": "10000000000000000",
  "amountOutMin": "9920149999999",
  "path": "0x<tokenIn><fee_3_bytes><tokenOut>",
  "notes": [
    "Assure-toi que le wallet a approve(tokenIn -> UniversalRouter).",
    "Calcule basé sur mid-price spot; pour une quote “réaliste”, brancher QuoterV2."
  ]
}

Execution on-chain du swap (ligne de commande mais qui se fera sur le frontend) :

1. Approve Permit2 (requis par Universal Router)
# Permit2 adresse “AllowanceTransfer”
PERMIT2=0x000000000022D473030F116dDEE9F6B43aC78BA3

# Approve large sur le tokenIn (RWA) vers Permit2
cast send 0x1a7008B9461deffA9a3176d864dEB6c24a64C580 \
  "approve(address,uint256)" \
  $PERMIT2 \
  0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff \
  --rpc-url $ALCHEMY_RPC_URL \
  --private-key $PRIVATE_KEY

2. Envoyer la transaction
cast send $UNIVERSAL_ROUTER "<DATA_DU_BACKEND_SWAP-CALLDATA>" \
  --value 0 \
  --rpc-url $ALCHEMY_RPC_URL \
  --private-key $PRIVATE_KEY
```
