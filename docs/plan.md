# Tokenized Asset Management Platform — Project Plan

> **Résumé rapide**
> - **But** : Plateforme (testnet Sepolia) pour tokeniser des actifs réels (RWA), faire respecter la compliance **on-chain** (KYC whitelist/blacklist), **échanger** les tokens via **Uniswap v3**, rester **synchro** avec la chaîne (indexer), et **afficher un prix** via **Chainlink** (ou oracle maison).
> - **Stack choisie** : EVM (Sepolia) • **Foundry** (contrats & tests) • **Uniswap v3** • **Chainlink si dispo** / **Oracle maison** • Wallet **Rabby** • **Next.js** (frontend) • **NestJS + Prisma + Postgres** (backend + indexer) • **Vercel** (front) • **Railway** (back + DB) • **Alchemy** (RPC) • **GitHub Actions** (CI/CD)
> - **Taille équipe** : 4 personnes — répartition proposée plus bas.


## 1) Objectifs & Livrables

### 1.1 Objectifs fonctionnels
- **Tokenisation** :
  - Fongible (ERC-20) pour parts d’un RWA (ex. part d’immeuble).
  - Non-fongible (ERC-721) pour actif unique (ex. œuvre).
- **Compliance on-chain** :
  - Registre **KYC** : `WHITELISTED` / `BLACKLISTED` (par défaut `NONE`).
  - **Blocage des transferts** directement dans les contrats si non conforme.
- **Trading on-chain** :
  - **Pool Uniswap v3** RWA20 / WETH (ou stable) sur **Sepolia**.
  - **Liquidité initiale** fournie par nous.
- **Indexer & temps réel** :
  - Indexer (polling `viem`) + WebSocket/SSE pour pousser les events au front.
  - Si un swap a lieu **hors UI** (ex. sur l’UI d’Uniswap), il apparaît dans l’app.
- **Oracle** :
  - **Chainlink Data Feed** si disponible sur Sepolia → lecture on-chain.
  - Sinon **oracle maison** avec `setPrice(price, timestamp)` (rôle admin).
- **MVP KYC** :
  - Panneau admin pour **whitelister/blacklister** des adresses.

### 1.2 Livrables attendus
- **Plateforme en ligne** (front Vercel + back Railway + DB Postgres managée).
- **Contrats déployés** sur Sepolia (adresses + vérification sur Etherscan/Blockscout).
- **Pool Uniswap v3** existant avec **TVL initiale**.
- **Code source** dans un **mono-repo public** GitHub.
- **README** + **ADRs courts** (choices & trade-offs) + **script de démo**.
- **Démo** : tokenisation, compliance (success/fail), swap, indexer en action, oracle.


## 2) Périmètre détaillé (ce qu’il y a à réaliser)

### 2.1 Contrats (Solidity via Foundry)
- **KYCRegistry.sol**
  - `enum Status { NONE, WHITELISTED, BLACKLISTED }`
  - `mapping(address => Status)`
  - `setStatus(address, Status)` (owner / AccessControl)
  - `isWhitelisted(address)`, `isBlacklisted(address)`
  - Event `StatusChanged(address user, Status status)`
- **GatedERC20.sol**
  - Hérite d’OpenZeppelin ERC20.
  - Référence `KYCRegistry`.
  - **Override des transferts/mint/burn** pour refuser si `from/to` non-whitelist ou blacklist.
  - `mint/burn`: restreints (owner/minter).
- **GatedERC721.sol**
  - Hérite d’OpenZeppelin ERC721.
  - Même **gardiens KYC** sur transferts/mint.
- **OracleFeed.sol** (fallback si pas de feed Chainlink)
  - `setPrice(int256 price, uint256 timestamp)` (rôle ORACLE_UPDATER)
  - `latestPrice()` retourne valeur + fraîcheur
  - Event `PriceUpdated(int256 price, uint256 timestamp)`
- **(Optionnel) TokenFactory.sol**
  - Déploiement de nouveaux `GatedERC20/ERC721` avec `KYCRegistry` partagé.

**Tests Foundry (obligatoire)** :
- KYC : set/unset, événements, accès restreint.
- ERC-20/721 : 
  - Transferts **OK** si whitelisted, **KO** si non whitelist/blacklist (tous les chemins : `transfer`, `transferFrom`, `safeTransferFrom`, `mint`, `burn`).
- Oracle : MAJ par admin OK, timestamp cohérent.

### 2.2 DEX (Uniswap v3 sur Sepolia)
- **Création de pool** RWA20/WETH (ou USDC de test).
- **Initialisation** du prix (`sqrtPriceX96`) + **ajout de liquidité** (LP NFT).
- **Scripts** : `create_pool`, `add_liquidity`, `swap_example`.
- **Test d’intégration** : swap **réussi** en KYC, swap **revert** si destinataire non whitelist.

### 2.3 Backend & Indexer (NestJS + Prisma + Postgres)
- **Schéma DB** (Prisma) :
  - `User(address PK, kyc_status, createdAt)`
  - `Token(address PK, type, symbol, decimals, owner)`
  - `Transfer(id, token, from, to, amountOrTokenId, txHash, block, ts)`
  - `DexSwap(id, pool, tokenIn, tokenOut, amountIn, amountOut, trader, ts)`
  - `OracleSnapshot(id, symbol, price, ts)`
  - `Cursor(name PK, lastBlock)` — gestion du rattrapage par flux d’events.
- **Indexer (polling viem)** :
  - Toutes les **60s** : `getLogs` sur topics des events (`Transfer`, `StatusChanged`, `PriceUpdated`, `Swap`).
  - **Upsert** en DB, mise à jour du **cursor**, **push SSE/WS** au front.
- **API REST** :
  - `GET /status` (santé/version)
  - `GET /kyc/:address` — statut
  - `POST /kyc` — setStatus (endpoint admin, protégé)
  - `GET /portfolio/:address` — soldes & NFTs
  - `GET /oracle/:symbol`
  - `GET /dex/swaps?token=…`
  - `GET /activity?since=…` — derniers events
- **Sécurité** : Admin endpoints protégés (API key/JWT), CORS, rate-limit de base.

### 2.4 Frontend (Next.js)
- **Connexion wallet** : Rabby (compatible EVM), WalletConnect (optionnel).
- **Pages** :
  - **Dashboard** : prix oracle, supply, TVL estimée, derniers transferts/swaps (live).
  - **Compliance Admin** : champ adresse + boutons `Whitelist` / `Blacklist`.
  - **Trade** : swap RWA/WETH via Uniswap v3 SDK (vérifie KYC avant).
  - **Portfolio** : soldes ERC-20, NFTs ERC-721, historique.
  - **Activity (live)** : flux SSE/WS.
  - **Tokenize** (optionnel si Factory) : formulaire de création ERC-20/ERC-721.
- **UX** :
  - Bandeau “KYC requis pour trader”.
  - Erreurs explicites (revert messages, statut KYC).

### 2.5 Déploiements & CI/CD
- **Front** : Vercel.
- **Back** : Railway (+ Postgres managé).
- **RPC** : Alchemy (Sepolia).
- **CI** : GitHub Actions (lint, tests, build; déploiements auto sur `main`).
- **Vérification contrats** : Etherscan/Blockscout verify.


## 3) Stack technique

- **Blockchain** : EVM **Sepolia**  
- **Contrats & tests** : **Foundry** (forge/cast) + OpenZeppelin  
- **DEX** : **Uniswap v3** (SDK core/v3)  
- **Oracle** : **Chainlink** si feed dispo, sinon **OracleFeed.sol**  
- **Wallet** : **Rabby** (EVM), compat WalletConnect (optionnel)  
- **Frontend** : **Next.js** (lib UI au choix du front lead)  
- **Backend/Indexer** : **NestJS** (Node/TS) + **viem** (polling) + **WebSocket/SSE**  
- **Base de données** : **Postgres** + **Prisma**  
- **Infra** : **Vercel** (front), **Railway** (back + Postgres), **Alchemy** (RPC), **GitHub Actions** (CI/CD)


## 4) Squelette du repo (mono-repo)

```
TAM-platform/
│
├─ README.md
├─ .env.example
├─ .gitignore
│
├─ docs/
│  ├─ README.md
│  ├─ ADR-0001-Chain-Choice.md
│  ├─ ADR-0002-Compliance-OnChain.md
│  ├─ ADR-0003-DEX-Uniswapv3.md
│  ├─ ADR-0004-Oracle-Design.md
│  └─ DEMO-SCRIPT.md
│
├─ deploy/
│  ├─ addresses.local.json
│  └─ addresses.sepolia.json
│
├─ .github/
│  └─ workflows/
│     ├─ ci-contracts.yml
│     ├─ ci-backend.yml
│     └─ ci-frontend.yml
│
├─ contracts/
│  ├─ foundry.toml
│  ├─ lib/
│  │  └─ .gitkeep
│  ├─ script/
│  │  ├─ Deploy.s.sol
│  │  ├─ SetOraclePrice.s.sol
│  │  └─ helpers/
│  │     ├─ CalcSqrtPriceX96.sol
│  │     └─ .gitkeep
│  ├─ src/
│  │  ├─ KYCRegistry.sol
│  │  ├─ GatedERC20.sol
│  │  ├─ GatedERC721.sol
│  │  └─ OracleFeed.sol
│  └─ test/
│     ├─ KYCRegistry.t.sol
│     ├─ GatedERC20.t.sol
│     ├─ GatedERC721.t.sol
│     └─ OracleFeed.t.sol
│
├─ backend/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ nest-cli.json
│  ├─ .env.example
│  ├─ Dockerfile
│  ├─ railway.json
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ migrations/
│  │     └─ .gitkeep
│  └─ src/
│     ├─ main.ts
│     ├─ app.module.ts
│     ├─ config/
│     │  ├─ configuration.ts
│     │  └─ validation.schema.ts
│     ├─ common/
│     │  ├─ guards/
│     │  │  └─ api-key.guard.ts
│     │  ├─ filters/
│     │  │  └─ http-exception.filter.ts
│     │  └─ dto/
│     │     └─ .gitkeep
│     ├─ indexer/
│     │  ├─ indexer.module.ts
│     │  ├─ indexer.service.ts
│     │  ├─ cursors.service.ts
│     │  └─ viem.client.ts
│     ├─ kyc/
│     │  ├─ kyc.module.ts
│     │  ├─ kyc.controller.ts
│     │  └─ kyc.service.ts
│     ├─ oracle/
│     │  ├─ oracle.module.ts
│     │  ├─ oracle.controller.ts
│     │  └─ oracle.service.ts
│     ├─ dex/
│     │  ├─ dex.module.ts
│     │  ├─ dex.controller.ts
│     │  └─ dex.service.ts
│     ├─ portfolio/
│     │  ├─ portfolio.module.ts
│     │  ├─ portfolio.controller.ts
│     │  └─ portfolio.service.ts
│     └─ activity/
│        ├─ activity.module.ts
│        ├─ activity.controller.ts
│        └─ activity.gateway.ts
│
└─ frontend/
   ├─ package.json
   ├─ next.config.js
   ├─ .env.example
   ├─ public/
   │  └─ favicon.ico
   └─ src/
      ├─ pages/
      │  ├─ _app.tsx
      │  ├─ index.tsx
      │  ├─ admin/
      │  │  └─ kyc.tsx
      │  ├─ trade.tsx
      │  ├─ portfolio.tsx
      │  └─ activity.tsx
      ├─ components/
      │  ├─ Layout.tsx
      │  ├─ BannerKYC.tsx
      │  └─ .gitkeep
      ├─ hooks/
      │  ├─ useKycStatus.ts
      │  └─ useActivityFeed.ts
      ├─ lib/
      │  ├─ api.ts
      │  ├─ wagmi.ts
      │  └─ uniswap.ts
      └─ styles/
         └─ globals.css
```


## 5) Variables d’environnement (exemple)

**Racine / Contracts (Foundry)**
- `SEPOLIA_RPC_URL=` (Alchemy)
- `PRIVATE_KEY=` (compte déploiement testnet)

**Backend**
- `NODE_ENV=production`
- `PORT=`
- `DATABASE_URL=` (Postgres Railway)
- `ALCHEMY_RPC_URL=` (Sepolia)
- `CHAIN_ID=11155111`
- `CONTRACT_KYC_REGISTRY=0x...`
- `CONTRACT_RWA20=0x...`
- `CONTRACT_RWA721=0x...`
- `CONTRACT_ORACLE=0x...`
- `ADMIN_API_KEY=` (pour endpoints KYC)
- `SSE_ENABLED=true`

**Frontend**
- `NEXT_PUBLIC_API_URL=` (backend URL)
- `NEXT_PUBLIC_CHAIN_ID=11155111`
- `NEXT_PUBLIC_CONTRACT_*` (si besoin côté front)


## 6) Répartition des tâches (équipe de 4)

> Chaque rôle a un **owner** mais tout le monde code des tests & docs.

### Rôle A — **Smart Contracts & Sécurité**
- Implémenter `KYCRegistry`, `GatedERC20`, `GatedERC721`, `OracleFeed`.
- Écrire **tests Foundry** (fuzz/invariants si possible).
- Scripts Foundry (`Deploy.s.sol`, `SetOraclePrice.s.sol`).
- Déploiement Sepolia + **verify**.
- Rédiger ADRs : Compliance on-chain, Oracle design.

**Attendus :**
- 100% tests unitaires OK; transferts bloqués correctement.
- Adresses déployées + vérifiées; scripts ré-exécutables.


### Rôle B — **Backend & Indexer**
- Schéma Prisma + migrations.
- Services indexer (polling `viem`, cursors, upserts).
- API REST (`/kyc`, `/portfolio`, `/oracle`, `/dex/swaps`, `/activity`).
- SSE/WS pour push live.
- **Tests Jest** (unit + e2e minimal avec Supertest).
- Déploiement Railway (back + Postgres).

**Attendus :**
- DB se remplit via indexer; API renvoie des données réelles.
- SSE/WS fonctionnels; healthcheck OK.


### Rôle C — **Frontend & UX**
- Next.js app (connexion Rabby / wagmi).
- Pages : Dashboard, Admin KYC, Trade (Uniswap v3 SDK), Portfolio, Activity (live).
- Gestion d’états & erreurs (KYC requis, revert messages).
- **Playwright e2e minimal** (smoke test : page up, boutons clés, statut KYC).

**Attendus :**
- UI fluide avec messages d’erreur propres.
- Swap désactivé si non KYC; activity live visible.


### Rôle D — **DEX & DevOps/CI**
- Création **pool Uniswap v3** + **liquidité initiale** (scripts).
- Script de **swap d’exemple** et test d’intégration (OK/KO).
- CI GitHub Actions (contracts/backend/frontend).
- Déploiements automatiques (Vercel/Railway).
- **DEMO-SCRIPT.md** + enregistrements (gif/mp4).

**Attendus :**
- Pool existant + TVL.
- CI verte; URLs publiques opérationnelles.
- Script de démo exécutable.


## 7) Roadmap

**S1 — Cadrage & bases**
- Repo, ADR-0001/0002/0003, Foundry/Nest/Next install.
- KYCRegistry + tests simples.
- Backend squelette + Prisma, Front “Hello wallet”.

**S2 — Compliance & Oracle**
- GatedERC20/721 + tests.
- Oracle (Chainlink reader ou OracleFeed).
- Pages Admin KYC (front) + endpoints.

**S3 — DEX & Liquidity**
- Scripts pool/liquidité Uniswap v3.
- Page Trade (SDK v3) + garde-fous KYC.

**S4 — Indexer & Temps réel**
- Indexer viem + cursors + SSE/WS.
- Pages Portfolio & Activity live.
- Tests intégration (swap hors UI → visible).

**S5 — Durcissement & Démo**
- Tests e2e (Playwright), polish UI.
- Deploy final (Vercel/Railway), README/ADRs.
- DEMO-SCRIPT + captures vidéos.


## 8) Check-list d’acceptation

- [ ] **Compliance en contrats** (reverts démontrés).
- [ ] **Pool Uniswap v3** + **liquidité** + **swap OK**.
- [ ] **Swap KO** si non KYC (preuve).
- [ ] **Indexer** détecte **actions hors UI** (preuve live).
- [ ] **Oracle** affiché (Chainlink ou maison) et utilisé en front.
- [ ] **Frontend** clair (bandeau KYC, erreurs lisibles).
- [ ] **Docs** : README complet, ADRs, adresses déployées, guide démo.
- [ ] **CI/CD** : builds & tests, URLs publiques.


## 9) Script de démo

1. **KYC** : tenter transfert avant KYC → **revert** ; whitelister → **OK** ; blacklister → **re-blocage**.
2. **DEX** : montrer pool & TVL ; swap via UI → **OK**.
3. **Indexer** : faire un swap via **UI Uniswap** ; retour dans l’app (<1 min) → **visible**.
4. **Oracle** : modifier le prix (Chainlink already live OU `setPrice`) → dashboard **maj**.
5. **Conclusion** : liens GitHub + URLs + limites (MVP KYC, pas d’AA).


## 10) Limites connues & pistes bonus

- **KYC MVP** : mapping on-chain admin — pas d’identité réelle (provider) dans ce projet.
- **AA/Gas sponsoring** : non inclus par défaut (peut être ajouté en bonus).
- **Sécurité** : audit formel non prévu ; tests & best-practices OZ/Foundry appliqués.

**Bonus possibles** :
- **Multisig Safe** propriétaire des contrats (KYC/mint par 2/3).
- **ERC-4337 / relayer** pour UX gasless sur certaines actions.
- **The Graph** comme indexer alternatif (si temps).


## 11) Références ADR

- `ADR-0001-Chain-Choice.md` — Choix EVM Sepolia (outillage, écosystème).
- `ADR-0002-Compliance-OnChain.md` — Gating dans ERC-20/721 vs frontend only.
- `ADR-0003-DEX-Uniswapv3.md` — Choix v3 (LP NFT, prix init, tick range).
- `ADR-0004-Oracle-Design.md` — Priority Chainlink, fallback OracleFeed maison.
- `ADR-0005-Indexer-Strategy.md` — Polling viem + cursors + SSE/WS.
