import { Given, Then, When } from "@cucumber/cucumber";
import {
  AccountBalanceQuery,
  AccountId,
  Client,
  KeyList,
  PrivateKey,
  RequestType,
  TopicCreateTransaction,
  TopicInfoQuery,
  TopicMessageQuery,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import { accounts } from "../../src/config";
import assert from "node:assert";
import ConsensusSubmitMessage = RequestType.ConsensusSubmitMessage;

const client = Client.forTestnet();

Given(
  /^a first account with more than (\d+) hbars$/,
  async function (expectedBalance: number) {
    const acc = accounts[0];
    const account: AccountId = AccountId.fromString(acc.id);
    this.account = account;
    const privKey: PrivateKey = PrivateKey.fromStringDer(acc.privateKey);
    this.privKey = privKey;
    client.setOperator(this.account, privKey);

    const query = new AccountBalanceQuery().setAccountId(account);
    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the first account as the submit key$/,
  async function (memo: string) {
    const createTopicTx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setSubmitKey(this.privKey.publicKey);

    const topicId = await createTopicTx
      .execute(client)
      .then((response) => response.getReceipt(client))
      .then((receipt) => receipt.topicId);
    this.topicId = topicId;
  }
);

When(
  /^The message "([^"]*)" is published to the topic$/,
  async function (message: string) {
    const submitMessageTx = new TopicMessageSubmitTransaction()
      .setTopicId(this.topicId)
      .setMessage(message);

    await submitMessageTx
      .execute(client)
      .then((response) => response.getReceipt(client));
    this.message = message;
  }
);

Then(
  /^The message "([^"]*)" is received by the topic and can be printed to the console$/,
  async function (message: string) {
    const topicMessageQuery = new TopicMessageQuery()
      .setTopicId(this.topicId)
      .setStartTime(0);

    return new Promise<void>((resolve, reject) => {
      let hasReceived = false;
      const timeoutHandle = setTimeout(() => {
        if (!hasReceived) {
          unsubscribe?.unsubscribe();
          reject(new Error(`Timeout waiting for message: "${message}"`));
        }
      }, 10000);

      let unsubscribe: any;

      try {
        unsubscribe = topicMessageQuery.subscribe(
          client,
          (error: any) => {
            if (error) {
              console.error("Subscription error:", error);
              clearTimeout(timeoutHandle);
              unsubscribe?.unsubscribe();
              reject(error);
            }
          },
          (msg: any) => {
            if (msg && msg.contents && !hasReceived) {
              const receivedMessage = Buffer.from(msg.contents).toString(
                "utf8"
              );
              console.log(`Message received from topic ==> ${receivedMessage}`);
              hasReceived = true;
              clearTimeout(timeoutHandle);

              try {
                assert.strictEqual(receivedMessage, message);
                unsubscribe?.unsubscribe();
                resolve();
              } catch (error) {
                unsubscribe?.unsubscribe();
                reject(error);
              }
            }
          }
        );
      } catch (error) {
        console.error("Error setting up subscription:", error);
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  }
);

Given(
  /^A second account with more than (\d+) hbars$/,
  async function (expectedBalance: number) {
    const acc = accounts[1];
    const account: AccountId = AccountId.fromString(acc.id);
    this.account2 = account;
    const privKey: PrivateKey = PrivateKey.fromStringDer(acc.privateKey);
    this.privKey2 = privKey;

    const query = new AccountBalanceQuery().setAccountId(account);
    const balance = await query.execute(client);
    assert.ok(balance.hbars.toBigNumber().toNumber() > expectedBalance);
  }
);

Given(
  /^A (\d+) of (\d+) threshold key with the first and second account$/,
  async function (required: number, total: number) {
    const keyList = new KeyList(
      [this.privKey.publicKey, this.privKey2.publicKey],
      required
    );

    this.thresholdKey = keyList;
    this.thresholdPrivateKeys = [this.privKey, this.privKey2];
  }
);

When(
  /^A topic is created with the memo "([^"]*)" with the threshold key as the submit key$/,
  async function (memo: string) {
    let createTopicTx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setSubmitKey(this.thresholdKey);

    createTopicTx.freeze();

    for (const privKey of this.thresholdPrivateKeys) {
      createTopicTx = await createTopicTx.sign(privKey);
    }

    const topicId = await createTopicTx
      .execute(client)
      .then((response) => response.getReceipt(client))
      .then((receipt) => receipt.topicId);
    this.topicId = topicId;
  }
);
