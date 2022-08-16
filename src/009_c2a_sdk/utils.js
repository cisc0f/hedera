const { 
    Hbar, 
    AccountCreateTransaction
} = require("@hashgraph/sdk");

// Creates a new account
async function accountCreator(privateKey, initialBalance, client) {
    const response = await new AccountCreateTransaction()
        .setInitialBalance(new Hbar(initialBalance))
        .setMaxAutomaticTokenAssociations(10)
        .setKey(privateKey.publicKey)
        .execute(client);
    const receipt = await response.getReceipt(client);
    return receipt.accountId;
}

// Functions exports
module.exports = {
    accountCreator
}
