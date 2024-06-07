import { AccountData } from "@cosmjs/amino";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { GasPrice } from "@cosmjs/stargate";
import { DECIMALS } from "./Agent";

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
  return parseInt(amount.toString()) / Math.pow(10, decimals ?? DECIMALS);
}

export function toMicroDenom(amount: number, decimals?: number): string {
  return (
    BigInt(amount) * BigInt(Math.pow(10, decimals ?? DECIMALS))
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
