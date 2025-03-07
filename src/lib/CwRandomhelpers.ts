import assert from "assert";
import Agent from "./Agent";

export function calculateAmountToPay(requestMsg, config) {
    let num_of_recipients = 1;
    if (requestMsg.recipients != null) {
      num_of_recipients = requestMsg.recipients.length;
    }
    let gas_amount = requestMsg.gas_limit * num_of_recipients;
    let jobs_num = requestMsg.jobs.length;
    let gas_price = config.gas_price_per_job;
    let gas_to_token_ratio = config.gas_to_token_ratio;
    gas_amount += jobs_num * gas_price;
    let token_amount = gas_amount * gas_to_token_ratio / 1000; 
    return Math.floor(token_amount);
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
    });
  }