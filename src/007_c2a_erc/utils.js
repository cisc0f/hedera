const { 
    TokenCreateTransaction, 
    Hbar,
    AccountCreateTransaction
} = require("@hashgraph/sdk");

async function accountCreator(pvKey, iBal, client) {
    const response = await new AccountCreateTransaction()
        .setInitialBalance(new Hbar(iBal))
        .setKey(pvKey.publicKey)
        .execute(client);
    const receipt = await response.getReceipt(client);
    return receipt.accountId;
}

async function tokenCreator(adminKey, treasuryId, treasuryKey, client) {
    //Create the transaction and freeze for manual signing
    const createToken = await new TokenCreateTransaction()
        .setTokenName("USD Bar")
        .setTokenSymbol("USDB")
        .setTreasuryAccountId(treasuryId)
        .setInitialSupply(10000)
        .setDecimals(2)
        .setAdminKey(adminKey.publicKey)
        .setMaxTransactionFee(new Hbar(20)) //Change the default max transaction fee
        .freezeWith(client);

    const createTokenTx =  await (await createToken.sign(adminKey)).sign(treasuryKey);
    const createTokenRx = await createTokenTx.execute(client);
    const createTokenReceipt = await createTokenRx.getReceipt(client);

    const tokenId = createTokenReceipt.tokenId;

    return tokenId;
}

module.exports = {
    accountCreator,
    tokenCreator
}
