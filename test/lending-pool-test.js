const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool", function () {
    let LendingPool;
    let lendingPool;
    let owner;
    let user1;
    let user2;
    let MockERC20;
    let mockToken;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy mock ERC20 token
        MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy("Mock Token", "MTK");

        // Deploy LendingPool
        LendingPool = await ethers.getContractFactory("LendingPool");
        lendingPool = await LendingPool.deploy();

        // Setup initial state
        await mockToken.mint(user1.address, ethers.parseEther("1000"));
        await mockToken.mint(user2.address, ethers.parseEther("1000"));
        
        // Set up roles
        const RISK_ADMIN_ROLE = ethers.id("RISK_ADMIN_ROLE");
        await lendingPool.grantRole(RISK_ADMIN_ROLE, owner.address);
        
        // Enable token by setting it as supported in the pool state
        await lendingPool.connect(owner).setSupportedToken(
            await mockToken.getAddress(), 
            true
        );
    });

    describe("Deposit", function () {
        it("Should allow users to deposit tokens", async function () {
            const depositAmount = ethers.parseEther("100");
            
            // Approve spending
            await mockToken.connect(user1).approve(await lendingPool.getAddress(), depositAmount);
            
            // Make deposit
            await lendingPool.connect(user1).deposit(await mockToken.getAddress(), depositAmount);
            
            // Check user position
            const position = await lendingPool.userPositions(user1.address, await mockToken.getAddress());
            expect(position.deposited).to.equal(depositAmount);
        });

        it("Should fail when depositing unsupported token", async function () {
            // Deploy another token that isn't supported
            const UnsupportedToken = await ethers.getContractFactory("MockERC20");
            const unsupportedToken = await UnsupportedToken.deploy("Unsupported", "UNS");
            
            const depositAmount = ethers.parseEther("100");
            await unsupportedToken.mint(user1.address, depositAmount);
            await unsupportedToken.connect(user1).approve(await lendingPool.getAddress(), depositAmount);
            
            await expect(
                lendingPool.connect(user1).deposit(await unsupportedToken.getAddress(), depositAmount)
            ).to.be.revertedWith("Token not supported");
        });

        it("Should fail when depositing 0 amount", async function () {
            await expect(
                lendingPool.connect(user1).deposit(await mockToken.getAddress(), 0)
            ).to.be.revertedWith("Amount must be greater than 0");
        });
    });

    describe("Access Control", function () {
        it("Should only allow RISK_ADMIN to set supported tokens", async function () {
            const newToken = await MockERC20.deploy("New Token", "NEW");
            
            // Normal user should not be able to set supported tokens
            await expect(
                lendingPool.connect(user1).setSupportedToken(await newToken.getAddress(), true)
            ).to.be.reverted;
            
            // Admin should be able to set supported tokens
            await expect(
                lendingPool.connect(owner).setSupportedToken(await newToken.getAddress(), true)
            ).to.not.be.reverted;
        });
    });
});