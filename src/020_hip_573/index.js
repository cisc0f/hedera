const { 
    AccountId, 
    PrivateKey,
    Hbar,
    Client,
    TokenType,
    AccountCreateTransaction,
    CustomFractionalFee,
    TransferTransaction,
    TokenCreateTransaction,
    AccountBalanceQuery,
} = require('@hashgraph/sdk');

require('dotenv').config({path: __dirname + '/../../.env'});

const operatorId = AccountId.fromString(process.env.PNET_ID);
const operatorKey = PrivateKey.fromString(process.env.PNET_KEY);

const client = Client.forPreviewnet().setOperator(operatorId, operatorKey);

const accountCreator =  async (initialBalance, privateKey) => {
    const createAccount = new AccountCreateTransaction()
        .setInitialBalance(initialBalance)
        .setKey(privateKey.publicKey)
        .setMaxAutomaticTokenAssociations(10)
        .freezeWith(client);
    const createAccountTx = await createAccount.execute(client);
    const createAccountRx = await createAccountTx.getReceipt(client);
    return createAccountRx.accountId;
}

async function main() {

    // STEP 1: Create three accounts using the helper function
    const accountKey1 = PrivateKey.generateED25519();
    const accountId1 = await accountCreator(50, accountKey1);

    const accountKey2 = PrivateKey.generateED25519();
    const accountId2 = await accountCreator(50, accountKey2);

    const accountKey3 = PrivateKey.generateED25519();
    const accountId3 = await accountCreator(50, accountKey3);

    console.log(`STEP 1 - Three accounts created: \n ${accountId1} \n ${accountId2} \n ${accountId3}\n`);

    // STEP 2: Create Custom Fees and Fungible Token
    const fee1 = new CustomFractionalFee()
        .setFeeCollectorAccountId(accountId1)
        .setNumerator(1)
        .setDenominator(100)
        .setAllCollectorsAreExempt(true);

    const fee2 = new CustomFractionalFee()
        .setFeeCollectorAccountId(accountId2)
        .setNumerator(2)
        .setDenominator(100)
        .setAllCollectorsAreExempt(true);

    const fee3 = new CustomFractionalFee()
        .setFeeCollectorAccountId(accountId3)
        .setNumerator(3)
        .setDenominator(100)
        .setAllCollectorsAreExempt(true);

    const createToken = new TokenCreateTransaction()
        .setTokenName("HIP-573 Token")
        .setTokenSymbol("H573")
        .setTokenType(TokenType.FungibleCommon)
        .setTreasuryAccountId(operatorId)
        .setAutoRenewAccountId(operatorId)
        .setAdminKey(operatorKey)
        .setFreezeKey(operatorKey)
        .setWipeKey(operatorKey)
        .setInitialSupply(100000000) // Total supply = 100000000 / 10 ^ 2
        .setDecimals(2)
        .setCustomFees([fee1, fee2, fee3])
        .setMaxTransactionFee(new Hbar(40))
        .freezeWith(client);

    const createTokenSigned1 = await createToken.sign(accountKey1);
    const createTokenSigned2 = await createTokenSigned1.sign(accountKey2);
    const createTokenSigned3 = await createTokenSigned2.sign(accountKey3);

    const createTokenTx = await createTokenSigned3.execute(client);
    const createTokenRx = await createTokenTx.getReceipt(client);

    const tokenId = createTokenRx.tokenId;

    console.log(`STEP 2 - Token with custom fees created: ${tokenId}\n`);

    // STEP 3: Send token from treasury to one account and from one account to another
    const transferFromTrasuryTx = await new TransferTransaction()
        .addTokenTransfer(tokenId, operatorId, -10000)
        .addTokenTransfer(tokenId, accountId2, 10000)
        .freezeWith(client)
        .execute(client);

    const transferFromTrasuryRx = await transferFromTrasuryTx.getReceipt(client);
    const transferFromTrasuryStatus = transferFromTrasuryRx.status.toString();

    console.log(`STEP 3 \nToken transfer from treasury to account 2: ${transferFromTrasuryStatus}`);

    const transferFromAccount2 = await new TransferTransaction()
        .addTokenTransfer(tokenId, accountId2, -10000)
        .addTokenTransfer(tokenId, accountId1, 10000)
        .freezeWith(client)
        .sign(accountKey2);
    
    const transferFromAccount2Tx = await transferFromAccount2.execute(client);
    const transferFromAccount2Rx = await transferFromAccount2Tx.getReceipt(client);

    console.log(`Transfer from account 2 to account 1: ${transferFromAccount2Rx.status.toString()}\n`);

    // Check collectors account balance (methods will be deprecated soon, use axios and mirror node api)
     const checkBalance1 = await new AccountBalanceQuery()
     .setAccountId(accountId1)
     .execute(client);
 
    const balance1 = checkBalance1.tokens._map.get(tokenId.toString());

    const checkBalance2 = await new AccountBalanceQuery()
        .setAccountId(accountId2)
        .execute(client);

    const balance2 = checkBalance2.tokens._map.get(tokenId.toString());

    const checkBalance3 = await new AccountBalanceQuery()
    .setAccountId(accountId3)
    .execute(client);

    const balance3 = checkBalance3.tokens._map.get(tokenId.toString());

    console.log(`Accounts Balance: \nAccount 1: ${balance1} \nAccount 2: ${balance2} \nAccount 3: ${balance3} \n`);

}

void main();