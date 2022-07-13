const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractCreateFlow, 
    TokenCreateTransaction, 
    ContractUpdateTransaction, 
    Hbar, 
    KeyList } = require('@hashgraph/sdk');
const fs = require('fs');

// External helper function
const { accountCreator } = require("./utils");

require('dotenv').config({path: __dirname + '/../../.env'});

const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const main = async () => {

    // Admin account creation
    const adminKey = PrivateKey.generateED25519();
    const adminId = await accountCreator(adminKey, 50, client);

    const bytecode = fs.readFileSync("./TreasuryContract_sol_TreasuryContract.bin");

    // Switch operator to admin to sign transactions
    //client.setOperator(adminId, adminKey);

    // Create contract with adminKey
    const contractCreate = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode)
        .setAdminKey(adminKey)
        .freezeWith(client);
    const signedContractCreate = await contractCreate.sign(adminKey);
    const contractCreateTx = await signedContractCreate.execute(client);
    const contractCreateRx = await contractCreateTx.getReceipt(client);
    const contractId = contractCreateRx.contractId;

    console.log("Contract created with ID: " + contractId);

    // Create fungible token using contract as treasury
    const tokenCreate = new TokenCreateTransaction()
        .setTokenName("USD Bar")
        .setTokenSymbol("USDB")
        .setTreasuryAccountId(AccountId.fromString(contractId))
        .setInitialSupply(10000)
        .setDecimals(2)
        .setAutoRenewAccountId(contractId)
        .setAutoRenewPeriod(7000000)
        .setMaxTransactionFee(new Hbar(30))
        .freezeWith(client);
    const signedTokenCreate = await tokenCreate.sign(adminKey);
    const tokenCreateTx = await signedTokenCreate.execute(client);
    const tokenCreateRx = await tokenCreateTx.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;

    console.log("Token created with ID: " + tokenId);

    const contractUpdate = await new ContractUpdateTransaction()
        .setContractId(contractId)
        .setAdminKey(new KeyList())
        .execute(client);
    const contractUpdateRx = await contractUpdate.getReceipt(client);

    console.log("Contract update status: " + contractUpdateRx.status.toString());
}

main();