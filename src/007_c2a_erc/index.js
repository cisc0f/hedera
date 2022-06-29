const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractCreateFlow, 
    ContractExecuteTransaction, 
    ContractFunctionParameters,  
    TokenAssociateTransaction,
    AccountInfoQuery,
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
    const adminId = await accountCreator(adminKey, 20, client);
    // add owner?

    const bytecode = fs.readFileSync('./binaries/TokenSenderERC_sol_TokenSenderERC.bin');

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

    client.setOperator(operatorId, operatorKey);

    const tokenId = await tokenCreator(adminKey, AccountId.fromString(contractId), adminKey, client);

    console.log("The new token ID is " + tokenId);

    // Execute token associate
    // Associate token to contract
    const associateToken = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(operatorId))
        .setTokenIds([tokenId]);
        // Signing not needed as execute is using adminKey to sign already

    const associateTokenTx = await associateToken.execute(client);
    const associateTokenRx = await associateTokenTx.getReceipt(client);

    const associateTokenStatus = associateTokenRx.status;

    console.log("The associate transaction status: " + associateTokenStatus.toString());

    // Approve token transfer
    const approve = new ContractExecuteTransaction()
        .setContractId(contractId)
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

    console.log("Token transfer transaction status: " + approveStatus.toString());

    // Execute token transfer
    const tokenTransfer = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(4000000)
        .setFunction("delegateTransfer", 
            new ContractFunctionParameters()
            .addAddress(tokenId.toSolidityAddress())
            .addAddress(operatorId.toSolidityAddress())
            .addUint256(1000)
        )
        .freezeWith(client);
    const tokenTransferSigned = await tokenTransfer.sign(adminKey); //not required ?
    const tokenTransferTx = await tokenTransferSigned.execute(client);
    const tokenTransferRx = await tokenTransferTx.getReceipt(client);
    const tokenTransferStatus = tokenTransferRx.status;

    console.log("Token transfer transaction status: " + tokenTransferStatus.toString());

    //Create the query
    const query = new AccountInfoQuery()
        .setAccountId(operatorId)

    const info = await query.execute(client);
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The contract balance for token " + tokenId + " is: " + balance);
}

main();