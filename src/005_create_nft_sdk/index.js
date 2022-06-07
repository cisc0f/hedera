const { 
    Client, 
    TokenCreateTransaction, 
    PrivateKey, 
    AccountId, 
    AccountCreateTransaction, 
    Hbar, 
    TokenType,
    TokenSupplyType
} = require('@hashgraph/sdk');

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

    const supplyKey = PrivateKey.generateED25519();
    const supplyId = await accountCreator(supplyKey, 10);
    const treasuryKey = PrivateKey.generateED25519();
    const treasuryId = await accountCreator(treasuryKey, 10);

    //Create the NFT
    let nftCreate = await new TokenCreateTransaction()
        .setTokenName("CryptoFrancis")
        .setTokenSymbol("CRYF")
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(treasuryId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(250)
        .setSupplyKey(supplyKey)
        .freezeWith(client);

    //Sign the transaction with the treasury key
    let nftCreateTxSign = await nftCreate.sign(treasuryKey);

    //Submit the transaction to a Hedera network
    let nftCreateSubmit = await nftCreateTxSign.execute(client);

    //Get the transaction receipt
    let nftCreateRx = await nftCreateSubmit.getReceipt(client);

    //Get the token ID
    let tokenId = nftCreateRx.tokenId;

    //Log the token ID
    console.log(`Created NFT with ID: ${tokenId} \n`);
    
}

main();