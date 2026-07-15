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
import { getContract, prepareContractCall, readContract } from 'thirdweb';
import { getCustodialSigner, sendCustodialCalls, type CustodialSigner } from './custody';
import type { ZeroIdentity } from './auth';

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
export async function executeList(identity: ZeroIdentity, params: ListParams): Promise<string> {
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

  return sendCustodialCalls(signer, [approve, list]);
}

/**
 * Buy an active listing: approve the exact on-chain price of WILD, then buy.
 * Returns the transaction hash. Throws if the listing is not active.
 */
export async function executeBuy(identity: ZeroIdentity, listingId: bigint): Promise<string> {
  const signer = await getCustodialSigner(identity);
  const marketplace = marketplaceContract(signer);

  const price = await readActiveListingPrice(marketplace, listingId);

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

/** Read a listing's price from the contract; throw if it is not active. */
async function readActiveListingPrice(
  marketplace: ReturnType<typeof marketplaceContract>,
  listingId: bigint,
): Promise<bigint> {
  const listing = await readContract({
    contract: marketplace,
    method: LISTINGS_METHOD,
    params: [listingId],
  });

  if (!listing[LISTING_ACTIVE_INDEX]) {
    throw new Error(`Listing ${listingId} is not active`);
  }
  return listing[LISTING_PRICE_INDEX] as bigint;
}
