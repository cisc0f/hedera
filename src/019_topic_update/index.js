const { TopicCreateTransaction, PrivateKey, AccountId, Client, TopicUpdateTransaction } = require('@hashgraph/sdk');


require('dotenv').config({path: __dirname + '/../../.env'});

// Get operator from .env file
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const main = async () => {

    const adminKey = PrivateKey.generateED25519();
    const submitKey = PrivateKey.generateED25519();

    const createTopic = new TopicCreateTransaction()
        .setAdminKey(adminKey)
        .setSubmitKey(submitKey)
        .freezeWith(client);

    const createTopicSigned = await createTopic.sign(adminKey);
    const createTopicTx = await createTopicSigned.execute(client);
    const createTopicRx = await createTopicTx.getReceipt(client);
    const createTopicId = createTopicRx.topicId;

    console.log("Topic created with ID: " + createTopicId);

    const updateTopic = await new TopicUpdateTransaction()
        .setTopicId(createTopicId)
        .setTopicMemo("Yooooo")
        .freezeWith(client);

    const updateTopicSigned = await updateTopic.sign(adminKey);
    const updateTopicTx = await updateTopicSigned.execute(client);
    const updateTopicRx = await updateTopicTx.getReceipt(client);
    const updateTopicStatus = updateTopicRx.status;

    console.log("Topic updated with status: " + updateTopicStatus.toString());
}
    

main();