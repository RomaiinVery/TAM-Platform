'use client';

import { useAccount } from 'wagmi';
import { useState, useRef, useEffect } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

type KycStatus = 0 | 1 | 2;

function statusLabel(s: KycStatus) {
  switch (s) {
    case 0: return 'Unverified';
    case 1: return 'Verified';
    case 2: return 'Blocked';
    default: return 'Unknown';
  }
}

function StatusPill({ status }: { status: KycStatus }) {
  const map: Record<KycStatus, string> = {
    0: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30',
    1: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30',
    2: 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/30',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${map[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

function weiToHuman(wei: string, decimals = 18) {
  try {
    const bi = BigInt(wei);
    const base = BigInt(10) ** BigInt(decimals);
    const whole = bi / base;
    const frac = (bi % base).toString().padStart(decimals, '0').replace(/0+$/, '');
    return frac ? `${whole}.${frac}` : whole.toString();
  } catch {
    return wei;
  }
}
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://sepolia.etherscan.io';

const CHAIN_LABELS: Record<number, string> = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  137: 'Polygon',
  8453: 'Base',
  10: 'Optimism',
  42161: 'Arbitrum',
};
function chainName(id: number) {
  return CHAIN_LABELS[id] ?? `Chain ${id}`;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(); // ou toLocaleDateString() si tu veux que la date seule
}


export default function ProfilPage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Self-service
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [lastError, setLastError] = useState<string>('');
  
  // Demande vérification
  const [isAskDone, setAskMsg] = useState<string>('');
  const clearTimerRefAsk = useRef<number | null>(null);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');

  // Toggle pour afficher/masquer la section "Besoin d’être vérifié ?"
  const [askOpen, setAskOpen] = useState(false);

  // Admin
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [target, setTarget] = useState('');
  const [newStatus, setNewStatus] = useState<KycStatus>(1);
  const [adminMsg, setAdminMsg] = useState<string>('');
  const clearTimerRefAdmin = useRef<number | null>(null);

  type Asset = {
    id: number;
    ownerAdresse: `0x${string}`;
    kind: 'erc20' | 'erc721';
    title: string;
    description: string | null;
    amountWei: string;       // string en wei
    metadataUrl: string | null;
    tokenAddress: `0x${string}` | null;
    txHash: `0x${string}` | null;
    chainId: number;
    kycAtMint: 0 | 1 | 2;
    status: 'draft' | 'minted' | 'failed' | string;
    createdAt: string;
    updatedAt: string;
  };

  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [assetsErr, setAssetsErr] = useState<string>('');
  const [assetsLoading, setAssetsLoading] = useState(false);

  async function fetchMyAssets() {
    if (!address) return;
    setAssetsLoading(true);
    setAssetsErr('');
    try {
      const url = new URL(`${BACKEND}/assets`);
      url.searchParams.set('owner', address);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      if (!res.ok) {
        setAssetsErr(`Erreur backend (HTTP ${res.status})`);
        setAssets(null);
        return;
      }
      const list = (await res.json()) as Asset[];
      setAssets(list);
    } catch {
      setAssetsErr('Impossible de récupérer les actifs.');
      setAssets(null);
    } finally {
      setAssetsLoading(false);
    }
  }

  async function fetchMyStatus() {
    if (!address) return;
    setLoading(true);
    setLastError('');
    try {
      const res = await fetch(`${BACKEND}/kyc/${address}`, { cache: 'no-store' });
      if (!res.ok) {
        setLastError(`Erreur backend (HTTP ${res.status})`);
        setStatus(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      // data: { address, status }
      setStatus(data.status as KycStatus);
    } catch {
      setLastError('Impossible de joindre le backend.');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function createUserThenAsk() {
    if (!address) {
      setAskMsg('Connecte ton wallet d’abord.');
      return;
    }
    if (!firstname.trim() || !lastname.trim()) {
      setAskMsg('Renseigne prénom et nom.');
      return;
    }
    try {
      const res = await fetch(`${BACKEND}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          adresse: address,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        setAskMsg(`Échec de la demande (${res.status}) ${msg}`.trim());
        return;
      }
      // On garde ta logique existante
      userAskStatus();
    } catch {
      setAskMsg('Erreur réseau');
    }
  }

  function userAskStatus() {
    setAskMsg('Demande de vérification envoyée avec succès ✅');

    if (clearTimerRefAsk.current) {
      clearTimeout(clearTimerRefAsk.current);
    }

    clearTimerRefAsk.current = window.setTimeout(() => {
      setAskMsg('');
      clearTimerRefAsk.current = null;
    }, 3000);
  }

  async function adminSetStatus() {
    setAdminMsg('');
    try {
      const body = JSON.stringify({ address: target, status: newStatus });
      const res = await fetch(`${BACKEND}/kyc/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        setAdminMsg(`Échec (${res.status}) ${txt || ''}`.trim());
        return;
      }

      const resDb = await fetch(`${BACKEND}/users/${target}/kyc`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey ? { 'x-admin-key': adminKey } : {}),
        },
        body: JSON.stringify({ kyc: newStatus }),
      });

      if (!resDb.ok) {
        const txt = await resDb.text().catch(() => '');
        setAdminMsg(`MAJ DB partielle: on-chain OK mais DB KO (${resDb.status}) ${txt || ''}`.trim());
        return;
      }

      setAdminMsg('Statut mis à jour avec succès ✅');
      setStatus(null);
      if (clearTimerRefAdmin.current) {
        clearTimeout(clearTimerRefAdmin.current);
      }
      clearTimerRefAdmin.current = window.setTimeout(() => {
        setAdminMsg('');
        clearTimerRefAdmin.current = null;
      }, 3000);
    } catch (e) {
      setAdminMsg('Erreur réseau');
    }
  }

  // Va chercher l'utilisateur en DB et met à jour prénom/nom (laisse vide si 404)
  async function fetchUserNames() {
    if (!address) return;
    try {
      const res = await fetch(`${BACKEND}/users/${address}`, { cache: 'no-store' });
      if (!res.ok) {
        // 404 -> utilisateur absent => champs vides
        setFirstname('');
        setLastname('');
        return;
      }
      const u = await res.json();
      setFirstname(u.firstname ?? '');
      setLastname(u.lastname ?? '');
    } catch {
      // En cas d'erreur réseau, ne casse rien côté UI
    }
  }

  // Wrapper pour le bouton "Rafraîchir mon statut": appelle TON fetchMyStatus + récupère prénom/nom
  async function refreshStatusAndUser() {
    await fetchMyStatus();
    await fetchUserNames();
    await fetchMyAssets();
  }

  // À la connexion wallet: essaye de récupérer prénom/nom en DB
  useEffect(() => {
    if (isConnected && address) {
      fetchUserNames();
    } else {
      setFirstname('');
      setLastname('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) fetchMyAssets();
    else setAssets(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  return (
    <div className="space-y-8">
      <header className="rounded-2xl bg-white/5 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Profil</h2>
        <p className="mt-2 text-sm text-white/80">
          Consulte et gère ton statut KYC on-chain. Tu peux te connecter, voir ton statut, et (si tu es admin) mettre à jour un statut.
        </p>
      </header>

      {/* Bloc self-service */}
      <section className="rounded-2xl bg-white/5 p-6 shadow-sm space-y-4">
        <h3 className="font-semibold">Mon statut</h3>

        {!isConnected ? (
          <p className="text-sm text-white/70">
            Connecte ton wallet pour voir ton statut KYC.
          </p>
        ) : (
          <>
            {/* Prénom / Nom (empilés) */}
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-2 text-sm text-white/80">
              <div>Prénom : <span className="font-medium">{firstname}</span></div>
              <div>Nom : <span className="font-medium">{lastname}</span></div>
            </div>

            <div className="text-sm text-white/80">
              Adresse connectée : <span className="font-mono" suppressHydrationWarning>{address ?? ''}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refreshStatusAndUser}  // <- wrapper (ne modifie pas fetchMyStatus)
                disabled={loading}
                className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 disabled:opacity-60"
              >
                {loading ? 'Chargement…' : 'Rafraîchir mon statut'}
              </button>

              {status !== null && (
                <div className="text-sm">
                  <StatusPill status={status} />
                </div>
              )}
            </div>

            {lastError && (
              <p className="text-sm text-rose-300">{lastError}</p>
            )}

            {/* --- Section "Besoin d’être vérifié ?" avec toggle --- */}
            <div className="pt-2 text-sm text-white/70">
              <button
                type="button"
                onClick={() => setAskOpen((v) => !v)}
                aria-expanded={askOpen}
                className="mb-1 inline-flex items-center gap-2 select-none"
              >
                <span className="font-medium">Besoin d’être vérifié ?</span>
                <span
                  className={`transition-transform ${askOpen ? 'rotate-90' : 'rotate-0'}`}
                  aria-hidden
                >
                  ▸
                </span>
              </button>

              {askOpen && (
                <>
                  <div className="grid gap-3 md:grid-cols-2 mb-2">
                    <label className="block text-sm text-white/80">
                      Prénom
                      <input
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                        placeholder="Alice"
                        className="mt-1 w-full rounded-lg bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/25"
                      />
                    </label>
                    <label className="block text-sm text-white/80">
                      Nom
                      <input
                        value={lastname}
                        onChange={(e) => setLastname(e.target.value)}
                        placeholder="Dupont"
                        className="mt-1 w-full rounded-lg bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/25"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 active:translate-y-[1px]"
                      onClick={createUserThenAsk}
                    >
                      Demander la vérification
                    </button>
                    {isAskDone && (
                      <p className="text-sm text-white/80">{isAskDone}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl bg-white/5 p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Mes actifs mintés</h3>
          <button
            onClick={fetchMyAssets}
            className="text-sm rounded bg-white/10 px-3 py-1 hover:bg-white/20 disabled:opacity-50"
            disabled={!mounted || !address || assetsLoading}
          >
            {assetsLoading ? 'Chargement…' : 'Rafraîchir'}
          </button>
        </div>

        {!isConnected ? (
          <p className="text-sm text-white/70">Connecte ton wallet pour voir tes actifs.</p>
        ) : assetsErr ? (
          <p className="text-sm text-rose-300">{assetsErr}</p>
        ) : !assets || assets.length === 0 ? (
          <p className="text-sm text-white/70">Aucun actif minté pour l’instant.</p>
        ) : (
          <div className="space-y-2">
            {assets.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{a.title}</div>
                  <span className="rounded-full px-2 py-0.5 text-xs bg-white/10">
                    {a.status}
                  </span>
                </div>
                <div className="text-white/70 mt-1">{a.description}</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>Montant : <span className="font-mono">{weiToHuman(a.amountWei)} {a.kind === 'erc20' ? 'RWA' : ''}</span></div>
                  <div>Réseau : <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{chainName(a.chainId)}</span></div>
                  <div>
                    {a.status === 'minted'
                      ? <>Minté le : <span className="font-mono" suppressHydrationWarning>{mounted ? fmtDate(a.updatedAt) : ''}</span></>
                      : <>Créé le : <span className="font-mono" suppressHydrationWarning>{mounted ? fmtDate(a.createdAt) : ''}</span></>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {a.txHash && (
                    <a className="text-emerald-300 no-underline hover:underline" href={`${EXPLORER}/tx/${a.txHash}`} target="_blank" rel="noreferrer">
                      Voir la tx
                    </a>
                  )}
                  {a.tokenAddress && (
                    <a className="text-emerald-300 no-underline hover:underline" href={`${EXPLORER}/token/${a.tokenAddress}`} target="_blank" rel="noreferrer">
                      Voir le token
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bloc admin */}
      <section className="rounded-2xl bg-white/5 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Admin</h3>
          <button
            onClick={() => setAdminOpen((v) => !v)}
            className="text-sm underline decoration-white/30 underline-offset-4 hover:decoration-white/60"
          >
            {adminOpen ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        {adminOpen && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm text-white/80">
                Admin key
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="x-admin-key"
                  className="mt-1 w-full rounded-lg bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/25"
                />
              </label>

              <label className="block text-sm text-white/80">
                Adresse cible
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="0x…"
                  className="mt-1 w-full rounded-lg bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/25"
                />
              </label>

              <label className="block text-sm text-white/80">
                Nouveau statut
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(Number(e.target.value) as KycStatus)}
                  className="mt-1 w-full rounded-lg bg-black/20 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-white/25"
                >
                  <option value={0}>Unverified</option>
                  <option value={1}>Verified</option>
                  <option value={2}>Blocked</option>
                </select>
              </label>

              <div className="flex items-center gap-3">
                <button
                  onClick={adminSetStatus}
                  className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                >
                  Mettre à jour
                </button>

                {adminMsg && (
                  <p className="text-sm text-white/80">{adminMsg}</p>
                )}
              </div>
            </div>

            <div className="text-sm text-white/70 space-y-2">
              <p className="font-medium">Bonnes pratiques</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ne colle ta clé admin que quand tu en as besoin.</li>
                <li>La clé n’est jamais stockée dans le navigateur.</li>
                <li>Les statuts sont écrits on-chain.</li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
