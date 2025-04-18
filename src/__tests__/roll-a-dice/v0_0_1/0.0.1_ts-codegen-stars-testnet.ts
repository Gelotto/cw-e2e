import setup from "../../../lib/setup";
import Agent, { chainConfigs } from "../../../lib/Agent";
import { faker } from "@faker-js/faker";
import assert from "assert";
import { b64encode, sleep } from "../../../lib/helpers";
import {calculateAmountToPay, addAddressesToWhitelist, assertError, manualGenerate, queryRequestStatus} from "../../../lib/CwRandomhelpers";
import { extractEventAttributeValueByKey } from "../../../lib/helpers";
import { Coin, StdFee } from "@cosmjs/amino";
import { CwRandomClient } from "./CwRandom.client";
import { RollADiceClient } from "./RollADice.client";
import { ConfigResponse as RollADiceConfigResponse} from "./RollADice.types";
import { ConfigResponse as CwRandomConfigResponse } from "./CwRandom.types";


// function to get default roll_a_dice config
// pub struct ConfigMsg {
//   pub fee_percentage: String,
//   pub random_cw_address: Addr,
//   pub accepted_denom: String,
//   pub operator: Option<Addr,>,
//   pub disabled: bool,
//   pub min_bet: String,
//   pub gas_limit: String,
//   pub max_bet: String,
// }
const defaultChainConfig = chainConfigs["stargaze_testnet"];
const ACCEPTED_DENOM = defaultChainConfig.denomMicro;
const GAS_LIMIT = "250000" // Maximum Expected gas that must be used to resolve the game
// minimum bet must be an integer value of the gas limit divided by the gas price
let min_bet = Number(GAS_LIMIT) * Number(defaultChainConfig.gasPrice.amount);
const MIN_BET = (Math.ceil(min_bet)*5).toString();
const MAX_BET = (Number(MIN_BET)*10).toString();
const DISABLED = false;

function calculateAmountByGas(gas: string, gas_price: string): string {
  let gas_amount = Number(gas);
  let token_amount = Math.ceil(gas_amount * Number(gas_price));
  return token_amount.toString();
}

async function manualGenerateTSCodegen(admin:CwRandomClient, denom: string, amount: string | null,
  randomness: string | null, height_id: string | null
) {
  let gas_required = "500000";
  let funds = [];
  if (amount != "0" && amount != null) {
    funds.push({ denom: denom, amount: amount });
  }
  return admin.generate({
    heightId: height_id,
    randomness: randomness,
  }, {amount:[{"denom":ACCEPTED_DENOM, "amount":calculateAmountByGas(gas_required,defaultChainConfig.gasPrice.amount.toString())}],gas:gas_required},
  undefined, funds);
}

function getDefaultRollADiceConfigMsg(random_cw_address: string, operator: string | null) {
  return {
      fee_percentage: "5",
      random_cw_address: random_cw_address,
      accepted_denom: ACCEPTED_DENOM,
      operator: operator,
      disabled: DISABLED,
      min_bet: MIN_BET,
      gas_limit: GAS_LIMIT,
      max_bet: MAX_BET,
    };
}

function assertRollADiceConfig(config: any, expected: any) {
  assert(config.fee_percentage == expected.fee_percentage);
  assert(config.random_cw_address == expected.random_cw_address);
  assert(config.accepted_denom == expected.accepted_denom);
  assert(config.operator == expected.operator);
  assert(config.disabled == expected.disabled);
  assert(config.min_bet == expected.min_bet);
  assert(config.gas_limit == expected.gas_limit);
  assert(config.max_bet == expected.max_bet);
}

function fetchRandomCWConfig(admin:Agent, rollADiceContractAddress: string) {
  return admin.execute({
    instructions: [
      {
        contractAddress: rollADiceContractAddress,
        msg: {
          fetch_random_c_w_config: {
          },
        },
        funds: [],
      },
    ],
  });
}


// function sendExactNumberPlayRequest(player:Agent, rollADiceContractAddress: string, funds: string, chosen_number: number) {
//   return player.execute({
//     instructions: [
//       {
//         contractAddress: rollADiceContractAddress,
//         msg: {
//           play_request: {
//             game_type: {
//               exact_number: {
//                 chosen_number: chosen_number,
//               }
//             }
//           },
//         },
//         funds: [{ denom: ACCEPTED_DENOM, amount: funds }],
//       },
//     ],
//   });
// }

function sendExactNumberPlayRequest(player:RollADiceClient, denom:String, funds: string, chosen_number: number) {
  return player.playRequest({
    gameType: {
      exact_number: {
        chosen_number: chosen_number,
      }
    },
  }, "auto", undefined, [{ denom: denom.toString(), amount: funds }])
}

function sendHighLowPlayRequest(player:RollADiceClient, denom:String, funds: string, dice_number: number) {
  return player.playRequest({
    gameType: {
      high_low: {
        dice_number: dice_number,
      }
    },
  }, "auto", undefined, [{ denom: denom.toString(), amount: funds }])
}


describe(`roll-a-dice`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId_cw_random: number;
  let codeId_roll_a_dice: number;

  beforeAll(async () => {
    const stargaze_mnemonics = [
      "employ enforce violin dignity rural mammal shaft cake gain primary quarter fame",
      "wrestle adjust student detect shock grunt crucial gallery worth broken mean insane",
      "visit laptop awesome raw laundry dash reunion vehicle panel error auto cruise"
    ]
    const users = await setup({ instantiateQuoteToken: false }, {mnemonics: stargaze_mnemonics},
      defaultChainConfig
    );
    admin = users[0];
    user1 = users[1];
    user2 = users[2];
    await sleep(4000);
    codeId_cw_random = await admin.upload({
      contract: "cw-random",
      build: "dev-stargaze",
      force: true,
    });
    await sleep(3000);
    codeId_roll_a_dice = await admin.upload({
      contract: "roll-a-dice",
      build: "dev-stargaze",
      force: true,
    });

  });

  it(`play games`, async () => {

    let random_cw_config = {
      gas_to_token_ratio: BigInt(75).toString(), // it's 0.075
      gas_price_per_job: BigInt(1000).toString(),
      denom_accepted: ACCEPTED_DENOM,
      max_gas_per_block: BigInt(2000000).toString(),
      operator: null,
      max_recipients: 10,
      max_job_per_request: 10,
      max_number_for_job: 10,
      gas_offset: BigInt(100000).toString(),
    }

    await sleep(3000);
    const { contractAddress: randomCWContractAddress } = await admin.instantiate({
        codeId: codeId_cw_random,
      msg: {
        config: random_cw_config,
        starting_seed: "testtest123",
      },
    });
    let cw_random_admin_client = new CwRandomClient(admin.client, admin.address, randomCWContractAddress);
    

    console.log("Random CW Contract Address: ", randomCWContractAddress);
    await sleep(3000);
    let roll_a_dice_config = getDefaultRollADiceConfigMsg(randomCWContractAddress, admin.address);
    const { contractAddress: rollADiceContractAddress } = await admin.instantiate({
      codeId: codeId_roll_a_dice,
      msg: {
        config: roll_a_dice_config,
      },
    });
    console.log("Roll a Dice Contract Address: ", rollADiceContractAddress);
    let roll_a_dice_admin_client = new RollADiceClient(admin.client, admin.address, rollADiceContractAddress);
    let roll_a_dice_user1_client = new RollADiceClient(user1.client, user1.address, rollADiceContractAddress);
    let roll_a_dice_user2_client = new RollADiceClient(user2.client, user2.address, rollADiceContractAddress);

    const configResult: RollADiceConfigResponse  = await roll_a_dice_admin_client.config();

    console.log(configResult);
    console.log(roll_a_dice_config);
    assertRollADiceConfig(configResult, roll_a_dice_config);
    // check error because CW Config is not fetched
    await sleep(3000);
    assertError("RandomConfigNotSet",async () => await sendExactNumberPlayRequest(roll_a_dice_user1_client,ACCEPTED_DENOM,  MIN_BET, 5));
    await sleep(3000);
    console.log(await roll_a_dice_admin_client.fetchRandomCWConfig());
    // check error when the address is not in the whitelist, if roll-a-dice is not in the whitelist, it can't request randomness
    // so the play request is expected to fail and refunded
    await sleep(3000);
    let play_request_response = await sendExactNumberPlayRequest(roll_a_dice_user1_client, ACCEPTED_DENOM, MIN_BET, 5);
    // query the game status
    let game_id = extractEventAttributeValueByKey(play_request_response.events, "game_id");
    let game_status = await roll_a_dice_user1_client.queryGame({
      id: game_id
    })
    console.log(game_status);
    assert(game_status.status == "refunded");
    await sleep(3000);
    console.log(await cw_random_admin_client.addWhitelistedAddressMsg({
      addresses: [rollADiceContractAddress],
    }));


    let admin_balance = await admin.queryBalance({ denom: defaultChainConfig.denomMicro }, admin.address);
    console.log("Admin Balance: ",admin_balance);

    // send some funds to the contract roll a dice to play
    const gasAmount = "100000";
    const gasPrice = defaultChainConfig.gasPrice.amount.toString();
    await sleep(3000);
    console.log(await admin.transfer({
      token: { denom: ACCEPTED_DENOM },
      recipient: rollADiceContractAddress,
      amount: MAX_BET,
    },{amount:[{"denom":ACCEPTED_DENOM, "amount":calculateAmountByGas(gasAmount,gasPrice)}],gas:gasAmount}
  ));
  await sleep(3000);
  console.log(await admin.transfer({
    token: { denom: ACCEPTED_DENOM },
    recipient: randomCWContractAddress,
    amount: MAX_BET,
  },{amount:[{"denom":ACCEPTED_DENOM, "amount":calculateAmountByGas(gasAmount,gasPrice)}],gas:gasAmount}
));
    // {amount:[{"denom":"ujunox", "amount":gasAmount}],gas:gasAmount}
    // query roll a dice balance
    let roll_a_dice_balance = await admin.queryBalance({ denom: defaultChainConfig.denomMicro }, rollADiceContractAddress);
    console.log("Roll a Dice Balance: ",roll_a_dice_balance);
    assert (parseInt(roll_a_dice_balance) >= Number(MAX_BET));


    await sleep(3000);
    play_request_response = await sendExactNumberPlayRequest(roll_a_dice_admin_client, ACCEPTED_DENOM, MIN_BET, 5);
    console.log("play_request_response :",play_request_response);
    game_id = extractEventAttributeValueByKey(play_request_response.events, "game_id");
    game_status = await roll_a_dice_user1_client.queryGame({
      id: game_id
    });
    console.log(game_status);
    let randomness_request_id_1 = game_status.randomness_request_id;
    let request_status_1 = await cw_random_admin_client.queryRequest({
      id: randomness_request_id_1
    });
    // let request_status_1 = await queryRequestStatus(user1, randomCWContractAddress, randomness_request_id_1);
    console.log(request_status_1);
    assert(game_status.status == "requested");

    await sleep(3000);
    console.log(await manualGenerateTSCodegen(cw_random_admin_client, ACCEPTED_DENOM, null, "testtest123", null));
    // console.log(await manualGenerate(admin, randomCWContractAddress, ACCEPTED_DENOM, "0", "testtest123", null));
    // console.log(await manualGenerate(admin, randomCWContractAddress, ACCEPTED_DENOM, "0", "testtest123", null));
    // await sleep(3000);
    game_status = await roll_a_dice_user1_client.queryGame({
      id: game_id
    });
    console.log(game_status);
    let randomness_request_id = game_status.randomness_request_id;
    let request_status = await cw_random_admin_client.queryRequest({
      id: randomness_request_id
    });
    console.log(request_status);
    assert(game_status.status == "won" || game_status.status == "lost" || game_status.status == "refunded");

    let requests = [];
    let users = [roll_a_dice_admin_client, roll_a_dice_user1_client, roll_a_dice_user2_client];
    for (let i = 0; i < users.length; i++) {
      requests.push(sendExactNumberPlayRequest(users[i], ACCEPTED_DENOM, MIN_BET, 6));
    }
    requests = await Promise.all(requests);

    // get user1 and user2 balance
    let user1_balance = await user1.queryBalance({ denom: defaultChainConfig.denomMicro }, user1.address);
    let user2_balance = await user2.queryBalance({ denom: defaultChainConfig.denomMicro }, user2.address);
    console.log("Pre generation User1 Balance: ",user1_balance);
    console.log("Post generation User2 Balance: ",user2_balance);
    let pre_gen_balances = [user1_balance, user2_balance];

    console.log(await manualGenerateTSCodegen(cw_random_admin_client, ACCEPTED_DENOM, null, "testtest123", null));
    await sleep(3000);
    console.log(await manualGenerateTSCodegen(cw_random_admin_client, ACCEPTED_DENOM, null, "testtest123", null));
    await sleep(3000);
    console.log(await manualGenerateTSCodegen(cw_random_admin_client, ACCEPTED_DENOM, null, "testtest123", null));
    await sleep(3000);
    
    let post_generation_user1_balance = await user1.queryBalance({ denom: defaultChainConfig.denomMicro }, user1.address);
    let post_generation_user2_balance = await user2.queryBalance({ denom: defaultChainConfig.denomMicro }, user2.address);
    console.log("Post generation User1 Balance: ",post_generation_user1_balance);
    console.log("Post generation User2 Balance: ",post_generation_user2_balance);
    let post_gen_balances = [post_generation_user1_balance, post_generation_user2_balance];
    let game_ids = [];
    let queries = [];
    let requests_ids = [];
    console.log(requests);
    for (let i = 0; i < users.length; i++) {
      let game_id = extractEventAttributeValueByKey(requests[i].events, "game_id");
      game_ids.push(game_id);
      queries.push(roll_a_dice_user1_client.queryGame(
        {
          id: game_id
        }
      ));
    }
    let statuses = await Promise.all(queries);

    console.log(statuses);
    for (let i = 0; i < users.length; i++) {
      let randomness_request_id = statuses[i].randomness_request_id;
      console.log(await cw_random_admin_client.queryRequest({
        id: randomness_request_id
      }));
      assert(statuses[i].status == "won" || statuses[i].status == "lost" || statuses[i].status == "refunded");
    }
});
});
