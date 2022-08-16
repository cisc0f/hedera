const { 
    Client,
    AccountId, 
    PrivateKey, 
    ContractCreateFlow, 
    ContractExecuteTransaction, 
    ContractFunctionParameters,  
    AccountInfoQuery,
    TokenId
} = require('@hashgraph/sdk');

const { 
    accountCreator 
} = require('./utils');

require('dotenv').config({path: __dirname + '/../../.env'});
const fs = require('fs');

const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const main = async () => {

    // Generating token receiver account
    const aliceKey = PrivateKey.generateED25519();
    const aliceId = await accountCreator(aliceKey, 20, client);

    const bytecode = fs.readFileSync('./binaries/TokenSender_sol_TokenSender.bin');

    // Create contract using ContractCreateFlow
    const createContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode)
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

    // Execute token transfer
    const tokenTransfer = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1500000)
        .setFunction("tokenTransfer", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress()) // Token ID
            .addAddress(aliceId.toSolidityAddress()) // Token receiver
            .addInt64(1000) // Token amount
        );
    const tokenTransferTx = await tokenTransfer.execute(client);
    const tokenTransferRx = await tokenTransferTx.getReceipt(client);
    const tokenTransferStatus = tokenTransferRx.status;

    console.log("Token transfer transaction status: " + tokenTransferStatus.toString());

    // Check Alice token balance
    const query = new AccountInfoQuery()
        .setAccountId(aliceId)

    const info = await query.execute(client);
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The contract balance for token " + tokenId + " is: " + balance);
}

main();