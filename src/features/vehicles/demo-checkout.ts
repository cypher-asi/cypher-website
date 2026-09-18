/**
 * TEMPORARY — remove once the vehicle contract is deployed.
 *
 * The contract does not exist on chain yet, so a real purchase could only ever
 * take a payment and then fail at the mint. While that is true the pay button
 * walks through to the delivered screen without charging or minting, so the
 * funnel can be reviewed end to end.
 *
 * Set NEXT_PUBLIC_VEHICLES_DEMO_CHECKOUT=false to restore the real flow. That
 * exact string and nothing else, so a typo, a blank value or a forgotten
 * variable all leave the walkthrough ON. The unsafe direction is the one that
 * takes real money for a vehicle that cannot be minted, so it is the one that
 * has to be asked for explicitly. VEHICLES_LIVE uses the same shape in the
 * opposite direction, where only the exact string "true" opens the funnel.
 *
 * NEXT_PUBLIC_ is required rather than tidier: the only caller is a client
 * component, and Next inlines nothing else into the browser bundle. The value
 * is not a secret, and it is not a security control either. Whether the API
 * route charges is decided on the server regardless of what a browser believes,
 * so this only governs whether the pay button takes the real path. The controls
 * that actually keep buyers out are the launch gate and the preview token.
 *
 * Once the contract is live: delete this module and its single call site.
 */
export function isDemoCheckout(): boolean {
  return process.env.NEXT_PUBLIC_VEHICLES_DEMO_CHECKOUT !== 'false';
}
