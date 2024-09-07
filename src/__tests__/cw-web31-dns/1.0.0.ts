import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { faker } from "@faker-js/faker";
import { b64encode } from "../../lib/helpers";

const HTML_ECHO_TEMPLATE = `
  <h1>{ data.message }</h1>
  <h2>{ meta.title } Test Page</h2>
  <h3>This entire website lives on-chain as an NFT</h3>
`.trim();

describe(`cw-web31-dns`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId: number;
  let websiteCodeId: number;

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId = await admin.upload({
      contract: "cw-web31-dns",
      build: "1.0.0",
      force: false,
    });

    websiteCodeId = await admin.upload({
      contract: "cw-website",
      build: "dev",
      force: false,
    });
  });

  it(`registers name, returns in query, and proxies render`, async () => {
    const { contractAddress: websiteContractAddress } = await admin.instantiate(
      {
        codeId: websiteCodeId,
        msg: {
          title: "Test Website",
          keywords: ["test", "blockchain", "cool"],
          description: "This is a test of an on-chain website",
          config: {
            rest_node: "http://localhost:1317",
          },
        },
      },
    );

    const { contractAddress } = await admin.instantiate({
      codeId,
      msg: {
        fee_recipient: admin.address,
        max_name_len: 10,
        price: {
          token: { denom: "ujunox" },
          amount: "1",
        },
      },
    });

    await admin.execute({
      instructions: [
        // Upload a template to the website contract
        {
          contractAddress: websiteContractAddress,
          msg: {
            templates: {
              upsert: { path: "/echo", template: HTML_ECHO_TEMPLATE },
            },
          },
        },
        // Register the website contract with the DNS with the name "poopy"
        {
          contractAddress,
          msg: {
            register: {
              name: "Poopy",
              address: websiteContractAddress,
              meta: {
                title: "Test Site",
                description: "Test Description",
                keywords: ["feces", "crap", "shit"],
              },
            },
          },
          funds: [{ denom: "ujunox", amount: "1" }],
        },
      ],
    });

    const record = await admin.query({
      contractAddress,
      msg: { name_record: { contract: "poopy" } },
    });

    console.log(record);

    const html = await admin.query({
      contractAddress,
      msg: {
        render: {
          contract: "poopy",
          path: "/echo",
          context: { message: "Hello, world!" },
        },
      },
    });

    console.log(html);
  });
});
