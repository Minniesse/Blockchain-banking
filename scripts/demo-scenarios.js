const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting DeFi Lending Protocol Demo Scenarios...");

    // Get signers
    const [deployer, lender, borrower] = await ethers.getSigners();
    console.log("Using addresses:");
    console.log("- Deployer:", deployer.address);
    console.log("- Lender:", lender.address);
    console.log("- Borrower:", borrower.address);

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC");
    const weth = await MockERC20.deploy("Wrapped Ether", "WETH");
    
    console.log("\n📜 Deployed Mock Tokens:");
    console.log("- USDC:", await usdc.getAddress());
    console.log("- WETH:", await weth.getAddress());

    // Deploy core contracts
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();

    const LendingPool = await ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy();

    console.log("\n📜 Deployed Core Contracts:");
    console.log("- PriceOracle:", await priceOracle.getAddress());
    console.log("- LendingPool:", await lendingPool.getAddress());

    // Setup roles and permissions
    const RISK_ADMIN_ROLE = ethers.id("RISK_ADMIN_ROLE");
    await lendingPool.grantRole(RISK_ADMIN_ROLE, deployer.address);

    // Configure supported tokens
    await lendingPool.setSupportedToken(await usdc.getAddress(), true);
    await lendingPool.setSupportedToken(await weth.getAddress(), true);

    // Mint tokens to users
    const usdcAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
    const wethAmount = ethers.parseEther("5"); // 5 WETH
    
    await usdc.mint(lender.address, usdcAmount);
    await weth.mint(borrower.address, wethAmount);

    console.log("\n🎬 Starting Use Case Scenarios...");

    // UC-001: Deposit Assets
    console.log("\n📝 UC-001: Deposit Assets into Lending Pool");
    console.log("Lender depositing 1,000 USDC...");
    
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.connect(lender).approve(await lendingPool.getAddress(), depositAmount);
    
    await lendingPool.connect(lender).deposit(
        await usdc.getAddress(),
        depositAmount
    );

    console.log("✅ Deposit successful!");
    const lenderPosition = await lendingPool.userPositions(
        lender.address,
        await usdc.getAddress()
    );
    console.log(`Deposited amount: ${ethers.formatUnits(lenderPosition.deposited, 6)} USDC`);

    // UC-002: Borrow Assets
    console.log("\n📝 UC-002: Borrow Assets Using Collateral");
    console.log("Borrower providing WETH as collateral and borrowing USDC...");

    const collateralAmount = ethers.parseEther("2"); // 2 WETH as collateral
    const borrowAmount = ethers.parseUnits("500", 6); // Borrow 500 USDC

    // First approve WETH spending
    await weth.connect(borrower).approve(await lendingPool.getAddress(), collateralAmount);
    
    // Borrow USDC using WETH as collateral
    await lendingPool.connect(borrower).borrow(
        await usdc.getAddress(),    // token to borrow
        borrowAmount,               // amount to borrow
        await weth.getAddress(),    // collateral token
        collateralAmount           // collateral amount
    );

    console.log("✅ Borrowing successful!");
    const borrowerPosition = await lendingPool.userPositions(
        borrower.address,
        await usdc.getAddress()
    );
    console.log(`Borrowed amount: ${ethers.formatUnits(borrowerPosition.borrowed, 6)} USDC`);
    console.log(`Collateral amount: ${ethers.formatUnits(borrowerPosition.collateral, 18)} WETH`);

    console.log("\n🎉 Demo scenarios completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
