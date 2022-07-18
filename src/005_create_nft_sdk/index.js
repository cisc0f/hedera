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

    const treasuryKey = PrivateKey.generateED25519();
    const treasuryId = await accountCreator(treasuryKey, 10);

    //Create the NFT
    const nftCreate = await new TokenCreateTransaction()
        .setTokenName("Fall Collection")
        .setTokenSymbol("LEAF")
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setTokenMemo("Just a memo")
        .setInitialSupply(0)
        .setTreasuryAccountId(treasuryId)
        .setSupplyType(TokenSupplyType.Finite)
        .setSupplyKey(treasuryKey)
        .setMaxSupply(250)
        .setAutoRenewAccountId(treasuryId)
        .setAutoRenewPeriod(7000000)
        .freezeWith(client);

    //Sign the transaction with the treasury key
    const nftCreateTxSign = await nftCreate.sign(treasuryKey);

    //Submit the transaction to a Hedera network
    const nftCreateSubmit = await nftCreateTxSign.execute(client);

    //Get the transaction receipt
    const nftCreateRx = await nftCreateSubmit.getReceipt(client);

    //Get the token ID
    const tokenId = nftCreateRx.tokenId;

    //Log the token ID
    console.log(`Created NFT with ID: ${tokenId} \n`);
    
}

main();