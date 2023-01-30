const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("BankAccount", function () {
  async function deployBankAccount() {
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const BankAccount = await ethers.getContractFactory("BankAccount");
    const bankAccount = await BankAccount.deploy();
    return { BankAccount, bankAccount, owner, addr1, addr2, addr3, addr4 };
  }

  //Deployment
  describe("Deployment", () => {
    it("should deploy without error", async () => {
      const BankAccount = await ethers.getContractFactory("BankAccount");
      expect(BankAccount.deploy()).not.to.be.reverted;
    });
  });

  //Create account
  describe("Create account", () => {
    it("should allow create an account", async () => {
      const { bankAccount, owner, addr1, addr2, addr3, addr4 } = await loadFixture(
        deployBankAccount
      );
      await bankAccount.connect(addr1).createAccount([addr2.address, addr3.address, addr4.address]);
      const accounts1 = await bankAccount.connect(addr1).getAccounts();
      const accounts2 = await bankAccount.connect(addr2).getAccounts();
      const accounts3 = await bankAccount.connect(addr3).getAccounts();
      const accounts4 = await bankAccount.connect(addr4).getAccounts();
      expect(accounts1.length).to.equal(1);
      expect(accounts2.length).to.equal(1);
      expect(accounts3.length).to.equal(1);
      expect(accounts4.length).to.equal(1);
    });

    it("should create account and emit event", async () => {
      const { bankAccount, addr1, addr2, addr3 } = await loadFixture(deployBankAccount);
      const result = await bankAccount.connect(addr1).createAccount([addr2.address, addr3.address]);
      const account1 = (await bankAccount.connect(addr1).getAccounts())[0];
      await expect(result)
        .to.emit(bankAccount, "AccountCreated")
        .withArgs([addr2.address, addr3.address], account1, time.latest);
    });

    it("should not create account with duplicate owners", async () => {
      const { bankAccount, addr1, addr2, addr3 } = await loadFixture(deployBankAccount);
      await expect(
        bankAccount.connect(addr1).createAccount([addr2.address, addr3.address, addr2.address])
      ).to.be.revertedWith("owner duplicated");
    });

    it("should not create account max 4 owners", async () => {
      const { bankAccount, owner, addr1, addr2, addr3, addr4 } = await loadFixture(
        deployBankAccount
      );
      await expect(
        bankAccount
          .connect(owner)
          .createAccount([
            addr1.address,
            addr2.address,
            addr3.address,
            addr3.address,
            addr4.address,
          ])
      ).to.be.revertedWith("Max 4 owners per account");
    });
  });
});
