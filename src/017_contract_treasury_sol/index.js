const { 
    Client, 
    AccountId, 
    PrivateKey, 
    ContractCreateFlow,
    ContractFunctionParameters,
    ContractExecuteTransaction,
} = require('@hashgraph/sdk');
const fs = require('fs');

require('dotenv').config({path: __dirname + '/../../.env'});

const operatorKey = PrivateKey.fromString(process.env.PRIVATE_KEY);
const operatorId = AccountId.fromString(process.env.ACCOUNT_ID);

const client = Client.forTestnet().setOperator(operatorId, operatorKey);

const main = async () => {

    const bytecode = fs.readFileSync("./binaries/TreasuryContract_sol_TreasuryContract.bin");

    const contractCreate = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode);
    const contractCreateTx = await contractCreate.execute(client);
    const contractCreateRx = await contractCreateTx.getReceipt(client);
    const contractId = contractCreateRx.contractId;

    console.log("Contract created with ID: " + contractId);

    // Create FT using precompile function
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractId)
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

    console.log("Token created with ID: " + tokenId);
}

main();