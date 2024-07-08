import setup from "../../../lib/setup";
import Agent from "../../../lib/Agent";
import { show, sleep } from "../../../lib/helpers";
import {
  createMarket,
  fetchProxiedMarketInfo,
  instantiateController,
  paginateMarkets,
} from "../../../contracts/pampit/controller";
import { globals } from "../../../lib/globals";
import { buy } from "../../../contracts/pampit/market";

describe(`The smart contract`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let fromControllerCodeId: number;
  let controllerCodeId: number;
  let marketCodeId: number;
  let tfCodeId: number;
  let cw20CodeId: number;

  beforeAll(async () => {
    const users = await setup();

    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    fromControllerCodeId = await admin.upload({
      contract: "pampit-controller",
      build: "0.4.0",
    });

    controllerCodeId = await admin.upload({
      contract: "pampit-controller",
      build: "0.4.1",
    });

    marketCodeId = await admin.upload({
      contract: "pampit-market",
      build: "0.4.1",
    });

    cw20CodeId = await admin.upload({
      contract: "cw20-base",
      build: "1.0.0",
    });

    tfCodeId = await admin.upload({
      contract: "cw-tokenfactory",
      build: "0.0.1",
    });
  });

  // it(`migrates from 0.4.0`, async () => {
  //   const controllerAddr = await instantiateController({
  //     quoteTokenAddress: globals.quoteTokenAddress,
  //     codeId: fromControllerCodeId,
  //     marketCodeId,
  //     cw20CodeId,
  //     tfCodeId,
  //     admin,
  //   });

  //   await admin.migrate({
  //     contractAddress: controllerAddr,
  //     codeId: fromControllerCodeId,
  //     msg: { empty: {} },
  //   });

  //   await sleep(1000);

  //   const { marketAddr: marketAddr1 } = await createMarket({
  //     admin,
  //     controllerAddr,
  //     preset: "test",
  //     symbol: "TESTA",
  //     cw20: true,
  //   });

  //   show(
  //     await fetchProxiedMarketInfo({
  //       user: admin,
  //       controllerAddr,
  //       selector: { symbol: "TESTA-1" },
  //     }),
  //   );

  //   await buy({
  //     user: admin,
  //     marketAddr: marketAddr1,
  //     quoteTokenAddr: globals.quoteTokenAddress,
  //     quoteAmount: BigInt(1e6).toString(),
  //   });

  //   show(
  //     await fetchProxiedMarketInfo({
  //       user: admin,
  //       controllerAddr,
  //       selector: { symbol: "TESTA-1" },
  //     }),
  //   );
  // });

  it(`updates indexes upon hitting goal`, async () => {
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
    });

    await buy({
      user: admin,
      marketAddr: marketAddr1,
      quoteTokenAddr: globals.quoteTokenAddress,
      quoteAmount: BigInt(49.9e18).toString(),
    });

    {
      const {
        response: { market_info },
      } = await fetchProxiedMarketInfo({
        user: admin,
        controllerAddr,
        selector: { symbol: "TESTA-1" },
      });

      expect(market_info?.status).toStrictEqual("open");

      const { markets } = await paginateMarkets({
        user: admin,
        controllerAddr,
        params: { index: "created_at" },
      });

      expect(markets).toStrictEqual([marketAddr1]);

      const { markets: graduatedMarkets } = await paginateMarkets({
        user: admin,
        controllerAddr,
        params: { index: "graduated_created_at" },
      });

      expect(graduatedMarkets).toStrictEqual([]);
    }

    await buy({
      user: admin,
      marketAddr: marketAddr1,
      quoteTokenAddr: globals.quoteTokenAddress,
      quoteAmount: BigInt(0.1e18).toString(),
    });

    {
      const {
        response: { market_info },
      } = await fetchProxiedMarketInfo({
        user: admin,
        controllerAddr,
        selector: { symbol: "TESTA-1" },
      });

      expect(market_info?.status).toStrictEqual("closed");

      const { markets } = await paginateMarkets({
        user: admin,
        controllerAddr,
        params: { index: "created_at" },
      });

      expect(markets).toStrictEqual([]);

      const { markets: graduatedMarkets } = await paginateMarkets({
        user: admin,
        controllerAddr,
        params: { index: "graduated_created_at" },
      });

      expect(graduatedMarkets).toStrictEqual([marketAddr1]);
    }
  });
});
