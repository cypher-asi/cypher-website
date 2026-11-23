/** WILD uses 18 decimals. Keep transfer amounts as integer strings, never floats. */
export function bridgeWildAmount(value:string):string|null {
  const text=value.trim();
  if(!/^(?:0|[1-9]\d{0,59})(?:\.\d{1,18})?$/.test(text))return null;
  const [whole,fraction='']=text.split('.');
  const atomic=BigInt(whole)*BigInt('1000000000000000000')+BigInt(fraction.padEnd(18,'0'));
  return atomic>BigInt(0)&&atomic<BigInt(2)**BigInt(256)?atomic.toString():null;
}

/** Format an atomic WILD amount (18 decimals) for display: thousands-separated
 * whole part, fractional part trimmed to at most 4 places. */
export function formatWild(atomic:string):string{
  const units=BigInt(atomic),scale=BigInt('1000000000000000000');
  const whole=(units/scale).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const fraction=(units%scale).toString().padStart(18,'0').slice(0,4).replace(/0+$/,'');
  return fraction?`${whole}.${fraction}`:whole;
}
