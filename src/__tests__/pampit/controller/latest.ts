import setup from "../../../lib/setup";
import Agent from "../../../lib/Agent";
import { show, fromMicroDenom, sleep } from "../../../lib/helpers";
import {
  createMarket,
  fetchAccountActivity,
  fetchProxiedMarketInfo,
  instantiateController,
  updateMarketFlags,
} from "../../../contracts/pampit/controller";
import { globals } from "../../../lib/globals";
import { buy, sell } from "../../../contracts/pampit/market";

describe(`The smart contract`, () => {
  // Test accounts
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;

  // Code IDs
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
      build: "0.5.0",
      // force: true,
    });

    marketCodeId = await admin.upload({
      contract: "pampit-market",
      build: "0.4.1",
      // force: true,
    });

    cw20CodeId = await admin.upload({
      contract: "cw20-base",
      build: "1.0.0",
      // force: true,
    });

    tfCodeId = await admin.upload({
      contract: "cw-tokenfactory",
      build: "0.0.1",
      // force: true,
    });
  });

  it(`returns user activity in expected order`, async () => {
    const controllerAddr = await instantiateController({
      quoteTokenAddress: globals.quoteTokenAddress,
      codeId: controllerCodeId,
      marketCodeId,
      cw20CodeId,
      tfCodeId,
      admin,
    });

    const { marketAddr: marketAddr1 } = await createMarket({
      admin,
      controllerAddr,
      preset: "test",
      symbol: "TESTA",
      cw20: true,
      // flags: [4],
    });

    const { marketAddr: marketAddr2 } = await createMarket({
      admin,
      controllerAddr,
      preset: "test",
      symbol: "TESTB",
      cw20: true,
      // flags: [1, 2],
    });

    const buyAmount1 = BigInt(1e18).toString();
    const buyAmount2 = BigInt(5e18).toString();

    const x1 = await buy({
      user: user1,
      marketAddr: marketAddr1,
      quoteTokenAddr: globals.quoteTokenAddress,
      quoteAmount: buyAmount1,
    });

    const sellAmount = (BigInt(x1) / BigInt(2)).toString();

    await buy({
      user: user2,
      marketAddr: marketAddr1,
      quoteTokenAddr: globals.quoteTokenAddress,
      quoteAmount: buyAmount1,
    });

    const x2 = await sell({
      user: user1,
      marketAddr: marketAddr1,
      tokenAmount: sellAmount,
    });

    await sell({
      user: user2,
      marketAddr: marketAddr1,
      tokenAmount: sellAmount,
    });

    const x3 = await buy({
      user: user1,
      marketAddr: marketAddr2,
      quoteTokenAddr: globals.quoteTokenAddress,
      quoteAmount: buyAmount2,
    });

    const x4 = await buy({
      user: user1,
      marketAddr: marketAddr1,
      quoteTokenAddr: globals.quoteTokenAddress,
      quoteAmount: buyAmount1,
    });

    const { actions: activity } = await fetchAccountActivity({
      user: user1,
      controllerAddr,
    });

    show(activity);

    expect(activity.length).toStrictEqual(4);

    expect(activity[0].seq_no).toStrictEqual("1");
    expect(activity[0].market).toStrictEqual(marketAddr1);
    expect(activity[0].action.buy.in_amount).toStrictEqual(buyAmount1);
    expect(activity[0].action.buy.out_amount).toStrictEqual(x1);

    expect(activity[1].seq_no).toStrictEqual("3");
    expect(activity[1].market).toStrictEqual(marketAddr1);
    expect(activity[1].action.sell.in_amount).toStrictEqual(sellAmount);
    expect(activity[1].action.sell.out_amount).toStrictEqual(x2);

    expect(activity[2].seq_no).toStrictEqual("5");
    expect(activity[2].market).toStrictEqual(marketAddr2);
    expect(activity[2].action.buy.in_amount).toStrictEqual(buyAmount2);
    expect(activity[2].action.buy.out_amount).toStrictEqual(x3);

    expect(activity[3].seq_no).toStrictEqual("6");
    expect(activity[3].market).toStrictEqual(marketAddr1);
    expect(activity[3].action.buy.in_amount).toStrictEqual(buyAmount1);
    expect(activity[3].action.buy.out_amount).toStrictEqual(x4);
  });

  it(`updates markets with expected flags`, async () => {
    const controllerAddr = await instantiateController({
      quoteTokenAddress: globals.quoteTokenAddress,
      codeId: controllerCodeId,
      marketCodeId,
      cw20CodeId,
      tfCodeId,
      admin,
    });

    const { marketAddr: marketAddr } = await createMarket({
      admin,
      controllerAddr,
      preset: "test",
      symbol: "TESTA",
      cw20: true,
      flags: [0, 4, 5],
    });

    {
      const info1 = await fetchProxiedMarketInfo({
        user: admin,
        controllerAddr,
        selector: { address: marketAddr },
      });

      expect(info1.meta.flags.length).toStrictEqual(3);
      expect(info1.meta.flags).toContain(0);
      expect(info1.meta.flags).toContain(4);
      expect(info1.meta.flags).toContain(5);
    }

    const flagsToAdd = [1];
    const flagsToRemove = [4, 5];

    await updateMarketFlags({
      admin,
      controllerAddr,
      marketAddr: marketAddr,
      add: flagsToAdd,
      remove: flagsToRemove,
    });

    {
      const info1 = await fetchProxiedMarketInfo({
        user: admin,
        controllerAddr,
        selector: { address: marketAddr },
      });

      expect(info1.meta.flags.length).toStrictEqual(2);
      expect(info1.meta.flags).toContain(0);
      expect(info1.meta.flags).toContain(1);
    }

    await updateMarketFlags({
      admin,
      controllerAddr,
      marketAddr: marketAddr,
      remove: [0, 1],
    });

    {
      const info1 = await fetchProxiedMarketInfo({
        user: admin,
        controllerAddr,
        selector: { address: marketAddr },
      });

      expect(info1.meta.flags.length).toStrictEqual(0);
    }
  });
});
