const { 
    Hbar,
    TokenCreateTransaction, 
    AccountCreateTransaction
} = require("@hashgraph/sdk");

// Creates a new account
async function accountCreator(privateKey, initialBalance, client) {
    const response = await new AccountCreateTransaction()
        .setInitialBalance(new Hbar(initialBalance))
        .setKey(privateKey.publicKey)
        .execute(client);
    const receipt = await response.getReceipt(client);
    return receipt.accountId;
}

// Creates a new Fungible Token (change parameters if needed)
async function tokenCreator(treasuryId, treasuryKey, client) {
    //Create the transaction and freeze for manual signing
    const createToken = await new TokenCreateTransaction()
        .setTokenName("USD Bar") // Name
        .setTokenSymbol("USDB") // Symbol
        .setTreasuryAccountId(treasuryId) // Treasury account
        .setInitialSupply(10000) // Initial supply
        .setSupplyKey(treasuryKey) // Supply key
        .setDecimals(2) // Decimals
        .setMaxTransactionFee(new Hbar(20)) // Change the default max transaction fee
        .freezeWith(client);
    // Sign with treasuryKey
    const createTokenTx =  await createToken.sign(treasuryKey);
    const createTokenRx = await createTokenTx.execute(client);
    const createTokenReceipt = await createTokenRx.getReceipt(client);

    const tokenId = createTokenReceipt.tokenId;

    return tokenId;
}

// Functions exports
module.exports = {
    accountCreator,
    tokenCreator
}
