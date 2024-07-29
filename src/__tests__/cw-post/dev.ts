import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { show } from "../../lib/helpers";

type NodeInitArgs = {
  parent_id?: string;
  title: string;
  body?: string;
  tags?: string[];
  links?: any[];
};

async function instantiatePost(admin: Agent, codeId: number) {
  return (
    await admin.instantiate({
      codeId,
      msg: {
        operator: admin.address,
        root: {
          title: "Test Title",
          body: "Test post body",
          links: [
            { generic: { url: "http://test.com" } },
            { image: { url: "http://test.image.com" } },
          ],
          tags: ["foo", "bar"],
          parent_id: "",
        },
        config: {
          token: { denom: "ujunox" },
          fee_recipient: admin.address,
          fees: {
            creation: (0.01e6).toFixed(),
            reaction: (0.01e6).toFixed(),
            tip_pct: (0.01e6).toFixed(),
            text: (0.01e6).toFixed(),
            link: (0.01e6).toFixed(),
            tag: (0.01e6).toFixed(),
          },
        },
      },
    })
  ).contractAddress;
}

async function reply({
  user,
  contractAddress,
  node,
}: {
  user: Agent;
  contractAddress;
  node: NodeInitArgs;
}) {
  return await user.execute({
    instructions: [{ contractAddress, msg: { reply: node } }],
  });
}

describe(`cw-post`, () => {
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
      contract: "cw-post",
      build: "dev",
      force: true,
    });
  });

  it(`creates post`, async () => {
    const contractAddress = await instantiatePost(admin, codeId);

    await reply({
      user: user1,
      contractAddress,
      node: { parent_id: "1", title: "Reply 1" },
    });

    show(await admin.query({ contractAddress, msg: { root: {} } }));
    show(
      await admin.query({
        contractAddress,
        msg: { nodes: { by_parent_id: { parent_id: "1" } } },
      }),
    );
  });
});
