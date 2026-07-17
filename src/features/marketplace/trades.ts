/**
 * Marketplace trade builders — turn a trade request into the exact ordered
 * sequence of prepared custodial calls and execute them via the custodial rail.
 *
 * Escrow-on-list means `list` and `buy` each need an approval before the action:
 *   list = nft.setApprovalForAll(marketplace, true) → marketplace.list(...)
 *   buy  = WILD.approve(marketplace, price)         → marketplace.buy(listingId)
 * Both are returned as an ordered pair and sent as ONE atomic batched UserOp by
 * the custody layer, so the approval is effective for the action and a partial
 * trade is impossible. `cancel` needs no approval.
 *
 * All amounts are `bigint` (raw base units / tokenId); callers parse user input
 * into `bigint` before calling. Fail-loud: an inactive listing throws rather
 * than sending a doomed transaction.
 */
import {
  getContract,
  prepareContractCall,
  prepareEvent,
  parseEventLogs,
  readContract,
  waitForReceipt,
} from 'thirdweb';
import { getCustodialSigner, sendCustodialCalls, type CustodialSigner } from './custody';
import type { ZeroIdentity } from './auth';
import { MarketplaceError } from './http';

// The marketplace `Listed` event — `listingId` is the first indexed field, so
// parsing it from the list tx receipt gives the new listing's id (the contract
// assigns it via nextListingId++), which the client needs for an instant grid.
const LISTED_EVENT = prepareEvent({
  signature:
    'event Listed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 amount, uint256 price, uint8 tokenType)',
});

// Human-readable ABI fragments. Marketplace fragments verified against
// trading-contracts/contracts/NFTMarketplace.sol; approvals are the standard
// ERC-20 / ERC-721 / ERC-1155 interfaces (setApprovalForAll covers both NFT
// standards). `listings` uses unnamed returns for a deterministic tuple decode.
const LIST_METHOD =
  'function list(address nftContract, uint256 tokenId, uint256 amount, uint256 price) returns (uint256)';
const BUY_METHOD = 'function buy(uint256 listingId)';
const CANCEL_METHOD = 'function cancel(uint256 listingId)';
const LISTINGS_METHOD =
  'function listings(uint256) view returns (address, address, uint256, uint256, uint256, uint8, bool)';
const SET_APPROVAL_FOR_ALL_METHOD = 'function setApprovalForAll(address operator, bool approved)';
const ERC20_APPROVE_METHOD = 'function approve(address spender, uint256 amount) returns (bool)';

// Tuple indices of the `listings` getter return (see the Listing struct).
const LISTING_SELLER_INDEX = 0;
const LISTING_PRICE_INDEX = 4;
const LISTING_ACTIVE_INDEX = 6;

export interface ListParams {
  nftContract: string;
  tokenId: bigint;
  amount: bigint;
  price: bigint;
}

function marketplaceContract(signer: CustodialSigner) {
  return getContract({
    client: signer.client,
    chain: signer.chain,
    address: signer.config.marketplaceAddress,
  });
}

/**
 * List an NFT for a fixed price: approve the marketplace as operator, then
 * escrow-and-list. Returns the transaction hash.
 */
export async function executeList(
  identity: ZeroIdentity,
  params: ListParams,
): Promise<{ transactionHash: string; listingId: string | null }> {
  const signer = await getCustodialSigner(identity);
  const marketplace = marketplaceContract(signer);
  const nft = getContract({
    client: signer.client,
    chain: signer.chain,
    address: params.nftContract,
  });

  const approve = prepareContractCall({
    contract: nft,
    method: SET_APPROVAL_FOR_ALL_METHOD,
    params: [signer.config.marketplaceAddress, true],
  });
  const list = prepareContractCall({
    contract: marketplace,
    method: LIST_METHOD,
    params: [params.nftContract, params.tokenId, params.amount, params.price],
  });

  const transactionHash = await sendCustodialCalls(signer, [approve, list]);

  // Best-effort: read the new listingId from the Listed event so the client can
  // show the listing instantly. A parse miss just falls back to null (the client
  // then relies on the indexer refresh) — never fail the (already-settled) list.
  let listingId: string | null = null;
  try {
    const receipt = await waitForReceipt({
      client: signer.client,
      chain: signer.chain,
      transactionHash: transactionHash as `0x${string}`,
    });
    const events = parseEventLogs({ logs: receipt.logs, events: [LISTED_EVENT] });
    const listed = events.find(
      (e) => e.address.toLowerCase() === signer.config.marketplaceAddress.toLowerCase(),
    );
    if (listed) listingId = listed.args.listingId.toString();
  } catch {
    /* leave listingId null — the client falls back to the indexer refresh */
  }

  return { transactionHash, listingId };
}

/**
 * Buy an active listing: approve the exact on-chain price of WILD, then buy.
 * Returns the transaction hash. Throws if the listing is not active.
 */
export async function executeBuy(identity: ZeroIdentity, listingId: bigint): Promise<string> {
  const signer = await getCustodialSigner(identity);
  const marketplace = marketplaceContract(signer);

  const { price, seller } = await readActiveListing(marketplace, listingId);
  // Defence in depth (the UI hides Buy on your own listing): buying your own
  // listing only burns the marketplace fee, so reject it server-side too.
  if (seller.toLowerCase() === identity.zeroWalletAddress.toLowerCase()) {
    throw new MarketplaceError(400, 'You cannot buy your own listing — cancel it instead.');
  }

  const wild = getContract({
    client: signer.client,
    chain: signer.chain,
    address: signer.config.wildAddress,
  });
  const approve = prepareContractCall({
    contract: wild,
    method: ERC20_APPROVE_METHOD,
    params: [signer.config.marketplaceAddress, price],
  });
  const buy = prepareContractCall({
    contract: marketplace,
    method: BUY_METHOD,
    params: [listingId],
  });

  return sendCustodialCalls(signer, [approve, buy]);
}

/**
 * Cancel your own active listing (returns the escrowed NFT). Returns the
 * transaction hash. Seller-only is enforced on-chain (`NotSeller`).
 */
export async function executeCancel(identity: ZeroIdentity, listingId: bigint): Promise<string> {
  const signer = await getCustodialSigner(identity);
  const marketplace = marketplaceContract(signer);

  const cancel = prepareContractCall({
    contract: marketplace,
    method: CANCEL_METHOD,
    params: [listingId],
  });

  return sendCustodialCalls(signer, [cancel]);
}

/** Read a listing's price + seller from the contract; throw if it is not active. */
async function readActiveListing(
  marketplace: ReturnType<typeof marketplaceContract>,
  listingId: bigint,
): Promise<{ price: bigint; seller: string }> {
  const listing = await readContract({
    contract: marketplace,
    method: LISTINGS_METHOD,
    params: [listingId],
  });

  if (!listing[LISTING_ACTIVE_INDEX]) {
    // Expected race: the grid can show a listing that just sold or was cancelled.
    throw new MarketplaceError(
      409,
      'This listing is no longer available — it may have just sold or been cancelled.',
    );
  }
  return {
    price: listing[LISTING_PRICE_INDEX] as bigint,
    seller: listing[LISTING_SELLER_INDEX] as string,
  };
}
