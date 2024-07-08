import { AccountData } from "@cosmjs/amino";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import * as ecc from "tiny-secp256k1";
import { ECPairFactory, ECPairInterface } from "ecpair";
import * as bech32 from "bech32";
import { defaultChainConfig } from "./Agent";
import { Addr } from "./types";

const ECPair = ECPairFactory(ecc);

export function b64encode(str: string): string {
  return Buffer.from(str, "binary").toString("base64");
}

export function b64decode(str: string): string {
  return Buffer.from(str, "base64").toString("binary");
}

export function b64encodeObject(obj: any): string {
  return Buffer.from(JSON.stringify(obj), "binary").toString("base64");
}

export function fromMicroDenom(
  amount: string | BigInt,
  decimals?: number,
): number {
  return (
    parseInt(amount.toString()) /
    Math.pow(10, decimals ?? defaultChainConfig.decimals)
  );
}

export function toMicroDenom(amount: number, decimals?: number): string {
  return BigInt(
    Math.floor(amount * Math.pow(10, decimals ?? defaultChainConfig.decimals)),
  ).toString();
}

export function toNanoseconds(date: Date | undefined | null): string {
  return (date.getTime() * 1000000).toFixed();
}

export function fromNanoseconds(nanos: string | number): Date {
  return new Date(
    (typeof nanos === "string" ? parseFloat(nanos) : nanos) / 1e6,
  );
}

export function show(state: any) {
  console.log(JSON.stringify(state, undefined, 2));
}

export function sleep(ms: number) {
  new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractEventAttributeValue(
  events: any,
  typeName: string,
  key: string,
): string {
  let tokenAddress: string = "";
  for (const e of events) {
    if (e.type === typeName) {
      tokenAddress = e.attributes.find((a) => a.key === key)?.value ?? "";
      if (tokenAddress.length > 0) {
        break;
      }
    }
  }
  return tokenAddress;
}

export async function repeat(n: number, func: (i: number) => Promise<void>) {
  for (let i = 0; i < n; ++i) {
    await func(i);
  }
}

export function randomAddresses({ n, prefix }: { n: number; prefix: string }) {
  const addresses: string[] = [];
  for (let i = 0; i < n; i++) {
    addresses.push(generateRandomAddress(prefix));
  }
  return addresses;
}

function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function generateRandomAddress(prefix: string): string {
  const publicKeyHash = generateRandomBytes(20); // 20 bytes for the public key hash
  const words = bech32.toWords(publicKeyHash);
  return bech32.encode(prefix, words);
}
