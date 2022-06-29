const { 
    PrivateKey, 
    AccountId, 
    Client, 
    TokenAssociateTransaction,
    ContractCreateFlow,
    TransferTransaction,
    AccountInfoQuery
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
    const adminId = await accountCreator(adminKey, 20, client);
    // const ownerKey = PrivateKey.generateED25519();
    // const ownerId = await accountCreator(ownerKey, 10, client);

    const bytecode = fs.readFileSync('TokenSender_sol_TokenSender.bin');
    // Change operator to adminId
    client.setOperator(adminId, adminKey);
    // Create contract using ContractCreateFlow
    const createContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode)
        .setAdminKey(adminKey);
    const createSubmit = await createContract.execute(client);
    const createRx = await createSubmit.getReceipt(client);
    const contractId = createRx.contractId;

    console.log("The new contract ID is " + contractId);

    // Create token and give to account
    const tokenId = await tokenCreator(adminKey, AccountId.fromString(contractId), adminKey, client);

    console.log("The new token ID is " + tokenId);

    // Switch back to operatorId
    client.setOperator(operatorId, operatorKey);

    // Associate token to account
    const associateToken = new TokenAssociateTransaction()
        .setAccountId(operatorId)
        .setTokenIds([tokenId]);
        // Signing not needed as execute is using operatorKey to sign already

    const associateTokenTx = await associateToken.execute(client);
    const associateTokenRx = await associateTokenTx.getReceipt(client);

    const associateTokenStatus = associateTokenRx.status;

    console.log("The associate transaction status: " + associateTokenStatus.toString());

    // Transfer token from contract to account using SDK
    const transferToken = new TransferTransaction()
        .addTokenTransfer(tokenId, contractId, -1000) // Transfer 10 USDB
        .addTokenTransfer(tokenId, operatorId, 1000)
        .freezeWith(client);
    const transferTokenTx = await transferToken.sign(adminKey);
    const transferTokenSubmit = await transferTokenTx.execute(client);
    const transferTokenRx = await transferTokenSubmit.getReceipt(client);

    const transferTokenStatus = transferTokenRx.status;

    console.log("The transfer transaction status: " + transferTokenStatus.toString());

    //Create the query
    const query = new AccountInfoQuery()
        .setAccountId(operatorId)

    const info = await query.execute(client);
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The contract balance for token " + tokenId + " is: " + balance);

}

main();