'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Link2, Wallet } from 'lucide-react';
import {
  discoverWalletProviders,
  ETHEREUM_MAINNET,
  readWalletConnection,
  requireWalletContext,
  siweExpiry,
  walletErrorMessage,
  walletMessageHex,
  type WalletProviderChoice,
} from './wallet-provider';
import { unlinkWallet } from '@/app/market/hooks/useUnlinkWalletMutation';
import type { LinkedWallet } from '@/features/marketplace/wallet-link';
import styles from './Wallets.module.css';

type Connection = { choice: WalletProviderChoice; address: string; chainId: string };
type Challenge = { message: string; expiresAt: number | null };
type Operation = 'idle' | 'connecting' | 'switching' | 'preparing' | 'signing' | 'linking' | 'unlinking';

/**
 * Link an external Ethereum mainnet wallet to the signed-in ZERO account, using
 * our real marketplace rail (`/api/marketplace/wallet-challenge` -> sign a SIWE
 * message -> `/api/marketplace/add-wallet`, listed/removed via `/wallets`). The
 * wallet is linked read-only (the proxy forces `canAuthenticate: false`), so a
 * signature proves ownership of the address, nothing more.
 */
export default function Wallets() {
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [providers, setProviders] = useState<WalletProviderChoice[]>([]);
  const [picker, setPicker] = useState(false);
  const [discovery, setDiscovery] = useState(0);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [operation, setOperationState] = useState<Operation>('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [unlinkId, setUnlinkId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const mounted = useRef(true);
  const generation = useRef(0);
  const operationRef = useRef<Operation>('idle');
  const busy = operation !== 'idle';
  const expired = !!challenge && challenge.expiresAt != null && challenge.expiresAt <= now;

  function setOperation(value: Operation) {
    operationRef.current = value;
    setOperationState(value);
  }
  function current(id: number) {
    return mounted.current && generation.current === id;
  }

  async function refresh() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/marketplace/wallets');
      const body = (await res.json().catch(() => ({}))) as { wallets?: LinkedWallet[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Could not load linked wallets');
      if (mounted.current) setWallets(body.wallets ?? []);
    } catch (reason) {
      if (mounted.current) setLoadError(walletErrorMessage(reason));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, []);

  useEffect(() => {
    if (!picker) return;
    setProviders([]);
    return discoverWalletProviders(setProviders);
  }, [picker, discovery]);

  useEffect(() => {
    if (!challenge) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  // A wallet account or network change mid-flow invalidates the connection so a
  // signature can never be produced for the wrong address or chain.
  useEffect(() => {
    if (!connection) return;
    const provider = connection.choice.provider;
    const changed = () => {
      if (operationRef.current === 'connecting' || operationRef.current === 'switching') return;
      if (operationRef.current === 'linking' || operationRef.current === 'unlinking') {
        setConnection(null);
        setChallenge(null);
        return;
      }
      generation.current++;
      setConnection(null);
      setChallenge(null);
      setOperation('idle');
      setError('Your wallet account or network changed. Connect again before linking.');
    };
    provider.on?.('accountsChanged', changed);
    provider.on?.('chainChanged', changed);
    provider.on?.('disconnect', changed);
    return () => {
      provider.removeListener?.('accountsChanged', changed);
      provider.removeListener?.('chainChanged', changed);
      provider.removeListener?.('disconnect', changed);
    };
  }, [connection]);

  function fail(reason: unknown, id: number) {
    if (current(id)) {
      setError(walletErrorMessage(reason));
      setOperation('idle');
    }
  }

  async function connect(choice: WalletProviderChoice) {
    if (busy) return;
    const id = ++generation.current;
    setOperation('connecting');
    setError('');
    setNotice('');
    setChallenge(null);
    try {
      const result = await readWalletConnection(choice.provider, true);
      if (!current(id)) return;
      setConnection({ choice, ...result });
      setPicker(false);
      setOperation('idle');
    } catch (reason) {
      fail(reason, id);
    }
  }

  async function switchMainnet() {
    if (!connection || busy) return;
    const id = ++generation.current;
    setOperation('switching');
    setError('');
    setChallenge(null);
    try {
      await connection.choice.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ETHEREUM_MAINNET }],
      });
      if (!current(id)) return;
      const result = await readWalletConnection(connection.choice.provider);
      if (!current(id)) return;
      if (result.chainId !== ETHEREUM_MAINNET)
        throw new Error('Your wallet is still on another network. Choose Ethereum Mainnet to continue.');
      setConnection({ ...connection, ...result });
      setOperation('idle');
    } catch (reason) {
      fail(reason, id);
    }
  }

  async function prepare() {
    if (!connection || busy) return;
    const id = ++generation.current;
    setOperation('preparing');
    setError('');
    setNotice('');
    setChallenge(null);
    try {
      await requireWalletContext(connection.choice.provider, connection.address);
      if (!current(id)) return;
      const res = await fetch(`/api/marketplace/wallet-challenge?address=${encodeURIComponent(connection.address)}`);
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!current(id)) return;
      if (!res.ok || typeof body.message !== 'string' || !body.message)
        throw new Error(body.error ?? 'Could not start wallet linking. Connect again for a fresh request.');
      setChallenge({ message: body.message, expiresAt: siweExpiry(body.message) });
      setOperation('idle');
    } catch (reason) {
      fail(reason, id);
    }
  }

  async function signAndLink() {
    if (!connection || !challenge || busy) return;
    const id = ++generation.current;
    setOperation('signing');
    setError('');
    setNotice('');
    try {
      await requireWalletContext(connection.choice.provider, connection.address);
      if (!current(id)) return;
      const signature = await connection.choice.provider.request({
        method: 'personal_sign',
        params: [walletMessageHex(challenge.message), connection.address],
      });
      if (!current(id)) return;
      if (typeof signature !== 'string' || !/^0x[0-9a-f]{130}$/i.test(signature))
        throw new Error('The wallet returned an unsupported signature. Use an Ethereum account controlled by your own keys.');
      await requireWalletContext(connection.choice.provider, connection.address);
      if (!current(id)) return;

      setOperation('linking');
      const res = await fetch('/api/marketplace/add-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: challenge.message, signature }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) throw new Error(body.error ?? 'Could not link wallet.');
      // The wallet is already linked to another ZERO account. We do not silently
      // move it: tell the person so they can resolve it from the wallet it is on.
      if (body.code === 'WALLET_LINKED_TO_ANOTHER_ACCOUNT')
        throw new Error('This wallet is already linked to another ZERO account.');
      if (!mounted.current) return;
      setChallenge(null);
      setConnection(null);
      setOperation('idle');
      setNotice('Wallet linked to your ZERO account.');
      await refresh();
    } catch (reason) {
      fail(reason, id);
    }
  }

  async function unlink(wallet: LinkedWallet) {
    if (busy) return;
    const id = ++generation.current;
    setOperation('unlinking');
    setError('');
    setNotice('');
    try {
      await unlinkWallet(wallet.id);
      if (!mounted.current) return;
      setWallets((previous) => previous.filter((item) => item.id !== wallet.id));
      setUnlinkId(null);
      setOperation('idle');
      setNotice('Wallet unlinked from your ZERO account. No assets were moved and wallet permissions were not changed.');
    } catch (reason) {
      fail(reason, id);
    }
  }

  function resetConnection() {
    generation.current++;
    setChallenge(null);
    setConnection(null);
    setPicker(false);
    setError('');
    setOperation('idle');
  }

  return (
    <div className={styles.root}>
      <header className={styles.heading}>
        <div>
          <h2>Wallets</h2>
          <p>Connect the wallets that hold your Wilder World items.</p>
        </div>
        <span className={styles.network}>Ethereum Mainnet</span>
      </header>
      <div className={styles.preview}>
        <Link2 size={19} aria-hidden />
        <div>
          <strong>Your keys stay with you.</strong>
          <p>
            A signature proves you control an address. It does not transfer assets, approve spending or give this
            site access to your funds.
          </p>
          <p>
            This links a wallet to your <strong>ZERO account</strong>, read only, so we can show what it holds. Item
            sync and entitlement delivery to your game account are not connected yet.
          </p>
        </div>
      </div>
      <dl className={styles.status}>
        <div>
          <dt>Wallet proof</dt>
          <dd>Signed ownership check</dd>
        </div>
        <div>
          <dt>Ethereum item sync</dt>
          <dd>Not connected</dd>
        </div>
        <div>
          <dt>Game-account delivery</dt>
          <dd>Not connected</dd>
        </div>
      </dl>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {loadError && (
        <div role="alert" className={styles.error}>
          <p>{loadError}</p>
          <button type="button" className={styles.secondary} disabled={busy || loading} onClick={refresh}>
            Reload linked wallets
          </button>
        </div>
      )}
      {loading ? (
        <p role="status" className={styles.muted}>Loading linked wallets…</p>
      ) : wallets.length ? (
        <div className={styles.walletList}>
          {wallets.map((wallet) => (
            <article className={styles.wallet} key={wallet.id}>
              <div className={styles.walletIcon}>
                <Wallet size={24} aria-hidden />
              </div>
              <div className={styles.walletInfo}>
                <p className={styles.eyebrow}>Ethereum Mainnet</p>
                <strong className={styles.address}>{wallet.publicAddress}</strong>
                <span className={styles.verified}>
                  <Check size={13} aria-hidden />
                  Signature verified · Linked to your ZERO account
                </span>
              </div>
              {unlinkId === wallet.id ? (
                <div className={styles.unlink} role="group" aria-label={`Unlink wallet ${wallet.publicAddress}`}>
                  <p>Remove this account link? Your wallet keeps its assets.</p>
                  <button className={styles.secondary} type="button" disabled={busy} onClick={() => unlink(wallet)}>
                    Confirm unlink
                  </button>
                  <button className={styles.textButton} type="button" disabled={busy} onClick={() => setUnlinkId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className={styles.secondary} type="button" disabled={busy} onClick={() => setUnlinkId(wallet.id)}>
                  Unlink wallet
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        !loadError && <p className={styles.empty}>No wallets linked yet. Connect one to verify your address.</p>
      )}
      <section className={styles.connect} aria-label="Connect a self-custody wallet">
        <h3>Connect a wallet</h3>
        <p>
          Use an Ethereum browser wallet or a wallet’s in-app browser. QR connection and smart-contract wallets are
          not supported here.
        </p>
        {!connection && !picker && (
          <button
            type="button"
            className={styles.primary}
            disabled={busy || loading || !!loadError}
            onClick={() => {
              setPicker(true);
              setError('');
              setNotice('');
            }}
          >
            Choose a wallet <ArrowUpRight size={15} aria-hidden />
          </button>
        )}
        {picker && !connection && (
          <div className={styles.picker}>
            <div className={styles.providers}>
              {providers.map((choice) => (
                <button type="button" className={styles.secondary} disabled={busy} key={choice.id} onClick={() => connect(choice)}>
                  <Wallet size={17} aria-hidden />
                  {choice.name}
                </button>
              ))}
            </div>
            {!providers.length && (
              <p className={styles.muted}>
                No compatible wallet was found. Open this page in your wallet’s browser, or enable its browser
                extension, then check again.
              </p>
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.textButton} disabled={busy} onClick={() => setDiscovery((value) => value + 1)}>
                Check for wallets
              </button>
              <button type="button" className={styles.textButton} onClick={resetConnection}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {connection && (
          <div className={styles.connection}>
            <p className={styles.eyebrow}>{connection.choice.name}</p>
            <strong className={styles.address}>{connection.address}</strong>
            <p className={styles.muted}>
              {connection.chainId === ETHEREUM_MAINNET
                ? 'Ethereum Mainnet · Ready to verify'
                : 'Choose Ethereum Mainnet to verify this wallet.'}
            </p>
            {connection.chainId !== ETHEREUM_MAINNET ? (
              <button type="button" className={styles.primary} disabled={busy} onClick={switchMainnet}>
                Switch to Ethereum Mainnet
              </button>
            ) : challenge ? (
              <>
                <details className={styles.proof}>
                  <summary>View signature request</summary>
                  <pre>{challenge.message}</pre>
                </details>
                <p className={styles.muted}>
                  {expired
                    ? 'This request expired. Refresh it before signing.'
                    : challenge.expiresAt != null
                      ? `Request expires at ${new Date(challenge.expiresAt).toLocaleTimeString()}.`
                      : 'Review the request in your wallet before signing.'}
                </p>
                <div className={styles.actions}>
                  {expired ? (
                    <button type="button" className={styles.primary} disabled={busy} onClick={prepare}>
                      Refresh signature request
                    </button>
                  ) : (
                    <button type="button" className={styles.primary} disabled={busy} onClick={signAndLink}>
                      Sign and link wallet
                    </button>
                  )}
                </div>
              </>
            ) : (
              <button type="button" className={styles.primary} disabled={busy} onClick={prepare}>
                Review wallet link
              </button>
            )}
            <button
              type="button"
              className={styles.textButton}
              disabled={operation === 'linking' || operation === 'unlinking'}
              onClick={resetConnection}
            >
              Cancel connection
            </button>
          </div>
        )}
        {busy && (
          <p role="status" className={styles.muted}>
            {operation === 'signing'
              ? 'Review the message in your wallet. No transaction is requested.'
              : operation === 'linking'
                ? 'Verifying and saving your wallet link…'
                : operation === 'unlinking'
                  ? 'Removing the wallet link…'
                  : operation === 'preparing'
                    ? 'Preparing your signed proof…'
                    : 'Continue in your wallet…'}
          </p>
        )}
      </section>
    </div>
  );
}
