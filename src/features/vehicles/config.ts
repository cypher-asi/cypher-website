import 'server-only';
import { getGhostlinePass } from '@/sites/wilderworld/ghostline';

/**
 * On-chain model id for each vehicle pass. Model ids are 1-based (the Vehicle
 * contract rejects 0). This mapping MUST match the deployed contract's models
 * and the token metadata — confirm it before mainnet.
 */
const MODEL_ID_BY_PASS: Record<string, number> = {
  ghostline: 1,
  'vera-solis': 2,
};

/** A carrier for an HTTP-shaped failure so the route can map it to a status. */
export class VehicleCheckoutError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'VehicleCheckoutError';
  }
}

export type VehiclePurchase = {
  passId: string;
  passName: string;
  modelId: number;
  /** Price in the smallest currency unit (USD cents), resolved server-side. */
  priceCents: number;
};

/**
 * Resolve the price and on-chain model id for a pass SERVER-SIDE. The client
 * only ever sends a pass id — never a price — so the charged amount always comes
 * from our own catalogue. Throws (400) on an unknown pass.
 */
export function resolveVehiclePurchase(passId: string): VehiclePurchase {
  const pass = getGhostlinePass(passId);
  const modelId = MODEL_ID_BY_PASS[passId];
  if (!pass || !modelId) {
    throw new VehicleCheckoutError(400, `Unknown vehicle pass: ${passId}`);
  }
  return { passId, passName: pass.name, modelId, priceCents: pass.priceCents };
}

/** Base URL of the mint executor (ww-tx-server). Fails loud if unset. */
export function wwTxServerUrl(): string {
  const url = process.env.WW_TX_SERVER_URL;
  if (!url) throw new VehicleCheckoutError(503, 'WW_TX_SERVER_URL is not configured');
  return url.replace(/\/+$/, '');
}

/** Shared secret sent to ww-tx-server's vehicle-admin-sale endpoint. Fails loud if unset. */
export function vehicleAdminSaleApiKey(): string {
  const key = process.env.VEHICLE_ADMIN_SALE_API_KEY;
  if (!key) throw new VehicleCheckoutError(503, 'VEHICLE_ADMIN_SALE_API_KEY is not configured');
  return key;
}

/** Base URL of the ZERO payments service (Stripe customer store). Fails loud if unset. */
export function zeroPaymentsUrl(): string {
  const url = process.env.ZERO_PAYMENTS_URL;
  if (!url) throw new VehicleCheckoutError(503, 'ZERO_PAYMENTS_URL is not configured');
  return url.replace(/\/+$/, '');
}
