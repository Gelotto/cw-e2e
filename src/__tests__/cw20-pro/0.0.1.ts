import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import {
  show,
  fromMicroDenom,
  randomAddresses,
  extractEventAttributeValue,
} from "../../lib/helpers";
import { Addr } from "../../lib/types";
import { coin } from "@cosmjs/amino";
import CosmWasmBatchRpcClient from "../../lib/CosmWasmBatchClient";
import { randomInt } from "crypto";
import { ExecuteInstruction } from "@cosmjs/cosmwasm-stargate";

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
      contract: "cw20-pro",
      build: "0.0.1",
    });
  });

  // it(`initializes new tokenfactory denom and airdrops balances`, async () => {
  //   // Create 500 random accounts by funding them with 0.000001 junox
  //   const numAccounts = 450;
  //   const accountAddresses = randomAddresses({
  //     prefix: "juno",
  //     n: numAccounts,
  //   });

  //   // Fund them in batches to ensure we don't run out of gas
  //   for (let i = 0; i < 3; ++i) {
  //     await admin.client.signAndBroadcast(
  //       admin.address,
  //       accountAddresses.slice(i * 150, (i + 1) * 150).map((toAddress) => {
  //         return {
  //           typeUrl: "/cosmos.bank.v1beta1.MsgSend",
  //           value: {
  //             fromAddress: admin.address,
  //             amount: [coin("1", "ujunox")],
  //             toAddress,
  //           },
  //         };
  //       }),
  //       "auto",
  //     );
  //   }

  //   let totalAmount = 0;
  //   const expectedBalances: string[] = [];

  //   // Create a new CW20 token
  //   const { contractAddress } = await admin.instantiate({
  //     codeId,
  //     msg: {
  //       symbol: "TEST",
  //       name: "Test",
  //       decimals: 6,
  //       mint: { minter: admin.address },
  //       marketing: {
  //         project: "Project Name",
  //         description: "Description Text",
  //         logo: { url: "http://logo.test" },
  //         marketing: admin.address,
  //       },
  //       initial_balances: accountAddresses.map((address) => {
  //         const amount = 1 + randomInt(9);
  //         totalAmount += amount;
  //         expectedBalances.push(amount.toString());
  //         return {
  //           address,
  //           amount: amount.toString(),
  //         };
  //       }),
  //     },
  //     admin: admin.address,
  //   });

  //   // Fee to create bank denom in juno text env
  //   const createDenomFee = coin(BigInt(10e6).toString(), "ujunox");

  //   // Build the full denom string of the new tokenfactory token
  //   const denom = `factory/${contractAddress}/test`;

  //   let t = 0;

  //   // Initialize a new bank denom from the existing cw20
  //   while (true) {
  //     const instructions: ExecuteInstruction[] = [];

  //     // If this is the first iteration of the loop, freeze the existing cw20
  //     // balances and initialize the new tokenfactory token.
  //     if (!t) {
  //       instructions.push({
  //         contractAddress,
  //         msg: { operator: { freeze_balances: {} } },
  //       });
  //       instructions.push({
  //         contractAddress,
  //         msg: { operator: { token_factory_init: {} } },
  //         funds: [createDenomFee],
  //       });
  //     }

  //     // Mint the next set of 100 initial balances
  //     instructions.push({
  //       contractAddress,
  //       msg: { operator: { token_factory_airdrop: { limit: !t ? 100 : 150 } } },
  //     });

  //     const result = await admin.execute({ instructions });

  //     // Get the total number of balances airdropped so far
  //     const numAccountsProcessed = extractEventAttributeValue(
  //       result.events,
  //       "wasm-airdrop",
  //       "n_balances_processed",
  //     );

  //     // If we've processed all of the accounts, we're done airdropping
  //     if (numAccountsProcessed === numAccounts.toString()) {
  //       break;
  //     }

  //     t++;
  //   }

  //   // Fetch everyone's new bank denom balance
  //   const queryClient = await CosmWasmBatchRpcClient.connect();
  //   const tokenFactoryBalances = await Promise.all(
  //     accountAddresses.map((address) => queryClient.getBalance(address, denom)),
  //   );

  //   // Ensure that each account's balance of the new token is exactly whatever
  //   // their existing cw20 token balance is.
  //   tokenFactoryBalances.forEach((b, i) => {
  //     expect(b.amount).toStrictEqual(expectedBalances[i]);
  //   });
  // });

  // it(`returns balances correctly ordered by size`, async () => {
  //   // Create random accounts by funding them with 0.000001 junox
  //   const numAccounts = 100;
  //   const accountAddresses = randomAddresses({
  //     prefix: "juno",
  //     n: numAccounts - 3, // this 3 is for admin,user1,user2
  //   });

  //   // Fund them in batches to ensure we don't run out of gas
  //   await admin.client.signAndBroadcast(
  //     admin.address,
  //     accountAddresses.map((toAddress) => {
  //       return {
  //         typeUrl: "/cosmos.bank.v1beta1.MsgSend",
  //         value: {
  //           fromAddress: admin.address,
  //           amount: [coin("1", "ujunox")],
  //           toAddress,
  //         },
  //       };
  //     }),
  //     "auto",
  //   );

  //   let totalAmount = 0;
  //   const expectedBalances: string[] = [];

  //   // Create a new CW20 token
  //   const { contractAddress } = await admin.instantiate({
  //     codeId,
  //     msg: {
  //       symbol: "TEST",
  //       name: "Test",
  //       decimals: 6,
  //       mint: { minter: admin.address },
  //       marketing: {
  //         project: "Project Name",
  //         description: "Description Text",
  //         logo: { url: "http://logo.test" },
  //         marketing: admin.address,
  //       },
  //       initial_balances: accountAddresses
  //         .map((address) => {
  //           const amount = 1 + randomInt(1e6 - 1);
  //           totalAmount += amount;
  //           expectedBalances.push(amount.toString());
  //           return {
  //             address,
  //             amount: amount.toString(),
  //           };
  //         })
  //         .concat([
  //           { address: admin.address, amount: BigInt(1000e6).toString() },
  //         ]),
  //     },
  //     admin: admin.address,
  //   });

  //   await admin.transfer({
  //     token: { address: contractAddress },
  //     amount: (100e6).toFixed(),
  //     recipient: user1.address,
  //   });

  //   await admin.transfer({
  //     token: { address: contractAddress },
  //     amount: (1e6).toFixed(),
  //     recipient: user2.address,
  //   });

  //   await user1.transfer({
  //     token: { address: contractAddress },
  //     amount: (99e6).toFixed(),
  //     recipient: user2.address,
  //   });

  //   // Verify desc order
  //   // Verify cw20-base balances match our custom balances
  //   {
  //     const {
  //       balances,
  //     }: { balances: Array<{ address: Addr; amount: string }> } =
  //       await admin.query({
  //         contractAddress,
  //         msg: { pro: { balances: { limit: 200 } } },
  //       });

  //     expect(balances.length).toStrictEqual(numAccounts);

  //     // Ensure the elements are correctly ordered
  //     balances.forEach((b, i) => {
  //       if (i > 0) {
  //         const bPrev = balances[i - 1];
  //         expect(parseInt(bPrev.amount)).toBeGreaterThanOrEqual(
  //           parseInt(b.amount),
  //         );
  //       }
  //     });

  //     // Make sure that our balances are in sync with cw20-base
  //     expect(
  //       await admin.queryBalance({ address: contractAddress }),
  //     ).toStrictEqual(
  //       balances.find((b) => b.address === admin.address)?.amount,
  //     );
  //     expect(
  //       await user1.queryBalance({ address: contractAddress }),
  //     ).toStrictEqual(
  //       balances.find((b) => b.address === user1.address)?.amount,
  //     );
  //     expect(
  //       await user2.queryBalance({ address: contractAddress }),
  //     ).toStrictEqual(
  //       balances.find((b) => b.address === user2.address)?.amount,
  //     );
  //   }

  //   // Verify desc order across pagination
  //   {
  //     let balancesMerged = [];
  //     const pageSize = Math.floor(numAccounts / 2);

  //     const {
  //       balances: balances1,
  //       cursor,
  //     }: { balances: Array<{ address: Addr; amount: string }>; cursor: any } =
  //       await admin.query({
  //         contractAddress,
  //         msg: { pro: { balances: { limit: pageSize } } },
  //       });

  //     balancesMerged = balancesMerged.concat(balances1);

  //     const {
  //       balances: balances2,
  //     }: { balances: Array<{ address: Addr; amount: string }>; cursor: any } =
  //       await admin.query({
  //         contractAddress,
  //         msg: { pro: { balances: { limit: pageSize, cursor } } },
  //       });

  //     balancesMerged = balancesMerged.concat(balances2);

  //     expect(balancesMerged.length).toStrictEqual(numAccounts);

  //     balancesMerged.forEach((b, i) => {
  //       if (i > 0) {
  //         const bPrev = balancesMerged[i - 1];
  //         expect(parseInt(bPrev.amount)).toBeGreaterThanOrEqual(
  //           parseInt(b.amount),
  //         );
  //       }
  //     });
  //   }

  //   // Verify asc order
  //   {
  //     const {
  //       balances,
  //     }: { balances: Array<{ address: Addr; amount: string }> } =
  //       await admin.query({
  //         contractAddress,
  //         msg: { pro: { balances: { limit: 100, desc: false } } },
  //       });

  //     balances.forEach((b, i) => {
  //       if (i > 0) {
  //         const bPrev = balances[i - 1];
  //         expect(parseInt(bPrev.amount)).toBeLessThanOrEqual(
  //           parseInt(b.amount),
  //         );
  //       }
  //     });
  //   }

  //   // Verify asc order across pagination
  //   {
  //     let balancesMerged = [];
  //     const pageSize = Math.floor(numAccounts / 2);

  //     const {
  //       balances: balances1,
  //       cursor,
  //     }: { balances: Array<{ address: Addr; amount: string }>; cursor: any } =
  //       await admin.query({
  //         contractAddress,
  //         msg: { pro: { balances: { limit: pageSize, desc: false } } },
  //       });

  //     balancesMerged = balancesMerged.concat(balances1);

  //     const {
  //       balances: balances2,
  //     }: { balances: Array<{ address: Addr; amount: string }>; cursor: any } =
  //       await admin.query({
  //         contractAddress,
  //         msg: { pro: { balances: { limit: pageSize, cursor, desc: false } } },
  //       });

  //     balancesMerged = balancesMerged.concat(balances2);

  //     expect(balancesMerged.length).toStrictEqual(numAccounts);

  //     balancesMerged.forEach((b, i) => {
  //       if (i > 0) {
  //         const bPrev = balancesMerged[i - 1];
  //         expect(parseInt(bPrev.amount)).toBeLessThanOrEqual(
  //           parseInt(b.amount),
  //         );
  //       }
  //     });
  //   }
  // });

  // it(`returns balances correctly ordered by size`, async () => {
  //   // Create random accounts by funding them with 0.000001 junox
  //   const numAccounts = 100;
  //   const accountAddresses = randomAddresses({
  //     prefix: "juno",
  //     n: numAccounts,
  //   });

  //   // Fund them in batches to ensure we don't run out of gas
  //   await admin.client.signAndBroadcast(
  //     admin.address,
  //     accountAddresses.map((toAddress) => {
  //       return {
  //         typeUrl: "/cosmos.bank.v1beta1.MsgSend",
  //         value: {
  //           fromAddress: admin.address,
  //           amount: [coin("1", "ujunox")],
  //           toAddress,
  //         },
  //       };
  //     }),
  //     "auto",
  //   );

  //   let totalAmount = 0;
  //   const expectedBalances: string[] = [];

  //   // Create a new CW20 token
  //   const { contractAddress: fromContractAddress } = await admin.instantiate({
  //     codeId,
  //     msg: {
  //       symbol: "SRC",
  //       name: "Source Token",
  //       decimals: 6,
  //       mint: { minter: admin.address },
  //       marketing: {
  //         project: "Project Name",
  //         description: "Description Text",
  //         logo: { url: "http://logo.test" },
  //         marketing: admin.address,
  //       },
  //       initial_balances: accountAddresses
  //         .map((address) => {
  //           const amount = 1 + randomInt(1e6 - 1);
  //           totalAmount += amount;
  //           expectedBalances.push(amount.toString());
  //           return {
  //             address,
  //             amount: amount.toString(),
  //           };
  //         })
  //     },
  //     admin: admin.address,
  //   });

  //   const { contractAddress } = await admin.instantiate({
  //     codeId,
  //     msg: {
  //       symbol: "DEST",
  //       name: "Destination Token",
  //       decimals: 6,
  //       mint: { minter: admin.address },
  //       initial_balances: [],
  //       marketing: {
  //         project: "Project Name",
  //         description: "Description Text",
  //         logo: { url: "http://logo.test" },
  //         marketing: admin.address,
  //       },
  //     },
  //     admin: admin.address,
  //   });

  //   {
  //     const result = await admin.execute({
  //       instructions: {
  //         contractAddress, msg: {
  //           pro: {
  //             copy_balances: { cw20_address: fromContractAddress, mode: 'replace' }
  //           }
  //         }
  //       }
  //     });

  //     const { balances: srcBalances } = await admin.query<{ balances: any[] }>({
  //       contractAddress: fromContractAddress,
  //       msg: { pro: { balances: { all: { limit: 200 } } } },
  //     });

  //     const { balances: dstBalances } = await admin.query<{ balances: any[] }>({
  //       contractAddress,
  //       msg: { pro: { balances: { all: { limit: 200 } } } },
  //     });

  //     expect(extractEventAttributeValue(result.events, "wasm", "done")).toStrictEqual("false")
  //     expect(srcBalances.length).toStrictEqual(100)
  //     expect(dstBalances.length).toStrictEqual(50)
  //   }

  //   {
  //     const result = await admin.execute({
  //       instructions: {
  //         contractAddress, msg: {
  //           pro: {
  //             copy_balances: { cw20_address: fromContractAddress, mode: 'replace' }
  //           }
  //         }
  //       }
  //     });

  //     const { balances: srcBalances } = await admin.query<{ balances: any[] }>({
  //       contractAddress: fromContractAddress,
  //       msg: { pro: { balances: { all: { limit: 200 } } } },
  //     });

  //     const { balances: dstBalances } = await admin.query<{ balances: any[] }>({
  //       contractAddress,
  //       msg: { pro: { balances: { all: { limit: 200 } } } },
  //     });

  //     expect(extractEventAttributeValue(result.events, "wasm", "done")).toStrictEqual("true")
  //     expect(dstBalances.length).toStrictEqual(100)
  //     expect(srcBalances).toStrictEqual(dstBalances)
  //   }

  // })

  it(`allows operator to be set`, async () => {
    // Create a new CW20 token
    const { contractAddress } = await admin.instantiate({
      codeId,
      msg: {
        symbol: "TEST",
        name: "Test",
        decimals: 6,
        mint: { minter: admin.address },
        marketing: {
          project: "Project Name",
          description: "Description Text",
          logo: { url: "http://logo.test" },
          marketing: admin.address,
        },
        initial_balances: [],
      },
      admin: admin.address,
    });

    await admin.execute({
      instructions: {
        contractAddress,
        msg: { pro: { set_operator: { address: user1.address } } },
      },
    });
  });
});
