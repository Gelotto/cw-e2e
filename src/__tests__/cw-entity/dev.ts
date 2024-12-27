import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { randomAddresses, repeat, pretty } from "../../lib/helpers";
import MerkleTree, { merkleTreeExample } from "../../lib/MerkleTree";
import { coin } from "@cosmjs/amino";

describe(`cw-entity`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId: number;

  async function instantiate() {
    return (
      await admin.instantiate({
        codeId,
        msg: {
          operator: admin.address,
          schema: {
            name: "User",
            properties: [
              {
                indexed: true,
                required: true,
                name: "age",
                value: { u8: {} },
              },
              {
                indexed: true,
                required: true,
                name: "email",
                value: { string: {} },
              },
            ],
          },
        },
      })
    ).contractAddress;
  }

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId = await admin.upload({
      contract: "cw-entity",
      build: "dev",
      // force: true,
    });
  });

  it(`creates entity and selects by ID`, async () => {
    const contractAddress = await instantiate();
    const result = await admin.execute({
      instructions: [
        {
          contractAddress,
          msg: {
            create: {
              id: "1",
              data: {
                email: "dg@gelotto.io",
                age: 40,
              },
            },
          },
        },
        {
          contractAddress,
          msg: {
            create: {
              id: "2",
              data: {
                email: "rizbe@gelotto.io",
                age: 34,
              },
            },
          },
        },
      ],
    });

    const results = await admin.client.queryContractSmart(contractAddress, {
      read: { target: { ids: ["1", "2"] }, select: ["*"] },
    });

    pretty(results);
  });
});
