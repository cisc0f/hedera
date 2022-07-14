const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractCreateFlow, 
    ContractExecuteTransaction, 
    ContractFunctionParameters,  
    TokenAssociateTransaction,
    AccountInfoQuery,
    TokenId,
} = require('@hashgraph/sdk');

const { accountCreator } = require('./utils');

require('dotenv').config({path: __dirname + '/../../.env'});
const fs = require('fs');

const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const main = async () => {

    // Generating token receiver account
    const aliceKey = PrivateKey.generateED25519();
    const aliceId = await accountCreator(aliceKey, 20, client);
    
    // Get compiled contract bytecode
    const bytecode = fs.readFileSync('./binaries/TokenSenderERC_sol_TokenSenderERC.bin');

    // Create contract using ContractCreateFlow
    const createContract = new ContractCreateFlow()
        .setGas(100000) // Increase if reverts
        .setBytecode(bytecode) // Set contract bytecode
    const createSubmit = await createContract.execute(client);
    const createRx = await createSubmit.getReceipt(client);
    // Get contract ID
    const contractId = createRx.contractId;

    console.log("The new contract ID is " + contractId);

    // Create FT using precompile function
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(300000) // Increase if revert
        .setPayableAmount(20) // Increase if revert
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

    // Associate token to receiver account
    const associateToken = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(aliceId)) // receiver ID
        .setTokenIds([tokenId]) // token IDs
        .freezeWith(client)
        .sign(aliceKey);
    const associateTokenTx = await associateToken.execute(client);
    const associateTokenRx = await associateTokenTx.getReceipt(client);

    const associateTokenStatus = associateTokenRx.status;

    console.log("The associate transaction status: " + associateTokenStatus.toString());

    // Execute token transfer
    const tokenTransfer = new ContractExecuteTransaction()
        .setContractId(contractId) // Contract ID
        .setGas(4000000) // Increase if reverts
        .setFunction("transfer", 
            new ContractFunctionParameters()
            .addAddress(tokenIdSolidityAddr) // Token ID
            .addAddress(aliceId.toSolidityAddress()) // Token receiver ID
            .addUint256(1000) // Token amount
        );
    
    const tokenTransferTx = await tokenTransfer.execute(client);
    const tokenTransferRx = await tokenTransferTx.getReceipt(client);
    const tokenTransferStatus = tokenTransferRx.status;

    console.log("Token transfer transaction status: " + tokenTransferStatus.toString());

    // Check receiver balance
    const query = new AccountInfoQuery()
        .setAccountId(aliceId) // Token receiver ID

    const info = await query.execute(client);
    // Get balance and divide by 100 because of token decimals
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The account balance for token " + tokenId + " is: " + balance);
}

main();