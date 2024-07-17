import setup from "../../../lib/setup";
import Agent from "../../../lib/Agent";
import {
  show,
  fromMicroDenom,
  sleep,
  randomAddresses,
} from "../../../lib/helpers";
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
import { coin } from "@cosmjs/amino";
import { base } from "@faker-js/faker";
import { fetchAllCw20Balances } from "../../../lib/balances";

describe(`The smart contract`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let controllerCodeId: number;
  let marketCodeId: number;
  let tfCodeId: number;
  let cw20CodeId: number;
  let cw20ProCodeId: number;
  let vaultCodeId: number;

  beforeAll(async () => {
    const users = await setup();

    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    const astroportPairCodeId = await admin.upload({
      contract: "astroport",
      build: "pair",
    });

    console.log({ astroportPairCodeId });

    controllerCodeId = await admin.upload({
      contract: "pampit-controller",
      build: "0.4.0",
    });

    controllerCodeId = await admin.upload({
      contract: "pampit-controller",
      build: "0.4.0",
    });

    marketCodeId = await admin.upload({
      contract: "pampit-market",
      build: "0.5.0",
    });

    cw20CodeId = await admin.upload({
      contract: "cw20-base",
      build: "1.0.0",
    });

    cw20ProCodeId = await admin.upload({
      contract: "cw20-pro",
      build: "0.0.1",
    });

    vaultCodeId = await admin.upload({
      contract: "cw-pampit-vault",
      build: "1.0.0",
    });
  });

  it(`graduates`, async () => {
    const { contractAddress } = await admin.client.instantiate(
      admin.address,
      marketCodeId,
      {
        goal: BigInt(0e6).toString(),
        owner: admin.address,
        manager: admin.address,
        quote: {
          token: {
            denom: "ujunox",
          },
          y_intercept: BigInt(0.5e6).toString(),
          min_buy_amount: (0).toFixed(),
          symbol: "JUNOX",
          decimals: 6,
        },
        base: {
          description: "Test description",
          name: "Base Token",
          symbol: "BASE",
          decimals: 6,
          supply: BigInt(10e6 * 1e6).toString(),
          cw20_code_id: cw20ProCodeId.toFixed(),
        },
        vault: {
          play: "init-astroport-pair",
          code_id: vaultCodeId.toFixed(),
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

    const {
      token: { denom: baseTokenAddress },
    } = await admin.query<{ token: { denom: string } }>({
      contractAddress,
      msg: { market_info: {} },
    });

    const numAccounts = 98;
    const accountAddresses = randomAddresses({
      prefix: "juno",
      n: numAccounts,
    });

    await buy({
      user: admin,
      marketAddr: contractAddress,
      quoteAmount: BigInt(1e6).toString(),
      denom: "ujunox",
    });

    for (let i = 0; i < Math.ceil(accountAddresses.length / 50); ++i) {
      // Fund them in batches to ensure we don't run out of gas
      await admin.client.signAndBroadcast(
        admin.address,
        accountAddresses.slice(i * 50, (i + 1) * 50).map((toAddress) => {
          return {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
              fromAddress: admin.address,
              amount: [coin("1", "ujunox")],
              toAddress,
            },
          };
        }),
        "auto",
      );

      await admin.execute({
        instructions: accountAddresses
          .slice(i * 50, (i + 1) * 50)
          .map((recipient) => ({
            contractAddress: baseTokenAddress,
            msg: { transfer: { amount: "1", recipient } },
          })),
      });
    }

    show(await admin.query({ contractAddress, msg: { graduation: {} } }));

    const { contractAddress: cw20ReplacementAddr } = await admin.instantiate({
      codeId: cw20ProCodeId,
      msg: {
        symbol: "REPLACEMENT",
        name: "Test",
        decimals: 6,
        mint: { minter: admin.address },
        marketing: {
          project: "Project Name",
          description: "Description Text",
          logo: { url: "http://logo.test" },
          marketing: admin.address,
        },
        initial_balances: await fetchAllCw20Balances(admin, baseTokenAddress),
      },
      admin: admin.address,
    });

    // // Set operator to market contract
    await admin.execute({
      instructions: {
        contractAddress: cw20ReplacementAddr,
        msg: { pro: { set_operator: { address: contractAddress } } },
      },
    });

    // Start graduation
    {
      const result = await admin.execute({
        instructions: {
          contractAddress,
          msg: { graduate: { cw20_replacement: cw20ReplacementAddr } },
          funds: [{ denom: "ujunox", amount: (10_000_000).toFixed() }],
        },
      });

      show(result.events.slice(0, 60));

      show(await admin.query({ contractAddress, msg: { graduation: {} } }));
    }

    // Continue graduation
    while (true) {
      const result = await admin.execute({
        instructions: {
          contractAddress,
          msg: { graduate: {} },
        },
      });

      const resp = await admin.query<any>({
        contractAddress,
        msg: { graduation: {} },
      });

      show(resp);

      if (resp.stage === "completed") {
        break;
      }
    }
  });
});
