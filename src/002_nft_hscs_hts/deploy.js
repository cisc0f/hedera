const fs = require('fs');
const { AccountId, 
        PrivateKey, 
        Client, 
        ContractCreateFlow, 
        ContractExecuteTransaction,
        ContractFunctionParameters
        } = require('@hashgraph/sdk');

// Setup your .env path
require('dotenv').config({path: __dirname + '/../../.env'});

const main = async () => {

    const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
    const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

    metadata = "QmdJwEyyZo8Vc7C7oq6vv1j3gw6a9Xaa9TR5cDudX4kKBW";

    const client = Client.forTestnet().setOperator(accountId, privateKey);

    const bytecode = fs.readFileSync('./binaries/NftManager_sol_NftManager.bin');

    // Create contract
    const createContract = new ContractCreateFlow()
        .setGas(150000)
        .setBytecode(bytecode);
    const createContractTx = await createContract.execute(client);
    const createContractRx = await createContractTx.getReceipt(client);
    const contractId = createContractRx.contractId;

    console.log(`Contract created with ID: ${contractId} \n`);

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

    console.log(`Token created with ID: ${tokenId} \n`);

    // Mint NFT
    const mintToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("mintNft",
            new ContractFunctionParameters()
            .addAddress(tokenIdSolidityAddr) // Your token address
            .addBytesArray([Buffer.from(metadata)]) // Metadata
            );
    const mintTokenTx = await mintToken.execute(client);
    const mintTokenRx = await mintTokenTx.getRecord(client);
    const serial = mintTokenRx.contractFunctionResult.getInt64(0);

    console.log(`Minted NFT with serial: ${serial} \n`);

    // Transfer NFT
    const transferToken = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("transferNft",
            new ContractFunctionParameters()
            .addAddress(tokenIdSolidityAddr)
            .addAddress(accountId.toSolidityAddress())
            .addInt64(serial))
    const transferTokenTx = await transferToken.execute(client);
    const transferTokenRx = await transferTokenTx.getReceipt(client);

    console.log(`Transfer status: ${transferTokenRx.status} \n`);

}

main();