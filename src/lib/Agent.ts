import { Coin, StdFee } from "@cosmjs/amino";
import {
  SigningCosmWasmClient,
  ExecuteInstruction,
  ExecuteResult,
  UploadResult,
  InstantiateResult,
} from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { Addr, Token } from "./types";
import { readFile } from "fs/promises";

const RPC = "http://127.0.0.1:26657";

const GAS_PRICE = GasPrice.fromString("0.004ujunox");

const PREFIX = "juno";

export const DECIMALS = 6;

export const DENOM_MICRO = "ujunox";

export default class Agent {
  private static readonly instances: Record<string, Agent> = {};
  readonly client: SigningCosmWasmClient;
  readonly address: string;

  constructor(client: SigningCosmWasmClient, address: string) {
    this.client = client;
    this.address = address;
  }

  static async connect(mnemonic: string): Promise<Agent> {
    const key = mnemonic;
    if (this.instances[key] === undefined) {
      const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: PREFIX,
      });

      const client = await SigningCosmWasmClient.connectWithSigner(
        RPC,
        signer,
        {
          gasPrice: GAS_PRICE,
        },
      );

      const { address } = (await signer.getAccounts())[0];

      this.instances[key] = new Agent(client, address);
    }

    return this.instances[key];
  }

  async instantiate({
    codeId,
    msg,
    fee,
    label,
    admin,
    funds,
    memo,
  }: {
    codeId: number;
    msg: any;
    fee: "auto" | StdFee;
    label?: string;
    admin?: Addr;
    funds?: Coin[];
    memo?: string;
  }): Promise<InstantiateResult> {
    return await this.client.instantiate(
      this.address,
      codeId,
      msg,
      label ?? new Date().toString(),
      fee ?? "auto",
      {
        admin: admin ?? this.address,
        funds,
        memo,
      },
    );
  }

  async execute({
    instructions,
    fee,
    memo,
  }: {
    instructions: ExecuteInstruction | ExecuteInstruction[];
    fee?: "auto" | StdFee;
    memo?: string;
  }) {
    return await this.client.executeMultiple(
      this.address,
      instructions instanceof Array ? instructions : [instructions],
      fee ?? "auto",
      memo,
    );
  }

  async query({ contractAddress, msg }: { contractAddress: string; msg: any }) {
    return await this.client.queryContractSmart(contractAddress, msg);
  }

  async migrate({
    contractAddress,
    msg,
    codeId,
    fee,
  }: {
    contractAddress: string;
    msg: any;
    codeId: number;
    fee?: "auto" | StdFee;
  }) {
    return await this.client.migrate(
      this.address,
      contractAddress,
      codeId,
      msg,
      fee ?? "auto",
    );
  }
  async upload({
    user,
    contract,
    build,
  }: {
    user: Agent;
    contract: string;
    build: string;
  }): Promise<UploadResult> {
    const wasmPath = `./wasms/${contract}/${build}/contract.wasm`;
    const dataBuff = await readFile(wasmPath);
    const dataByteArray = Uint8Array.from(dataBuff);
    return await user.client.upload(this.address, dataByteArray, "auto");
  }

  async queryBalance(token?: Token): Promise<string> {
    token ??= { denom: DENOM_MICRO };
    if (token.address) {
      const { balance } = await this.client.queryContractSmart(token.address, {
        balance: { address: this.address },
      });
      return balance;
    } else {
      const coin = await this.client.getBalance(this.address, token.denom);
      return coin.amount;
    }
  }

  async transfer({
    token,
    recipient,
    amount,
  }: {
    token: Token;
    recipient: Addr;
    amount: string | BigInt;
  }): Promise<ExecuteResult | unknown> {
    token.address;
    if (token.address) {
      return await this.execute({
        instructions: {
          contractAddress: token.address,
          msg: { transfer: { amount: amount.toString(), recipient } },
        },
      });
    } else {
      return await this.client.sendTokens(
        this.address,
        recipient,
        [{ denom: token.denom, amount: amount.toString() }],
        "auto",
      );
    }
  }
}
