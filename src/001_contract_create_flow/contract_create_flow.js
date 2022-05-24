require('dotenv').config({path: __dirname + '/../../.env'});
const { AccountId, PrivateKey, Client, ContractCreateFlow } = require('@hashgraph/sdk');
const fs = require('fs');

const main = async () => {
    const accountId = AccountId.fromString(process.env.ACCOUNT_ID);
    const privateKey = PrivateKey.fromString(process.env.PRIVATE_KEY);

    const client = Client.forTestnet().setOperator(accountId, privateKey);

    const bytecode = fs.readFileSync('contract_create_flow.bin');

    // Create contract using ContractCreateFlow
    const createContract = new ContractCreateFlow()
        .setGas(100000)
        .setBytecode(bytecode)
    const createTx = await createContract.execute(client);
    const createRx = await createTx.getReceipt(client);
    const contractId = createRx.contractId;

    console.log(`Contract created with ID: ${contractId}`);

}

main();