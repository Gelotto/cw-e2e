import { b64encodeObject, extractEventAttributeValue } from "../../lib/helpers";
import { globals } from "../../lib/globals";
import Agent from "../../lib/Agent";

export async function sell({
  user,
  marketAddr,
  tokenAddr,
  tokenAmount: baseAmount,
}: {
  user: Agent;
  marketAddr: string;
  tokenAddr?: string | null;
  tokenAmount: string;
}) {
  if (!tokenAddr) {
    const {
      token: { denom },
    } = await queryMarketInfo({ user, marketAddr });
    tokenAddr = denom;
  }

  const result = await user.client.execute(
    user.address,
    tokenAddr,
    {
      send: {
        contract: marketAddr,
        amount: baseAmount,
        msg: b64encodeObject({ sell: {} }),
      },
    },
    "auto",
  );
  const amountOut = extractEventAttributeValue(
    result.events,
    "wasm",
    "out_amount",
  );
  return amountOut;
}

export async function buy({
  user,
  marketAddr,
  quoteTokenAddr,
  quoteAmount,
  denom,
}: {
  user: Agent;
  marketAddr: string;
  quoteTokenAddr?: string;
  quoteAmount: string;
  denom?: string;
}) {
  const result = await (denom
    ? user.client.execute(
        user.address,
        marketAddr,
        { buy: { amount: quoteAmount } },
        "auto",
        undefined,
        [{ denom, amount: quoteAmount }],
      )
    : user.client.execute(
        user.address,
        quoteTokenAddr,
        {
          send: {
            contract: marketAddr,
            amount: quoteAmount,
            msg: b64encodeObject({ buy: {} }),
          },
        },
        "auto",
        undefined,
      ));
  const amountOut = extractEventAttributeValue(
    result.events,
    "wasm",
    "out_amount",
  );
  return amountOut;
}

export async function refund({
  admin,
  marketAddr,
}: {
  admin: Agent;
  marketAddr: string;
}) {
  return await admin.client.execute(
    admin.address,
    marketAddr,
    {
      refund: {},
    },
    "auto",
  );
}

export async function queryMarketInfo({
  user,
  marketAddr,
  time,
}: {
  user: Agent;
  marketAddr: string;
  time?: Date;
}): Promise<any> {
  return await user.client.queryContractSmart(marketAddr, {
    market_info: {
      time: time ? (time.getTime() * 1e6).toFixed() : undefined,
    },
  });
}
