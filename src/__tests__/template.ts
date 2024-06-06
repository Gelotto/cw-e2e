import setup from "../lib/setup";
import Agent from "../lib/Agent";
import { show, fromMicroDenom } from "../lib/helpers";

describe(`The smart contract`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;

  beforeAll(async () => {
    const users = await setup();
    admin = users[0];
    user1 = users[1];
    user2 = users[2];
  });

  it(`does something`, async () => {
    show({
      balances: {
        admin: fromMicroDenom(await admin.queryBalance()),
        user1: fromMicroDenom(await user1.queryBalance()),
        user2: fromMicroDenom(await user2.queryBalance()),
      },
    });
  });
});
