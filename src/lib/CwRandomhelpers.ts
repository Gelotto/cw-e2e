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