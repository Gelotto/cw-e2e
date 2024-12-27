import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { randomAddresses, repeat, pretty } from "../../lib/helpers";
import MerkleTree, { merkleTreeExample } from "../../lib/MerkleTree";
import { coin } from "@cosmjs/amino";

describe(`cw-merkle-payment`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId: number;
  let contractAddress: string;
  let tree: MerkleTree;
  let recipients: string[] = [];

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId = await admin.upload({
      contract: "cw-merkle-payment",
      build: "dev",
      // force: true,
    });

    recipients = randomAddresses({ n: 4, prefix: "juno" }).concat([
      admin.address,
    ]);

    // await merkleTreeExample(recipients);
    // return;

    tree = new MerkleTree().build(recipients);

    contractAddress = (
      await admin.instantiate({
        codeId,
        msg: {
          metadata: {
            name: "Test Contract",
          },
          config: {
            owner: admin.address,
            token: { denom: "ujunox" },
            root: tree.root,
            size: recipients.length.toFixed(),
            amount: "1",
          },
        },
        funds: [coin(recipients.length, "ujunox")],
      })
    ).contractAddress;
  });

  it(`verifies admin can claim`, async () => {
    const proof = tree.prove(recipients.length - 1);
    await admin.execute({
      instructions: [
        {
          contractAddress,
          msg: { claim: { proof } },
        },
      ],
    });
  });

  it(`verifies other user CANNOT claim`, async () => {
    const proof = tree.prove(recipients.length - 1);
    let error: Error | undefined = undefined;
    try {
      await user1.execute({
        instructions: [
          {
            contractAddress,
            msg: { claim: { proof } },
          },
        ],
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
  });
});
