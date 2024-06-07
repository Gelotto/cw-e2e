import setup from "../../../lib/setup";
import Agent from "../../../lib/Agent";
import { show, fromMicroDenom, sleep } from "../../../lib/helpers";
import {
  createMarket,
  fetchAccountActivity,
  instantiateController,
} from "../../../contracts/pampit/controller";
import { globals } from "../../../lib/globals";
import { buy, sell } from "../../../contracts/pampit/market";

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
      build: "0.3.1",
    });

    marketCodeId = await admin.upload({
      contract: "pampit-market",
      build: "0.3.1",
    });
  });

  // it(`migrates from 0.3.0`, async () => {
  //   const fromCodeId = await admin.upload({
  //     contract: "pampit-controller",
  //     build: "0.3.0",
  //     force: true,
  //   });

  //   const controllerCodeId = await admin.upload({
  //     contract: "pampit-controller",
  //     build: "0.3.1",
  //     force: true,
  //   });

  //   const marketCodeId = await admin.upload({
  //     contract: "pampit-market",
  //     build: "0.3.1",
  //     force: true,
  //   });

  //   const controllerAddr = await instantiateController({
  //     quoteTokenAddress: globals.quoteTokenAddress,
  //     cw20CodeId: globals.cw20CodeId,
  //     codeId: fromCodeId,
  //     marketCodeId,
  //     admin,
  //   });

  //   await sleep(1000);

  //   await admin.migrate({
  //     contractAddress: controllerAddr,
  //     codeId: controllerCodeId,
  //     msg: { empty: {} },
  //   });
  // });

  it(`returns user activity in expected order`, async () => {
    const controllerAddr = await instantiateController({
      quoteTokenAddress: globals.quoteTokenAddress,
      cw20CodeId: globals.cw20CodeId,
      codeId: controllerCodeId,
      marketCodeId,
      admin,
    });

    const { marketAddr: marketAddr1 } = await createMarket({
      admin,
      controllerAddr,
      preset: "injective",
    });

    const { marketAddr: marketAddr2 } = await createMarket({
      admin,
      controllerAddr,
      preset: "injective",
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
});
