import setup from "../../lib/setup";
import Agent from "../../lib/Agent";
import {
  show,
  fromMicroDenom,
  repeat,
  fromNanoseconds,
  extractEventAttributeValue,
} from "../../lib/helpers";
import {
  TaxRecipientInitArgs,
  claim,
  delegate,
  deposit,
  queryAccount,
  queryHouse,
  queryTaxes,
  unstake,
} from "../../contracts/sath";

describe(`cw-sath`, () => {
  let admin: Agent;
  let user1: Agent;
  let user2: Agent;
  let codeId: number;

  // const defaultContractAddress =
  //   "juno153r9tg33had5c5s54sqzn879xww2q2egektyqnpj6nwxt8wls70qsyfdq2";

  // const defaultDenom = `factory/${defaultContractAddress}/test`;

  const instantiateTestHouse = async (
    admin: Agent,
    options?: {
      unbondingSeconds?: BigInt | string | number;
      taxRecipients?: TaxRecipientInitArgs[];
    },
  ) =>
    await admin.instantiate({
      codeId,
      msg: {
        marketing: {
          name: "Test SATH",
          description: "Test SATH Smart Contract",
        },
        taxes: options?.taxRecipients ?? [],
        staking: {
          token: { denom: "ujunox" },
          unbonding_seconds: (options?.unbondingSeconds ?? "0").toString(),
        },
      },
    });

  beforeAll(async () => {
    const users = await setup();
    admin = users[0];
    user1 = users[1];
    user2 = users[2];

    codeId = await admin.upload({
      contract: "cw-sath",
      build: "0.0.1",
    });
  });

  // it(`instantiates normally`, async () => {
  //   const { contractAddress: houseAddress } = await instantiateTestHouse(admin);
  //   const info = await queryHouse({ user: admin, houseAddress });
  //   show(info);
  // });

  // it(`updates state correctly after registering new delegation`, async () => {
  //   const { contractAddress: houseAddress } = await instantiateTestHouse(admin);

  //   {
  //     const info = await queryHouse({
  //       houseAddress,
  //       user: admin,
  //     });

  //     show(info);
  //   }

  //   await delegate({ houseAddress, user: admin, amount: "100" });

  //   {
  //     const info = await queryHouse({
  //       user: admin,
  //       houseAddress: houseAddress,
  //     });

  //     show(info);
  //   }
  // });

  // it(`updates state correctly after depositing, distributing correct amounts`, async () => {
  //   const { contractAddress: houseAddress } = await instantiateTestHouse(admin);

  //   const depositDelta = BigInt(100);
  //   const stakingDelta = BigInt(100);

  //   // Running totals:
  //   let houseDelegation = BigInt(0);
  //   let a1Revenue = BigInt(0);
  //   let a1Delegation = BigInt(0);
  //   let a2Delegation = BigInt(0);
  //   let a2Revenue = BigInt(0);
  //   let houseRevenue = BigInt(0);

  //   // User 1 delegates
  //   await delegate({ houseAddress, user: user1, amount: stakingDelta });
  //   // Admin deposites rewards
  //   await deposit({ houseAddress, user: admin, amount: depositDelta });

  //   houseDelegation += stakingDelta;
  //   houseRevenue += depositDelta;
  //   a1Delegation += stakingDelta;
  //   a1Revenue += depositDelta;

  //   {
  //     const h = await queryHouse({ houseAddress, user: admin });
  //     const a1 = await queryAccount({ houseAddress, user: user1 });

  //     expect(h.delegation.amount).toStrictEqual(houseDelegation.toString());
  //     expect(a1.delegation).toStrictEqual(a1Delegation.toString());

  //     expect(h.balances[0].amount).toStrictEqual(houseRevenue.toString());
  //     expect(a1.balances[0].amount).toStrictEqual(a1Revenue.toString());
  //   }

  //   // User 2 delegates
  //   await delegate({ houseAddress, user: user2, amount: stakingDelta });
  //   // Admin deposites more rewards
  //   await deposit({ houseAddress, user: admin, amount: depositDelta });

  //   houseDelegation += stakingDelta;
  //   houseRevenue += depositDelta;
  //   a2Delegation += stakingDelta;
  //   a2Revenue += (depositDelta * a2Delegation) / houseDelegation;
  //   a1Revenue += (depositDelta * a1Delegation) / houseDelegation;

  //   {
  //     const h = await queryHouse({ houseAddress, user: admin });
  //     const a1 = await queryAccount({ houseAddress, user: user1 });
  //     const a2 = await queryAccount({ houseAddress, user: user2 });

  //     console.log("----------------");
  //     show({ h, a1, a2 });

  //     expect(h.delegation.amount).toStrictEqual(houseDelegation.toString());
  //     expect(a1.delegation).toStrictEqual(a1Delegation.toString());
  //     expect(a2.delegation).toStrictEqual(a2Delegation.toString());

  //     expect(h.balances[0].amount).toStrictEqual(houseRevenue.toString());
  //     expect(a1.balances[0].amount).toStrictEqual(a1Revenue.toString());
  //     expect(a2.balances[0].amount).toStrictEqual(a2Revenue.toString());
  //   }

  //   // Admin deposites more rewards
  //   await deposit({ houseAddress, user: admin, amount: depositDelta });
  //   // User 2 delegates AFTER deposit, so only user1 should have balance change.
  //   await delegate({ houseAddress, user: user2, amount: stakingDelta });

  //   houseRevenue += depositDelta;
  //   a1Revenue += (depositDelta * a1Delegation) / houseDelegation;
  //   a2Revenue += (depositDelta * a2Delegation) / houseDelegation;
  //   a2Delegation += stakingDelta;

  //   {
  //     const h = await queryHouse({ houseAddress, user: admin });
  //     const a1 = await queryAccount({ houseAddress, user: user1 });
  //     const a2 = await queryAccount({ houseAddress, user: user2 });

  //     console.log("----------------");
  //     show({ h, a1, a2 });

  //     expect(a1.delegation).toStrictEqual(a1Delegation.toString());
  //     expect(a2.delegation).toStrictEqual(a2Delegation.toString());

  //     expect(h.balances[0].amount).toStrictEqual(houseRevenue.toString());
  //     expect(a1.balances[0].amount).toStrictEqual(a1Revenue.toString());
  //     expect(a2.balances[0].amount).toStrictEqual(a2Revenue.toString());
  //   }

  //   houseDelegation += stakingDelta;

  //   {
  //     const h = await queryHouse({ houseAddress, user: admin });
  //     expect(h.delegation.amount).toStrictEqual(houseDelegation.toString());
  //   }

  //   await deposit({ houseAddress, user: admin, amount: depositDelta });
  //   await deposit({ houseAddress, user: admin, amount: depositDelta });
  //   await deposit({ houseAddress, user: admin, amount: depositDelta });

  //   houseRevenue += BigInt(3) * depositDelta;
  //   a1Revenue += (BigInt(3) * depositDelta * a1Delegation) / houseDelegation;
  //   a2Revenue += (BigInt(3) * depositDelta * a2Delegation) / houseDelegation;

  //   {
  //     const h = await queryHouse({ houseAddress, user: admin });
  //     const a1 = await queryAccount({ houseAddress, user: user1 });
  //     const a2 = await queryAccount({ houseAddress, user: user2 });

  //     console.log("----------------");
  //     show({ h, a1, a2 });

  //     expect(a1.delegation).toStrictEqual(a1Delegation.toString());
  //     expect(a2.delegation).toStrictEqual(a2Delegation.toString());

  //     expect(h.balances[0].amount).toStrictEqual(houseRevenue.toString());
  //     expect(a1.balances[0].amount).toStrictEqual(a1Revenue.toString());
  //     expect(a2.balances[0].amount).toStrictEqual(a2Revenue.toString());
  //   }
  // });

  // it(`processes claims for one user correctly`, async () => {
  //   const { contractAddress: houseAddress } = await instantiateTestHouse(admin);

  //   const depositDelta = BigInt(100);
  //   const stakingDelta = BigInt(100);

  //   // increase stake, earn, and claim twice over
  //   await repeat(2, async () => {
  //     await delegate({ houseAddress, user: user1, amount: stakingDelta });
  //     await deposit({ houseAddress, user: admin, amount: depositDelta });

  //     {
  //       const h = await queryHouse({ houseAddress, user: admin });
  //       const a = await queryAccount({ user: user1, houseAddress });

  //       expect(h.balances[0].amount).toStrictEqual(depositDelta.toString());
  //       expect(a.balances[0].amount).toStrictEqual(depositDelta.toString());
  //     }

  //     await claim({ houseAddress, user: user1 });

  //     {
  //       const h = await queryHouse({ houseAddress, user: admin });
  //       const a = await queryAccount({ user: user1, houseAddress });

  //       expect(h.balances).toStrictEqual([]);
  //       expect(a.balances).toStrictEqual([]);
  //     }
  //   });
  // });

  // it(`processes claims for two users correctly`, async () => {
  //   const { contractAddress: houseAddress } = await instantiateTestHouse(admin);

  //   const depositDelta = BigInt(100);
  //   const stakingDelta = BigInt(100);

  //   // increase stake, earn, and claim twice over
  //   await repeat(2, async () => {
  //     await delegate({ houseAddress, user: user1, amount: stakingDelta });
  //     await delegate({ houseAddress, user: user2, amount: stakingDelta });
  //     await deposit({ houseAddress, user: admin, amount: depositDelta });

  //     {
  //       const h = await queryHouse({ houseAddress, user: admin });
  //       const a1 = await queryAccount({ user: user1, houseAddress });
  //       const a2 = await queryAccount({ user: user2, houseAddress });
  //       const expAccountBalance = (depositDelta / BigInt(2)).toString();

  //       expect(h.balances[0].amount).toStrictEqual(depositDelta.toString());
  //       expect(a1.balances[0].amount).toStrictEqual(expAccountBalance);
  //       expect(a2.balances[0].amount).toStrictEqual(expAccountBalance);
  //     }

  //     await claim({ houseAddress, user: user1 });

  //     {
  //       const h = await queryHouse({ houseAddress, user: admin });
  //       const a1 = await queryAccount({ user: user1, houseAddress });
  //       const a2 = await queryAccount({ user: user2, houseAddress });
  //       const expAccount1Balance = "0";
  //       const expAccount2Balance = (depositDelta / BigInt(2)).toString();

  //       expect(h.balances[0].amount).toStrictEqual(expAccount2Balance);
  //       expect(a1.balances[0].amount).toStrictEqual(expAccount1Balance);
  //       expect(a2.balances[0].amount).toStrictEqual(expAccount2Balance);
  //     }

  //     await claim({ houseAddress, user: user2 });

  //     {
  //       const h = await queryHouse({ houseAddress, user: admin });
  //       const a1 = await queryAccount({ user: user1, houseAddress });
  //       const a2 = await queryAccount({ user: user2, houseAddress });
  //       const expAccountBalance = "0";

  //       expect(h.balances).toStrictEqual([]);
  //       expect(a1.balances).toStrictEqual([]);
  //       expect(a2.balances).toStrictEqual([]);
  //     }
  //   });
  // });

  // it(`unstakes correctly with respect to unbonding time`, async () => {
  //   const unbondingSeconds = 100;
  //   const stakingDelta = BigInt(100);
  //   const unbondingAmount1 = BigInt(80);
  //   const unbondingAmount2 = BigInt(20);

  //   const { contractAddress: houseAddress } = await instantiateTestHouse(
  //     admin,
  //     { unbondingSeconds },
  //   );

  //   // Stake and unstake at same block time so that the account's created_at
  //   // time and unbonds_at times should be spaced by exactly the specified
  //   // unbonding time.
  //   await user1.execute({
  //     instructions: [
  //       {
  //         contractAddress: houseAddress,
  //         funds: [{ denom: "ujunox", amount: stakingDelta.toString() }],
  //         msg: {
  //           stake: {
  //             amount: stakingDelta.toString(),
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: houseAddress,
  //         msg: {
  //           unstake: {
  //             amount: unbondingAmount1.toString(),
  //           },
  //         },
  //       },
  //     ],
  //   });

  //   let unbondsAt1 = 0;
  //   let unbondsAt2 = 0;

  //   {
  //     const h = await queryHouse({ houseAddress, user: admin });
  //     const a = await queryAccount({ user: user1, houseAddress });

  //     const createdAt = parseInt(a.created_at);
  //     const unbondsAt = parseInt(a.unbonding.unbonds_at);
  //     const seconds = parseInt(
  //       (BigInt(unbondsAt - createdAt) / BigInt(1e9)).toString(),
  //     );

  //     unbondsAt1 = unbondsAt;

  //     expect(h.delegation.amount).toStrictEqual(
  //       (stakingDelta - unbondingAmount1).toString(),
  //     );
  //     expect(a.delegation).toStrictEqual(
  //       (stakingDelta - unbondingAmount1).toString(),
  //     );
  //     expect(a.unbonding.amount).toStrictEqual(unbondingAmount1.toString());
  //     expect(seconds).toStrictEqual(unbondingSeconds);
  //   }

  //   await unstake({
  //     user: user1,
  //     amount: unbondingAmount2,
  //     houseAddress,
  //   });

  //   {
  //     const h = await queryHouse({ houseAddress, user: admin });
  //     const a = await queryAccount({ user: user1, houseAddress });
  //     const unbondsAt = parseInt(a.unbonding.unbonds_at);

  //     unbondsAt2 = unbondsAt;
  //     show({ diff: unbondsAt2 - unbondsAt1 });

  //     expect(h.delegation.amount).toStrictEqual("0");
  //     expect(a.delegation).toStrictEqual("0");
  //     expect(a.unbonding.amount).toStrictEqual(
  //       (unbondingAmount1 + unbondingAmount2).toString(),
  //     );
  //     expect(unbondsAt2).toBeGreaterThan(unbondsAt1);
  //     expect(unbondsAt2).toBeLessThanOrEqual(
  //       unbondsAt1 + unbondingSeconds * 1e9,
  //     );
  //     // expect(seconds).toStrictEqual(unbondingSeconds);
  //   }
  // });

  // it(`processes deposit correctly WRT a user's unbonding`, async () => {
  //   const unbondingSeconds = 100;
  //   const stakingDelta = BigInt(100);
  //   const depositAmount = BigInt(100);
  //   const unbondingAmount = BigInt(50);

  //   const { contractAddress: houseAddress } = await instantiateTestHouse(admin);

  //   // Stake and unstake at same block time so that the account's created_at
  //   // time and unbonds_at times should be spaced by exactly the specified
  //   // unbonding time.
  //   await delegate({ houseAddress, user: user1, amount: stakingDelta });
  //   await user2.execute({
  //     instructions: [
  //       {
  //         contractAddress: houseAddress,
  //         funds: [{ denom: "ujunox", amount: stakingDelta.toString() }],
  //         msg: {
  //           stake: {
  //             amount: stakingDelta.toString(),
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: houseAddress,
  //         msg: {
  //           unstake: {
  //             amount: unbondingAmount.toString(),
  //           },
  //         },
  //       },
  //       {
  //         contractAddress: houseAddress,
  //         funds: [{ denom: "ujunox", amount: depositAmount.toString() }],
  //         msg: {
  //           deposit: {
  //             amount: depositAmount.toString(),
  //             token: { denom: "ujunox" },
  //           },
  //         },
  //       },
  //     ],
  //   });
  //   {
  //     const h = await queryHouse({ houseAddress, user: admin });
  //     const a1 = await queryAccount({ user: user1, houseAddress });
  //     const a2 = await queryAccount({ user: user2, houseAddress });

  //     expect(h.balances[0].amount).toStrictEqual(depositAmount.toString());

  //     expect(a1.delegation).toStrictEqual(stakingDelta.toString());
  //     expect(a1.balances[0].amount).toStrictEqual(
  //       (
  //         (depositAmount * stakingDelta) /
  //         (stakingDelta + stakingDelta - unbondingAmount)
  //       ).toString(),
  //     );

  //     expect(a2.delegation).toStrictEqual(
  //       (stakingDelta - unbondingAmount).toString(),
  //     );
  //     expect(a2.balances[0].amount).toStrictEqual(
  //       (
  //         (depositAmount * (stakingDelta - unbondingAmount)) /
  //         (stakingDelta + stakingDelta - unbondingAmount)
  //       ).toString(),
  //     );

  //     show({ h, a1, a2 });
  //   }
  // });

  it(`sends and sets expected taxes`, async () => {
    const { contractAddress: houseAddress } = await instantiateTestHouse(
      admin,
      {
        taxRecipients: [
          {
            address: user1.address,
            name: "George",
            pct: (0.01e6).toFixed(),
            immutable: true,
            autosend: true,
          },
          {
            address: user2.address,
            name: "Sally",
            pct: (0.02e6).toFixed(),
            immutable: false,
            autosend: false,
          },
        ],
      },
    );

    {
      const house = await queryHouse({ user: admin, houseAddress });
      const taxes = await queryTaxes({ user: admin, houseAddress });
      show({ house, taxes });
    }

    const user1BalanceBefore = await user1.queryBalance();
    const user2BalanceBefore = await user2.queryBalance();
    const depositAmount = 100;

    await deposit({
      houseAddress,
      amount: depositAmount.toString(),
      user: admin,
    });

    const user1BalanceAfter = await user1.queryBalance();
    const user2BalanceAfter = await user2.queryBalance();
    {
      const house = await queryHouse({ user: admin, houseAddress });
      const taxes = await queryTaxes({ user: admin, houseAddress });
      show({ house, taxes });

      expect(
        taxes.recipients.find((x) => x.address === user1.address).totals[0]
          .balance,
      ).toStrictEqual("0");

      expect(
        taxes.recipients.find((x) => x.address === user1.address).totals[0]
          .total,
      ).toStrictEqual("1");

      expect(
        taxes.recipients.find((x) => x.address === user2.address).totals[0]
          .balance,
      ).toStrictEqual("2");

      expect(
        taxes.recipients.find((x) => x.address === user2.address).totals[0]
          .total,
      ).toStrictEqual("2");

      const user1BalanceDelta =
        parseInt(user1BalanceAfter) - parseInt(user1BalanceBefore);

      const user2BalanceDelta =
        parseInt(user2BalanceAfter) - parseInt(user2BalanceBefore);

      expect(user1BalanceDelta).toStrictEqual(1);
      expect(user2BalanceDelta).toStrictEqual(0);
    }
  });
});
