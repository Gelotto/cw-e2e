import Agent, { chainConfigs } from "../lib/Agent";
import { show } from "../lib/helpers";

async function main() {
  const admin = await Agent.connectAdmin("stargaze");
  const config = chainConfigs["stargaze"];

  const controllerCodeId = await admin.upload({
    contract: "pampit-controller",
    build: "0.4.1",
    force: true,
  });

  show({ controllerCodeId });

  const marketCodeId = await admin.upload({
    contract: "pampit-market",
    build: "0.4.1",
    force: true,
  });

  show({ marketCodeId });

  //   const tfCodeId = await admin.upload({
  //     contract: "cw-tokenfactory",
  //     build: "0.0.1",
  //     force: true,
  //   });

  //   const cw20CodeId = await admin.upload({
  //     contract: "cw20-base",
  //     build: "1.0.0",
  //     force: true,
  //   });

  //   show({ tfCodeId, cw20CodeId, controllerCodeId, marketCodeId });

  // const { contractAddress: controllerAddr } = await admin.instantiate({
  //   codeId: 848,
  //   admin: admin.address,
  //   label: "PampIt Token Launchpad Controller",
  //   msg: {
  //     market_code_id: "847",
  //     cw20_code_id: "850",
  //     tf_code_id: "849",
  //     manager: admin.address,
  //     presets: [
  //       {
  //         name: "osmosis",
  //         params: {
  //           decimals: 6,
  //           supply: (BigInt(21e6) * BigInt(1e6)).toString(),
  //           goal: (BigInt(10_000) * BigInt(1e6)).toString(),
  //           quote: {
  //             token: { denom: config.denomMicro },
  //             y_intercept: (BigInt(5_000) * BigInt(1e6)).toString(),
  //             min_buy_amount: BigInt(0.05e6).toString(),
  //             decimals: config.decimals,
  //             symbol: config.symbol,
  //           },
  //           fees: {
  //             fee_recipient: config.feeWallet,
  //             creation_fee: BigInt(3.5e6).toString(),
  //             buy_fee_pct: (0.01e6).toFixed(),
  //             sell_fee_pct: (0.01e6).toFixed(),
  //           },
  //           pamp: {
  //             manager: admin.address,
  //             burn_rate: BigInt(5e5).toString(),
  //             min_amount: BigInt(100e6).toString(),
  //             rates: [
  //               BigInt(1e4).toString(),
  //               BigInt(1e5).toString(),
  //               BigInt(1e6).toString(),
  //               BigInt(1e7).toString(),
  //               BigInt(1e8).toString(),
  //             ],
  //           },
  //         },
  //       },
  //     ],
  //   },
  // });

  // show({ controllerAddr });
}

main();
