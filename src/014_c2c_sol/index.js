const { 
    Client,
    AccountId, 
    PrivateKey, 
    ContractCreateFlow, 
    ContractExecuteTransaction, 
    ContractFunctionParameters, 
    ContractInfoQuery 
} = require('@hashgraph/sdk');

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

    console.log("The new contract ID is " + contractIdSender);

    // Create TokenReceiver contract
    const createReceiverContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeReceiver);
    const createReceiverSubmit = await createReceiverContract.execute(client);
    const createReceiverRx = await createReceiverSubmit.getReceipt(client);
    const contractIdReceiver = createReceiverRx.contractId;

    console.log("The new contract ID is " + contractIdReceiver);

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
    const tokenId = AccountId.fromSolidityAddress(tokenIdSolidityAddr);

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
        .setFunction("tokenTransfer", 
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
}

main();