import Agent from "../lib/Agent";
import { Addr } from "../lib/types";

export type TaxRecipientInitArgs = {
  address: Addr;
  name?: string;
  logo?: string;
  pct: string;
  autosend: boolean;
  immutable: boolean;
};

export async function claim({
  houseAddress,
  user,
}: {
  houseAddress: string;
  user: Agent;
}) {
  return await user.execute({
    instructions: {
      contractAddress: houseAddress,
      msg: {
        claim: {
          token: { denom: "ujunox" },
        },
      },
    },
  });
}

export async function deposit({
  houseAddress,
  user,
  amount,
}: {
  houseAddress: string;
  user: Agent;
  amount: BigInt | string;
}) {
  return await user.execute({
    instructions: {
      contractAddress: houseAddress,
      funds: [{ denom: "ujunox", amount: amount.toString() }],
      msg: {
        deposit: {
          amount: amount.toString(),
          token: { denom: "ujunox" },
        },
      },
    },
  });
}

export async function unstake({
  houseAddress,
  user,
  amount,
}: {
  houseAddress: string;
  user: Agent;
  amount: BigInt | string;
}) {
  return await user.execute({
    instructions: {
      contractAddress: houseAddress,
      msg: {
        unstake: {
          amount: amount.toString(),
        },
      },
    },
  });
}

export async function delegate({
  houseAddress,
  user,
  amount,
}: {
  houseAddress: string;
  user: Agent;
  amount: BigInt | string;
}) {
  return await user.execute({
    instructions: {
      contractAddress: houseAddress,
      funds: [{ denom: "ujunox", amount: amount.toString() }],
      msg: {
        stake: {
          amount: amount.toString(),
        },
      },
    },
  });
}

export async function queryHouse({
  user,
  houseAddress,
}: {
  user: Agent;
  houseAddress: string;
}) {
  return await user.query({
    contractAddress: houseAddress,
    msg: { house: {} },
  });
}

export async function queryDeposits({
  user,
  houseAddress,
}: {
  user: Agent;
  houseAddress: string;
}) {
  return await user.query({
    contractAddress: houseAddress,
    msg: { deposits: {} },
  });
}

export async function queryTaxes({
  user,
  houseAddress,
}: {
  user: Agent;
  houseAddress: string;
}) {
  return await user.query({
    contractAddress: houseAddress,
    msg: { taxes: {} },
  });
}

export async function queryAccount({
  user,
  houseAddress,
}: {
  user: Agent;
  houseAddress: string;
}) {
  return await user.query({
    contractAddress: houseAddress,
    msg: { account: { address: user.address } },
  });
}
