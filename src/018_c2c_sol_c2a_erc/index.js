const { 
    Client,
    AccountId, 
    PrivateKey, 
    ContractCreateFlow, 
    ContractExecuteTransaction, 
    ContractFunctionParameters, 
    ContractInfoQuery, 
    TokenAssociateTransaction,
    AccountInfoQuery,
    TokenId
} = require('@hashgraph/sdk');

const { accountCreator } = require('./utils');

require('dotenv').config({path: __dirname + '/../../.env'});
const fs = require('fs');

const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const main = async () => {

    // Get bytecode from compiled contract
    const bytecodeSender = fs.readFileSync('./binaries/TokenSender_sol_TokenSender.bin');
    const bytecodeReceiver = fs.readFileSync('./binaries/TokenReceiver_sol_TokenReceiver.bin');

    // Create TokenSender contract
    const createSenderContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeSender);
    const createSenderSubmit = await createSenderContract.execute(client);
    const createSenderRx = await createSenderSubmit.getReceipt(client);
    const contractIdSender = createSenderRx.contractId;

    console.log("The new TokenSender contract ID is " + contractIdSender);

    // Create TokenReceiver contract
    const createReceiverContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeReceiver);
    const createReceiverSubmit = await createReceiverContract.execute(client);
    const createReceiverRx = await createReceiverSubmit.getReceipt(client);
    const contractIdReceiver = createReceiverRx.contractId;

    console.log("The new TokenReceiver contract ID is " + contractIdReceiver);

    // Create FT using TokenSender create function
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractIdSender)
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

    console.log(`Token created with ID: ${tokenId}`);

    // Execute token associate function in TokenReceiver
    const tokenAssociate = new ContractExecuteTransaction()
        .setContractId(contractIdReceiver)
        .setGas(1500000)
        .setFunction("tokenAssociate", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
        );
    const tokenAssociateTx = await tokenAssociate.execute(client);
    const tokenAssociateRx = await tokenAssociateTx.getReceipt(client);
    const tokenAssociateStatus = tokenAssociateRx.status;

    console.log("Token associate transaction status: " + tokenAssociateStatus.toString());

    // Execute token transfer (TokenSender -> TokenReceiver)
    const tokenTransfer = new ContractExecuteTransaction()
        .setContractId(contractIdSender)
        .setGas(1500000)
        .setFunction("transferPrecompile", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
            .addAddress(contractIdReceiver.toSolidityAddress())
            .addInt64(1000)
        );
    const tokenTransferTx = await tokenTransfer.execute(client);
    const tokenTransferRx = await tokenTransferTx.getReceipt(client);
    const tokenTransferStatus = tokenTransferRx.status;

    console.log("Token transfer transaction status: " + tokenTransferStatus.toString());

    // Get TokenSender balance
    const getSender = new ContractInfoQuery()
        .setContractId(contractIdSender);

    const senderInfo = await getSender.execute(client);
    const senderBalance = senderInfo.tokenRelationships.get(tokenId).balance / 100;

    console.log("The sender contract balance for token " + tokenId + " is: " + senderBalance);

    // Get TokenReceiver balance
    const getReceiver = new ContractInfoQuery()
        .setContractId(contractIdReceiver);

    const receiverInfo = await getReceiver.execute(client);
    const receiverBalance = receiverInfo.tokenRelationships.get(tokenId).balance / 100;

    console.log("The receiver contract balance for token " + tokenId + " is: " + receiverBalance);

    // PHASE 2
    // Generating token receiver account (Alice)
    const aliceKey = PrivateKey.generateED25519();
    const aliceId = await accountCreator(aliceKey, 20, client);

    // Associate token with Alice
    const associateToken = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(aliceId)) // receiver ID
        .setTokenIds([tokenId]) // token IDs
        .freezeWith(client)
        .sign(aliceKey);
    const associateTokenTx = await associateToken.execute(client);
    const associateTokenRx = await associateTokenTx.getReceipt(client);
    const associateTokenStatus = associateTokenRx.status;

    console.log("The associate transaction status: " + associateTokenStatus.toString());

    // Execute token transfer from TokenSender to Alice
    const tokenTransferERC = new ContractExecuteTransaction()
        .setContractId(contractIdSender) // Contract ID
        .setGas(4000000) // Increase if reverts
        .setFunction("transferERC", 
            new ContractFunctionParameters()
            .addAddress(tokenIdSolidityAddr) // Token ID
            .addAddress(aliceId.toSolidityAddress()) // Token receiver ID
            .addUint256(1000) // Token amount
        );
    
    const tokenTransferERCTx = await tokenTransferERC.execute(client);
    const tokenTransferERCRx = await tokenTransferERCTx.getReceipt(client);
    const tokenTransferERCStatus = tokenTransferERCRx.status;

    console.log("Token transfer transaction status: " + tokenTransferERCStatus.toString());

    // Get TokenSender balance
    const getSender2 = new ContractInfoQuery()
        .setContractId(contractIdSender);

    const senderInfo2 = await getSender2.execute(client);
    const senderBalance2 = senderInfo2.tokenRelationships.get(tokenId).balance / 100;

    console.log("The sender contract balance for token " + tokenId + " is: " + senderBalance2);

    // Check Alice's balance
    const query = new AccountInfoQuery()
        .setAccountId(aliceId) // Token receiver ID

    const info = await query.execute(client);
    // Get balance and divide by 100 because of token decimals
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The account balance for token " + tokenId + " is: " + balance);
}

main();