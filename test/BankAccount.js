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

  async function createAccounts() {
    const { bankAccount, owner, addr1, addr2, addr3, addr4 } = await loadFixture(deployBankAccount);
    await bankAccount.createAccount([addr1.address, addr2.address]);
    const account1 = (await bankAccount.connect(addr1).getAccounts())[0];
    const account2 = (await bankAccount.connect(addr2).getAccounts())[0];
    const accountOwner = (await bankAccount.connect(owner).getAccounts())[0];
    return { bankAccount, owner, addr1, addr2, addr3, addr4, account1, account2, accountOwner };
  }

  async function deposit() {
    const { bankAccount, owner, addr1, addr2, addr3, addr4, account1, account2, accountOwner } =
      await createAccounts();
    const value = "1000";
    await bankAccount.deposit(accountOwner, { value });
    return {
      bankAccount,
      owner,
      addr1,
      addr2,
      addr3,
      addr4,
      account1,
      account2,
      accountOwner,
      value,
    };
  }

  async function requestWithdraw() {
    const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } = await deposit();
    await bankAccount.requestWithdraw(accountOwner, value);
    return { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 };
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

    it("should not create account for more than 4 owners", async () => {
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
    it("should not create account, max 3 account for a user", async () => {
      const { bankAccount, owner, addr1, addr2, addr3, addr4 } = await loadFixture(
        deployBankAccount
      );
      await bankAccount.connect(owner).createAccount([addr1.address]);
      await bankAccount.connect(owner).createAccount([addr1.address]);
      await bankAccount.connect(owner).createAccount([addr1.address]);
      await expect(bankAccount.connect(owner).createAccount([addr1.address])).to.be.revertedWith(
        "Max user account attempt"
      );
    });
  });

  describe("Deposit", function () {
    it("should allow deposit from owner", async () => {
      const { bankAccount, owner, addr1, addr2, addr3, addr4, account1, account2, account3 } =
        await createAccounts();
      await expect(bankAccount.deposit(account1, { value: "1000" })).to.changeEtherBalances(
        [bankAccount, owner],
        ["1000", "-1000"]
      );
    });

    it("should not allow deposit, account is not an owner", async () => {
      const { bankAccount, owner, addr1, addr2, addr3, addr4, account1, account2, account3 } =
        await createAccounts();
      await expect(
        bankAccount.connect(addr4).deposit(account1, { value: ethers.utils.parseEther("0.01") })
      ).to.revertedWith("You are not the owner");
    });
  });

  describe("Withdraw", async () => {
    const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } = await deposit();
    describe("Request a withdraw", function () {
      it("owner can request a withdraw", async () => {
        await bankAccount.requestWithdraw(accountOwner, value);
      });

      it("user not an owner cannot request a withdraw", async () => {
        const { bankAccount, addr4, accountOwner, value } = await deposit();

        await expect(
          bankAccount.connect(addr4).requestWithdraw(accountOwner, value)
        ).to.be.revertedWith("You are not the owner");
      });
    });
    describe("Approve a withdraw", async () => {
      it("user not owner cannot approve a withdraw", async () => {
        await expect(
          bankAccount.connect(addr4).approveWithdraw(accountOwner, 0)
        ).to.be.revertedWith("You are not the owner");
      });
      it("owner cannot approve invalid withdraw id", async () => {
        await expect(bankAccount.approveWithdraw(accountOwner, 1)).to.be.revertedWith(
          "request does not exist!"
        );
      });
      it("owner how created the request cannot approve a withdraw", async () => {
        const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } =
          await requestWithdraw();
        await expect(bankAccount.approveWithdraw(accountOwner, 0)).to.be.revertedWith(
          "Already approved"
        );
      });
      it("owners can approve a withdraw", async () => {
        const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } =
          await requestWithdraw();
        await bankAccount.connect(addr1).approveWithdraw(accountOwner, 0);
        const approvals = await bankAccount.getApprovals(accountOwner, 0);
        expect(approvals).to.equal(2);
      });
    });

    describe("Make a withdraw", function () {
      it("owner cannot make a withdraw, request not approved", async () => {
        const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } =
          await requestWithdraw();
        await expect(bankAccount.withdraw(accountOwner, 0)).to.be.revertedWith(
          "request not approved"
        );
      });
      it("user not an owner cannot make a withdraw", async () => {
        const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } =
          await requestWithdraw();
        await expect(bankAccount.connect(addr4).withdraw(accountOwner, 0)).to.be.revertedWith(
          "You are not the owner"
        );
      });
      it("owner cannot make a withdraw, invalid request id", async () => {
        const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } =
          await requestWithdraw();
        await expect(bankAccount.withdraw(accountOwner, 1)).to.be.revertedWith(
          "request does not exist!"
        );
      });
      it("only request creater can make a withdraw", async () => {
        const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } =
          await requestWithdraw();
        await bankAccount.connect(addr1).approveWithdraw(accountOwner, 0);
        await bankAccount.connect(addr2).approveWithdraw(accountOwner, 0);
        await expect(bankAccount.connect(addr1).withdraw(accountOwner, 0)).to.be.revertedWith(
          "only request creater can withdraw"
        );
      });
      it("owner can make a withdraw", async () => {
        const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } =
          await requestWithdraw();
        await bankAccount.connect(addr1).approveWithdraw(accountOwner, 0);
        await bankAccount.connect(addr2).approveWithdraw(accountOwner, 0);
        await expect(bankAccount.withdraw(accountOwner, 0)).to.changeEtherBalances(
          [bankAccount, owner],
          [`-${value}`, value]
        );
      });
      it("owner cannot make a withdraw, insufficient balance", async () => {
        const { bankAccount, accountOwner, value, owner, addr1, addr2, addr3, addr4 } =
          await deposit();
        await bankAccount.requestWithdraw(accountOwner, `${value}00`);
        await bankAccount.connect(addr1).approveWithdraw(accountOwner, 0);
        await bankAccount.connect(addr2).approveWithdraw(accountOwner, 0);
        await expect(bankAccount.withdraw(accountOwner, 0)).to.be.revertedWith(
          "Insufficient balance"
        );
      });
    });
  });
});
