import setup from "../../../lib/setup";
import Agent from "../../../lib/Agent";
import { show, fromMicroDenom, sleep } from "../../../lib/helpers";
import {
  createMarket,
  fetchAccountActivity,
  fetchActivity,
  instantiateController,
  migrateMarkets,
} from "../../../contracts/pampit/controller";
import { globals } from "../../../lib/globals";
import { buy, queryMarketInfo, sell } from "../../../contracts/pampit/market";

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
      build: "0.3.2",
      force: true,
    });

    marketCodeId = await admin.upload({
      contract: "pampit-market",
      build: "0.3.1",
    });
  });

  // it(`migrates from 0.3.1`, async () => {
  //   const toCodeId = controllerCodeId;

  //   const controllerAddr = await instantiateController({
  //     quoteTokenAddress: globals.quoteTokenAddress,
  //     cw20CodeId: globals.cw20CodeId,
  //     codeId: controllerCodeId,
  //     marketCodeId,
  //     admin,
  //   });

  //   await admin.migrate({
  //     contractAddress: controllerAddr,
  //     codeId: toCodeId,
  //     msg: { empty: {} },
  //   });

  //   await sleep(1000);

  //   const { marketAddr } = await createMarket({
  //     admin,
  //     controllerAddr,
  //     preset: "injective",
  //   });

  //   const buyAmount1 = BigInt(1e18).toString();
  //   const buyAmount2 = BigInt(5e18).toString();

  //   const x1 = await buy({
  //     user: user1,
  //     marketAddr: marketAddr,
  //     quoteTokenAddr: globals.quoteTokenAddress,
  //     quoteAmount: buyAmount1,
  //   });

  //   const sellAmount = (BigInt(x1) / BigInt(2)).toString();

  //   await buy({
  //     user: user2,
  //     marketAddr: marketAddr,
  //     quoteTokenAddr: globals.quoteTokenAddress,
  //     quoteAmount: buyAmount1,
  //   });

  //   await sell({
  //     user: user1,
  //     marketAddr: marketAddr,
  //     tokenAmount: sellAmount,
  //   });

  //   await sell({
  //     user: user2,
  //     marketAddr: marketAddr,
  //     tokenAmount: sellAmount,
  //   });

  //   await buy({
  //     user: user1,
  //     marketAddr: marketAddr,
  //     quoteTokenAddr: globals.quoteTokenAddress,
  //     quoteAmount: buyAmount2,
  //   });

  //   await buy({
  //     user: user1,
  //     marketAddr: marketAddr,
  //     quoteTokenAddr: globals.quoteTokenAddress,
  //     quoteAmount: buyAmount1,
  //   });
  // });

  it(`allows admin to set market status to canceled in controller`, async () => {
    const controllerAddr = await instantiateController({
      quoteTokenAddress: globals.quoteTokenAddress,
      cw20CodeId: globals.cw20CodeId,
      codeId: controllerCodeId,
      marketCodeId,
      admin,
    });

    const { marketAddr } = await createMarket({
      admin,
      controllerAddr,
      preset: "injective",
    });

    {
      const info = await queryMarketInfo({ user: admin, marketAddr });
      show(info);
    }

    const result = await admin.execute({
      instructions: {
        contractAddress: controllerAddr,
        msg: {
          admin: {
            update_market_status: {
              market_addr: marketAddr,
              new_status: "canceled",
            },
          },
        },
      },
    });

    {
      const info = await queryMarketInfo({ user: admin, marketAddr });
      show(info);
    }
  });
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

    const { actions: activity } = await fetchActivity({
      user: admin,
      controllerAddr,
    });

    show(activity);
  });
});
