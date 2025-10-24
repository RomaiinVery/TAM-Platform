'use client';

import Link from 'next/link';
import { useState } from 'react';

type CheckState = 'idle' | 'loading' | 'ok' | 'error';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

function StatusDot({ state }: { state: CheckState }) {
  const base = 'inline-block h-2.5 w-2.5 rounded-full align-middle';
  const color =
    state === 'ok'
      ? 'bg-emerald-500'
      : state === 'error'
      ? 'bg-rose-500'
      : state === 'loading'
      ? 'bg-yellow-400 animate-pulse'
      : 'bg-zinc-400';
  return <span className={`${base} ${color}`} />;
}

export default function HomePage() {
  const [check, setCheck] = useState<CheckState>('idle');
  const [message, setMessage] = useState<string>('');

  async function handleCheck() {
    try {
      setCheck('loading');
      setMessage('');
      const res = await fetch(`${BACKEND_URL}/status`, { cache: 'no-store' });
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {}
      if (res.ok) {
        setCheck('ok');
        setMessage('Backend opérationnel ✅');
      } else {
        setCheck('error');
        setMessage('Le backend répond mais n’est pas OK.');
      }
    } catch (e) {
      setCheck('error');
      setMessage('Impossible de joindre le backend.');
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-white/5 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Bienvenue sur TAM Platform</h2>
        <p className="mt-2 text-sm text-white/80">
          La plateforme qui connecte des <span className="font-medium">actifs du monde réel (RWA)</span>
          {' '}au monde <span className="font-medium">DeFi</span> : tokenisation, cotation, échange et
          opérations on-chain sur Sepolia.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl bg-white/5 p-5 shadow-sm">
          <h3 className="font-semibold">Tu es Investisseur ?</h3>
          <p className="mt-2 text-sm text-white/80">
            Consulte le prix spot, prépare ton swap en un clic, signe avec ton wallet et suis la
            transaction sur Etherscan. Tout se fait côté client pour une sécurité maximale.
          </p>
          <div className="mt-4">
            <Link
              href="/trade"
              className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
            >
              Aller sur Trade →
            </Link>
          </div>
        </article>

        <article className="rounded-2xl bg-white/5 p-5 shadow-sm">
          <h3 className="font-semibold">Tu es Émetteur (RWA) ?</h3>
          <p className="mt-2 text-sm text-white/80">
            Tokenise un actif, gère la conformité (KYC/whitelist des contrats) et prépare l’accès
            au marché. La page “Tokenize” centralise le process et la roadmap.
          </p>
          <div className="mt-4">
            <Link
              href="/tokenize"
              className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
            >
              Découvrir Tokenize →
            </Link>
          </div>
        </article>

        <article className="rounded-2xl bg-white/5 p-5 shadow-sm">
          <h3 className="font-semibold">Tu es Admin ?</h3>
          <p className="mt-2 text-sm text-white/80">
            Vérifie le statut KYC on-chain d’une adresse et mets à jour si besoin.<br></br>
            Des outils d’admin et d’indexation peuvent s’ajouter ensuite.
          </p>
          <div className="mt-4">
            <Link
              href="/profil"
              className="inline-flex items-center rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
            >
              Vérifier un KYC →
            </Link>
          </div>
        </article>
      </section>

      <section className="rounded-2xl bg-white/5 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Santé du backend</h3>
            <p className="mt-1 text-sm text-white/70">
              Ping de <code className="rounded bg-white/10 px-1 py-0.5">GET /status</code> sur {BACKEND_URL}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <StatusDot state={check} />
              <span className="min-w-[9ch]">
                {check === 'idle' && 'En attente'}
                {check === 'loading' && 'Test…'}
                {check === 'ok' && 'OK'}
                {check === 'error' && 'Erreur'}
              </span>
            </div>

            <button
              onClick={handleCheck}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 active:translate-y-[1px]"
            >
              Tester le backend
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-3 text-sm text-white/80">
            {message}
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/trade"
          className="rounded-2xl bg-white/5 p-4 shadow-sm transition hover:bg-white/10"
        >
          <div className="font-semibold">Swap RWA ↔︎ WETH</div>
          <div className="mt-1 text-sm text-white/70">
            Quote spot, réglage du slippage & deadline, calldata prêt à signer.
          </div>
        </Link>

        <Link
          href="/tokenize"
          className="rounded-2xl bg-white/5 p-4 shadow-sm transition hover:bg-white/10"
        >
          <div className="font-semibold">Tokenisation & conformité</div>
          <div className="mt-1 text-sm text-white/70">
            Parcours émetteur, whitelists de contrats & KYC on-chain.
          </div>
        </Link>
      </section>
    </div>
  );
}
