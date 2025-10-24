'use client';

import * as React from 'react';
import {
  useAccount,
  usePublicClient,
  useWalletClient,
} from 'wagmi';
import { parseAbi, getAddress } from 'viem';

type QuoteSpotOk = {
  ok: true;
  pool: `0x${string}`;
  feePpm: number;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  token0: `0x${string}`;
  token1: `0x${string}`;
  tokenInIsToken0: boolean;
  decimalsIn: number;
  decimalsOut: number;
  amountIn: string;    // wei
  amountOut: string;   // wei
  midPriceToken1PerToken0: number;
  midPriceToken0PerToken1: number;
  warnings?: string[];
};
type QuoteSpotErr = { ok: false; reason: string };

type SwapCalldataOk = {
  ok: true;
  router: `0x${string}`;
  chainId: number;
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;       // wei
  deadline: string;
  feePpm: number;
  amountIn: string;    // wei
  amountOutMin: string;// wei
  path: `0x${string}`;
  notes?: string[];
};
type SwapCalldataErr = { ok: false; reason: string };

type KycResp =
  | { address: `0x${string}`; status: number }
  | { message: string; statusCode?: number; error?: string };

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
const RWA  = getAddress(((process.env.NEXT_PUBLIC_RWA_ERC20 ?? '').trim() || '0x1a7008B9461deffA9a3176d864dEB6c24a64C580') as `0x${string}`);
const WETH = getAddress((process.env.NEXT_PUBLIC_WETH as `0x${string}`) ?? '0xfff9976782d46cc05630d1f6ebab18b2324d6b14');
const POOL = getAddress((process.env.NEXT_PUBLIC_POOL as `0x${string}`) ?? '0x5A9C1dA3068DD5c69E298BeA01e32dF62d863a09');
const FEE  = Number(process.env.NEXT_PUBLIC_FEE ?? '3000');
const ROUTER = getAddress((process.env.NEXT_PUBLIC_ROUTER as `0x${string}`) ?? '0x3A9D4BAB9751398BbFa63ad67599Bb04e4BdF98b');
const PERMIT2 = getAddress((process.env.NEXT_PUBLIC_PERMIT2 as `0x${string}`) ?? '0x000000000022D473030F116dDEE9F6B43aC78BA3');
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_BASE ?? 'https://sepolia.etherscan.io';

type Direction = 'RWA_TO_WETH' | 'WETH_TO_RWA';

function padRight(str: string, n: number) {
  if (str.length >= n) return str.slice(0, n);
  return str + '0'.repeat(n - str.length);
}
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

const erc20Abi = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

const wethAbi = parseAbi([
  'function deposit() payable',
  'function withdraw(uint256 wad)',
]);

const permit2Abi = parseAbi([
  'function approve(address token, address spender, uint160 amount, uint48 expiration)',
]);

const MAX_UINT160 = (BigInt(2) ** BigInt(160)) - BigInt(1);
function oneYearFromNow(): number {
  return Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
}

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // UI state
  const [dir, setDir] = React.useState<Direction>('RWA_TO_WETH');
  const [amountHuman, setAmountHuman] = React.useState('');
  const [amountWei, setAmountWei] = React.useState('');
  const [amtErr, setAmtErr] = React.useState<string | null>(null);

  const [slippageBps, setSlippageBps] = React.useState(50);   // 0.50%
  const [deadlineSec, setDeadlineSec] = React.useState(900);   // 15 min

  const [quote, setQuote] = React.useState<QuoteSpotOk | null>(null);
  const [qLoading, setQLoading] = React.useState(false);
  const [qErr, setQErr] = React.useState<string | null>(null);

  const [calldata, setCalldata] = React.useState<SwapCalldataOk | null>(null);
  const [cdLoading, setCdLoading] = React.useState(false);
  const [cdErr, setCdErr] = React.useState<string | null>(null);

  const [execLoading, setExecLoading] = React.useState(false);
  const [execErr, setExecErr] = React.useState<string | null>(null);
  const [execHash, setExecHash] = React.useState<`0x${string}` | null>(null);

  // KYC
  const [kyc, setKyc] = React.useState<number | null>(null);
  const [kycLoading, setKycLoading] = React.useState(false);
  const [kycErr, setKycErr] = React.useState<string | null>(null);

  // Wrap/Unwrap
  const [wrapHuman, setWrapHuman] = React.useState('');
  const [wrapWei, setWrapWei] = React.useState('');
  const [wrapErr, setWrapErr] = React.useState<string | null>(null);
  const [wrapLoading, setWrapLoading] = React.useState(false);
  const [wrapHash, setWrapHash] = React.useState<`0x${string}` | null>(null);

  const [unwrapHuman, setUnwrapHuman] = React.useState('');
  const [unwrapWei, setUnwrapWei] = React.useState('');
  const [unwrapErr, setUnwrapErr] = React.useState<string | null>(null);
  const [unwrapLoading, setUnwrapLoading] = React.useState(false);
  const [unwrapHash, setUnwrapHash] = React.useState<`0x${string}` | null>(null);

  const tokenIn  = dir === 'RWA_TO_WETH' ? RWA  : WETH;
  const tokenOut = dir === 'RWA_TO_WETH' ? WETH : RWA;

  // --- KYC ---
  async function fetchKyc() {
    if (!address) return;
    setKycLoading(true);
    setKycErr(null);
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
  React.useEffect(() => {
    if (isConnected) fetchKyc();
  }, [isConnected]);

  // --- Amount handlers (Trade) ---
  function onAmountHumanChange(v: string) {
    setAmountHuman(v);
    const wei = humanToWeiStr(v, 18);
    if (wei === null) {
      setAmtErr('Format invalide. Ex: 1, 0.5, 1.2345 (18 déc. max)');
      setAmountWei('');
      return;
    }
    setAmtErr(null);
    setAmountWei(wei);
  }

  const canQuote = isConnected && address && amountWei && BigInt(amountWei) > BigInt(0);

  // --- Quote ---
  async function fetchQuote() {
    if (!canQuote) return;
    setQLoading(true);
    setQErr(null);
    setQuote(null);
    setCalldata(null);
    setExecErr(null);
    setExecHash(null);

    const url = new URL(`${BACKEND}/dex/quote-spot`);
    url.searchParams.set('pool', POOL);
    url.searchParams.set('tokenIn', tokenIn);
    url.searchParams.set('tokenOut', tokenOut);
    url.searchParams.set('amountIn', amountWei);

    try {
      const res = await fetch(url.toString());
      const data = (await res.json()) as QuoteSpotOk | QuoteSpotErr;
      if ((data as QuoteSpotOk).ok) {
        setQuote(data as QuoteSpotOk);
      } else {
        setQErr((data as QuoteSpotErr).reason || 'Quote indisponible');
      }
    } catch {
      setQErr('Erreur réseau quote');
    } finally {
      setQLoading(false);
    }
  }

  // --- Build calldata ---
  const canCalldata = !!quote && !cdLoading;
  async function buildSwapCalldata() {
    if (!address || !quote) return;
    setCdLoading(true);
    setCdErr(null);
    setCalldata(null);
    setExecErr(null);
    setExecHash(null);

    const body = {
      sender: address,
      recipient: address,
      pool: POOL,
      tokenIn,
      tokenOut,
      amountIn: quote.amountIn,
      fee: FEE,
      slippageBps,
      deadlineSec,
    };

    try {
      const res = await fetch(`${BACKEND}/dex/swap-calldata`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as SwapCalldataOk | SwapCalldataErr;
      if ('ok' in data && (data as SwapCalldataOk).ok) {
        setCalldata(data as SwapCalldataOk);
      } else {
        setCdErr((data as SwapCalldataErr).reason || 'Construction calldata échouée');
      }
    } catch {
      setCdErr('Erreur réseau swap-calldata');
    } finally {
      setCdLoading(false);
    }
  }

  // --- Approve if needed (when tokenIn is ERC20 we control) ---
  async function ensureAllowanceIfNeeded() {
    if (!walletClient || !publicClient || !address) throw new Error('Wallet non dispo');
    const needed = BigInt(quote?.amountIn ?? '0');
    if (needed === BigInt(0)) return;

    const isUniversalRouter = !!calldata?.data?.startsWith('0x3593564c');
    const spender = isUniversalRouter ? PERMIT2 : ROUTER;

    const allowance = (await publicClient.readContract({
      address: tokenIn,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [address, spender],
    })) as bigint;

    if (allowance >= needed) return;

    const hash = await walletClient.writeContract({
      address: tokenIn,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, needed], // ou "infinite" si tu préfères
      account: address,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  // --- Execute swap with wallet ---
  async function executeSwapWithWallet() {
    try {
      if (!walletClient || !publicClient) throw new Error('Wallet non dispo');
      if (!calldata) throw new Error('Pas de calldata');
      if (!address) throw new Error('Adresse manquante');
      if (kyc !== 1) throw new Error('KYC requis (non validé)');
      const isUniversalRouter = !!calldata?.data?.startsWith('0x3593564c');

      setExecLoading(true);
      setExecErr(null);
      setExecHash(null);

      const current = await walletClient.getChainId();
      if (current !== calldata.chainId) {
        await walletClient.switchChain?.({ id: calldata.chainId });
      }

      await ensureAllowanceIfNeeded();

      if (isUniversalRouter) {
        await ensurePermit2AllowanceForRouter();
      }

      const hash = await walletClient.sendTransaction({
        to: getAddress(calldata!.to),
        data: calldata!.data,
        value: BigInt(calldata!.value ?? '0'),
        account: address,
      });
      setExecHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (e: any) {
      const msg =
        e?.shortMessage ||
        e?.message ||
        'Échec de l’exécution du swap (voir console)';
      setExecErr(msg);
      console.error(e);
    } finally {
      setExecLoading(false);
    }
  }

  const canExecute = !!calldata && !!walletClient && kyc === 1 && !execLoading;

  /** ================
   *  Wrap / Unwrap UI
   *  ================ */
  function onWrapHumanChange(v: string) {
    setWrapHuman(v);
    const wei = humanToWeiStr(v, 18);
    if (wei === null) {
      setWrapErr('Format invalide. Ex: 0.1, 1, 1.25 (18 déc. max)');
      setWrapWei('');
      return;
    }
    setWrapErr(null);
    setWrapWei(wei);
  }
  function onUnwrapHumanChange(v: string) {
    setUnwrapHuman(v);
    const wei = humanToWeiStr(v, 18);
    if (wei === null) {
      setUnwrapErr('Format invalide. Ex: 0.1, 1, 1.25 (18 déc. max)');
      setUnwrapWei('');
      return;
    }
    setUnwrapErr(null);
    setUnwrapWei(wei);
  }

  async function wrapEthToWeth() {
    try {
      if (!walletClient || !publicClient || !address) throw new Error('Wallet non dispo');
      if (!wrapWei || BigInt(wrapWei) === BigInt(0)) throw new Error('Montant invalide');

      setWrapLoading(true);
      setWrapErr(null);
      setWrapHash(null);

      // WETH.deposit() payable
      const hash = await walletClient.writeContract({
        address: WETH,
        abi: wethAbi,
        functionName: 'deposit',
        value: BigInt(wrapWei),
        account: address,
      });
      setWrapHash(hash);

      await publicClient.waitForTransactionReceipt({ hash });
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Wrap échoué';
      setWrapErr(msg);
      console.error(e);
    } finally {
      setWrapLoading(false);
    }
  }

  async function unwrapWethToEth() {
    try {
      if (!walletClient || !publicClient || !address) throw new Error('Wallet non dispo');
      if (!unwrapWei || BigInt(unwrapWei) === BigInt(0)) throw new Error('Montant invalide');

      setUnwrapLoading(true);
      setUnwrapErr(null);
      setUnwrapHash(null);

      // WETH.withdraw(uint256)
      const hash = await walletClient.writeContract({
        address: WETH,
        abi: wethAbi,
        functionName: 'withdraw',
        args: [BigInt(unwrapWei)],
        account: address,
      });
      setUnwrapHash(hash);

      await publicClient.waitForTransactionReceipt({ hash });
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || 'Unwrap échoué';
      setUnwrapErr(msg);
      console.error(e);
    } finally {
      setUnwrapLoading(false);
    }
  }

  async function ensurePermit2AllowanceForRouter() {
    if (!walletClient || !publicClient || !address) throw new Error('Wallet non dispo');

    // On peut écrire sans lire (idempotent: ré-écrire la même allowance ne casse rien)
    const hash = await walletClient.writeContract({
      address: PERMIT2,
      abi: permit2Abi,
      functionName: 'approve',
      args: [tokenIn, getAddress(calldata!.to), MAX_UINT160, oneYearFromNow()],
      account: address,
    });

    await publicClient.waitForTransactionReceipt({ hash });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Trade</h1>
        <p className="text-sm text-white/80">
          Obtiens un prix, prépare l’échange RWA ⇄ WETH et exécute le swap avec ton wallet.
        </p>
      </header>

      {!isConnected ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p>Connecte ton wallet pour trader.</p>
        </div>
      ) : (
        <>
          {/* KYC status quick view */}
          <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">État KYC</h2>
              <button
                onClick={fetchKyc}
                className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                disabled={kycLoading}
              >
                {kycLoading ? 'Vérification…' : 'Rafraîchir'}
              </button>
            </div>
            <div className="text-sm">
              {kyc === null && !kycLoading && <p>Inconnu.</p>}
              {kyc !== null && (
                <p>
                  Statut KYC :{' '}
                  <span className={kyc > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {kyc > 0 ? 'Validé' : 'Non validé'}
                  </span>
                </p>
              )}
              {kycErr && <p className="text-rose-400">{kycErr}</p>}
            </div>
          </section>

          {/* Wrap / Unwrap WETH */}
          <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
            <h2 className="font-medium">Wrap / Unwrap WETH</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Wrap */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="text-white/80">Wrap ETH → WETH</div>
                <input
                  className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                  value={wrapHuman}
                  onChange={(e) => onWrapHumanChange(e.target.value)}
                  placeholder="ex: 0.1"
                />
                <div className="text-xs text-white/60">
                  {wrapWei ? `${wrapWei} wei` : '—'}
                </div>
                <button
                  onClick={wrapEthToWeth}
                  className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:opacity-50"
                  disabled={!wrapWei || wrapLoading || !walletClient}
                  title={!walletClient ? 'Wallet non dispo' : (!wrapWei ? 'Montant requis' : '')}
                >
                  {wrapLoading ? 'Wrap…' : 'Wrap'}
                </button>
                {wrapErr && <p className="text-rose-400">{wrapErr}</p>}
                {wrapHash && (
                  <p>
                    Tx:{' '}
                    <a
                      className="underline text-emerald-300"
                      href={`${EXPLORER}/tx/${wrapHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {wrapHash}
                    </a>
                  </p>
                )}
              </div>

              {/* Unwrap */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                <div className="text-white/80">Unwrap WETH → ETH</div>
                <input
                  className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                  value={unwrapHuman}
                  onChange={(e) => onUnwrapHumanChange(e.target.value)}
                  placeholder="ex: 0.1"
                />
                <div className="text-xs text-white/60">
                  {unwrapWei ? `${unwrapWei} wei` : '—'}
                </div>
                <button
                  onClick={unwrapWethToEth}
                  className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:opacity-50"
                  disabled={!unwrapWei || unwrapLoading || !walletClient}
                  title={!walletClient ? 'Wallet non dispo' : (!unwrapWei ? 'Montant requis' : '')}
                >
                  {unwrapLoading ? 'Unwrap…' : 'Unwrap'}
                </button>
                {unwrapErr && <p className="text-rose-400">{unwrapErr}</p>}
                {unwrapHash && (
                  <p>
                    Tx:{' '}
                    <a
                      className="underline text-emerald-300"
                      href={`${EXPLORER}/tx/${unwrapHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {unwrapHash}
                    </a>
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-white/60">
              Astuce : garde toujours un peu d’ETH pour payer le gas.
            </p>
          </section>

          {/* Pair & montant */}
          <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
            <h2 className="font-medium">1) Pair & Montant</h2>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dir"
                  value="RWA_TO_WETH"
                  checked={dir === 'RWA_TO_WETH'}
                  onChange={() => setDir('RWA_TO_WETH')}
                />
                RWA → WETH
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="dir"
                  value="WETH_TO_RWA"
                  checked={dir === 'WETH_TO_RWA'}
                  onChange={() => setDir('WETH_TO_RWA')}
                />
                WETH → RWA
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/70">
                  Montant {dir === 'RWA_TO_WETH' ? 'RWA' : 'WETH'} (humain)
                </label>
                <input
                  className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                  value={amountHuman}
                  onChange={(e) => onAmountHumanChange(e.target.value)}
                  placeholder="ex: 1.5"
                />
                {amtErr && <p className="text-xs text-rose-400 mt-1">{amtErr}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/70">Slippage (bps)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                  value={slippageBps}
                  onChange={(e) => setSlippageBps(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/70">Deadline (sec)</label>
                <input
                  type="number"
                  min={60}
                  className="w-full rounded bg-white/10 px-3 py-2 outline-none"
                  value={deadlineSec}
                  onChange={(e) => setDeadlineSec(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={fetchQuote}
                className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:opacity-50"
                disabled={!canQuote || qLoading}
                title={!canQuote ? 'Montant requis' : ''}
              >
                {qLoading ? 'Calcul…' : 'Obtenir un prix'}
              </button>
            </div>

            {!qLoading && qErr && <p className="text-rose-400 text-sm">{qErr}</p>}
            {!qLoading && quote && (
              <div className="text-sm space-y-1">
                <p>Pool: {quote.pool}</p>
                <p>
                  Montant in: {weiToHumanStr(quote.amountIn)} ({quote.amountIn} wei) → Estimé out: {weiToHumanStr(quote.amountOut)} ({quote.amountOut} wei)
                </p>
                <p>
                  Mid-price ~ 1 {dir === 'RWA_TO_WETH' ? 'RWA' : 'WETH'} ={' '}
                  {dir === 'RWA_TO_WETH'
                    ? `${quote.midPriceToken1PerToken0} WETH`
                    : `${quote.midPriceToken0PerToken1} RWA`}
                </p>
                {quote.warnings?.length ? (
                  <ul className="list-disc pl-5 text-amber-300">
                    {quote.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </section>

          {/* Calldata & Exécution */}
          <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">2) Préparer & Exécuter</h2>
              <div className="flex gap-2">
                <button
                  onClick={buildSwapCalldata}
                  className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20 disabled:opacity-50"
                  disabled={!quote || cdLoading}
                  title={!quote ? 'Fais une quote d’abord' : ''}
                >
                  {cdLoading ? 'Construction…' : 'Construire le calldata'}
                </button>
                <button
                  onClick={executeSwapWithWallet}
                  className="rounded bg-emerald-500/20 px-3 py-1 text-sm hover:bg-emerald-500/30 disabled:opacity-50"
                  disabled={!(!!calldata && !!walletClient && kyc === 1) || execLoading}
                  title={
                    !walletClient ? 'Wallet non dispo' :
                    kyc !== 1 ? 'KYC requis' :
                    !calldata ? 'Pas de calldata' : ''
                  }
                >
                  {execLoading ? 'Exécution…' : 'Exécuter le swap'}
                </button>
              </div>
            </div>

            {!cdLoading && cdErr && <p className="text-rose-400 text-sm">{cdErr}</p>}
            {!execLoading && execErr && <p className="text-rose-400 text-sm">{execErr}</p>}
            {execHash && (
              <p className="text-sm">
                Tx envoyée :{' '}
                <a
                  className="underline text-emerald-300"
                  href={`${EXPLORER}/tx/${execHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {execHash}
                </a>
              </p>
            )}

            {!cdLoading && calldata && (
              <div className="text-xs space-y-1">
                <p>Router: {calldata.router}</p>
                <p>To: {calldata.to}</p>
                <p>Value: {calldata.value}</p>
                <p>AmountOutMin: {calldata.amountOutMin}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer">Données brutes</summary>
                  <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-all">
                    {calldata.data}
                  </pre>
                </details>
                {calldata.notes?.length ? (
                  <ul className="list-disc pl-5 text-amber-300">
                    {calldata.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
