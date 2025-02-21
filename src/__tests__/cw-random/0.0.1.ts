import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import { faker } from "@faker-js/faker";
import assert from "assert";
import { b64encode } from "../../lib/helpers";


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
  //     pub gas_to_token_ratio: u64,
  //     pub gas_price_per_job: u64,
  //     pub denom_accepted: String,
  //     pub max_gas_per_block: u64,
  //     pub operator: Option<Addr,>,
  //     pub max_recipients: u16,
  //     pub max_job_per_request: u16,
  //     pub max_number_for_job: u16,
  // }
    let config = {
      gas_to_token_ratio: 75, // it's 0.075
      gas_price_per_job: 10,
      denom_accepted: "ujunox",
      max_gas_per_block: 1000000,
      operator: null,
      max_recipients: 10,
      max_job_per_request: 10,
      max_number_for_job: 10,
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
        config: {}
      }
    });
    assert(configResult.operator == admin.address);

  });
});
