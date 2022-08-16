const { 
    PrivateKey, 
    AccountId, 
    Client, 
    TokenAssociateTransaction,
    ContractCreateFlow,
    TransferTransaction,
    AccountInfoQuery,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    TokenId,
    KeyList
} = require('@hashgraph/sdk');

const {
    accountCreator
} = require('./utils');

const fs = require('fs');

// Setup your .env path
require('dotenv').config({path: __dirname + '/../../.env'});

const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

const main = async () => {

    // Generating token receiver account
    const aliceKey = PrivateKey.generateED25519();
    const aliceId = await accountCreator(aliceKey, 20, client);

    const adminKey = PrivateKey.generateED25519();

    const bytecode = fs.readFileSync('./binaries/TokenSender_sol_TokenSender.bin');

    // Create contract using ContractCreateFlow
    const createContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode)
        .setAdminKey(adminKey)
        .sign(adminKey);
    const createSubmit = await createContract.execute(client);
    const createRx = await createSubmit.getReceipt(client);
    const contractId = createRx.contractId;

    console.log("The new contract ID is " + contractId);

    // Create FT using precompile function
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(300000) // Increase if reverts
        .setPayableAmount(20) // Increase if reverts
        .setFunction("createFungible", 
            new ContractFunctionParameters()
            .addString("USD Bar") // FT name
            .addString("USDB") // FT symbol
            .addUint256(10000) // FT initial supply
            .addUint256(2) // FT decimals
            .addUint32(7000000)); // auto renew period

    const createTokenTx = await createToken.execute(client);
    const createTokenRx = await createTokenTx.getRecord(client);
    const tokenIdSolidityAddr = createTokenRx.contractFunctionResult.getAddress(0);
    const tokenId = TokenId.fromSolidityAddress(tokenIdSolidityAddr);

    console.log(`Token created with ID: ${tokenId} \n`);

    // Transfer token from contract to account using SDK
    const transferToken = await new TransferTransaction()
        .addTokenTransfer(tokenId, contractId, -1000) // Transfer 10 USDB
        .addTokenTransfer(tokenId, aliceId, 1000)
        .freezeWith(client)
        .sign(adminKey);
    
    const transferTokenSubmit = await transferToken.execute(client);
    const transferTokenRx = await transferTokenSubmit.getReceipt(client);

    const transferTokenStatus = transferTokenRx.status;

    console.log("The transfer transaction status: " + transferTokenStatus.toString());

    //Create the query
    const query = new AccountInfoQuery()
        .setAccountId(aliceId)

    const info = await query.execute(client);
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The contract balance for token " + tokenId + " is: " + balance);

}

main();