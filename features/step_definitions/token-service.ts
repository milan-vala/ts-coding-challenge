import { Given, Then, When } from "@cucumber/cucumber";
import { accounts } from "../../src/config";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  PrivateKey,
  TokenCreateTransaction,
  TokenInfoQuery,
  TokenMintTransaction,
} from "@hashgraph/sdk";
import assert from "node:assert";

const client = Client.forTestnet();

Given(
  /^A Hedera account with more than (\d+) hbar$/,
  async function (expectedBalance: number) {
    const account = accounts[0];
    const MY_ACCOUNT_ID = AccountId.fromString(account.id);
    const MY_PRIVATE_KEY = PrivateKey.fromStringDer(account.privateKey);
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    const query = new AccountBalanceQuery().setAccountId(MY_ACCOUNT_ID);
    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

When(/^I create a token named Test Token \(HTT\)$/, async function () {
  const operatorId = client.operatorAccountId!;
  const operatorKey = client.operatorPublicKey!;
  const tokenCreateTx = new TokenCreateTransaction()
    .setTokenName("Test Token")
    .setTokenSymbol("HTT")
    .setDecimals(2)
    .setInitialSupply(0)
    .setTreasuryAccountId(operatorId)
    .setSupplyKey(operatorKey);

  const txResponse = await tokenCreateTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  this.tokenId = receipt.tokenId;
});

Then(
  /^The token has the name "([^"]*)"$/,
  async function (expectedName: string) {
    const tokenInfoQuery = new TokenInfoQuery().setTokenId(this.tokenId);
    const tokenInfo = await tokenInfoQuery.execute(client);
    assert.strictEqual(tokenInfo.name, expectedName);
  }
);

Then(
  /^The token has the symbol "([^"]*)"$/,
  async function (expectedSymbol: string) {
    const tokenInfoQuery = new TokenInfoQuery().setTokenId(this.tokenId);
    const tokenInfo = await tokenInfoQuery.execute(client);
    assert.strictEqual(tokenInfo.symbol, expectedSymbol);
  }
);

Then(
  /^The token has (\d+) decimals$/,
  async function (expectedDecimals: number) {
    const tokenInfoQuery = new TokenInfoQuery().setTokenId(this.tokenId);
    const tokenInfo = await tokenInfoQuery.execute(client);
    assert.strictEqual(tokenInfo.decimals, expectedDecimals);
  }
);

Then(/^The token is owned by the account$/, async function () {
  const tokenInfoQuery = new TokenInfoQuery().setTokenId(this.tokenId);
  const tokenInfo = await tokenInfoQuery.execute(client);
  const currentOperatorId = client.operatorAccountId;
  assert.strictEqual(
    tokenInfo.treasuryAccountId?.toString(),
    currentOperatorId?.toString()
  );
});

Then(
  /^An attempt to mint (\d+) additional tokens succeeds$/,
  async function (amount: number) {
    const mintTx = new TokenMintTransaction()
      .setTokenId(this.tokenId)
      .setAmount(amount);

    const txResponse = await mintTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    assert.ok(receipt.status.toString() === "SUCCESS");
  }
);

When(
  /^I create a fixed supply token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (initialSupply: number) {
    const operatorId = client.operatorAccountId!;
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName("Test Token")
      .setTokenSymbol("HTT")
      .setDecimals(2)
      .setInitialSupply(initialSupply)
      .setTreasuryAccountId(operatorId);

    const txResponse = await tokenCreateTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    this.tokenId = receipt.tokenId;
  }
);
Then(
  /^The total supply of the token is (\d+)$/,
  async function (expectedSupply: number) {
    const tokenInfoQuery = new TokenInfoQuery().setTokenId(this.tokenId);
    const tokenInfo = await tokenInfoQuery.execute(client);
    assert.strictEqual(tokenInfo.totalSupply.toNumber(), expectedSupply);
  }
);
Then(/^An attempt to mint tokens fails$/, async function () {
  const mintTx = new TokenMintTransaction()
    .setTokenId(this.tokenId)
    .setAmount(100);

  try {
    const txResponse = await mintTx.execute(client);
    await txResponse.getReceipt(client);
    assert.fail("Expected mint transaction to fail");
  } catch (error: any) {
    assert.ok(
      error.message.includes("TOKEN_HAS_NO_SUPPLY_KEY") ||
        error.message.includes("INVALID_TOKEN_SUPPLY_KEY")
    );
  }
});
Given(
  /^A first hedera account with more than (\d+) hbar$/,
  async function (expectedBalance: number) {
    const account = accounts[0];
    this.firstAccountId = AccountId.fromString(account.id);
    this.firstPrivateKey = PrivateKey.fromStringDer(account.privateKey);
    client.setOperator(this.firstAccountId, this.firstPrivateKey);

    const query = new AccountBalanceQuery().setAccountId(this.firstAccountId);
    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);
Given(/^A second Hedera account$/, async function () {
  const account = accounts[1];
  this.secondAccountId = AccountId.fromString(account.id);
  this.secondPrivateKey = PrivateKey.fromStringDer(account.privateKey);
});
Given(
  /^A token named Test Token \(HTT\) with (\d+) tokens$/,
  async function (initialSupply: number) {
    const operatorId = client.operatorAccountId!;
    const operatorKey = client.operatorPublicKey!;
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName("Test Token")
      .setTokenSymbol("HTT")
      .setDecimals(2)
      .setInitialSupply(initialSupply)
      .setTreasuryAccountId(operatorId)
      .setSupplyKey(operatorKey);

    const txResponse = await tokenCreateTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    this.tokenId = receipt.tokenId;
  }
);

Given(/^The first account holds (\d+) HTT tokens$/, async function () {});

Given(/^The second account holds (\d+) HTT tokens$/, async function () {});

When(
  /^The first account creates a transaction to transfer (\d+) HTT tokens to the second account$/,
  async function () {}
);

When(/^The first account submits the transaction$/, async function () {});

When(
  /^The second account creates a transaction to transfer (\d+) HTT tokens to the first account$/,
  async function () {}
);

Then(
  /^The first account has paid for the transaction fee$/,
  async function () {}
);

Given(
  /^A first hedera account with more than (\d+) hbar and (\d+) HTT tokens$/,
  async function () {}
);

Given(
  /^A second Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function () {}
);

Given(
  /^A third Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function () {}
);

Given(
  /^A fourth Hedera account with (\d+) hbar and (\d+) HTT tokens$/,
  async function () {}
);

When(
  /^A transaction is created to transfer (\d+) HTT tokens out of the first and second account and (\d+) HTT tokens into the third account and (\d+) HTT tokens into the fourth account$/,
  async function () {}
);

Then(/^The third account holds (\d+) HTT tokens$/, async function () {});

Then(/^The fourth account holds (\d+) HTT tokens$/, async function () {});
