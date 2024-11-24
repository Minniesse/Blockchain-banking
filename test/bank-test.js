const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bank Contract", function () {
  let bank;
  let owner;
  let alice;
  let bob;
  let charlie;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    const Bank = await ethers.getContractFactory("Bank");
    bank = await Bank.deploy();
    await bank.waitForDeployment();

    console.log("Bank deployed to:", await bank.getAddress());
    console.log("Owner address:", owner.address);
    console.log("Alice address:", alice.address);
    console.log("Bob address:", bob.address);
    console.log("Charlie address:", charlie.address);
  });

  it("Should handle deposits correctly", async function () {
    const depositAmount = ethers.parseEther("1.0");
    await bank.connect(alice).deposit({ value: depositAmount });

    const balance = await bank.connect(alice).getBalance();
    expect(balance).to.equal(depositAmount);

    const history = await bank.connect(alice).getTransactionHistory();
    expect(history.length).to.equal(1);
    expect(history[0].amount).to.equal(depositAmount);
    expect(history[0].transactionType).to.equal("Deposit");

    console.log("\nDeposit Test:");
    console.log("Deposited:", ethers.formatEther(depositAmount), "ETH");
    console.log("Balance:", ethers.formatEther(balance), "ETH");
  });

  it("Should handle withdrawals correctly", async function () {
    const depositAmount = ethers.parseEther("2.0");
    await bank.connect(bob).deposit({ value: depositAmount });

    const withdrawAmount = ethers.parseEther("1.0");
    await bank.connect(bob).withdraw(withdrawAmount);

    const balance = await bank.connect(bob).getBalance();
    expect(balance).to.equal(depositAmount - withdrawAmount);

    const history = await bank.connect(bob).getTransactionHistory();
    expect(history.length).to.equal(2);
    expect(history[1].amount).to.equal(withdrawAmount);
    expect(history[1].transactionType).to.equal("Withdraw");

    console.log("\nWithdraw Test:");
    console.log("Initial deposit:", ethers.formatEther(depositAmount), "ETH");
    console.log("Withdrawn:", ethers.formatEther(withdrawAmount), "ETH");
    console.log("Remaining balance:", ethers.formatEther(balance), "ETH");
  });

  it("Should handle transfers correctly", async function () {
    const depositAmount = ethers.parseEther("3.0");
    await bank.connect(charlie).deposit({ value: depositAmount });

    const transferAmount = ethers.parseEther("1.0");
    await bank.connect(charlie).transfer(alice.address, transferAmount);

    const charlieBalance = await bank.connect(charlie).getBalance();
    const aliceBalance = await bank.connect(alice).getBalance();

    expect(charlieBalance).to.equal(depositAmount - transferAmount);
    expect(aliceBalance).to.equal(transferAmount);

    const charlieHistory = await bank.connect(charlie).getTransactionHistory();
    const aliceHistory = await bank.connect(alice).getTransactionHistory();

    expect(charlieHistory.length).to.equal(2);
    expect(aliceHistory.length).to.equal(1);
    expect(charlieHistory[1].transactionType).to.equal("Transfer Sent");
    expect(aliceHistory[0].transactionType).to.equal("Transfer Received");

    console.log("\nTransfer Test:");
    console.log("Charlie's initial deposit:", ethers.formatEther(depositAmount), "ETH");
    console.log("Transferred to Alice:", ethers.formatEther(transferAmount), "ETH");
    console.log("Charlie's remaining balance:", ethers.formatEther(charlieBalance), "ETH");
    console.log("Alice's balance:", ethers.formatEther(aliceBalance), "ETH");
  });

  it("Should fail on invalid operations", async function () {
    const withdrawAmount = ethers.parseEther("1.0");
    
    // Try to withdraw without balance
    try {
      await bank.connect(alice).withdraw(withdrawAmount);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("Insufficient balance");
    }

    // Try to transfer without balance
    try {
      await bank.connect(bob).transfer(alice.address, withdrawAmount);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("Insufficient balance");
    }

    // Try to transfer to zero address
    await bank.connect(charlie).deposit({ value: withdrawAmount });
    try {
      await bank.connect(charlie).transfer(ethers.ZeroAddress, withdrawAmount);
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error.message).to.include("Invalid recipient address");
    }

    console.log("\nFailure Test:");
    console.log("Successfully caught invalid operations");
  });
}); 