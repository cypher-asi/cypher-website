import { createThirdwebClient, type ThirdwebClient } from 'thirdweb';

/**
 * Browser thirdweb client for wallet connect (external EOA linking). Uses only
 * the public client id — the secret key stays server-side in the custodial
 * trade path. Null when the id isn't configured, so the connect UI can degrade
 * gracefully instead of crashing the market render.
 */
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

export const thirdwebClient: ThirdwebClient | null = clientId
  ? createThirdwebClient({ clientId })
  : null;
