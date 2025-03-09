import setup from "../../lib/setup";
import Agent, { defaultChainConfig } from "../../lib/Agent";
import { faker } from "@faker-js/faker";
import assert from "assert";
import { b64encode, sleep } from "../../lib/helpers";
import {calculateAmountToPay, addAddressesToWhitelist, assertError, manualGenerate, queryRequestStatus} from "../../lib/CwRandomhelpers";
import { extractEventAttributeValueByKey } from "../../lib/helpers";
import { Coin, StdFee } from "@cosmjs/amino";

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
const ACCEPTED_DENOM = defaultChainConfig.denomMicro;
const GAS_LIMIT = "250000" // Maximum Expected gas that must be used to resolve the game
// minimum bet must be an integer value of the gas limit divided by the gas price
let min_bet = Number(GAS_LIMIT) * Number(defaultChainConfig.gasPrice.amount);
const MIN_BET = (Math.ceil(min_bet)*5).toString();
const MAX_BET = (Number(MIN_BET)*10).toString();
const DISABLED = false;

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


function sendExactNumberPlayRequest(player:Agent, rollADiceContractAddress: string, funds: string, chosen_number: number) {
  return player.execute({
    instructions: [
      {
        contractAddress: rollADiceContractAddress,
        msg: {
          play_request: {
            game_type: {
              exact_number: {
                chosen_number: chosen_number,
              }
            }
          },
        },
        funds: [{ denom: ACCEPTED_DENOM, amount: funds }],
      },
    ],
  });
}

function sendHighLowPlayRequest(player:Agent, rollADiceContractAddress: string, funds: string, dice_number: number) {
  return player.execute({
    instructions: [
      {
        contractAddress: rollADiceContractAddress,
        msg: {
          play_request: {
            game_type: {
              high_low: {
                dice_number: dice_number,
              }
            }
          },
        },
        funds: [{ denom: ACCEPTED_DENOM, amount: funds }],
      },
    ],
  });
}

function queryGameStatus(player:Agent, rollADiceContractAddress: string, game_id: string) {
  return player.query<{id:string,
    status:string,
    user_address: string,
    bet_amount: string,
    bet_currency: string,
    created_at: string,
    updated_at: string,
    potential_winning_amount: string,
    dice_results: string| null,
    error_message: string,
    game_type: any,
    randomness_request_id: string | null,
    randomness_serving_block_height: string | null,
  }>({
    contractAddress: rollADiceContractAddress,
    msg: {
      query_game: {
        id: game_id
      }
    }
  });
}

function queryUserGames(querier:Agent, rollADiceContractAddress: string, player:string, cursor: number | null, limit: number) {  
  return querier.query({
    contractAddress: rollADiceContractAddress,
    msg: {
      user_games_query: {
        user_address: player,
        cursor: cursor,
        limit: limit,
      }
    }
  });
}


describe(`roll-a-dice`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId_cw_random: number;
  let codeId_roll_a_dice: number;

  beforeAll(async () => {
    const users = await setup({ instantiateQuoteToken: false });
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId_cw_random = await admin.upload({
      contract: "cw-random",
      build: "dev",
      force: true,
    });

    codeId_roll_a_dice = await admin.upload({
      contract: "roll-a-dice",
      build: "dev",
      force: true,
    });

  });

  it(`play games`, async () => {
    // Create a new cw-random contract instance
  //   pub struct Config {
  //     pub gas_to_token_ratio: Uint64,
  //     pub gas_price_per_job: Uint64,
  //     pub denom_accepted: String,
  //     pub max_gas_per_block: Uint64,
  //     pub operator: Option<Addr,>,
  //     pub max_recipients: u16,
  //     pub max_job_per_request: u16,
  //     pub max_number_for_job: u16,
  // }
    let random_cw_config = {
      gas_to_token_ratio: BigInt(75).toString(), // it's 0.075
      gas_price_per_job: BigInt(1000).toString(),
      denom_accepted: "ujunox",
      max_gas_per_block: BigInt(2000000).toString(),
      operator: null,
      max_recipients: 10,
      max_job_per_request: 10,
      max_number_for_job: 10,
      gas_offset: BigInt(100000).toString(),
    }
    const { contractAddress: randomCWContractAddress } = await admin.instantiate({
        codeId: codeId_cw_random,
      msg: {
        config: random_cw_config,
        starting_seed: "testtest123",
      },
    });

    

    console.log(randomCWContractAddress);

    let roll_a_dice_config = getDefaultRollADiceConfigMsg(randomCWContractAddress, admin.address);
    const { contractAddress: rollADiceContractAddress } = await admin.instantiate({
      codeId: codeId_roll_a_dice,
      msg: {
        config: roll_a_dice_config,
      },
    });

    // query the config
    const configResult: { operator: string,
      fee_percentage: string,
      random_cw_address: string,
      accepted_denom: string,
      disabled: boolean,
      min_bet: string,
      gas_limit: string,
      max_bet: string
     } = await admin.query({
      contractAddress: rollADiceContractAddress,
      msg: {
        config: {}
      }
    });
    console.log(configResult);
    console.log(roll_a_dice_config);
    assertRollADiceConfig(configResult, roll_a_dice_config);
    // check error because CW Config is not fetched
    // assertError("RandomConfigNotSet",() => sendExactNumberPlayRequest(user1, rollADiceContractAddress, MIN_BET, 5));
    console.log(await fetchRandomCWConfig(admin, rollADiceContractAddress));
    // check error when the address is not in the whitelist, if roll-a-dice is not in the whitelist, it can't request randomness
    // so the play request is expected to fail and refunded
    let play_request_response = await sendExactNumberPlayRequest(admin, rollADiceContractAddress, MIN_BET, 5);
    // query the game status
    let game_id = extractEventAttributeValueByKey(play_request_response.events, "game_id");
    let game_status = await queryGameStatus(user1, rollADiceContractAddress, game_id);
    console.log(game_status);
    assert(game_status.status == "refunded");

    console.log(await addAddressesToWhitelist(admin, randomCWContractAddress, [rollADiceContractAddress]));

    let admin_balance = await admin.queryBalance({ denom: defaultChainConfig.denomMicro }, admin.address);
    console.log("Admin Balance: ",admin_balance);

    // send some funds to the contract roll a dice to play
    const gasAmount = "100000";

    console.log(await admin.transfer({
      token: { denom: ACCEPTED_DENOM },
      recipient: rollADiceContractAddress,
      amount: MAX_BET,
    },{amount:[{"denom":"ujunox", "amount":gasAmount}],gas:gasAmount}
  ));
  console.log(await admin.transfer({
    token: { denom: ACCEPTED_DENOM },
    recipient: randomCWContractAddress,
    amount: MAX_BET,
  },{amount:[{"denom":"ujunox", "amount":gasAmount}],gas:gasAmount}
));
    // {amount:[{"denom":"ujunox", "amount":gasAmount}],gas:gasAmount}
    // query roll a dice balance
    let roll_a_dice_balance = await admin.queryBalance({ denom: defaultChainConfig.denomMicro }, rollADiceContractAddress);
    console.log("Roll a Dice Balance: ",roll_a_dice_balance);
    assert (parseInt(roll_a_dice_balance) >= Number(MAX_BET));

    play_request_response = await sendExactNumberPlayRequest(admin, rollADiceContractAddress, MIN_BET, 5);
    console.log("play_request_response :",play_request_response);
    game_id = extractEventAttributeValueByKey(play_request_response.events, "game_id");
    game_status = await queryGameStatus(user1, rollADiceContractAddress, game_id);
    console.log(game_status);
    let randomness_request_id_1 = game_status.randomness_request_id;
    let request_status_1 = await queryRequestStatus(user1, randomCWContractAddress, randomness_request_id_1);
    console.log(request_status_1);
    assert(game_status.status == "requested");

    // sleep(2000);
    console.log(await manualGenerate(admin, randomCWContractAddress, ACCEPTED_DENOM, "0", "testtest123", null));
    // console.log(await manualGenerate(admin, randomCWContractAddress, ACCEPTED_DENOM, "0", "testtest123", null));
    // console.log(await manualGenerate(admin, randomCWContractAddress, ACCEPTED_DENOM, "0", "testtest123", null));
    // sleep(2000);
    game_status = await queryGameStatus(user1, rollADiceContractAddress, game_id);
    console.log(game_status);
    let randomness_request_id = game_status.randomness_request_id;
    let request_status = await queryRequestStatus(user1, randomCWContractAddress, randomness_request_id);
    console.log(request_status);
    assert(game_status.status == "won" || game_status.status == "lost" || game_status.status == "refunded");

    let requests = [];
    let users = [admin, user1, user2];
    for (let i = 0; i < users.length; i++) {
      requests.push(sendExactNumberPlayRequest(users[i], rollADiceContractAddress, MIN_BET, 6));
    }
    requests = await Promise.all(requests);
    console.log(await manualGenerate(admin, randomCWContractAddress, ACCEPTED_DENOM, "0", "testtest123", null));
    console.log(await manualGenerate(admin, randomCWContractAddress, ACCEPTED_DENOM, "0", "testtest123", null));
    console.log(await manualGenerate(admin, randomCWContractAddress, ACCEPTED_DENOM, "0", "testtest123", null));

    let game_ids = [];
    let queries = [];
    let requests_ids = [];
    console.log(requests);
    for (let i = 0; i < users.length; i++) {
      let game_id = extractEventAttributeValueByKey(requests[i].events, "game_id");
      game_ids.push(game_id);
      queries.push(queryGameStatus(user1, rollADiceContractAddress, game_id));
    }
    let statuses = await Promise.all(queries);

    console.log(statuses);
    for (let i = 0; i < users.length; i++) {
      let randomness_request_id = statuses[i].randomness_request_id;
      console.log(await queryRequestStatus(user1, randomCWContractAddress, randomness_request_id));
      assert(statuses[i].status == "won" || statuses[i].status == "lost" || statuses[i].status == "refunded");
    }




});
});
