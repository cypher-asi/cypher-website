/**
 * TEMPORARY — remove once the vehicle contract is deployed.
 *
 * The contract does not exist on chain yet, so a real purchase could only ever
 * take a payment and then fail at the mint. While that is true the pay button
 * walks through to the delivered screen without charging or minting, so the
 * funnel can be reviewed end to end.
 *
 * To restore the real flow: return false. Nothing else needs to change — the
 * payment path is untouched and still covered by its tests. Then delete this
 * module and its single call site.
 *
 * Safe to leave on meanwhile because the whole section is behind the launch gate
 * (VEHICLES_LIVE) and a preview token, so no buyer can reach it. It MUST be
 * turned off before the funnel goes live.
 */
export function isDemoCheckout(): boolean {
  return true;
}
