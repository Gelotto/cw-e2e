import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { faker } from "@faker-js/faker";
import assert from "assert";
import { b64encode } from "../../lib/helpers";
import {calculateAmountToPay} from "../../lib/CwRandomhelpers";
import { extractEventAttributeValueByKey } from "../../lib/helpers";

describe(`cw-random`, () => {
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
      contract: "cw-random",
      build: "dev",
      force: true,
    });
  });

  it(`request randomness`, async () => {
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
    let config = {
      gas_to_token_ratio: BigInt(75).toString(), // it's 0.075
      gas_price_per_job: BigInt(1000).toString(),
      denom_accepted: "ujunox",
      max_gas_per_block: BigInt(1000000).toString(),
      operator: null,
      max_recipients: 10,
      max_job_per_request: 10,
      max_number_for_job: 10,
      gas_offset: BigInt(100000).toString(),
    }
    const { contractAddress } = await admin.instantiate({
      codeId,
      msg: {
        config: config,
        starting_seed: "testtest123",
      },
    });

    console.log(contractAddress);

    // query the config
    const configResult: { operator: string } = await admin.query({
      contractAddress,
      msg: {
        query_config: {}
      }
    });
    assert(configResult.operator == admin.address);

    let jobs = [];
    let u8_job = {
      u8: {
        min: 0,
        max: 255,
        n:10
      }
    };
    jobs.push(u8_job);

    let request_msg = {
      height : null,
      recipients: null,
      jobs:jobs,
      prng: null,
      gas_limit: "1000",
      response_id: "0",
    };

    // request randomness (this must fail because the address is not in a whitelist)
    try {
      await admin.execute({
        instructions: [
          {
            contractAddress,
            msg: {
              request: request_msg
            },
            funds: [{ denom: "ujunox", amount: "1" }],
          },
        ],
      });
    } catch (error) {
      console.error("Expected error:", error);

    if (error.message.includes("NotAuthorized")) {
      console.log("The address is not authorized to request randomness.");
    } else {
      // If the error is not the expected one, rethrow it
      throw error;
    }
  }

  // Add the address to the whitelist and request randomness
  await admin.execute({
    instructions: [
      {
        contractAddress,
        msg: {
          add_whitelisted_address_msg: {
            addresses: [admin.address],
          },
        },
        funds: [{ denom: "ujunox", amount: "1" }],
      },
    ],

  });
  // request randomness
  let response = await admin.execute({
    instructions: [
      {
        contractAddress,
        msg: {
          request: request_msg
        },
        funds: [{ denom: "ujunox", amount: (calculateAmountToPay(request_msg,config)).toString() }],
      },
    ],
  });
  console.log(response);
  let first_req_id = extractEventAttributeValueByKey(response.events, "request_id");

  response = await admin.execute({
    instructions: [
      {
        contractAddress,
        msg: {
          request: request_msg
        },
        funds: [{ denom: "ujunox", amount: (calculateAmountToPay(request_msg,config)).toString() }],
      },
    ],
  });
  console.log(response);
  let second_request_id = extractEventAttributeValueByKey(response.events, "request_id");
  //manual generate

  response = await admin.execute({
    instructions: [
      {
        contractAddress,
        msg: {
          generate: {
            height_id: null,
            randomness: null,
          }
        },
        funds: [{ denom: "ujunox", amount: "100" }],
      },
    ],
  });

  //query 
  let response_first_query_request = await admin.query({
    contractAddress,
    msg: {
      request: {
        id: first_req_id,
      }
    }
  });
  console.log(response_first_query_request);

  //query 
  let response_second_query_request = await admin.query({
    contractAddress,
    msg: {
      request: {
        id: second_request_id,
      }
    }
  });
  console.log(response_second_query_request);

  // query the config
  // const configResult: { operator: string } = await admin.query({
  //   contractAddress,
  //   msg: {
  //     config: {}
  //   }
  // });

});
});
