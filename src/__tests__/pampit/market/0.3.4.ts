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

  beforeAll(async () => {
    const users = await setup();

    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    controllerCodeId = await admin.upload({
      contract: "pampit-controller",
      build: "0.3.4",
      force: true,
    });

    marketCodeId = await admin.upload({
      contract: "pampit-market",
      build: "0.3.1",
    });
  });

  it(`migrates from 0.3.2`, async () => {
    const toCodeId = controllerCodeId;

    const fromCodeId = await admin.upload({
      contract: "pampit-controller",
      build: "0.3.4",
    });

    const controllerAddr = await instantiateController({
      quoteTokenAddress: globals.quoteTokenAddress,
      cw20CodeId: globals.cw20CodeId,
      codeId: fromCodeId,
      marketCodeId,
      admin,
    });

    await sleep(1000);

    const { marketAddr: marketAddr1 } = await createMarket({
      admin,
      controllerAddr,
      preset: "injective",
      symbol: "TESTA",
    });

    const { marketAddr: marketAddr2 } = await createMarket({
      admin,
      controllerAddr,
      preset: "injective",
      symbol: "TESTB",
    });

    await buy({
      user: user1,
      marketAddr: marketAddr1,
      quoteTokenAddr: globals.quoteTokenAddress,
      quoteAmount: BigInt(1e18).toString(),
    });

    await admin.migrate({
      contractAddress: controllerAddr,
      codeId: toCodeId,
      msg: { v0_3_4: {} },
    });

    await refund({ admin, marketAddr: marketAddr1 });

    const marketInfo1 = await fetchProxiedMarketInfo({
      user: admin,
      controllerAddr,
      selector: { symbol: "TESTA-1" },
    });

    const marketInfo2 = await fetchProxiedMarketInfo({
      user: admin,
      controllerAddr,
      selector: { symbol: "TESTB-1" },
    });

    show(marketInfo1);
    show(marketInfo2);
  });
});
