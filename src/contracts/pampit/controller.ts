import Agent from "../../lib/Agent";
import { b64encodeObject, extractEventAttributeValue } from "../../lib/helpers";
import { faker } from "@faker-js/faker";
import { queryMarketInfo } from "./market";
import { Addr } from "../../lib/types";

export type MarketSelector = {
  symbol?: string;
  id?: string;
  slug?: string;
  address?: string;
};

export async function instantiateController({
  admin,
  codeId,
  marketCodeId,
  cw20CodeId,
  tfCodeId,
  quoteTokenAddress,
  msg,
}: {
  admin: Agent;
  codeId: number;
  marketCodeId: number;
  cw20CodeId?: number;
  tfCodeId?: number;
  quoteTokenAddress: string;
  msg?: any;
}) {
  const result = await admin.client.instantiate(
    admin.address,
    codeId,
    {
      market_code_id: marketCodeId.toFixed(),
      cw20_code_id: cw20CodeId?.toFixed(),
      tf_code_id: tfCodeId?.toFixed(),
      manager: admin.address,
      presets: [
        {
          name: "juno",
          params: {
            decimals: 6,
            supply: BigInt(21e6).toString(),
            goal: BigInt(500e6).toString(),
            quote: {
              token: { denom: "ujunox" },
              y_intercept: BigInt(45e6).toString(),
              min_buy_amount: BigInt(0.0001 * 1e6).toString(),
              decimals: 6,
              symbol: "JUNO",
            },
            fees: {
              fee_recipient: admin.address,
              buy_fee_pct: (0.01e6).toFixed(),
              sell_fee_pct: (0.01e6).toFixed(),
              creation_fee: (1e6).toFixed(),
            },
            pamp: {
              manager: admin.address,
              burn_rate: BigInt(5e5).toString(),
              min_amount: BigInt(0.01 * 1e6).toString(),
              rates: [
                BigInt(1e4).toString(),
                BigInt(1e5).toString(),
                BigInt(1e6).toString(),
                BigInt(1e7).toString(),
                BigInt(1e8).toString(),
              ],
            },
          },
        },
        {
          name: "test",
          params: {
            decimals: 18,
            supply: BigInt(1000e18).toString(),
            goal: BigInt(50e18).toString(),
            quote: {
              token: { address: quoteTokenAddress },
              y_intercept: BigInt(25e18).toString(),
              min_buy_amount: BigInt(1).toString(),
              decimals: 18,
              symbol: "QUOTE",
            },
            fees: {
              fee_recipient: admin.address,
              buy_fee_pct: (0.0e18).toFixed(),
              sell_fee_pct: (0.0e18).toFixed(),
              creation_fee: (0.0e18).toFixed(),
            },
            pamp: {
              manager: admin.address,
              burn_rate: BigInt(0.5e6).toString(),
              min_amount: BigInt(0.01 * 1e18).toString(),
              rates: [
                BigInt(1e4).toString(),
                BigInt(1e5).toString(),
                BigInt(1e6).toString(),
                BigInt(1e7).toString(),
                BigInt(1e8).toString(),
              ],
            },
          },
        },
        {
          name: "injective",
          params: {
            decimals: 18,
            supply: (BigInt(21e6) * BigInt(1e18)).toString(),
            goal: BigInt(1000e18).toString(),
            quote: {
              token: { address: quoteTokenAddress },
              y_intercept: BigInt(100e18).toString(),
              min_buy_amount: BigInt(1).toString(),
              decimals: 18,
              symbol: "QUOTE",
            },
            fees: {
              fee_recipient: admin.address,
              buy_fee_pct: (0.0e6).toFixed(),
              sell_fee_pct: (0.0e6).toFixed(),
              creation_fee: (0.0e18).toFixed(),
            },
            pamp: {
              manager: admin.address,
              burn_rate: BigInt(0.5e6).toString(),
              min_amount: BigInt(0.01 * 1e18).toString(),
              rates: [
                BigInt(1e4).toString(),
                BigInt(1e5).toString(),
                BigInt(1e6).toString(),
                BigInt(1e7).toString(),
                BigInt(1e8).toString(),
              ],
            },
          },
        },
      ],
      ...(msg ?? {}),
    },
    `Controller ${new Date().getTime().toString()}`,
    "auto",
    { admin: admin.address },
  );
  const controllerContractAddress = result.contractAddress;
  console.log({ controllerContractAddress });
  return controllerContractAddress;
}

export async function createMarket({
  admin,
  controllerAddr,
  funds,
  msg,
  preset,
  symbol: customSymbol,
  flags,
  cw20,
}: {
  admin: Agent;
  controllerAddr: string;
  funds?: any;
  flags?: number[];
  symbol?: string;
  msg?: {
    tags?: string[];
    marketing?: any;
    flags?: number[];
    token: {
      name: string;
      symbol: string;
      description?: string;
      image_url?: string;
      cw20?: boolean;
    };
  };
  preset?: "injective" | "juno" | "stargaze" | "test";
  cw20?: boolean;
}) {
  if (msg === undefined) {
    const name = faker.word.words({ count: { min: 2, max: 5 } });
    const symbol = (customSymbol ?? name).toUpperCase();
    msg = {
      tags: [],
      marketing: { name: "test" },
      token: {
        name,
        symbol,
        description: faker.word.words({ count: { min: 5, max: 20 } }),
        image_url: "/images/placeholders/cat.png",
      },
    };
  }
  msg.token.cw20 = cw20 ?? true;
  if (flags) {
    msg.flags = flags;
  }

  const createMarketMsg = {
    market: {
      create: {
        marketing: { name: "test" },
        ...msg,
        preset,
      },
    },
  };

  const result = await admin.client.execute(
    admin.address,
    controllerAddr,
    createMarketMsg,
    "auto",
    undefined,
    funds,
  );

  const marketAddr = extractEventAttributeValue(
    result.events,
    "wasm",
    "market_addr",
  );
  const {
    quote: { denom },
  } = await queryMarketInfo({ user: admin, marketAddr });

  return { marketAddr, tokenAddr: denom };
}

export async function updateMarketFlags({
  admin,
  controllerAddr,
  marketAddr,
  add,
  remove,
}: {
  admin: Agent;
  controllerAddr: Addr;
  marketAddr: Addr;
  add?: number[];
  remove?: number[];
}) {
  return await admin.execute({
    instructions: {
      contractAddress: controllerAddr,
      msg: {
        admin: {
          update_market_flags: {
            market_addr: marketAddr,
            add,
            remove,
          },
        },
      },
    },
  });
}

export async function migrateMarkets({
  admin,
  controllerAddr,
  fromCodeId,
  toCodeId,
  msg,
}: {
  admin: Agent;
  controllerAddr: Addr;
  fromCodeId: number;
  toCodeId: number;
  msg?: any;
}) {
  return await admin.execute({
    instructions: {
      contractAddress: controllerAddr,
      msg: {
        admin: {
          migrate: {
            from_code_id: fromCodeId.toString(),
            code_id: toCodeId.toString(),
            msg:
              msg ??
              b64encodeObject({
                empty: {},
              }),
          },
        },
      },
    },
  });
}

export async function fetchProxiedMarketInfo({
  user,
  controllerAddr,
  selector,
}: {
  user: Agent;
  controllerAddr: Addr;
  selector: MarketSelector;
}): Promise<{
  meta: { [key: string]: any; flags: number[] | null };
  response: any;
  market: Addr;
}> {
  return await user.client.queryContractSmart(controllerAddr, {
    market: { selector, sender: user.address, msg: { market_info: {} } },
  });
}

export async function fetchAccountActivity({
  user,
  controllerAddr,
  cursor,
  limit,
}: {
  user: Agent;
  controllerAddr: Addr;
  cursor?: any;
  limit?: number;
}): Promise<any> {
  return await user.client.queryContractSmart(controllerAddr, {
    account_activity: { address: user.address, cursor, limit },
  });
}

export async function fetchActivity({
  user,
  controllerAddr,
  cursor,
  limit,
}: {
  user: Agent;
  controllerAddr: Addr;
  cursor?: any;
  limit?: number;
}): Promise<any> {
  return await user.client.queryContractSmart(controllerAddr, {
    activity: { cursor, limit },
  });
}

export async function paginateMarkets({
  user,
  controllerAddr,
  params,
}: {
  user: Agent;
  controllerAddr: string;
  params: {
    index: any;
    desc?: boolean;
  };
}): Promise<any> {
  return await user.client.queryContractSmart(controllerAddr, {
    markets: {
      in_range: {
        index: params.index,
        desc: params.desc,
      },
    },
  });
}
