'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';

type KycResp =
  | { address: `0x${string}`; status: number }
  | { message: string; statusCode?: number; error?: string };

type MintErc20Ok = {
  ok: true;
  token: `0x${string}`;
  to: `0x${string}`;
  amount: string;
  txHash: `0x${string}`;
  status: 'success' | 'pending' | 'failed';
  gasUsed?: string;
};
type MintErc20Err = { ok?: false; message?: string; error?: string };

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
const RWA = (process.env.NEXT_PUBLIC_RWA_ERC20 as `0x${string}`) ?? '0x1a7008B9461deffA9a3176d864dEB6c24a64C580';
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://sepolia.etherscan.io';

type AssetKind = 'erc20' | 'erc721';

/** =======================
 *  Helpers amount <-> wei
 *  ======================= */
function padRight(str: string, n: number) {
  if (str.length >= n) return str.slice(0, n);
  return str + '0'.repeat(n - str.length);
}

// "1.5" -> "1500000000000000000"  (18 décimales)
function humanToWeiStr(input: string, decimals = 18): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d*\.?\d*$/.test(trimmed)) return null;
  const [wholeRaw, fracRaw = ''] = trimmed.split('.');
  const whole = wholeRaw === '' ? '0' : wholeRaw;
  const fracPadded = padRight(fracRaw, decimals);
  const merged = (whole + fracPadded).replace(/^0+/, '');
  const normalized = merged === '' ? '0' : merged;
  try {
    const bi = BigInt(normalized);
    if (bi < BigInt(0)) return null;
    return normalized;
  } catch {
    return null;
  }
}

// "1500000000000000000" -> "1.5"
function weiToHumanStr(weiStr: string, decimals = 18): string {
  try {
    const bi = BigInt(weiStr);
    const base = BigInt(10) ** BigInt(decimals);
    const whole = bi / base;
    const frac = bi % base;
    if (frac === BigInt(0)) return whole.toString();
    let fracStr = frac.toString().padStart(decimals, '0');
    fracStr = fracStr.replace(/0+$/, '');
    return `${whole.toString()}.${fracStr}`;
  } catch {
    return '';
  }
}

export default function TokenizePage() {
  const { address, isConnected } = useAccount();

  // Formulaire
  const [kind, setKind] = React.useState<AssetKind>('erc20');
  const [title, setTitle] = React.useState('');     // Titre
  const [description, setDescription] = React.useState(''); // Description

  // Montant: humain + wei (les appels backend utilisent `amount` en wei)
  const [humanAmount, setHumanAmount] = React.useState(''); // ex: "1.5"
  const [amount, setAmount] = React.useState('');           // wei
  const [metadataUrl, setMetadataUrl] = React.useState(''); // pour ERC721 (placeholder)
  const [amountErr, setAmountErr] = React.useState<string | null>(null);

  // KYC
  const [kyc, setKyc] = React.useState<null | number>(null);
  const [kycLoading, setKycLoading] = React.useState(false);
  const [kycErr, setKycErr] = React.useState<string | null>(null);

  // Mint (backend)
  const [mintLoading, setMintLoading] = React.useState(false);
  const [mintErr, setMintErr] = React.useState<string | null>(null);
  const [mintOk, setMintOk] = React.useState<MintErc20Ok | null>(null);

  // Assets (DB)
  const [draftId, setDraftId] = React.useState<number | null>(null);

  const canMintBackend = React.useMemo(() => {
    if (!isConnected || !address) return false;
    if (kyc !== 1) return false; // gate KYC ici (optionnel mais conseillé sur Tokenize)
    if (kind !== 'erc20') return false; // backend: endpoint erc20 uniquement
    try {
      return !!amount && BigInt(amount) > BigInt(0) && !!title.trim() && !!description.trim();
    } catch {
      return false;
    }
  }, [isConnected, address, kyc, kind, amount, title, description]);

  async function fetchKyc() {
    if (!address) return;
    setKycLoading(true);
    setKycErr(null);
    setKyc(null);
    try {
      const res = await fetch(`${BACKEND}/kyc/${address}`);
      const data = (await res.json()) as KycResp;
      if ('status' in data && typeof data.status === 'number') {
        setKyc(data.status);
      } else {
        setKycErr('Impossible de récupérer le statut KYC');
      }
    } catch {
      setKycErr('Erreur réseau KYC');
    } finally {
      setKycLoading(false);
    }
  }

  async function mintViaBackend() {
    if (!address) return;
    setMintLoading(true);
    setMintErr(null);
    setMintOk(null);

    try {
      const res = await fetch(`${BACKEND}/token/mint-erc20`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: address, amount }), // en wei
      });
      const data = (await res.json()) as MintErc20Ok | MintErc20Err;
      if ('ok' in data && data.ok) {
        setMintOk(data as MintErc20Ok);
      } else {
        setMintErr(
          (data as MintErc20Err).message ||
            (data as MintErc20Err).error ||
            'Mint backend échoué',
        );
      }
    } catch {
      setMintErr('Erreur réseau mint backend');
    } finally {
      setMintLoading(false);
    }
  }

  // ---------- LOGIQUE D'ASSET (DB) ----------

  // 1) Créer un brouillon d'actif avant le mint
  async function createAssetDraft() {
    if (!address) throw new Error('Adresse requise');
    const body = {
      ownerAdresse: address,
      kind,                          // 'erc20' | 'erc721'
      title: title || 'Sans titre',  // Titre
      description: description || '',// Description
      amountWei: kind === 'erc20' ? (amount || '0') : undefined,
      metadataUrl: kind === 'erc721' ? (metadataUrl || undefined) : undefined,
    };
    const res = await fetch(`${BACKEND}/assets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Création brouillon échouée (${res.status}) ${t}`);
    }
    const draft = await res.json();
    setDraftId(draft.id);
    return draft.id as number;
  }

  // 2) Wrapper : crée le draft puis lance le mint
  async function mintDraftThenMint() {
    try {
      await createAssetDraft();
      await mintViaBackend();
    } catch (e: any) {
      setMintErr(e?.message || 'Erreur lors de la création de l’actif');
    }
  }

  // 3) Après succès du mint, patch l'actif en DB
  React.useEffect(() => {
    (async () => {
      if (!mintOk || !draftId) return;
      try {
        await fetch(`${BACKEND}/assets/${draftId}/mint`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            txHash: mintOk.txHash,
            tokenAddress: mintOk.token,
            chainId: (mintOk as any).chainId ?? 11155111,
            kycAtMint: kyc ?? null,
          }),
        });
      } catch {
        // noop
      }
    })();
  }, [mintOk, draftId, kyc]);

  /** ======================
   *  Handlers Montant HR/Wei
   *  ====================== */
  function onHumanAmountChange(val: string) {
    setHumanAmount(val);
    const wei = humanToWeiStr(val, 18);
    if (wei === null) {
      setAmountErr('Format invalide. Exemples: "1", "0.5", "1.2345" (max 18 décimales)');
      return;
    }
    setAmountErr(null);
    setAmount(wei);
  }

  function onWeiAmountChange(val: string) {
    if (!/^\d*$/.test(val)) return; // entier décimal uniquement
    setAmount(val);
    setAmountErr(null);
    if (val === '') {
      setHumanAmount('');
      return;
    }
    setHumanAmount(weiToHumanStr(val, 18));
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Tokenize</h1>
        <p className="text-sm text-white/80">
          Décris ton actif, vérifie le KYC, vois un récap, puis frappe des RWA tokens (mint).
        </p>
      </header>

      {!isConnected ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p>Connecte ton wallet pour commencer.</p>
        </div>
      ) : (
        <>
          {/* 1) KYC */}
          <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">1) Vérification KYC</h2>
              <button
                onClick={fetchKyc}
                className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                disabled={kycLoading}
              >
                {kycLoading ? 'Vérification…' : 'Vérifier'}
              </button>
            </div>
            <div className="text-sm">
              {kycLoading && <p>Chargement…</p>}
              {!kycLoading && kyc !== null && (
                <p>
                  Statut KYC :{' '}
                  <span className={kyc > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {kyc > 0 ? 'Validé' : 'Non validé'}
                  </span>
                </p>
              )}
              {!kycLoading && kycErr && <p className="text-rose-400">{kycErr}</p>}
            </div>
          </section>

          {/* 2) Saisie */}
          <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
            <h2 className="font-medium">2) Décrire l’actif</h2>

            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="erc20"
                  checked={kind === 'erc20'}
                  onChange={() => setKind('erc20')}
                />
                ERC20 (part fongible)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value="erc721"
                  checked={kind === 'erc721'}
                  onChange={() => setKind('erc721')}
                />
                ERC721 (pièce unique)
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/70">Titre *</label>
                <input
                  className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Facture INV-0042"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-white/70">Description *</label>
                <input
                  className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Facture ACME 10/2025 (réf., ISIN, etc.)"
                />
              </div>

              {kind === 'erc20' ? (
                <>
                  {/* Montant humain */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/70">Montant (humain)</label>
                    <input
                      className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                      value={humanAmount}
                      onChange={(e) => onHumanAmountChange(e.target.value)}
                      placeholder='Ex: 1.5 (max 18 décimales)'
                    />
                    {amountErr && <p className="text-xs text-rose-400 mt-1">{amountErr}</p>}
                  </div>

                  {/* Montant wei */}
                  <div className="space-y-1">
                    <label className="text-xs text-white/70">Montant (wei) *</label>
                    <input
                      className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                      value={amount}
                      onChange={(e) => onWeiAmountChange(e.target.value)}
                      placeholder="ex: 1000000000000000000"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-white/70">Metadata URL *</label>
                  <input
                    className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                    value={metadataUrl}
                    onChange={(e) => setMetadataUrl(e.target.value)}
                    placeholder="ipfs://… ou https://…"
                  />
                </div>
              )}
            </div>
          </section>

          {/* 3) Récap */}
          <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
            <h2 className="font-medium">3) Récap</h2>
            <div className="text-sm text-white/80 grid gap-1">
              <div><span className="text-white/60">Titre :</span> {title || '—'}</div>
              <div><span className="text-white/60">Description :</span> {description || '—'}</div>
              {kind === 'erc20' ? (
                <>
                  <div><span className="text-white/60">Montant (humain) :</span> {humanAmount || (amount ? weiToHumanStr(amount, 18) : '—')}</div>
                  <div><span className="text-white/60">Montant (wei) :</span> {amount || '—'}</div>
                  <div><span className="text-white/60">Token :</span> <span className="font-mono">{RWA}</span></div>
                </>
              ) : (
                <div><span className="text-white/60">Metadata URL :</span> {metadataUrl || '—'}</div>
              )}
            </div>
          </section>

          {/* 4) Mint */}
          <section className="rounded-lg border border-emerald-600/30 bg-emerald-900/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">4) Mint</h2>
              <button
                onClick={mintDraftThenMint}
                className="rounded bg-emerald-500/20 px-3 py-1 text-sm hover:bg-emerald-500/30 disabled:opacity-50"
                disabled={!canMintBackend || mintLoading}
                title={
                  !isConnected ? 'Connecte ton wallet' :
                  kyc !== 1 ? 'KYC requis' :
                  !title || !description ? 'Titre et Description requis' :
                  !amount ? 'Montant requis' : ''
                }
              >
                {mintLoading ? 'Mint en cours…' : 'Mint (ERC20)'}
              </button>
            </div>

            {!mintLoading && mintOk && (
              <div className="text-sm space-y-1">
                <p>
                  ✅ Mint effectué sur le token{' '}
                  <span className="font-mono">{mintOk.token}</span>
                </p>
                <p>
                  Hash:{' '}
                  <a
                    className="underline text-emerald-300"
                    href={`${EXPLORER}/tx/${mintOk.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {mintOk.txHash}
                  </a>
                </p>
                {mintOk.gasUsed && <p>Gas used: {mintOk.gasUsed}</p>}

                {/* CTA vers Trade */}
                <div className="pt-2">
                  <a
                    href={`/trade?token=${RWA}`}
                    className="inline-flex items-center rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                  >
                    Aller trader
                  </a>
                </div>
              </div>
            )}
            {!mintLoading && mintErr && <p className="text-rose-400 text-sm">{mintErr}</p>}
          </section>
        </>
      )}
    </div>
  );
}
