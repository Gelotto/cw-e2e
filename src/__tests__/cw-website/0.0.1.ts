import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { faker } from "@faker-js/faker";

const HTML_ECHO_TEMPLATE = `
!DOCTYPE HTML
<html>
  <head>
    <style type="text/css">
      body {
        font-family: sans-serif;
      }

      html,
      body,
      main {
        height: 100%;
        width: 100%;
      }

      main {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
      }

      h1,
      h2 {
        padding: 0;
        margin: 0;
      }

      h1 {
        text-transform: uppercase;
      }

      h2 {
        color: #999;
      }
    </style>
    <title>{{ meta.title }}</title>
  </head>
  <body>
    <main>
      <h1>{{ message }}</h1>
      <h2>{{ meta.title }} Test Page</h2>
    </main>
  </body>
</html>
`.trim();

describe(`cw20-pro`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId: number;

  beforeAll(async () => {
    const users = await setup();
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId = await admin.upload({
      contract: "cw-website",
      build: "dev",
    });
  });

  it(`upserts template and renders it`, async () => {
    // Create a new cw-website contract instance and get it's address
    const { contractAddress } = await admin.instantiate({
      codeId,
      msg: {
        title: "Test Website",
      },
    });

    // path string to associate with the to-be-upserted template text
    const path = "/echo";

    await admin.execute({
      instructions: {
        contractAddress,
        msg: {
          templates: {
            upsert: { path, template: HTML_ECHO_TEMPLATE },
          },
        },
      },
    });

    // A "message" query parameter to render in the "echo" template
    const message = faker.word.words(5);
    const msg = { render: { path, params: { echo: { message } } } };

    // Render the echo template with the "render" smart query
    const html: string = await admin.query({ contractAddress, msg });

    console.log(html);
  });
});
