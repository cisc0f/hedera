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
async function tokenCreator(adminKey, treasuryId, treasuryKey, client) {
    //Create the transaction and freeze for manual signing
    const createToken = await new TokenCreateTransaction()
        .setTokenName("USD Bar") // Name
        .setTokenSymbol("USDB") // Symbol
        .setTreasuryAccountId(treasuryId) // Treasury account
        .setInitialSupply(10000) // Initial supply
        .setDecimals(2) // Decimals
        .setAdminKey(adminKey) // Admin key
        .setSupplyKey(adminKey)
        .setMaxTransactionFee(new Hbar(20)) // Change the default max transaction fee
        .freezeWith(client);
    // Double sign with adminKey and treasuryKey
    const createTokenTx =  await (await createToken.sign(adminKey)).sign(treasuryKey);
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
