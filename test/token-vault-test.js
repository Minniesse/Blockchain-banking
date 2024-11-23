const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenVault", function () {
    let TokenVault;
    let tokenVault;
    let owner;
    let user1;
    let MockERC20;
    let mockToken;

    beforeEach(async function () {
        // Get signers
        [owner, user1] = await ethers.getSigners();

        // Deploy mock token
        MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy("Mock Token", "MTK");

        // Deploy TokenVault
        TokenVault = await ethers.getContractFactory("TokenVault");
        tokenVault = await TokenVault.deploy();

        // Setup roles
        const VAULT_MANAGER_ROLE = ethers.id("VAULT_MANAGER_ROLE");
        await tokenVault.grantRole(VAULT_MANAGER_ROLE, owner.address);
    });

    describe("Token Management", function () {
        it("Should add supported token", async function () {
            await tokenVault.addSupportedToken(mockToken.getAddress(), 1000);
            const tokenInfo = await tokenVault.tokens(await mockToken.getAddress());
            expect(tokenInfo.isSupported).to.be.true;
            expect(tokenInfo.minimumReserve).to.equal(1000);
        });
    });
});