const fs = require('fs');
const { AccountId, 
        PrivateKey, 
        Client, 
        ContractCreateFlow, 
        ContractExecuteTransaction,
        ContractFunctionParameters,
        AccountCreateTransaction,
        Hbar
        } = require('@hashgraph/sdk');

// Setup your .env path
require('dotenv').config({path: __dirname + '/../../.env'});

// CID from ipfs
metadata = "QmdJwEyyZo8Vc7C7oq6vv1j3gw6a9Xaa9TR5cDudX4kKBW";

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
    
    // Init Alice account
    const aliceKey = PrivateKey.generateED25519();
    const aliceId = await accountCreator(aliceKey, 100);

    const bytecode = fs.readFileSync('./binaries/NftManager_sol_NftManager.bin');

    // Create contract
    const createContract = new ContractCreateFlow()
        .setGas(150000) // Increase if revert
        .setBytecode(bytecode); // Contract bytecode
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
            .addString("CryptoFrancis") // NFT name
            .addString("CRYF") // NFT symbol
            .addString("Just a memo") // NFT memo
            .addUint32(10) // NFT max supply
            .addUint32(7000000) // Expiration: Needs to be between 6999999 and 8000001
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
            .addAddress(tokenIdSolidityAddr) // Token address
            .addBytesArray([Buffer.from(metadata)]) // Metadata
            );
    const mintTokenTx = await mintToken.execute(client);
    const mintTokenRx = await mintTokenTx.getRecord(client);
    const serial = mintTokenRx.contractFunctionResult.getInt64(0);

    console.log(`Minted NFT with serial: ${serial} \n`);
    
    // Transfer NFT to Alice
    const transferToken = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("transferNft",
            new ContractFunctionParameters()
            .addAddress(tokenIdSolidityAddr) // Token address
            .addAddress(aliceId.toSolidityAddress()) // Token receiver (Alice)
            .addInt64(serial)) // NFT serial number
        .freezeWith(client) // freezing using client
        .sign(aliceKey); // Sign transaction with Alice 
    const transferTokenTx = await transferToken.execute(client);
    const transferTokenRx = await transferTokenTx.getReceipt(client);

    console.log(`Transfer status: ${transferTokenRx.status} \n`);

}

main();