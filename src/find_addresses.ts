import Web3 from "web3";
import { AbiItem } from "web3-utils";
import abi from "../abi/typhoon.json";
import fetch from "node-fetch";
import fs from "fs";

const RPC_URL = "https://bsc-dataseed1.defibit.io/";
const CUTOFF_BLOCK = 6025000;
const API_KEY = "";

const CONTRACTS = {
    0.1: "0x66e90E4F92f39873c2feB394aB87616B37AFFFdB",
    "1.0": "0x6FF1D9e9fB6d3E118f39672CEb7A7A2234007053",
    10: "0x0fC5B5BD6455A3C16c1847a91Ebea94d00d5FF8a",
    100: "0xa0AeA64d75c9d86596EDe704577D5E925254fd4E",
};

const httpProvider = new Web3.providers.HttpProvider(RPC_URL, {
    timeout: 10000,
});
const web3 = new Web3(httpProvider);

function getContract(address) {
    return new web3.eth.Contract((abi as unknown) as AbiItem, address, null);
}

async function loadDepositHistory({ contract }) {
    const recursiveFetch = async (host, apiKey, fromBlock = 0) => {
        const topic =
            "0xa945e51eec50ab98c161376f0db4cf2aeba3ec92755fe2fcd388bdbbb80ff196";
        const url = `https://${host}/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock='latest'&address=${contract._address}&topic0=${topic}&apikey=${apiKey}`;

        const res = await fetch(url).then((r) => r.json());
        const parsedEvents = res.result.map((row) => {
            contract.inputs = [
                {
                    indexed: true,
                    internalType: "bytes32",
                    name: "commitment",
                    type: "bytes32",
                },
                {
                    indexed: false,
                    internalType: "uint32",
                    name: "leafIndex",
                    type: "uint32",
                },
                {
                    indexed: false,
                    internalType: "uint256",
                    name: "timestamp",
                    type: "uint256",
                },
            ];

            const data = contract._decodeEventABI(row);
            return data;
        });

        if (parsedEvents.length === 1000) {
            const lastEvent = parsedEvents.reduce(
                (prev, cur) => {
                    if (prev.blockNumber > cur.blockNumber) {
                        return prev;
                    }

                    return cur;
                },
                { blockNumber: 0 }
            );

            const additionalEvents = await recursiveFetch(
                host,
                apiKey,
                lastEvent.blockNumber
            );

            // filter out duplicated events based on txhash
            let txs = {};
            const merged = parsedEvents
                .concat(additionalEvents)
                .filter((value, index, self) => {
                    if (txs[value.transactionHash] === undefined) {
                        txs[value.transactionHash] = null;
                        return true;
                    }

                    return false;
                });
            return merged;
        }
        return parsedEvents;
    };

    try {
        return await recursiveFetch("bsc.typhoon.network", API_KEY);
    } catch (e) {
        console.error("loadDepositData", e);
        throw e;
    }
}

(async () => {
    const contractMapping = Object.entries(CONTRACTS).map(([key, val]) => {
        return [key, getContract(val)];
    });

    // fetch the history
    const eligibleTransactionHistory = {};
    for (let [key, contract] of contractMapping) {
        console.log(`Parsing ${key}...`);
        const history = (await loadDepositHistory({ contract })).filter(
            (element) => {
                return element.blockNumber <= CUTOFF_BLOCK;
            }
        );

        console.log(`Found ${history.length} valid deposit events`);

        // fetch all adresses from those transactions and aggregate
        const addresses = {};
        const txhashes = history.map((h) => h.transactionHash);
        for (let hash of txhashes) {
            const tx = await web3.eth.getTransaction(hash);
            addresses[tx.from] = null;
        }

        console.log(`Found ${Object.keys(addresses).length} unique wallets`);
        eligibleTransactionHistory[key as string] = Object.keys(addresses);
    }

    fs.writeFileSync(
        "./data/wallets.json",
        JSON.stringify(eligibleTransactionHistory)
    );
})();
