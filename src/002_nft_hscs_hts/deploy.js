const fs = require('fs');
const { AccountId, 
        PrivateKey, 
        Client, 
        ContractCreateFlow, 
        ContractExecuteTransaction,
        ContractFunctionParameters,
        } = require('@hashgraph/sdk');

require('dotenv').config({path: __dirname + '/../../.env'});

const main = async () => {

    const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
    const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

    const client = Client.forTestnet().setOperator(accountId, privateKey);

    const bytecode = fs.readFileSync('./binaries/NftManager_sol_NftManager.bin');

    // Create contract
    const createContract = new ContractCreateFlow()
        .setGas(150000)
        .setBytecode(bytecode)
    const createContractTx = await createContract.execute(client);
    const createContractRx = await createContractTx.getReceipt(client);
    const contractId = createContractRx.contractId;
    console.log(`Contract created with ID: ${contractId}`);

    // Create NFT from precompile
    const createToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(300000) // Increase if revert
        .setPayableAmount(20) // Increase if revert
        .setFunction("createNft", 
            new ContractFunctionParameters()
            .addString("CryptoFrancis")
            .addString("CRYF")
            .addString("Just a memo")
            .addUint32(10)
            .addUint32(7000000) // Needs to be between 6999999 and 8000001
            );
    const createTokenTx = await createToken.execute(client);
    const createTokenRx = await createTokenTx.getRecord(client);
    const tokenIdSolidityAddr = createTokenRx.contractFunctionResult.getAddress(0);
    const tokenId = AccountId.fromSolidityAddress(tokenIdSolidityAddr);
    console.log(`Token created with ID: ${tokenId}`);

}

main();