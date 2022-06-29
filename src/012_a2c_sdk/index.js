const { 
    PrivateKey, 
    AccountId, 
    Client, 
    Hbar,
    TokenAssociateTransaction,
    ContractCreateFlow,
    TransferTransaction,
    ContractInfoQuery,
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
    const adminId = await accountCreator(adminKey, 10, client);
    // const ownerKey = PrivateKey.generateED25519();
    // const ownerId = await accountCreator(ownerKey, 10, client);

    // Create token and give to account
    const tokenId = await tokenCreator(adminKey, operatorId, operatorKey, client);

    console.log("The new token ID is " + tokenId);

    const bytecode = fs.readFileSync('TokenReceiver_sol_TokenReceiver.bin');
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

    // Associate token to contract
    const associateToken = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(contractId))
        .setTokenIds([tokenId]);
        // Signing not needed as execute is using adminKey to sign already

    const associateTokenTx = await associateToken.execute(client);
    const associateTokenRx = await associateTokenTx.getReceipt(client);

    const associateTokenStatus = associateTokenRx.status;

    console.log("The associate transaction status: " + associateTokenStatus.toString());

    // Switch back to operatorId
    client.setOperator(operatorId, operatorKey);

    // Transfer token from account to contract using SDK
    const transferToken = new TransferTransaction()
        .addTokenTransfer(tokenId, operatorId, -1000) // Transfer 10 USDB
        .addTokenTransfer(tokenId, contractId, 1000)
        .freezeWith(client);
    const transferTokenTx = await transferToken.sign(operatorKey);
    const transferTokenSubmit = await transferTokenTx.execute(client);
    const transferTokenRx = await transferTokenSubmit.getReceipt(client);

    const transferTokenStatus = transferTokenRx.status;

    console.log("The transfer transaction status: " + transferTokenStatus.toString());

    //Create the query
    const query = new ContractInfoQuery()
        .setContractId(contractId);

    const info = await query.execute(client);
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The contract balance for token " + tokenId + " is: " + balance);

}

main();