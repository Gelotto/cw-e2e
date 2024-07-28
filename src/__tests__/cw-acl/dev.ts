import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { show } from "../../lib/helpers";

describe(`cw-acl`, () => {
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
      contract: "cw-acl",
      build: "dev",
      force: true,
    });

    contractAddress = (
      await admin.instantiate({
        codeId,
        msg: {
          name: "Test ACL",
          description: "This is a ACL for testing purposes only.",
          operator: { address: admin.address },
        },
      })
    ).contractAddress;
  });

  it(`authorizes principal to allowed paths`, async () => {
    const paths = ["/users", "/users/123", "/posts/123"];

    await admin.execute({
      instructions: paths.map((path) => ({
        contractAddress,
        msg: { allow: { principal: user1.address, path } },
      })),
    });

    const isAuthorized = async (paths: string[]) =>
      await admin.query({
        contractAddress,
        msg: {
          is_allowed: {
            principal: user1.address,
            require: "all",
            raise: false,
            paths,
          },
        },
      });

    // Ensure each individual path allowed is authorized
    for (const path of paths) {
      expect([path, await isAuthorized([path])]).toStrictEqual([path, true]);
    }

    // Ensure that we are authorized to some other user subpath via /users
    {
      const path = "/users/456";
      expect([path, await isAuthorized([path])]).toStrictEqual([path, true]);
    }

    // Ensure that we are NOT authorized to an unrecognized path
    {
      const path = "/tokens/123";
      expect([path, await isAuthorized([path])]).toStrictEqual([path, false]);
    }

    // Ensure that we are NOT authorized to a random post path
    {
      const path = "/posts/345";
      expect([path, await isAuthorized([path])]).toStrictEqual([path, false]);
    }

    // Ensure that we are NOT authorized to a /posts/123's parent path
    {
      const path = "/posts";
      expect([path, await isAuthorized([path])]).toStrictEqual([path, false]);
    }
  });

  it(`authorizes principal to allowed paths via role`, async () => {
    await admin.execute({
      instructions: [
        {
          contractAddress,
          msg: {
            role: {
              create: {
                name: "user-admin",
                description: "Test admin for managing user resources",
                paths: ["/users"],
              },
            },
          },
        },
        {
          contractAddress,
          msg: {
            role: {
              create: {
                name: "post-admin",
                description: "Test admin for managing post resources",
                paths: ["/posts"],
              },
            },
          },
        },
        {
          contractAddress,
          msg: {
            role: { grant: { role: "user-admin", principal: user1.address } },
          },
        },
        {
          contractAddress,
          msg: {
            role: { grant: { role: "post-admin", principal: user2.address } },
          },
        },
      ],
    });

    show({
      roles: {
        user1: await admin.query({
          contractAddress,
          msg: { roles: { principal: user1.address } },
        }),
        user2: await admin.query({
          contractAddress,
          msg: { roles: { principal: user2.address } },
        }),
      },
    });

    const authorized = async (principal: string, path: string) =>
      await admin.query({
        contractAddress,
        msg: {
          is_allowed: {
            principal,
            paths: [path],
          },
        },
      });

    {
      const p = "/users";
      const expected = [p, true];
      expect([p, await authorized(user1.address, p)]).toStrictEqual(expected);
    }
    {
      const p = "/posts";
      const expected = [p, false];
      expect([p, await authorized(user1.address, p)]).toStrictEqual(expected);
    }

    {
      const p = "/users";
      const expected = [p, false];
      expect([p, await authorized(user2.address, p)]).toStrictEqual(expected);
    }
    {
      const p = "/users/123";
      const expected = [p, false];
      expect([p, await authorized(user2.address, p)]).toStrictEqual(expected);
    }
    {
      const p = "/posts";
      const expected = [p, true];
      expect([p, await authorized(user2.address, p)]).toStrictEqual(expected);
    }
    {
      const p = "/posts/123";
      const expected = [p, true];
      expect([p, await authorized(user2.address, p)]).toStrictEqual(expected);
    }
  });

  it(`lists paths correctly for acl, principal, and role`, async () => {
    await admin.execute({
      instructions: [
        {
          contractAddress,
          msg: {
            role: {
              create: {
                name: "test-role",
                paths: ["/a"],
              },
            },
          },
        },
        {
          contractAddress,
          msg: {
            allow: { principal: user1.address, path: "/b", ttl: 60 },
          },
        },
      ],
    });

    show(
      await admin.query({
        contractAddress,
        msg: { paths: { subject: "acl" } },
      }),
    );

    show(
      await admin.query({
        contractAddress,
        msg: { paths: { subject: { role: "test-role" } } },
      }),
    );

    show(
      await admin.query({
        contractAddress,
        msg: { paths: { subject: { role: "foo" } } },
      }),
    );

    show(
      await admin.query({
        contractAddress,
        msg: { paths: { subject: { principal: user1.address } } },
      }),
    );

    show(
      await admin.query({
        contractAddress,
        msg: { paths: { subject: { principal: "foo " } } },
      }),
    );
  });
});
