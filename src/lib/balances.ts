import Agent from "./Agent";
import { Addr } from "./types";

export async function fetchAllCw20Balances(
  admin: Agent,
  tokenAddress: Addr,
): Promise<Array<{ address: Addr; amount: string }>> {
  const balances: Array<{ address: Addr; amount: string }> = [];

  let addresses: Addr[] = [];
  let start_after: string;

  while (true) {
    const { accounts } = await admin.query<{ accounts: string[] }>({
      contractAddress: tokenAddress,
      msg: { all_accounts: { limit: 30, start_after } },
    });

    if (accounts.length > 0) {
      start_after = accounts[accounts.length - 1];
      addresses = addresses.concat(accounts);
    } else {
      break;
    }
  }

  const balanceAmounts = await Promise.all(
    addresses.map((address) =>
      admin.queryBalance({ address: tokenAddress }, address),
    ),
  );

  return addresses.map((address, i) => ({
    address,
    amount: balanceAmounts[i],
  }));
}
