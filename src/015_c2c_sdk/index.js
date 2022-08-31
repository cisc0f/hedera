const { 
    PrivateKey, 
    AccountId, 
    Client, 
    TokenAssociateTransaction,
    ContractCreateFlow,
    TransferTransaction,
    ContractInfoQuery
} = require('@hashgraph/sdk');

const {
    accountCreator, 
    tokenCreator
} = require('./utils');

const fs = require('fs');

// Setup your .env path
require('dotenv').config({path: __dirname + '/../../.env'});

const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

const main = async () => {

    const adminKey = PrivateKey.generateED25519();
    const adminId = await accountCreator(adminKey, 40, client);
    // owner ?

    const bytecodeSender = fs.readFileSync('./binaries/TokenSender_sol_TokenSender.bin');
    const bytecodeReceiver = fs.readFileSync('./binaries/TokenReceiver_sol_TokenReceiver.bin');
    
    // Create sender contract using ContractCreateFlow
    const createSenderContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeSender)
        .setAdminKey(adminKey)
        .sign(adminKey);
    const createSenderSubmit = await createSenderContract.execute(client);
    const createSenderRx = await createSenderSubmit.getReceipt(client);
    const contractIdSender = createSenderRx.contractId;

    console.log("The new contract ID is " + contractIdSender);

    // Create receiver contract using ContractCreateFlow
    const createReceiverContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeReceiver)
        .setAdminKey(adminKey)
        .sign(adminKey);
    const createReceiverSubmit = await createReceiverContract.execute(client);
    const createReceiverRx = await createReceiverSubmit.getReceipt(client);
    const contractIdReceiver = createReceiverRx.contractId;

    console.log("The new contract ID is " + contractIdReceiver);

    // Create token and give to sender contract
    const tokenId = await tokenCreator(adminKey, AccountId.fromString(contractIdSender), adminKey, client);

    console.log("The new token ID is " + tokenId);

    // Associate token to account
    const associateToken = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(contractIdReceiver))
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(adminKey);

    const associateTokenTx = await associateToken.execute(client);
    const associateTokenRx = await associateTokenTx.getReceipt(client);

    const associateTokenStatus = associateTokenRx.status;

    console.log("The associate transaction status: " + associateTokenStatus.toString());

    // Transfer token from contract to account using SDK
    const transferToken = new TransferTransaction()
        .addTokenTransfer(tokenId, contractIdSender, -1000) // Transfer 10 USDB
        .addTokenTransfer(tokenId, contractIdReceiver, 1000)
        .freezeWith(client);
    const transferTokenTx = await transferToken.sign(adminKey);
    const transferTokenSubmit = await transferTokenTx.execute(client);
    const transferTokenRx = await transferTokenSubmit.getReceipt(client);

    const transferTokenStatus = transferTokenRx.status;

    console.log("The transfer transaction status: " + transferTokenStatus.toString());

    // Get Sender balance
    const getSender = new ContractInfoQuery()
        .setContractId(contractIdSender);

    const senderInfo = await getSender.execute(client);
    const senderBalance = senderInfo.tokenRelationships.get(tokenId).balance / 100;

    console.log("The sender contract balance for token " + tokenId + " is: " + senderBalance);

    // Get Receiver balance
    const getReceiver = new ContractInfoQuery()
        .setContractId(contractIdReceiver);

    const receiverInfo = await getReceiver.execute(client);
    const receiverBalance = receiverInfo.tokenRelationships.get(tokenId).balance / 100;

    console.log("The receiver contract balance for token " + tokenId + " is: " + receiverBalance);
}

main();