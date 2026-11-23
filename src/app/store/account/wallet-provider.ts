export type EthereumProvider={
  request:(args:{method:string;params?:readonly unknown[]})=>Promise<unknown>;
  on?:(event:string,listener:(...args:unknown[])=>void)=>void;
  removeListener?:(event:string,listener:(...args:unknown[])=>void)=>void;
};
export type WalletProviderChoice={id:string;name:string;provider:EthereumProvider};
export const ETHEREUM_MAINNET='0x1';
const ADDRESS=/^0x[0-9a-f]{40}$/i;
export function walletAddress(value:unknown):string|null{return typeof value==='string'&&ADDRESS.test(value)&&!/^0x0{40}$/i.test(value)?value.toLowerCase():null;}
function isProvider(value:unknown):value is EthereumProvider{return !!value&&typeof value==='object'&&typeof (value as EthereumProvider).request==='function';}
/** Discovery is started by a visitor's connect action. Wallet-supplied icons are never rendered. */
export function discoverWalletProviders(update:(choices:WalletProviderChoice[])=>void,target:Window=window){
  const choices:WalletProviderChoice[]=[];
  const announce=(event:Event)=>{
    const detail=(event as CustomEvent).detail as {info?:{uuid?:unknown;name?:unknown};provider?:unknown}|undefined;
    if(!detail?.info||!isProvider(detail.provider)||typeof detail.info.uuid!=='string'||typeof detail.info.name!=='string'||!detail.info.uuid||!detail.info.name.trim())return;
    const id=detail.info.uuid.slice(0,100),name=detail.info.name.trim().slice(0,60);
    const existing=choices.findIndex(choice=>choice.provider===detail.provider);
    if(existing>=0){if(choices[existing].id==='browser-wallet')choices[existing]={id,name,provider:detail.provider};else return;}
    else if(!choices.some(choice=>choice.id===id))choices.push({id,name,provider:detail.provider});else return;
    update([...choices]);
  };
  target.addEventListener('eip6963:announceProvider',announce);
  const fallback=(target as Window&{ethereum?:unknown}).ethereum;
  if(isProvider(fallback)){choices.push({id:'browser-wallet',name:'Browser wallet',provider:fallback});update([...choices]);}
  target.dispatchEvent(new Event('eip6963:requestProvider'));
  return()=>target.removeEventListener('eip6963:announceProvider',announce);
}
export async function readWalletConnection(provider:EthereumProvider,requestAccess=false){
  const result=await provider.request({method:requestAccess?'eth_requestAccounts':'eth_accounts'});
  const address=Array.isArray(result)?walletAddress(result[0]):null;
  if(!address)throw new Error('Choose an Ethereum account in your wallet and connect again.');
  const chain=await provider.request({method:'eth_chainId'});
  return {address,chainId:typeof chain==='string'?chain.toLowerCase():''};
}
export async function requireWalletContext(provider:EthereumProvider,address:string){
  const current=await readWalletConnection(provider);
  if(current.address!==address.toLowerCase())throw new Error('Your selected wallet account changed. Connect again before linking.');
  if(current.chainId!==ETHEREUM_MAINNET)throw new Error('Switch your wallet to Ethereum Mainnet before linking.');
}
export function walletErrorMessage(error:unknown){
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  if(code==='4001')return 'The wallet request was cancelled. Nothing was linked; you can try again.';
  if(code==='-32002')return 'A wallet request is already open. Complete or cancel it in your wallet first.';
  if(code==='4900'||code==='4901')return 'Your wallet is disconnected. Open it and connect again.';
  if(code==='4200')return 'This wallet does not support message signing. Try a compatible Ethereum browser wallet.';
  return error instanceof Error?error.message:'The wallet could not complete this request. Try again.';
}
export function walletMessageHex(message:string){return '0x'+Array.from(new TextEncoder().encode(message),value=>value.toString(16).padStart(2,'0')).join('');}

/** Parse the `Expiration Time` field from a SIWE message, or null if absent/invalid. */
export function siweExpiry(message:string):number|null{
  const line=message.split('\n').find(value=>value.startsWith('Expiration Time: '));
  if(!line)return null;
  const parsed=Date.parse(line.slice('Expiration Time: '.length).trim());
  return Number.isFinite(parsed)?parsed:null;
}
