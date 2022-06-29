const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractCreateFlow, 
    ContractExecuteTransaction, 
    ContractFunctionParameters,  
    TokenAssociateTransaction,
    AccountInfoQuery,
    ContractInfoQuery,
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

    const bytecodeSender = fs.readFileSync('./binaries/TokenSenderERC_sol_TokenSenderERC.bin');
    const bytecodeReceiver = fs.readFileSync('./binaries/TokenReceiverERC_sol_TokenReceiverERC.bin');

    client.setOperator(adminId, adminKey);
    // Create contract using ContractCreateFlow
    const createSenderContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeSender)
        .setAdminKey(adminKey);
    const createSenderTx = await createSenderContract.execute(client);
    const createSenderRx = await createSenderTx.getReceipt(client);
    const contractIdSender = createSenderRx.contractId;

    console.log("The new sender contract ID is " + contractIdSender);

    // Create token with sender contract as treasury
    const tokenId = await tokenCreator(adminKey, AccountId.fromString(contractIdSender), adminKey, client);

    console.log("The new token ID is " + tokenId);

    // Create contract using ContractCreateFlow
    const createReceiverContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecodeReceiver)
        .setAdminKey(adminKey);
    const createReceiverTx = await createReceiverContract.execute(client);
    const createReceiverRx = await createReceiverTx.getReceipt(client);
    const contractIdReceiver = createReceiverRx.contractId;

    console.log("The new receiver contract ID is " + contractIdReceiver);

    // Execute token associate
    // Associate token to contract
    const associateToken = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(contractIdReceiver))
        .setTokenIds([tokenId]);
        // Signing not needed as execute is using adminKey to sign already

    const associateTokenTx = await associateToken.execute(client);
    const associateTokenRx = await associateTokenTx.getReceipt(client);

    const associateTokenStatus = associateTokenRx.status;

    console.log("The associate transaction status: " + associateTokenStatus.toString());

    client.setOperator(operatorId, operatorKey);

    // Approve token transfer
    const approve = new ContractExecuteTransaction()
        .setContractId(contractIdSender)
        .setGas(4000000)
        .setFunction("approve", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
            .addAddress(operatorId.toSolidityAddress())
            .addUint256(1000)
        );
    const approveTx = await approve.execute(client);
    const approveRx = await approveTx.getReceipt(client);
    const approveStatus = approveRx.status;

    console.log("Token approve transaction status: " + approveStatus.toString());

    // Execute token transfer
    const tokenTransfer = new ContractExecuteTransaction()
        .setContractId(contractIdSender)
        .setGas(4000000)
        .setFunction("delegateTransfer", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
            .addAddress(contractIdReceiver.toSolidityAddress())
            .addUint256(1000)
        )
        .freezeWith(client);
    const tokenTransferSigned = await tokenTransfer.sign(adminKey); //not required ?
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