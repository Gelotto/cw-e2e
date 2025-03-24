import assert from "assert";
import Agent from "./Agent";

// let config = {
//   gas_to_token_ratio: BigInt(75).toString(), // it's 0.075
//   gas_price_per_job: BigInt(1000).toString(),
//   denom_accepted: "ujunox",
//   max_gas_per_block: BigInt(1000000).toString(),
//   operator: null,
//   max_recipients: 10,
//   max_job_per_request: 10,
//   max_number_for_job: 10,
//   gas_offset: BigInt(100000).toString(),
// }

export function calculateAmountToPay(requestMsg, config) {
    let num_of_recipients = 1;
    if (requestMsg.recipients != null) {
      num_of_recipients = requestMsg.recipients.length;
    }
    let gas_amount = Number(requestMsg.gas_limit) * num_of_recipients;
    let jobs_num = requestMsg.jobs.length;
    let gas_price = Number(config.gas_price_per_job);
    let gas_to_token_ratio = Number(config.gas_to_token_ratio);
    gas_amount += jobs_num * gas_price;
    console.log("Gas amount to pay: ", gas_amount);
    gas_amount += Number(config.gas_offset);
    console.log("Gas amount to pay with offset: ", gas_amount);
    let token_amount = Math.ceil(gas_amount * gas_to_token_ratio / 1000);
    console.log("Token amount to pay: ", token_amount); 

    return token_amount;
  }

export function addAddressesToWhitelist(admin:Agent, randomCWContractAddress, addresses: string[]) {
    return admin.execute({
      instructions: [
        {
          contractAddress: randomCWContractAddress,
          msg: {
            add_whitelisted_address_msg: {
              addresses: addresses,
            },
          },
          funds: [],
        },
      ],
    });
  }

export async function assertError(expectedError: string,fn: (...args: any[]) => any, ...args: any[]) {
    let has_raised_error = false;
    try {
      await fn(...args);
    } catch (error) {
      if (error.message.includes(expectedError)) {
        has_raised_error = true;
        console.log("The error message is as expected.");
      }
      else {
      console.error("Found error:", error);
      throw error;
      }
    }
    assert(has_raised_error);
  }

  export async function manualGenerate(admin:Agent, randomCWContractAddress, denom: string, amount: string,
    randomness: string | null, height_id: string | null
  ) {
    let funds = [];
    if (amount != "0") {
      funds.push({ denom: denom, amount: amount });
    }
    return admin.execute({
      instructions: [
        {
          contractAddress: randomCWContractAddress,
          msg: {
            generate: {
              height_id: height_id,
              randomness: randomness,
            },
          },
          funds: funds,
        },
      ],
      fee:{amount:[{"denom":"ujunox", "amount":"100000"}],gas:"500000"}
    });
  }

  export async function queryRequestStatus(user:Agent, randomCWContractAddress, request_id: string) {
    return user.query({
      contractAddress: randomCWContractAddress,
      msg: {
        query_request: {
          id: request_id,
        },
      },
    });
  }