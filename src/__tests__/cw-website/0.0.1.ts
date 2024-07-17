import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { faker } from "@faker-js/faker";
import { b64encode } from "../../lib/helpers";

const HTML_ECHO_TEMPLATE = `
<body>
  <main>
    <h1>{ data.message }</h1>
    <h2>{ meta.title } Test Page</h2>
  </main>
</body>
`.trim();

const HTML_HOME_TEMPLATE = `
<body>
  <main>
    Nothing to see here!
  </main>
</body>
`.trim();

describe(`cw20-pro`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId: number;

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId = await admin.upload({
      contract: "cw-website",
      build: "dev",
      force: true,
    });
  });

  it(`upserts template and renders it`, async () => {
    // Create a new cw-website contract instance and get it's address
    const { contractAddress } = await admin.instantiate({
      codeId,
      msg: {
        title: "Test Website",
        keywords: ["test", "blockchain", "cool"],
        description: "This is a test of an on-chain website",
        config: {
          rest_node: "http://localhost:1317",
        },
      },
    });

    console.log(contractAddress);

    const path = "/echo";

    await admin.execute({
      instructions: [
        {
          contractAddress,
          msg: {
            assets: {
              upsert: {
                name: "test",
                mime_type: "text/javascript",
                data: b64encode(`console.log("it works!");`),
              },
            },
          },
        },
        {
          contractAddress,
          msg: {
            assets: {
              upsert: {
                name: "base",
                mime_type: "text/css",
                data: b64encode(
                  `
                body {
                  background: black;
                  color: white;
                }
              `,
                ),
              },
            },
          },
        },
        {
          contractAddress,
          msg: {
            templates: {
              upsert: { path, template: HTML_ECHO_TEMPLATE, styles: ["base"] },
            },
          },
        },
        {
          contractAddress,
          msg: {
            templates: {
              upsert: {
                path: "/",
                template: HTML_HOME_TEMPLATE,
                styles: ["base"],
              },
            },
          },
        },
      ],
    });

    // path string to associate with the to-be-upserted template text

    // Some random context data
    const message = faker.word.words(5);

    // Render the echo template with the "render" smart query
    const html: string = await admin.query({
      contractAddress,
      msg: {
        render: {
          path,
          context: {
            message,
          },
        },
      },
    });

    console.log(html);

    console.log(await admin.query({ contractAddress, msg: { templates: {} } }));
    console.log(
      await admin.query({
        contractAddress,
        msg: { template: { path: "/echo" } },
      }),
    );
  });
});
