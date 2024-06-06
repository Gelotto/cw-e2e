import { fromMicroDenom, toMicroDenom } from "./helpers";
import Agent, { DENOM_MICRO } from "./Agent";

const ADMIN_MNEMONIC =
  "clip hire initial neck maid actor venue client foam budget lock catalog sweet " +
  "steak waste crater broccoli pipe steak sister coyote moment obvious choose";

const USER1_MNEMONIC =
  "maximum decide hen peace police chair enforce speak treat whale burst answer uncle " +
  "north family horse develop exercise foster method refuse fold park announce";

const USER2_MNEMONIC =
  "filter suspect goat bargain fortune network spoil gate gift shadow sister organ " +
  "match popular heart flip invest skirt employ faint razor knock relief file";

export default async function setup(): Promise<Agent[]> {
  const admin = await Agent.connect(ADMIN_MNEMONIC);
  const user1 = await Agent.connect(USER1_MNEMONIC);
  const user2 = await Agent.connect(USER2_MNEMONIC);

  // Ensure each user has a ujunox balance of at least 1 by transfering the
  // difference from the admin account.
  for (const user of [user1, user2]) {
    const balance = fromMicroDenom(
      await user.queryBalance({ denom: DENOM_MICRO }),
    );
    if (balance < 1) {
      await admin.transfer({
        token: { denom: DENOM_MICRO },
        recipient: user.address,
        amount: toMicroDenom(1 - balance),
      });
    }
  }

  return [admin, user1, user2];
}
