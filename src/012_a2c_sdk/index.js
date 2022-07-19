const { 
    PrivateKey, 
    AccountId, 
    Client,
    TokenAssociateTransaction,
    ContractCreateFlow,
    TransferTransaction,
    ContractInfoQuery,
    ContractUpdateTransaction,
    KeyList,
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

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const main = async () => {

    // Create admin key for contract
    const adminKey = PrivateKey.generateED25519();
    const adminId = await accountCreator(adminKey, 10, client);

    // Alice is the sender 
    const aliceKey = PrivateKey.generateED25519();
    const aliceId = await accountCreator(aliceKey, 10, client);

    // Create token with Alice as treasury
    const tokenId = await tokenCreator(aliceId, aliceKey, client);

    console.log("The new token ID is " + tokenId);

    // Load bytecode
    const bytecode = fs.readFileSync('TokenReceiver_sol_TokenReceiver.bin');
    
    // Switch operator to sign transaction
    client.setOperator(adminId, adminKey);

    // Create contract with adminKey
    const createContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode)
        .setAdminKey(adminKey)
    const createSubmit = await createContract.execute(client);
    const createRx = await createSubmit.getReceipt(client);
    const contractId = createRx.contractId;

    console.log("The new contract ID is " + contractId);

    // Switch operator back to operator account
    client.setOperator(operatorId, operatorKey);

    // Associate token to contract (sign using adminKey)
    const associateToken = await new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(contractId))
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(adminKey);

    const associateTokenTx = await associateToken.execute(client);
    const associateTokenRx = await associateTokenTx.getReceipt(client);

    const associateTokenStatus = associateTokenRx.status;

    console.log("The associate transaction status: " + associateTokenStatus.toString());

    // Update contract and remove contract's admin key
    const contractUpdate = await new ContractUpdateTransaction()
        .setContractId(contractId)
        .setAdminKey(new KeyList())
        .freezeWith(client)
        .sign(adminKey);
    const contractUpdateTx = await contractUpdate.execute(client);
    const contractUpdateRx = await contractUpdateTx.getReceipt(client);

    console.log("Contract update status: " + contractUpdateRx.status.toString());

    // Transfer token from Alice to the contract using SDK
    const transferToken = new TransferTransaction()
        .addTokenTransfer(tokenId, aliceId, -1000) // -10 USDB
        .addTokenTransfer(tokenId, contractId, 1000) // +10 USDB
        .freezeWith(client);
    const transferTokenTx = await transferToken.sign(aliceKey);
    const transferTokenSubmit = await transferTokenTx.execute(client);
    const transferTokenRx = await transferTokenSubmit.getReceipt(client);

    const transferTokenStatus = transferTokenRx.status;

    console.log("The transfer transaction status: " + transferTokenStatus.toString());

    //Check contract's balance
    const query = new ContractInfoQuery()
        .setContractId(contractId);

    const info = await query.execute(client);
    const balance = info.tokenRelationships.get(tokenId).balance / 100;

    console.log("The contract balance for token " + tokenId + " is: " + balance);

}

main();