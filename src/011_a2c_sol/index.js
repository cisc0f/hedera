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
    const adminId = await accountCreator(adminKey, 10, client);
    // add owner?

    const tokenId = await tokenCreator(adminKey, operatorId, operatorKey, client);

    console.log("The new token ID is " + tokenId);

    const bytecode = fs.readFileSync('./binaries/TokenReceiver_sol_TokenReceiver.bin');

    // Create contract using ContractCreateFlow
    const createContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode)
    const createSubmit = await createContract.execute(client);
    const createRx = await createSubmit.getReceipt(client);
    const contractId = createRx.contractId;

    console.log("The new contract ID is " + contractId);

    // Execute token associate
    const tokenAssociate = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1500000)
        .setFunction("tokenAssociate", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
        );
    const tokenAssociateTx = await tokenAssociate.execute(client);
    const tokenAssociateRx = await tokenAssociateTx.getReceipt(client);
    const tokenAssociateStatus = tokenAssociateRx.status;

    console.log("Token associate transaction status: " + tokenAssociateStatus.toString());

    // Execute token transfer
    const tokenTransfer = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1500000)
        .setFunction("tokenTransfer", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
            .addAddress(operatorId.toSolidityAddress())
            .addInt64(1000)
        )
        .freezeWith(client);
    const tokenTransferSigned = await tokenTransfer.sign(operatorKey);
    const tokenTransferTx = await tokenTransferSigned.execute(client);
    const tokenTransferRx = await tokenTransferTx.getReceipt(client);
    const tokenTransferStatus = tokenTransferRx.status;

    console.log("Token transfer transaction status: " + tokenTransferStatus.toString());

    //Create the query
    const query = new ContractInfoQuery()
        .setContractId(contractId);

    const info = await query.execute(client);
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The contract balance for token " + tokenId + " is: " + balance);
}

main();