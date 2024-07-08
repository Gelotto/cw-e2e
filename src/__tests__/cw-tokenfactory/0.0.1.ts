import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { show, fromMicroDenom } from "../../lib/helpers";

describe(`tokenfactory-core smart contract`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId: number;

  // const defaultContractAddress =
  //   "juno153r9tg33had5c5s54sqzn879xww2q2egektyqnpj6nwxt8wls70qsyfdq2";

  // const defaultDenom = `factory/${defaultContractAddress}/test`;

  beforeAll(async () => {
    const users = await setup();
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId = await admin.upload({
      contract: "cw-tokenfactory",
      build: "0.0.1",
      force: true,
    });
  });

  it(`creates a new denom`, async () => {
    const { contractAddress, events } = await admin.instantiate({
      codeId,
      msg: {
        factory: "osmosis",
        initial_balances: [
          { address: admin.address, amount: (1000e6).toFixed() },
        ],
        metadata: {
          name: "Test Token",
          description: "Native Test Token",
          symbol: "TEST",
          uri: "https://test.com",
          decimals: 6,
        },
      },
      funds: [{ denom: "ujunox", amount: (10e6).toFixed() }],
    });

    const newDenom = `factory/${contractAddress}/test`;
    const info = await admin.query({ contractAddress, msg: { info: {} } });
    const { manager } = await admin.query({
      contractAddress,
      msg: { config: {} },
    });

    show({ contractAddress, info });

    const balance = await admin.queryBalance({ denom: newDenom });

    expect(manager).toStrictEqual(admin.address);
    expect(balance).toStrictEqual((1000e6).toFixed());
  });
});
