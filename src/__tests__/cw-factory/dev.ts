import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import {
  b64encodeObject,
  extractEventAttributeValue,
  show,
} from "../../lib/helpers";
import { ExecuteResult } from "@cosmjs/cosmwasm-stargate";

const buildCw20ProInstantiateMsg = (admin: Agent, symbol: string) => ({
  symbol,
  name: "Test Token",
  decimals: 6,
  mint: { minter: admin.address },
  initial_balances: [],
  marketing: {
    project: "Test Name",
    description: "Test Description",
    logo: { url: "http://logo.test" },
    marketing: admin.address,
  },
});

const extractCreatedContractAddress = (result: ExecuteResult) => {
  return extractEventAttributeValue(
    result.events,
    "wasm-factory-create",
    "contract_address",
  );
};

describe(`cw-factory`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId: number;
  let cwProCodeId: number;

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    cwProCodeId = await admin.upload({
      contract: "cw20-pro",
      build: "0.0.1",
    });

    codeId = await admin.upload({
      contract: "cw-factory",
      build: "dev",
      force: true,
    });
  });

  // it(`creates contracts, updates custom index, and returns contracts in correct order`, async () => {
  //   const { contractAddress: factoryAddress } = await admin.instantiate({
  //     codeId,
  //     msg: {
  //       config: {
  //         managed_by: admin.address,
  //         allowed_code_ids: [cwProCodeId.toFixed()],
  //         default_code_id: cwProCodeId.toFixed(),
  //       },
  //     },
  //   });

  //   for (const symbol of ["ZED", "APPLE", "POOPER"]) {
  //     {
  //       await admin.execute({
  //         instructions: [
  //           {
  //             contractAddress: factoryAddress,
  //             msg: {
  //               create: {
  //                 name: symbol.toLowerCase(),
  //                 code_id: cwProCodeId.toFixed(),
  //                 instantiate_msg: buildCw20ProInstantiateMsg(admin, symbol),
  //                 label: "Test CW20 Contract",
  //               },
  //             },
  //           },
  //           {
  //             contractAddress: factoryAddress,
  //             msg: {
  //               update: {
  //                 contract: { name: symbol.toLowerCase() },
  //                 indices: [{ name: "symbol", value: { string: symbol } }],
  //               },
  //             },
  //           },
  //         ],
  //       });
  //     }
  //   }

  //   {
  //     const resp = await admin.query<{ addresses: string[]; cursor: any }>({
  //       contractAddress: factoryAddress,
  //       msg: {
  //         contracts: { by_index: { index: { custom: "symbol" }, desc: true } },
  //       },
  //     });

  //     const symbols: any[] = [];

  //     for (const addr of resp.addresses) {
  //       symbols.push(
  //         await admin.query({ contractAddress: addr, msg: { token_info: {} } }),
  //       );
  //     }

  //     show({ resp, symbols });
  //   }
  // });

  // it(`creates contracts, tags them, and returns contracts in correct order`, async () => {
  //   const { contractAddress: factoryAddress } = await admin.instantiate({
  //     codeId,
  //     msg: {
  //       config: {
  //         managed_by: admin.address,
  //         allowed_code_ids: [cwProCodeId.toFixed()],
  //         default_code_id: cwProCodeId.toFixed(),
  //       },
  //     },
  //   });

  //   let weight = 0;
  //   const tag = "score";

  //   for (const symbol of ["ZED", "APPLE", "POOPER"]) {
  //     {
  //       await admin.execute({
  //         instructions: [
  //           {
  //             contractAddress: factoryAddress,
  //             msg: {
  //               create: {
  //                 name: symbol.toLowerCase(),
  //                 code_id: cwProCodeId.toFixed(),
  //                 instantiate_msg: buildCw20ProInstantiateMsg(admin, symbol),
  //                 label: "Test CW20 Contract",
  //               },
  //             },
  //           },
  //           {
  //             contractAddress: factoryAddress,
  //             msg: {
  //               update: {
  //                 contract: { name: symbol.toLowerCase() },
  //                 tags: [{ op: "set", tag, weight: weight++ }],
  //               },
  //             },
  //           },
  //         ],
  //       });
  //     }
  //   }

  //   {
  //     const resp = await admin.query<{
  //       addresses: string[];
  //       weights: number[];
  //       cursor: any;
  //     }>({
  //       contractAddress: factoryAddress,
  //       msg: {
  //         contracts: { by_tag: { tag, desc: false } },
  //       },
  //     });

  //     const symbols: any[] = [];

  //     for (let i = 0; i < resp.addresses.length; ++i) {
  //       const addr = resp.addresses[i];
  //       const weight = resp.weights[i];
  //       console.log({ addr, weight });
  //       symbols.push([
  //         (
  //           await admin.query<any>({
  //             contractAddress: addr,
  //             msg: { token_info: {} },
  //           })
  //         ).symbol,
  //         weight,
  //       ]);
  //     }

  //     show({ resp, symbols });
  //   }
  // });

  it(`creates contracts, updates custom index, and returns contracts in correct order`, async () => {
    const { contractAddress: factoryAddress } = await admin.instantiate({
      codeId,
      msg: {
        config: {
          managed_by: admin.address,
          allowed_code_ids: [cwProCodeId.toFixed()],
          default_code_id: cwProCodeId.toFixed(),
        },
      },
    });

    const symbol = "EGGS";

    await admin.execute({
      instructions: {
        contractAddress: factoryAddress,
        msg: {
          presets: {
            set: {
              overridable: false,
              name: "test",
              values: {
                symbol: "SPAM",
              },
            },
          },
        },
      },
    });

    await admin.execute({
      instructions: [
        {
          contractAddress: factoryAddress,
          msg: {
            create: {
              preset: "test",
              name: symbol.toLowerCase(),
              code_id: cwProCodeId.toFixed(),
              instantiate_msg: buildCw20ProInstantiateMsg(admin, symbol),
              label: "Test CW20 Contract",
            },
          },
        },
        {
          contractAddress: factoryAddress,
          msg: {
            update: {
              contract: { name: symbol.toLowerCase() },
              indices: [
                {
                  name: "symbol",
                  value: { string: symbol },
                },
              ],
            },
          },
        },
      ],
    });

    {
      const resp = await admin.query<{ addresses: string[]; cursor: any }>({
        contractAddress: factoryAddress,
        msg: {
          contracts: { in_range: { index: { custom: "symbol" }, desc: true } },
        },
      });

      const tokenInfos: any[] = [];
      for (const addr of resp.addresses) {
        tokenInfos.push(
          await admin.query({ contractAddress: addr, msg: { token_info: {} } }),
        );
      }

      show({ resp, tokenInfos });
    }
  });
});
