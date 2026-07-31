'use client';

/**
 * Hosted external-wallet linking page. Reached after the session bootstrap
 * (`/api/link-wallet/start`) has promoted the host-injected token into the
 * session cookie. Connects an external wallet via WalletConnect (the only
 * connector available in an embedded browser), proves ownership with a
 * signature, and links it to the ZERO account through the existing marketplace
 * proxies. On any terminal state it navigates to the completion route, which
 * clears the session and redirects to the callback the host intercepts.
 */
import { useRef, useState } from 'react';
import { useConnectModal } from 'thirdweb/react';
import { createWallet, type Wallet } from 'thirdweb/wallets';
import { MarketWeb3Provider } from '../market/MarketWeb3Provider';
import { thirdwebClient } from '../market/lib/thirdwebClient';
import { linkWalletFlow, type SignableAccount } from '../market/hooks/useLinkWalletMutation';
import { completePath } from '@/features/marketplace/hosted-link';

type Phase = 'idle' | 'working' | 'transfer';

function LinkFlow() {
  const { connect } = useConnectModal();
  const [phase, setPhase] = useState<Phase>('idle');
  const account = useRef<SignableAccount | null>(null);
  const wallet = useRef<Wallet | null>(null);

  function complete(outcome: 'success' | 'cancelled' | 'error', code?: string) {
    window.location.href = completePath(outcome, code);
  }

  async function releaseWallet() {
    try {
      await wallet.current?.disconnect();
    } catch {
      /* best-effort — a lingering connection is not fatal */
    }
    wallet.current = null;
  }

  async function runLink(signer: SignableAccount, confirm: boolean) {
    setPhase('working');
    try {
      const result = await linkWalletFlow(signer, confirm);
      if (result.requiresConfirmation) {
        // Wallet is linked to another ZERO account — needs an explicit move.
        setPhase('transfer');
        return;
      }
      await releaseWallet();
      complete('success');
    } catch {
      await releaseWallet();
      complete('error', 'link_failed');
    }
  }

  async function handleConnect() {
    if (!thirdwebClient) {
      complete('error', 'client_unavailable');
      return;
    }
    let signer: SignableAccount;
    try {
      const connected = await connect({
        client: thirdwebClient,
        setActive: false,
        // No injected wallet exists in an embedded browser, so pin WalletConnect.
        wallets: [createWallet('walletConnect')],
      });
      const twAccount = connected.getAccount();
      if (!twAccount) {
        await releaseWallet();
        return; // nothing connected — stay idle so the user can retry or cancel
      }
      wallet.current = connected;
      signer = {
        address: twAccount.address,
        signMessage: ({ message }) => twAccount.signMessage({ message }),
      };
      account.current = signer;
    } catch {
      return; // user dismissed the connect modal — stay idle
    }
    await runLink(signer, false);
  }

  async function handleConfirmTransfer() {
    if (!account.current) return;
    await runLink(account.current, true);
  }

  async function handleCancel() {
    await releaseWallet();
    complete('cancelled');
  }

  const busy = phase === 'working';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>Link an Ethereum wallet</h1>

      {phase === 'transfer' ? (
        <>
          <p style={{ maxWidth: 360, opacity: 0.75, fontSize: 14, lineHeight: 1.5 }}>
            This wallet is linked to another ZERO account. Move it to this account?
          </p>
          <button type="button" style={buttonStyle} onClick={handleConfirmTransfer}>
            Move it here
          </button>
          <button type="button" style={linkStyle} onClick={handleCancel}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <p style={{ maxWidth: 360, opacity: 0.75, fontSize: 14, lineHeight: 1.5 }}>
            Connect your wallet and sign a message to link it to your ZERO account. No transaction,
            no gas.
          </p>
          <button type="button" style={buttonStyle} onClick={handleConnect} disabled={busy}>
            {busy ? 'Linking…' : 'Connect & link a wallet'}
          </button>
          <button type="button" style={linkStyle} onClick={handleCancel} disabled={busy}>
            Cancel
          </button>
        </>
      )}
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '12px 24px',
  fontSize: 16,
  borderRadius: 8,
  border: '1px solid currentColor',
  background: 'transparent',
  cursor: 'pointer',
};

const linkStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  fontSize: 14,
  opacity: 0.6,
  cursor: 'pointer',
};

export default function LinkWalletPage() {
  return (
    <MarketWeb3Provider>
      <LinkFlow />
    </MarketWeb3Provider>
  );
}
