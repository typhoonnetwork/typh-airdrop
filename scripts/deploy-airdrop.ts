import hre from "hardhat";
import fs from "fs";

const ethers = hre.ethers;

async function main() {
  console.log("Deploying Airdrop...");

  // const tokenAddress = "0x35876fbafc884aab12e73510de4cc818ff7660ff";
  const tokenAddress = "0x4090e535f2e251f5f88518998b18b54d26b3b07c";

  const content = JSON.parse(fs.readFileSync("./data/wallets.json", "utf8"));
  const allocation = 100_000;
  const multiplier: { [key: string]: number } = {
    "0.1": 1,
    "1.0": 2,
    "10": 4,
    "100": 16,
  };

  // calculate total amount of shares available for this airdrop
  const totalShares = Object.keys(multiplier).reduce((prev, cur) => {
    const mx = multiplier[`${cur}`];
    return prev + content[cur].length * mx;
  }, 0);

  console.log("total shares: ", totalShares);
  console.log("average: ", allocation / totalShares);

  // calculate allocations for each user
  let allocations: [string, number][] = [];
  for (let denomination of Object.keys(content)) {
    const mx = multiplier[`${denomination}`];
    const alloc = content[denomination].map((addr: string) => [
      addr,
      (allocation / totalShares) * mx,
    ]);
    allocations = allocations.concat(alloc);
  }

  // aggregate all allocations across the different contracts into one big tuple
  let rewardMap = allocations.reduce((acc, [addr, amount]) => {
    if (!(addr in acc)) {
      acc[addr] = 0;
    }

    acc[addr] += amount;
    return acc;
  }, {});

  const rewardTuple: [string, number][] = Object.entries(rewardMap);

  // check if calculation is correct
  const total = rewardTuple.reduce((prev, cur) => {
    return (prev += cur[1]);
  }, 0);

  if (Math.ceil(total) !== allocation) {
    throw Error("allocation calculation incorrect");
  }

  // parse to string
  let rewards = rewardTuple.map(([addr, val]) => [
    addr,
    ethers.utils.parseEther(`${val}`).toString(),
  ]);

  console.log("Deploying airdrop with following details");
  console.log("Token Address: ", tokenAddress);
  console.log("Amount of recipients: ", rewardTuple.length);

  const [deployer] = await hre.ethers.getSigners();

  const Airdrop = await ethers.getContractFactory("Airdrop");
  const airdrop = await Airdrop.deploy(
    tokenAddress, // TYPH token on testnet
    [],
    deployer.address
  );

  console.log("Airdrop contract deployed to: ", airdrop.address);

  // split into chunks since the payload is too big for doing them all at the same time
  const chunks = rewards.reduce((resultArray: any, item, index) => {
    const chunkIndex = Math.floor(index / 500); // 100 chunks

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, []);

  for (const chunk in chunks) {
    console.log(`Adding chunk ${chunk} of ${chunks.length}`);
    await airdrop.connect(deployer).functions.add(chunks[chunk], {});
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
