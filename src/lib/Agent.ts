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
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

export type ChainConfig = {
  rpc: string;
  gasPrice: GasPrice;
  prefix: string;
  denomMicro: string;
  symbol: string;
  decimals: number;
  feeWallet: string;
};

export const chainConfigs: Record<string, ChainConfig> = {
  junolocalnet: {
    rpc: "http://127.0.0.1:26657",
    gasPrice: GasPrice.fromString("0.004ujunox"),
    prefix: "juno",
    denomMicro: "ujunox",
    symbol: "JUNOX",
    decimals: 6,
    feeWallet: "",
  },
  stargaze: {
    rpc: "https://stargaze-rpc.publicnode.com:443",
    gasPrice: GasPrice.fromString("1.5ustars"),
    prefix: "stars",
    denomMicro: "ustars",
    symbol: "STARS",
    decimals: 6,
    feeWallet: "",
  },
  osmosis: {
    rpc: "https://osmosis-rpc.publicnode.com:443",
    gasPrice: GasPrice.fromString("0.025uosmo"),
    prefix: "osmo",
    denomMicro: "uosmo",
    symbol: "OSMO",
    decimals: 6,
    feeWallet: "osmo1jume25ttjlcaqqjzjjqx9humvze3vcc8uwwmnu",
  },
};

export const defaultChainConfig = chainConfigs["junolocalnet"];

export default class Agent {
  private static readonly instances: Record<string, Agent> = {};
  readonly config: ChainConfig;
  readonly client: SigningCosmWasmClient;
  readonly address: string;

  constructor(
    client: SigningCosmWasmClient,
    address: string,
    config: ChainConfig,
  ) {
    this.client = client;
    this.address = address;
    this.config = config;
  }

  static async connect(mnemonic: string, config?: ChainConfig): Promise<Agent> {
    config ??= chainConfigs["junolocalnet"];
    const key = mnemonic;
    if (this.instances[key] === undefined) {
      const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: config.prefix,
      });

      const client = await SigningCosmWasmClient.connectWithSigner(
        config.rpc,
        signer,
        {
          gasPrice: config.gasPrice,
        },
      );

      const { address } = (await signer.getAccounts())[0];

      this.instances[key] = new Agent(client, address, config);
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
    fee?: "auto" | StdFee;
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

  async query<T>({ contractAddress, msg }: { contractAddress: string; msg: any }): Promise<T> {
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
    contract,
    build,
    force,
  }: {
    contract: string;
    build: string;
    force?: boolean;
  }): Promise<number> {
    const codeIdPath = `./wasms/${contract}/${build}/code-id.txt`;
    if (!existsSync(codeIdPath) || force) {
      const wasmPath = `./wasms/${contract}/${build}/contract.wasm`;
      const dataBuff = await readFile(wasmPath);
      const dataByteArray = Uint8Array.from(dataBuff);
      const result = await this.client.upload(
        this.address,
        dataByteArray,
        "auto",
      );
      await writeFile(codeIdPath, result.codeId.toString());
      return result.codeId;
    } else {
      return parseInt((await readFile(codeIdPath)) as any);
    }
  }

  async queryBalance(token?: Token, address?: Addr): Promise<string> {
    token ??= { denom: this.config.denomMicro };
    if (token.address) {
      const { balance } = await this.client.queryContractSmart(token.address, {
        balance: { address: address ?? this.address },
      });
      return balance;
    } else {
      const coin = await this.client.getBalance(
        address ?? this.address,
        token.denom,
      );
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
