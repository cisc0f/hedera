const { 
    Client,
    AccountId, 
    PrivateKey, 
    ContractCreateFlow, 
    ContractExecuteTransaction, 
    ContractFunctionParameters, 
    ContractInfoQuery 
} = require('@hashgraph/sdk');

const { 
    accountCreator, 
    tokenCreator 
} = require('./utils');

require('dotenv').config({path: __dirname + '/../../.env'});
const fs = require('fs');

const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

const main = async () => {

    const adminKey = PrivateKey.generateED25519();
    const adminId = await accountCreator(adminKey, 40, client);
    // add owner?

    const bytecodeSender = fs.readFileSync('./binaries/TokenSender_sol_TokenSender.bin');
    const bytecodeReceiver = fs.readFileSync('./binaries/TokenReceiver_sol_TokenReceiver.bin');

    // Change operator to adminId
    client.setOperator(adminId, adminKey);
    // Create sender contract using ContractCreateFlow
    const createSenderContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeSender)
        .setAdminKey(adminKey);
    const createSenderSubmit = await createSenderContract.execute(client);
    const createSenderRx = await createSenderSubmit.getReceipt(client);
    const contractIdSender = createSenderRx.contractId;

    console.log("The new contract ID is " + contractIdSender);

    // Create receiver contract using ContractCreateFlow
    const createReceiverContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeReceiver)
        .setAdminKey(adminKey);
    const createReceiverSubmit = await createReceiverContract.execute(client);
    const createReceiverRx = await createReceiverSubmit.getReceipt(client);
    const contractIdReceiver = createReceiverRx.contractId;

    console.log("The new contract ID is " + contractIdReceiver);

    // Create token and give to sender contract
    const tokenId = await tokenCreator(adminKey, AccountId.fromString(contractIdSender), adminKey, client);

    console.log("The new token ID is " + tokenId);

    // Execute token associate
    const tokenAssociate = new ContractExecuteTransaction()
        .setContractId(contractIdSender)
        .setGas(1500000)
        .setFunction("tokenAssociate", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
            .addAddress(contractIdReceiver.toSolidityAddress())
        );
    const tokenAssociateTx = await tokenAssociate.execute(client);
    const tokenAssociateRx = await tokenAssociateTx.getReceipt(client);
    const tokenAssociateStatus = tokenAssociateRx.status;

    console.log("Token associate transaction status: " + tokenAssociateStatus.toString());

    // Switch back to operatorId
    client.setOperator(operatorId, operatorKey);

    // Execute token transfer
    const tokenTransfer = new ContractExecuteTransaction()
        .setContractId(contractIdSender)
        .setGas(1500000)
        .setFunction("tokenTransfer", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
            .addAddress(contractIdReceiver.toSolidityAddress())
            .addInt64(1000)
        )
        .freezeWith(client);
    const tokenTransferSigned = await tokenTransfer.sign(adminKey);
    const tokenTransferTx = await tokenTransferSigned.execute(client);
    const tokenTransferRx = await tokenTransferTx.getReceipt(client);
    const tokenTransferStatus = tokenTransferRx.status;

    console.log("Token transfer transaction status: " + tokenTransferStatus.toString());

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