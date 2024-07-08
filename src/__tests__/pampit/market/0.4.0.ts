import setup from "../../../lib/setup";
import Agent from "../../../lib/Agent";
import { show, fromMicroDenom, sleep } from "../../../lib/helpers";
import {
  createMarket,
  fetchAccountActivity,
  fetchActivity,
  fetchProxiedMarketInfo,
  instantiateController,
  migrateMarkets,
} from "../../../contracts/pampit/controller";
import { globals } from "../../../lib/globals";
import {
  buy,
  queryMarketInfo,
  refund,
  sell,
} from "../../../contracts/pampit/market";

describe(`The smart contract`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let controllerCodeId: number;
  let marketCodeId: number;
  let tfCodeId: number;
  let cw20CodeId: number;

  beforeAll(async () => {
    const users = await setup();

    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    controllerCodeId = await admin.upload({
      contract: "pampit-controller",
      build: "0.4.0",
    });

    marketCodeId = await admin.upload({
      contract: "pampit-market",
      build: "0.4.0",
    });

    tfCodeId = await admin.upload({
      contract: "cw-tokenfactory",
      build: "0.0.1",
    });

    cw20CodeId = await admin.upload({
      contract: "cw20-base",
      build: "1.0.0",
    });
  });

  it(`instantiates`, async () => {
    const toCodeId = controllerCodeId;

    const result = await admin.client.instantiate(
      admin.address,
      marketCodeId,
      {
        goal: BigInt(50e18).toString(),
        owner: admin.address,
        manager: admin.address,
        quote: {
          token: {
            address: globals.quoteTokenAddress,
          },
          y_intercept: BigInt(25 * 1e18).toString(),
          min_buy_amount: (0).toFixed(),
          symbol: "QUOTE",
          decimals: 18,
        },
        base: {
          description: "Test description",
          name: "Base Token",
          symbol: "BASE",
          decimals: 18,
          supply: BigInt(100e6 * 1e18).toString(),
          cw20_code_id: cw20CodeId.toFixed(),
        },
        marketing: { name: "Base" },
        pamp: {
          min_amount: "10000",
          manager: admin.address,
          burn_rate: "500000",
          rates: [
            // tokens per hour
            (10_000).toFixed(),
            (100_000).toFixed(),
            (1_000_000).toFixed(),
            (10_000_000).toFixed(),
            (100_000_000).toFixed(),
          ],
        },
      },
      `Market ${new Date().getTime().toString()}`,
      "auto",
      {
        admin: admin.address,
      },
    );
  });
});
