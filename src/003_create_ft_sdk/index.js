const { 
    Client, 
    TokenCreateTransaction, 
    PrivateKey, AccountId, AccountCreateTransaction, Hbar 
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

    //Create the transaction and freeze for manual signing
    const transaction = await new TokenCreateTransaction()
        .setTokenName("USD Bar")
        .setTokenSymbol("USDB")
        .setTreasuryAccountId(treasuryId)
        .setInitialSupply(10000)
        .setDecimals(2)
        .setAutoRenewAccountId(treasuryId)
        .setAutoRenewPeriod(7000000)
        .setMaxTransactionFee(new Hbar(30)) //Change the default max transaction fee
        .freezeWith(client);

    //Sign the transaction with the token adminKey and the token treasury account private key
    const signTx =  await transaction.sign(treasuryKey);

    //Sign the transaction with the client operator private key and submit to a Hedera network
    const txResponse = await signTx.execute(client);

    //Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the token ID from the receipt
    const tokenId = receipt.tokenId;

    console.log("The new token ID is " + tokenId);
    
}

main();