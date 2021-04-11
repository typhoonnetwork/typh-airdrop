import { ethers } from "hardhat";
import { Signer, Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import BigNumber from "bn.js";

chai.use(chaiAsPromised);

describe("Airdrop", function () {
  let Token: ContractFactory;
  let token: Contract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrWithoutClaim: SignerWithAddress;
  let Airdrop: ContractFactory;
  let airdrop: Contract;

  before(async function () {
    // init token
    [owner, addr1, addr2, addrWithoutClaim] = await ethers.getSigners();
    Token = await ethers.getContractFactory("BEP20Mock");
    token = await Token.deploy("20000000000000000000000000");

    // init contract
    Airdrop = await ethers.getContractFactory("Airdrop");
    airdrop = await Airdrop.deploy(
      token.address,
      [
        [owner.address, "20000000000000000000000"],
        [addr1.address, "200000000000000000000"],
        [addr2.address, "1337"],
      ],
      owner.address
    );

    // transfer tokens to contract
    await token
      .connect(owner)
      .transfer(airdrop.address, "20000000000000000000000");
  });

  it("should set the correct operator ", async function () {
    const operator: String[] = await airdrop.functions.operator();
    expect(operator[0]).to.equal(owner.address);
  });

  it("should initialize correct claims", async function () {
    let res: BigNumber[];

    res = await airdrop.functions.claims(addr1.address);
    expect(res[0].toString()).to.equal("200000000000000000000");
    res = await airdrop.functions.claims(addr2.address);
    expect(res[0].toString()).to.equal("1337");
    res = await airdrop.functions.claims(owner.address);
    expect(res[0].toString()).to.equal("20000000000000000000000");

    // no claim
    res = await airdrop.functions.claims(addrWithoutClaim.address);
    expect(res[0].toNumber()).to.equal(0);
  });

  it("should display the correct claim", async function () {
    const res = await airdrop.connect(addr1).functions.availableClaim();
    expect(res[0].toString()).to.equal("200000000000000000000");
  });

  it("should attribute correct claim once", async function () {
    // submit claim
    await airdrop.connect(addr1).functions.claim();
    expect(
      await token.balanceOf(addr1.address),
      "addr1 token balance"
    ).to.equal("200000000000000000000");
    expect(
      await token.balanceOf(airdrop.address),
      "contract token balance"
    ).to.equal("19800000000000000000000");

    // Try again
    await expect(
      airdrop.connect(addr1).functions.claim()
    ).to.eventually.be.rejectedWith("no claim available");

    // balance shouldn't change
    expect(
      await token.balanceOf(addr1.address),
      "addr1 token balance"
    ).to.equal("200000000000000000000");
    expect(
      await token.balanceOf(airdrop.address),
      "contract token balance"
    ).to.equal("19800000000000000000000");
  });

  it("should only allow withdrawUnspentClaims from operator", async function () {
    // submit claim from non-operator address
    await expect(
      airdrop.connect(addr1).functions.withdrawUnspentClaims()
    ).to.eventually.be.rejectedWith("only operator can call this function");
  });

  it("should withdraw all unspent claims", async function () {
    // submit claim from non-operator address
    await airdrop.connect(owner).functions.withdrawUnspentClaims();

    expect(
      await token.balanceOf(owner.address),
      "owner token balance"
    ).to.equal("19999800000000000000000000");
    expect(
      await token.balanceOf(airdrop.address),
      "airdrop token balance"
    ).to.equal("0");
  });
});
