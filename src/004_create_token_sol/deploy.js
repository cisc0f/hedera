const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractCreateFlow,
    ContractFunctionParameters,
    ContractExecuteTransaction,
    AccountCreateTransaction,
    Hbar
} = require('@hashgraph/sdk');
const fs = require('fs');

require('dotenv').config({path: __dirname + '/../../.env'});

// Get operator from .env file
const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

// Account creation function
async function accountCreator(pvKey, iBal) {

    const response = await new AccountCreateTransaction()
        .setInitialBalance(new Hbar(iBal))
        .setKey(pvKey.publicKey)
        .execute(client);

    const receipt = await response.getReceipt(client);

    return receipt.accountId;
}

const main = async () => {

    const adminKey = PrivateKey.generateED25519();
    const adminId = await accountCreator(adminKey, 10);
    const treasuryKey = PrivateKey.generateED25519();
    const treasuryId = await accountCreator(treasuryKey, 10);

    const bytecode = fs.readFileSync('./binaries/TokenCreator_sol_TokenCreator.bin');

    const createContract = new ContractCreateFlow()
        .setGas(150000) // Increase if revert
        .setBytecode(bytecode); // Contract bytecode
    const createContractTx = await createContract.execute(client);
    const createContractRx = await createContractTx.getReceipt(client);
    const contractId = createContractRx.contractId;

    console.log(`Contract created with ID: ${contractId}`);

    // Create FT using precompile function
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(300000) // Increase if revert
        .setPayableAmount(20) // Increase if revert
        .setFunction("createFungible", 
            new ContractFunctionParameters()
            .addString("CryptoFrancis") // FT name
            .addString("CRYF") // FT symbol
            .addUint256(1000000000) // FT initial supply
            .addUint256(2) // FT decimals
            .addAddress(treasuryId.toSolidityAddress()) // treasury account
            .addBytes(adminKey.publicKey.toBytes()) // admin public key
            .addBytes(treasuryKey.publicKey.toBytes()) // treasury public key
            .addAddress(adminId.toSolidityAddress()) // auto renew account (admin)
            .addUint32(7000000)) // auto renew period
        .freezeWith(client);

    // sign transaction with admin and treasury
    const signTx = await (await createToken.sign(adminKey)).sign(treasuryKey);
    const createTokenTx = await signTx.execute(client);

    const createTokenRx = await createTokenTx.getRecord(client);
    const tokenIdSolidityAddr = createTokenRx.contractFunctionResult.getAddress(0);
    const tokenId = AccountId.fromSolidityAddress(tokenIdSolidityAddr);

    console.log(`Token created with ID: ${tokenId} \n`);

}

main();