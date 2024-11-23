const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidationManager", function () {
    let LiquidationManager;
    let liquidationManager;
    let PriceOracle;
    let priceOracle;
    let LendingPool;
    let lendingPool;
    let MockERC20;
    let debtToken;
    let collateralToken;
    let owner;
    let liquidator;
    let borrower;

    beforeEach(async function () {
        [owner, liquidator, borrower] = await ethers.getSigners();

        // Deploy mock tokens
        MockERC20 = await ethers.getContractFactory("MockERC20");
        debtToken = await MockERC20.deploy("Debt Token", "DEBT");
        collateralToken = await MockERC20.deploy("Collateral Token", "COLL");

        // Deploy PriceOracle
        PriceOracle = await ethers.getContractFactory("PriceOracle");
        priceOracle = await PriceOracle.deploy();

        // Deploy LendingPool
        LendingPool = await ethers.getContractFactory("LendingPool");
        lendingPool = await LendingPool.deploy();

        // Deploy LiquidationManager
        LiquidationManager = await ethers.getContractFactory("LiquidationManager");
        liquidationManager = await LiquidationManager.deploy(
            await priceOracle.getAddress(),
            await lendingPool.getAddress()
        );

        // Setup roles
        const LIQUIDATOR_ROLE = ethers.id("LIQUIDATOR_ROLE");
        await liquidationManager.grantRole(LIQUIDATOR_ROLE, liquidator.address);

        // Setup tokens in protocol
        await liquidationManager.addSupportedToken(await debtToken.getAddress());
        await liquidationManager.addSupportedToken(await collateralToken.getAddress());
    });

    describe("Liquidation Parameters", function () {
        it("Should set liquidation parameters correctly", async function () {
            await liquidationManager.setLiquidationParameters(
                await debtToken.getAddress(),
                8000, // 80% liquidation threshold
                500,  // 5% bonus
                5000  // 50% max liquidation
            );

            const params = await liquidationManager.tokenParameters(await debtToken.getAddress());
            expect(params.liquidationThreshold).to.equal(8000);
            expect(params.liquidationBonus).to.equal(500);
            expect(params.maxLiquidationAmount).to.equal(5000);
        });
    });
});