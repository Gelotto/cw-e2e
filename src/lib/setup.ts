import { fromMicroDenom, pretty, toMicroDenom } from "./helpers";
import { globals } from "../lib/globals";
import Agent, { ChainConfig, defaultChainConfig } from "./Agent";

const ADMIN_MNEMONIC =
  "clip hire initial neck maid actor venue client foam budget lock catalog sweet " +
  "steak waste crater broccoli pipe steak sister coyote moment obvious choose";

const USER1_MNEMONIC =
  "maximum decide hen peace police chair enforce speak treat whale burst answer uncle " +
  "north family horse develop exercise foster method refuse fold park announce";

const USER2_MNEMONIC =
  "filter suspect goat bargain fortune network spoil gate gift shadow sister organ " +
  "match popular heart flip invest skirt employ faint razor knock relief file";

export default async function setup(
  { instantiateQuoteToken }: { instantiateQuoteToken: boolean } = {
    instantiateQuoteToken: true,
  },
  {mnemonics} : {mnemonics: string[]} = {mnemonics: []},
  config?: ChainConfig
): Promise<Agent[]> {
  let admin, user1, user2: Agent;
  console.log("Using mnemonics ",mnemonics ,"having length ", mnemonics.length);
  if (mnemonics.length == 3) {
    console.log("Using provided mnemonics");
    admin = await Agent.connect(mnemonics[0], config);
    user1 = await Agent.connect(mnemonics[1], config);
    user2 = await Agent.connect(mnemonics[2], config);
  } else {
    admin = await Agent.connect(ADMIN_MNEMONIC);
    user1 = await Agent.connect(USER1_MNEMONIC);
    user2 = await Agent.connect(USER2_MNEMONIC);
  
    // Ensure each user has a ujunox balance of at least 1 by transfering the
    // difference from the admin account.
    for (const user of [user1, user2]) {
      const balance = parseInt(
        await user.queryBalance({ denom: defaultChainConfig.denomMicro }),
      );
      console.log("User", user.address, " has balance ", balance);
      if (balance < 1e6) {
        console.log("Transfering funds ",(1e6 - balance).toFixed() ," to user", user.address);
        console.log(await admin.transfer({
          token: { denom: defaultChainConfig.denomMicro },
          recipient: user.address,
          amount: (1e6 - balance).toFixed(),
        },{amount:[{"denom":defaultChainConfig.denomMicro, "amount":"15000"}],gas:"200000"}));
      }
    }
  }

  if (instantiateQuoteToken) {
    const codeId = await admin.upload({
      contract: "cw20-base",
      build: "1.0.0",
    });
    const result = await admin.instantiate({
      codeId,
      msg: {
        decimals: 18,
        name: "Foo Coin",
        symbol: "FOO",
        initial_balances: [
          {
            amount: BigInt(1_000_000 * 1e18).toString(),
            address: admin.address,
          },
          {
            amount: BigInt(1_000_000 * 1e18).toString(),
            address: user1.address,
          },
          {
            amount: BigInt(1_000_000 * 1e18).toString(),
            address: user2.address,
          },
        ],
        min: {
          cap: BigInt(1e9 * 1e18).toString(),
          minter: admin.address,
        },
      },
    });

    globals.cw20CodeId = codeId;
    globals.quoteTokenAddress = result.contractAddress;
    pretty({ globals });
  }

  return [admin, user1, user2];
}
