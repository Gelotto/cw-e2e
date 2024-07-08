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

  it(`initializes markets with expected flags`, async () => {
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
      flags: [4],
    });

    const { marketAddr: marketAddr2 } = await createMarket({
      admin,
      controllerAddr,
      preset: "test",
      symbol: "TESTB",
      cw20: true,
      flags: [1, 2],
    });

    {
      const info1 = await fetchProxiedMarketInfo({
        user: admin,
        controllerAddr,
        selector: { address: marketAddr1 },
      });

      expect(info1.meta.flags.length).toStrictEqual(1);
      expect(info1.meta.flags).toContain(4);

      const info2 = await fetchProxiedMarketInfo({
        user: admin,
        controllerAddr,
        selector: { address: marketAddr2 },
      });

      expect(info2.meta.flags.length).toStrictEqual(2);
      expect(info2.meta.flags).toContain(1);
      expect(info2.meta.flags).toContain(2);
    }
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
