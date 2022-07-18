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

    // Create NFT using precompile function
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(300000) // Increase if revert
        .setPayableAmount(20) // Increase if revert
        .setFunction("createNonFungible", 
            new ContractFunctionParameters()
            .addString("Fall Collection") //NFT name
            .addString("LEAF") // NFT symbol
            .addString("Just a memo") // NFT memo
            .addUint32(250) // NFT max supply
            .addUint32(7000000)); // auto renew period
    
    const createTokenTx = await createToken.execute(client);

    const createTokenRx = await createTokenTx.getRecord(client);
    const tokenIdSolidityAddr = createTokenRx.contractFunctionResult.getAddress(0);
    const tokenId = AccountId.fromSolidityAddress(tokenIdSolidityAddr);

    console.log(`Token created with ID: ${tokenId} \n`);

}

main();