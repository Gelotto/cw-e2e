import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { pretty, fromMicroDenom } from "../../lib/helpers";
import { toBinary } from "@cosmjs/cosmwasm-stargate";

describe(`cw-claims`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;

  let codeId: number;
  let contractAddress: string;

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId = await admin.upload({
      contract: "cw-claims",
      build: "1.0.0",
      force: false,
    });
  });

  it(`instantiates along with new token`, async () => {
    const result = await admin.instantiate({
      codeId: codeId,
      msg: {},
    });

    contractAddress = result.contractAddress;
    pretty(contractAddress);
  });
});
