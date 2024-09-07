import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import {
  b64encodeObject,
  extractEventAttributeValue,
  show,
} from "../../lib/helpers";
import {
  ExecuteInstruction,
  ExecuteResult,
  toBinary,
} from "@cosmjs/cosmwasm-stargate";

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
  let cw20CodeId: number;
  let cwProCodeId: number;

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    cw20CodeId = await admin.upload({
      contract: "cw20-base",
      build: "1.0.0",
    });

    cwProCodeId = await admin.upload({
      contract: "cw20-pro",
      build: "0.0.1",
    });

    codeId = await admin.upload({
      contract: "cw-factory",
      build: "dev",
      // force: true,
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

  //   // Check DESC order
  //   {
  //     const resp = await admin.query<{ addresses: string[]; cursor: any }>({
  //       contractAddress: factoryAddress,
  //       msg: {
  //         contracts: {
  //           in_range: { index: { custom: "symbol" }, desc: true },
  //         },
  //       },
  //     });

  //     const symbols: any[] = [];
  //     for (const addr of resp.addresses) {
  //       symbols.push(
  //         (
  //           await admin.query<{ symbol: string }>({
  //             contractAddress: addr,
  //             msg: { token_info: {} },
  //           })
  //         ).symbol,
  //       );
  //     }
  //     show(symbols);
  //     for (let i = 0; i < symbols.length - 1; ++i) {
  //       expect(symbols[i] > symbols[i + 1]).toBe(true);
  //     }
  //   }

  //   // Check ASC order
  //   {
  //     const resp = await admin.query<{ addresses: string[]; cursor: any }>({
  //       contractAddress: factoryAddress,
  //       msg: {
  //         contracts: {
  //           in_range: { index: { custom: "symbol" }, desc: false },
  //         },
  //       },
  //     });

  //     const symbols: any[] = [];
  //     for (const addr of resp.addresses) {
  //       symbols.push(
  //         (
  //           await admin.query<{ symbol: string }>({
  //             contractAddress: addr,
  //             msg: { token_info: {} },
  //           })
  //         ).symbol,
  //       );
  //     }

  //     show(symbols);
  //     for (let i = 0; i < symbols.length - 1; ++i) {
  //       expect(symbols[i] < symbols[i + 1]).toBe(true);
  //     }
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

    const instructions: ExecuteInstruction[] = [];
    for (const symbol of ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF"]) {
      {
        instructions.push({
          contractAddress: factoryAddress,
          msg: {
            create: {
              name: symbol.toLowerCase(),
              code_id: cwProCodeId.toFixed(),
              instantiate_msg: buildCw20ProInstantiateMsg(admin, symbol),
              label: "Test CW20 Contract",
            },
          },
        });
        instructions.push({
          contractAddress: factoryAddress,
          msg: {
            update: {
              contract: { name: symbol.toLowerCase() },
              indices: [{ name: "symbol", value: { string: symbol } }],
            },
          },
        });
      }
    }

    await admin.execute({ instructions });

    // Check DESC order
    {
      const limit = 2;
      const symbols: any[] = [];
      let cursor = null;

      while (true) {
        const resp = await admin.query<{ addresses: string[]; cursor: any }>({
          contractAddress: factoryAddress,
          msg: {
            contracts: {
              in_range: {
                index: { custom: "symbol" },
                desc: false,
                limit,
                cursor,
              },
            },
          },
        });
        for (const addr of resp.addresses) {
          symbols.push(
            (
              await admin.query<{ symbol: string }>({
                contractAddress: addr,
                msg: { token_info: {} },
              })
            ).symbol,
          );
        }
        cursor = resp.cursor;
        show({ resp, symbols });
        if (!cursor) {
          break;
        }
      }

      for (let i = 0; i < symbols.length - 1; ++i) {
        expect(symbols[i] < symbols[i + 1]).toBe(true);
      }
    }
  });

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

  //   for (const symbol of ["CHEESE", "ZORG", "POOP"]) {
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

  //   // Check ASC
  //   {
  //     {
  //       const resp = await admin.query<{
  //         addresses: string[];
  //         weights: number[];
  //         cursor: any;
  //       }>({
  //         contractAddress: factoryAddress,
  //         msg: {
  //           contracts: { with_tag: { tag, desc: false } },
  //         },
  //       });

  //       const results: any[] = [];

  //       for (let i = 0; i < resp.addresses.length; ++i) {
  //         const weight = resp.weights[i];
  //         results.push(weight);
  //       }

  //       show({ resp, symbols: results });

  //       for (let i = 0; i < results.length - 1; ++i) {
  //         const w1 = results[i];
  //         const w2 = results[i + 1];
  //         expect(w1 < w2).toBe(true);
  //       }
  //     }
  //   }

  //   // Check DESC
  //   {
  //     {
  //       const resp = await admin.query<{
  //         addresses: string[];
  //         weights: number[];
  //         cursor: any;
  //       }>({
  //         contractAddress: factoryAddress,
  //         msg: {
  //           contracts: { with_tag: { tag, desc: true } },
  //         },
  //       });

  //       const results: any[] = [];

  //       for (let i = 0; i < resp.addresses.length; ++i) {
  //         const weight = resp.weights[i];
  //         results.push(weight);
  //       }

  //       show({ resp, symbols: results });

  //       for (let i = 0; i < results.length - 1; ++i) {
  //         const w1 = results[i];
  //         const w2 = results[i + 1];
  //         expect(w1 > w2).toBe(true);
  //       }
  //     }
  //   }
  // });

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

  //   const initialSymbol = "APPLE";
  //   const updatedSymbol = "ZORG";

  //   await admin.execute({
  //     instructions: [
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           create: {
  //             name: "Foo",
  //             code_id: cwProCodeId.toFixed(),
  //             instantiate_msg: buildCw20ProInstantiateMsg(admin, "FOO"),
  //             label: "Test CW20 Contract",
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           create: {
  //             name: initialSymbol.toLowerCase(),
  //             code_id: cwProCodeId.toFixed(),
  //             instantiate_msg: buildCw20ProInstantiateMsg(admin, initialSymbol),
  //             label: "Test CW20 Contract",
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           update: {
  //             contract: { name: initialSymbol.toLowerCase() },
  //             indices: [
  //               {
  //                 name: "symbol",
  //                 value: { string: initialSymbol },
  //               },
  //             ],
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           update: {
  //             contract: { name: "Foo" },
  //             indices: [
  //               {
  //                 name: "symbol",
  //                 value: { string: "FOO" },
  //               },
  //             ],
  //           },
  //         },
  //       },
  //     ],
  //   });

  //   {
  //     const resp = await admin.query<{ addresses: string[]; cursor: any }>({
  //       contractAddress: factoryAddress,
  //       msg: {
  //         contracts: {
  //           in_range: { index: { custom: "symbol" }, desc: true },
  //         },
  //       },
  //     });

  //     const symbols: any[] = [];
  //     for (const addr of resp.addresses) {
  //       symbols.push(
  //         (
  //           await admin.query<{ symbol: string }>({
  //             contractAddress: addr,
  //             msg: { token_info: {} },
  //           })
  //         ).symbol,
  //       );
  //     }
  //     show(symbols);
  //     for (let i = 0; i < symbols.length - 1; ++i) {
  //       expect(symbols[i] > symbols[i + 1]).toBe(true);
  //     }
  //   }

  //   await admin.execute({
  //     instructions: [
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           update: {
  //             contract: { name: initialSymbol.toLowerCase() },
  //             indices: [
  //               {
  //                 name: "symbol",
  //                 value: { string: updatedSymbol },
  //               },
  //             ],
  //           },
  //         },
  //       },
  //     ],
  //   });

  //   {
  //     const resp = await admin.query<{ addresses: string[]; cursor: any }>({
  //       contractAddress: factoryAddress,
  //       msg: {
  //         contracts: {
  //           in_range: { index: { custom: "symbol" }, desc: true },
  //         },
  //       },
  //     });

  //     const symbols: any[] = [];
  //     for (const addr of resp.addresses) {
  //       symbols.push(
  //         (
  //           await admin.query<{ symbol: string }>({
  //             contractAddress: addr,
  //             msg: { token_info: {} },
  //           })
  //         ).symbol,
  //       );
  //     }
  //     show(symbols);
  //     for (let i = 0; i < symbols.length - 1; ++i) {
  //       expect(symbols[i] < symbols[i + 1]).toBe(true);
  //     }
  //   }
  // });

  // it(`migrates contracts in a session and accumulates failed contract adddresses to retry`, async () => {
  //   const { contractAddress: factoryAddress } = await admin.instantiate({
  //     codeId,
  //     msg: {
  //       config: {
  //         managed_by: admin.address,
  //         allowed_code_ids: [cwProCodeId.toFixed(), cw20CodeId.toFixed()],
  //         default_code_id: cw20CodeId.toFixed(),
  //       },
  //     },
  //   });

  //   const symbols = ["EGGS", "SPAM", "FOO", "BAR", "EGO", "DOOF", "APPL"];

  //   await admin.execute({
  //     instructions: symbols.map((symbol) => ({
  //       contractAddress: factoryAddress,
  //       msg: {
  //         create: {
  //           name: symbol.toLowerCase(),
  //           code_id: cw20CodeId.toFixed(),
  //           instantiate_msg: buildCw20ProInstantiateMsg(admin, symbol),
  //           label: "Test CW20 Contract",
  //           admin: symbol === "APPL" ? user1.address : undefined,
  //         },
  //       },
  //     })),
  //   });

  //   const migationParams = {
  //     name: "testMigration1",
  //     from_code_id: cw20CodeId.toFixed(),
  //     to_code_id: cwProCodeId.toFixed(),
  //     error_strategy: "retry",
  //     batch_size: 3,
  //   };

  //   const result = await admin.execute({
  //     instructions: [
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           migrations: {
  //             session: {
  //               begin: migationParams,
  //             },
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           migrations: {
  //             session: {
  //               step: { name: migationParams.name },
  //             },
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           migrations: {
  //             session: {
  //               step: { name: migationParams.name },
  //             },
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: factoryAddress,
  //         msg: {
  //           migrations: {
  //             session: {
  //               step: { name: migationParams.name },
  //             },
  //           },
  //         },
  //       },
  //     ],
  //   });

  //   show(
  //     await admin.query({
  //       contractAddress: factoryAddress,
  //       msg: { migrations: { session: migationParams.name } },
  //     }),
  //   );
  // });
});
