import { parseAbi } from "viem";
import { BANMAO_KING_DEPLOYMENT as deployment } from "./deployment";

export const kingAddress = deployment.contractAddress as `0x${string}`;
export const paymentAddress = deployment.paymentToken as `0x${string}`;
export const kingAbi = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function mintPrice(address) view returns (uint256)",
  "function isPaymentToken(address) view returns (bool)",
  "function mint(address to, address paymentToken) payable returns (uint256)",
  "function tokenURI(uint256) view returns (string)",
  "function refreshMetadata(uint256 tokenId)",
  "event KingMinted(address indexed payer, address indexed to, uint256 indexed tokenId, address paymentToken, uint256 price, uint32 packedTraits)",
]);
export function validateMintState(price: bigint, accepted: boolean, supply: bigint, max: bigint) {
  if (!accepted || price !== BigInt(deployment.mintPrice) || max !== BigInt(deployment.maxSupply)) throw new Error("Contract configuration mismatch");
  if (supply >= max) throw new Error("Sold out");
}
export function decodeKingMetadata(uri: string): { name: string; image: string; attributes: { trait_type: string; value: string }[] } {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) throw new Error("Invalid metadata URI");
  const data = JSON.parse(atob(uri.slice(prefix.length)));
  if (typeof data.name !== "string" || typeof data.image !== "string" || !data.image.startsWith("data:image/svg+xml;base64,")) throw new Error("Invalid on-chain image");
  return { name: data.name, image: data.image, attributes: Array.isArray(data.attributes) ? data.attributes.filter((a: { trait_type?: unknown; value?: unknown }) => typeof a?.trait_type === "string" && typeof a?.value === "string") : [] };
}
