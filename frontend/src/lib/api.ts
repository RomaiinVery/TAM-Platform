const BASE = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function ok<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status} ${r.statusText} — ${body}`);
  }
  return r.json() as Promise<T>;
}

export async function getStatus() {
    const res = await fetch(`${BASE}/status`, { cache: 'no-store' })
  return ok<{ ok: true; service: string; ts: number }>(res);
}

export async function getKyc(addr: string) {
    const res = await fetch(`${BASE}/kyc/${addr}`, { cache: 'no-store' })
  return ok<{ address: string; status: number }>(res);
}

export async function quoteSpot(params: {
  pool: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/dex/quote-spot?${q}`, { cache: 'no-store' })
  return ok<{
    ok: boolean;
    amountOut?: string;
    midPriceToken1PerToken0?: number;
    midPriceToken0PerToken1?: number;
    warnings?: string[];
  }>(res);
}

export async function swapCalldata(body: {
  sender: string;
  recipient: string;
  pool: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  fee?: number;
  slippageBps?: number;
  deadlineSec?: number;
}) {
    const res = await fetch(`${BASE}/dex/swap-calldata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  return ok<{
    ok: boolean;
    to: string;
    data: `0x${string}`;
    value: string;
    amountOutMin: string;
  }>(res);
}
