const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle", function () {
    let PriceOracle;
    let priceOracle;
    let owner;
    let user;
    let MockERC20;
    let mockToken;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy mock token
        MockERC20 = await ethers.getContractFactory("MockERC20");
        mockToken = await MockERC20.deploy("Mock Token", "MTK");

        // Deploy PriceOracle
        PriceOracle = await ethers.getContractFactory("PriceOracle");
        priceOracle = await PriceOracle.deploy();

        // Setup roles
        const PRICE_UPDATER_ROLE = ethers.id("PRICE_UPDATER_ROLE");
        await priceOracle.grantRole(PRICE_UPDATER_ROLE, owner.address);
    });

    describe("Price Management", function () {
        it("Should prevent unauthorized price updates", async function () {
            await expect(
                priceOracle.connect(user).updatePrice(await mockToken.getAddress())
            ).to.be.reverted;
        });
    });
});