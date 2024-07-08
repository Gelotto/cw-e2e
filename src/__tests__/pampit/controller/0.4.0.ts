import setup from "../../../lib/setup";
import Agent, { defaultChainConfig } from "../../../lib/Agent";
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
      // force: true,
    });

    marketCodeId = await admin.upload({
      contract: "pampit-market",
      build: "0.4.0",
      // force: true,
    });

    cw20CodeId = await admin.upload({
      contract: "cw20-base",
      build: "1.0.0",
      force: true,
    });

    tfCodeId = await admin.upload({
      contract: "cw-tokenfactory",
      build: "0.0.1",
      // force: true,
    });

    console.log({ controllerCodeId, marketCodeId, tfCodeId });
  });

  it(`executes a buy when using a cw20 as the base token`, async () => {
    const controllerAddr = await instantiateController({
      quoteTokenAddress: globals.quoteTokenAddress,
      codeId: controllerCodeId,
      marketCodeId,
      cw20CodeId,
      tfCodeId,
      admin,
    });

    // const controllerAddr = await instantiateController({
    //   quoteTokenAddress: "",
    //   codeId: 277,
    //   marketCodeId: 276,
    //   tfCodeId: 272,
    //   cw20CodeId: 275,
    //   admin,
    // });
    // const controllerAddr =
    //   "stars1a5wdcnfezmgqpsmhh426e6rltalzvkew6ef6z963vm9vdypt63qqkjru02";

    await sleep(1000);

    const { marketAddr: marketAddr1 } = await createMarket({
      admin,
      controllerAddr,
      preset: "juno",
      symbol: "TESTA",
      cw20: true,
      funds: [{ denom: "ujunox", amount: (1e6).toFixed() }],
    });

    // await buy({
    //   user: admin,
    //   marketAddr: marketAddr1,
    //   // quoteTokenAddr: globals.quoteTokenAddress,
    //   denom: "ujunox",
    //   quoteAmount: BigInt(1e6).toString(),
    // });

    const marketInfo1 = await fetchProxiedMarketInfo({
      user: admin,
      controllerAddr,
      selector: { symbol: "TESTA-1" },
    });

    show(marketInfo1);
  });

  // it(`executes a buy when using a native denom as the base token`, async () => {
  //   const toCodeId = controllerCodeId;

  //   const controllerAddr = await instantiateController({
  //     quoteTokenAddress: globals.quoteTokenAddress,
  //     codeId: controllerCodeId,
  //     marketCodeId,
  //     cw20CodeId: globals.cw20CodeId,
  //     tfCodeId,
  //     admin,
  //   });

  //   await sleep(1000);

  //   const { marketAddr: marketAddr1 } = await createMarket({
  //     admin,
  //     controllerAddr,
  //     preset: "injective",
  //     symbol: "TESTA",
  //     cw20: false,
  //     funds: [{ denom: DENOM_MICRO, amount: (10e6).toFixed() }],
  //   });

  //   show(
  //     await fetchProxiedMarketInfo({
  //       user: admin,
  //       controllerAddr,
  //       selector: { symbol: "TESTA-1" },
  //     }),
  //   );

  //   await buy({
  //     user: user1,
  //     marketAddr: marketAddr1,
  //     quoteTokenAddr: globals.quoteTokenAddress,
  //     quoteAmount: BigInt(1e18).toString(),
  //   });

  //   const {
  //     response: { market_info },
  //   } = await fetchProxiedMarketInfo({
  //     user: admin,
  //     controllerAddr,
  //     selector: { symbol: "TESTA-1" },
  //   });

  //   show({
  //     buyerBalance: await user1.queryBalance({
  //       address: market_info.token.denom,
  //     }),
  //   });
  // });
});
