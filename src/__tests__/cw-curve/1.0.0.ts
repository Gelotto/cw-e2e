import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { pretty, fromMicroDenom } from "../../lib/helpers";
import { toBinary } from "@cosmjs/cosmwasm-stargate";

describe(`cw-curve`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;

  let curveCodeId: number;
  let cw20ProCodeId: number;

  let contractAddress: string;
  let baseTokenAddress: string;

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    cw20ProCodeId = await admin.upload({
      contract: "cw20-pro",
      build: "0.1.0",
      force: false,
    });

    curveCodeId = await admin.upload({
      contract: "cw-curve",
      build: "1.0.0",
      force: false,
    });
  });

  it(`instantiates along with new token`, async () => {
    const result = await admin.instantiate({
      codeId: curveCodeId,
      msg: {
        operator_addr: null,
        fee_addr: admin.address,

        taker_fee_pct: BigInt(1e4).toString(),
        maker_fee_pct: BigInt(1e4).toString(),

        base_reserve: BigInt(100e6).toString(),
        quote_reserve: BigInt(10e6).toString(),

        base_token: {
          code_id: cw20ProCodeId.toString(),
          decimals: 6,
          symbol: "TEST",
          name: "Test Token",
          description: "Test Description",
        },

        quote_token: {
          decimals: 6,
          token: { denom: "ujunox" },
        },
      },
    });

    contractAddress = result.contractAddress;

    const overview: any = await admin.query({
      contractAddress,
      msg: { overview: {} },
    });

    baseTokenAddress = overview.amm.base_token.address as string;

    pretty(overview);
  });

  it(`buys some tokens`, async () => {
    await admin.execute({
      instructions: [
        {
          contractAddress,
          msg: { buy: {} },
          funds: [{ denom: "ujunox", amount: "1000" }],
        },
        {
          contractAddress: baseTokenAddress,
          msg: {
            send: {
              contract: contractAddress,
              amount: "9900",
              msg: toBinary({ sell: {} }),
            },
          },
        },
      ],
    });

    pretty(await admin.query({ contractAddress, msg: { overview: {} } }));
    pretty(
      await admin.query({
        contractAddress,
        msg: { account: { address: admin.address } },
      }),
    );
  });
});
