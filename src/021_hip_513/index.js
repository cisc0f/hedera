const fs = require('fs');
const { 
    AccountId, 
    PrivateKey, 
    Client, 
    ContractCreateFlow,
    ContractFunctionParameters,
    ContractExecuteTransaction
} = require('@hashgraph/sdk');

require('dotenv').config({path: __dirname + '/../../.env'});

const operatorId = AccountId.fromString(process.env.PNET_ID);
const operatorKey = PrivateKey.fromString(process.env.PNET_KEY);
const client = Client.forPreviewnet().setOperator(operatorId, operatorKey);

async function main() {

    const bytecode = fs.readFileSync('SimpleContract_sol_SimpleContract.bin');

    const deployContract = new ContractCreateFlow()
        .setGas(1000000)
        .setBytecode(bytecode)
        .setConstructorParameters(new ContractFunctionParameters()
            .addString("Ciao"));
    const deployContractTx = await deployContract.execute(client);
    const deployContractRx = await deployContractTx.getReceipt(client);
    const contractId = deployContractRx.contractId;

    console.log(contractId.toString());

    const getMessage = new ContractExecuteTransaction()
        .setGas(1000000)
        .setContractId(contractId)
        .setFunction("get_message");
    const getMessageTx = await getMessage.execute(client);
    const getMessageRx = await getMessageTx.getReceipt(client);
    const getMessageStatus = getMessageRx.status.toString();

    console.log(getMessageStatus);

    process.exit(0);
}

void main();