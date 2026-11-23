'use client';

import {useEffect,useId,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUpRight,Check,Clock3,Wallet} from 'lucide-react';
import {bridgeWildAmount,formatWild} from './bridge-amount';
import {useWildBalance} from './useWildBalance';
import styles from './Bridge.module.css';

/** A linked Ethereum EOA from the marketplace wallet-link rail. These are the
 * user's external, self-custody wallets (the ZERO custodial wallet is filtered
 * out upstream), so every entry is an Ethereum Mainnet source for the bridge. */
type SourceWallet={id:string;address:string};
type Stage='connect'|'amount'|'review';
type ActivityFilter='all'|'pending'|'completed';
const stages:Stage[]=['connect','amount','review'];
function WildIcon(){return <span className={styles.tokenIcon}><img src="/images/wilder-world/wilder-world-logo-orange.svg" alt=""/></span>;}

/** Design preview of ZERO's existing bridge flow. No wallet RPC or transaction
 * execution lives here. A linked wallet is not an active signer. Review may be
 * previewed without a connection, but confirmation must stay unavailable until
 * the approved ZERO adapter supplies a verified account, route and quote. */
export default function Bridge({userId,zeroWalletAddress,onManageWallets}:{userId:string|null;zeroWalletAddress:string|null;onManageWallets?:()=>void}){
  const id=useId(),heading=useRef<HTMLHeadingElement>(null);
  const [walletState,setWalletState]=useState<{owner:string|null;wallets:SourceWallet[];status:'loading'|'ready'|'error';error:string}>({owner:null,wallets:[],status:'loading',error:''});
  const [selection,setSelection]=useState<{owner:string|null;walletId:string;amount:string}>({owner:userId,walletId:'',amount:''});
  const [flow,setFlow]=useState<{owner:string|null;stage:Stage;filter:ActivityFilter}>({owner:userId,stage:'connect',filter:'all'});
  const [attempt,setAttempt]=useState(0),[touched,setTouched]=useState(false);
  const stage=flow.owner===userId?flow.stage:'connect';
  const previousStage=useRef(stage);
  useEffect(()=>{
    const controller=new AbortController();
    setWalletState({owner:userId,wallets:[],status:userId?'loading':'ready',error:''});
    setSelection({owner:userId,walletId:'',amount:''});setTouched(false);
    setFlow({owner:userId,stage:'connect',filter:'all'});
    if(userId)fetch('/api/marketplace/wallets',{signal:controller.signal}).then(async res=>{
      const body=await res.json().catch(()=>({})) as {wallets?:{id:string;publicAddress:string}[];error?:string};
      if(!res.ok)throw new Error(body.error??'Could not load linked wallets');
      if(controller.signal.aborted)return;
      const wallets=(body.wallets??[]).filter(wallet=>/^0x[0-9a-f]{40}$/i.test(wallet.publicAddress)).map(wallet=>({id:wallet.id,address:wallet.publicAddress}));
      setWalletState({owner:userId,wallets,status:'ready',error:''});
    }).catch(reason=>{if(!controller.signal.aborted)setWalletState({owner:userId,wallets:[],status:'error',error:reason instanceof Error?reason.message:'Could not load linked wallets'});});
    return()=>controller.abort();
  },[userId,attempt]);
  useEffect(()=>{if(previousStage.current!==stage){heading.current?.focus();previousStage.current=stage;}},[stage]);
  const wallets=walletState.owner===userId?walletState.wallets:[];
  const loading=!!userId&&(walletState.owner!==userId||walletState.status==='loading');
  const amount=selection.owner===userId?selection.amount:'';
  const selected=selection.owner===userId?wallets.find(wallet=>wallet.id===selection.walletId):undefined;
  const wildBalance=useWildBalance(selected?.address??null);
  const balanceLabel=wildBalance.status==='ready'&&wildBalance.balance!==null?`Balance ${formatWild(wildBalance.balance)} WILD`:wildBalance.status==='loading'?'Balance loading':'Balance unavailable';
  const receiving=zeroWalletAddress;
  const valid=bridgeWildAmount(amount)!==null;
  const invalid=touched&&amount!==''&&!valid;
  const filter=flow.owner===userId?flow.filter:'all';
  const update=(values:Partial<typeof selection>)=>setSelection(previous=>({...previous,owner:userId,...values}));
  const go=(next:Stage)=>setFlow(previous=>({...previous,owner:userId,stage:next}));
  const manageLabel=userId?'Manage wallets':'Connect wallet';
  const manage=onManageWallets?<button type="button" className={styles.secondary} onClick={onManageWallets}>{manageLabel}<ArrowUpRight size={14} aria-hidden/></button>:<Link className={styles.secondary} href="/store/account?tab=wallets">{manageLabel}<ArrowUpRight size={14} aria-hidden/></Link>;
  return <div className={styles.root}>
    <header className={styles.heading}><div><h2>Bridge</h2><p>Ethereum Mainnet <ArrowRight size={12} aria-hidden/> Z Chain</p></div><span className={styles.badge}>WILD only</span></header>
    <ol className={styles.steps} aria-label="Bridge progress">{stages.map((step,index)=><li key={step} aria-current={step===stage?'step':undefined} data-complete={index<stages.indexOf(stage)}><span>{index<stages.indexOf(stage)?<Check size={12} aria-hidden/>:'0'+(index+1)}</span>{['Wallet','Amount','Review'][index]}</li>)}</ol>
    <p className={styles.preview}>Preview <span>·</span> Transfers are unavailable here.</p>
    <section className={styles.panel} aria-labelledby={id+'-stage'}>
      <div className={styles.stageHeading}>{stage!=='connect'&&<button type="button" className={styles.back} onClick={()=>go(stage==='review'?'amount':'connect')} aria-label={stage==='review'?'Back to amount':'Back to wallets'}><ArrowLeft size={17} aria-hidden/></button>}<h3 ref={heading} tabIndex={-1} id={id+'-stage'}>{stage==='connect'?'Connect your wallet':stage==='amount'?'Enter amount':'Review transfer'}</h3></div>
      {stage==='connect'?<>
        <p className={styles.intro}>Move WILD from your Ethereum wallet into your ZERO wallet.</p>
        <div className={styles.wallets}>
          <div className={styles.walletCard}><div className={styles.walletTitle}><Wallet size={19} aria-hidden/><div><strong>Ethereum Mainnet</strong><span>Self-custody wallet</span></div></div>
            {loading?<p role="status" className={styles.muted}>Loading linked wallets…</p>:walletState.owner===userId&&walletState.status==='error'?<div role="alert" className={styles.error}><p>{walletState.error}</p><button type="button" className={styles.textAction} onClick={()=>setAttempt(value=>value+1)}>Retry wallets</button></div>:wallets.length?<><label className={styles.srOnly} htmlFor={id+'-wallet'}>Source wallet</label><select id={id+'-wallet'} value={selected?.id??''} onChange={event=>update({walletId:event.target.value})}><option value="">Select a linked wallet</option>{wallets.map(wallet=><option key={wallet.id} value={wallet.id}>{wallet.address.slice(0,8)}…{wallet.address.slice(-6)}</option>)}</select>{selected&&<p className={styles.address}>{selected.address}</p>}<small className={styles.walletStatus}>{selected?'Linked · signing connection pending':'Choose your source wallet'}</small></>:<p className={styles.muted}>Not connected</p>}
          </div>
          <ArrowRight className={styles.walletArrow} size={18} aria-hidden/>
          <div className={styles.walletCard}><div className={styles.walletTitle}><span className={styles.zeroIcon} aria-hidden>Z</span><div><strong>Z Chain</strong><span>ZERO account wallet</span></div></div>{receiving?<p className={styles.address}>{receiving}</p>:<p className={styles.muted}>Not connected</p>}<small className={styles.walletStatus}>Receiving address comes from your ZERO account.</small></div>
        </div>
        <div className={styles.actions}>{manage}<button type="button" className={styles.primary} onClick={()=>go('amount')}>{selected?'Continue':'Preview transfer'}<ArrowRight size={15} aria-hidden/></button></div>
      </>:stage==='amount'?<form onSubmit={event=>{event.preventDefault();setTouched(true);if(valid)go('review');}}>
        <div className={styles.tokenCard}><div className={styles.cardLabel}><span>From</span><span>Ethereum Mainnet</span></div><div className={styles.tokenRow}><WildIcon/><div className={styles.tokenName}><strong>WILD</strong><span>Self-custody wallet</span></div><label className={styles.srOnly} htmlFor={id+'-amount'}>Amount</label><input id={id+'-amount'} value={amount} onChange={event=>update({amount:event.target.value})} onBlur={()=>setTouched(true)} inputMode="decimal" autoComplete="off" placeholder="0" maxLength={80} aria-invalid={invalid} aria-describedby={invalid?id+'-amount-error':undefined}/></div><div className={styles.cardFooter}><span className={styles.address}>{selected?.address??'Wallet not connected'}</span><span>{balanceLabel}</span></div></div>
        {invalid&&<p id={id+'-amount-error'} role="alert" className={styles.error}>Enter a positive WILD amount with up to 18 decimal places.</p>}
        <div className={styles.direction}><ArrowDown size={18} aria-hidden/></div>
        <div className={styles.tokenCard}><div className={styles.cardLabel}><span>To</span><span>Z Chain</span></div><div className={styles.tokenRow}><WildIcon/><div className={styles.tokenName}><strong>WILD</strong><span>ZERO wallet</span></div><span className={styles.receive} aria-label="Estimated receive unavailable">—</span></div><div className={styles.cardFooter}><span className={styles.address}>{receiving??'Receiving wallet not connected'}</span><span>Quote unavailable</span></div></div>
        <button type="submit" className={styles.primary+' '+styles.full} disabled={!valid}>Review transfer<ArrowRight size={15} aria-hidden/></button>
      </form>:<>
        <p className={styles.intro}>Ethereum wallet <ArrowRight size={12} aria-hidden/> ZERO wallet</p>
        <div className={styles.reviewTokens}><div><WildIcon/><strong>WILD</strong><span className={styles.reviewAmount}>{amount}</span><span className={styles.muted}>Ethereum Mainnet</span></div><ArrowRight className={styles.reviewArrow} size={20} aria-hidden/><div><WildIcon/><strong>WILD</strong><span className={styles.reviewAmount}>—</span><span className={styles.muted}>Z Chain · quote unavailable</span></div></div>
        <dl className={styles.details}><div><dt>From wallet</dt><dd className={styles.address}>{selected?.address??'Not connected'}</dd></div><div><dt>Receiving wallet</dt><dd className={styles.address}>{receiving??'Not connected'}</dd></div><div><dt>Network fee</dt><dd>—</dd></div><div><dt>Bridge fee</dt><dd>—</dd></div><div><dt>Estimated arrival</dt><dd>—</dd></div></dl>
        <button type="button" className={styles.primary+' '+styles.full} disabled aria-describedby={id+'-availability'}>Confirm bridge<ArrowRight size={15} aria-hidden/></button>
        <p className={styles.availability} id={id+'-availability'}>Wallet connection and a verified quote are required before confirmation.</p>
      </>}
    </section>
    {stage==='connect'&&<section className={styles.activity} aria-labelledby={id+'-activity'}><div className={styles.activityHeader}><h3 id={id+'-activity'}>Activity</h3><div className={styles.filters} role="group" aria-label="Filter bridge activity">{(['all','pending','completed'] as const).map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFlow(previous=>({...previous,owner:userId,filter:value}))}>{value[0].toUpperCase()+value.slice(1)}<span aria-label="Count unavailable">—</span></button>)}</div></div><div className={styles.emptyActivity} role="status"><Clock3 size={22} strokeWidth={1.3} aria-hidden/><p>{filter==='all'?'Bridge activity':filter==='pending'?'Pending transfers':'Completed transfers'} will appear when the bridge is connected.</p></div></section>}
  </div>;
}
