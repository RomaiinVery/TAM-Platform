/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';

function short(addr?: `0x${string}`, size?: number) {
  return addr ? size ? `${addr.slice(0, size)}…${addr.slice((size-2)*-1)}` :`${addr.slice(0, 6)}…${addr.slice(-4)}` : '';
}

function explorerBase(chainId: number | undefined) {
  switch (chainId) {
    case 1: return 'https://etherscan.io';
    case 11155111: return 'https://sepolia.etherscan.io';
    default: return 'https://etherscan.io';
  }
}

export default function ConnectWallet() {
  const { address, status } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const injected = useMemo(
    () => connectors.find((c) => c.id === 'injected') ?? connectors[0],
    [connectors]
  );

  const onConnect = async () => {
    setErr(null);
    if (!injected) {
      setErr("Aucun wallet compatible détecté.");
      return;
    }
    if (status === 'connected') {
      setOpen((s) => !s);
      return;
    }

    try {
      setPending(true);
      await connectAsync({ connector: injected });
    } catch (e: any) {
      const msg: string = e?.shortMessage || e?.message || '';
      if (/already connected/i.test(msg)) {
        try {
          await disconnectAsync();
          await new Promise((r) => setTimeout(r, 120));
          await connectAsync({ connector: injected });
        } catch (e2: any) {
          setErr(e2?.shortMessage || e2?.message || 'Connexion impossible');
        }
      } else if (/rejected/i.test(msg)) {
        setErr('Connexion annulée');
      } else {
        setErr(msg || 'Erreur de connexion');
      }
    } finally {
      setPending(false);
    }
  };

  const onDisconnect = async () => {
    setErr(null);
    try {
      setPending(true);
      await disconnectAsync();
      setOpen(false);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || 'Déconnexion impossible');
    } finally {
      setPending(false);
    }
  };

  const onCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={onConnect}
        disabled={pending || status === 'connecting' || status === 'reconnecting'}
        className={[
          'group inline-flex items-center gap-2 rounded-full px-4 py-2',
          status === 'connected'
            ? 'border border-white/10 bg-white/5 hover:bg-white/10'
            : 'bg-black text-white hover:bg-neutral-900 border border-white/10'
        ].join(' ')}
      >
        <span
          className={[
            'h-2.5 w-2.5 rounded-full',
            status === 'connected' ? 'bg-emerald-500' :
            status === 'connecting' || status === 'reconnecting' ? 'bg-amber-400' : 'bg-neutral-400',
            'ring-2 ring-white/20'
          ].join(' ')}
        />
        <span className="font-medium tracking-tight">
          {pending || status === 'connecting' || status === 'reconnecting'
            ? 'Connexion…'
            : status === 'connected'
              ? short(address)
              : 'Connect Wallet'}
        </span>
      </button>

      {status === 'connected' && open && (
        <div className="absolute right-0 z-10 mt-3 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl backdrop-blur">
          <div className="px-4 py-3">
            <p className="text-xs text-neutral-400">Connecté</p>
            <p className="mt-1 font-mono text-sm text-white">{short(address, 13)}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {chainId === 11155111 ? 'Sepolia' : `Chain ${chainId ?? '?'}`}
            </div>
          </div>

          <div className="border-t border-white/10" />

          <div className="p-1">
            <button
              onClick={onCopy}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-white hover:bg-white/5"
            >
              {copied ? '✅ Adresse copiée' : 'Copier l’adresse'}
            </button>
            <a
              href={`${explorerBase(chainId)}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl px-3 py-2 text-sm text-white hover:bg-white/5"
            >
              Voir sur Etherscan ↗
            </a>
            <button
              onClick={onDisconnect}
              disabled={pending}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-left text-sm text-red-300 hover:bg-white/10 disabled:opacity-60"
            >
              {pending ? '…' : 'Se déconnecter'}
            </button>
          </div>
        </div>
      )}

      {err && <p className="mt-2 text-xs text-red-500">{err}</p>}
    </div>
  );
}
