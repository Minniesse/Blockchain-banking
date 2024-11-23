const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy PriceOracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  console.log("PriceOracle deployed to:", await priceOracle.getAddress());

  // Deploy TokenVault
  const TokenVault = await ethers.getContractFactory("TokenVault");
  const tokenVault = await TokenVault.deploy();
  await tokenVault.waitForDeployment();
  console.log("TokenVault deployed to:", await tokenVault.getAddress());

  // Deploy LendingPool
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy();
  await lendingPool.waitForDeployment();
  console.log("LendingPool deployed to:", await lendingPool.getAddress());

  // Deploy LiquidationManager
  const LiquidationManager = await ethers.getContractFactory("LiquidationManager");
  const liquidationManager = await LiquidationManager.deploy(
    await priceOracle.getAddress(),
    await lendingPool.getAddress()
  );
  await liquidationManager.waitForDeployment();
  console.log("LiquidationManager deployed to:", await liquidationManager.getAddress());

  // Save deployment addresses
  const deploymentAddresses = {
    priceOracle: await priceOracle.getAddress(),
    tokenVault: await tokenVault.getAddress(),
    lendingPool: await lendingPool.getAddress(),
    liquidationManager: await liquidationManager.getAddress(),
    network: hre.network.name
  };

  const deploymentPath = path.join(__dirname, "../deployment-addresses.json");
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentAddresses, null, 2)
  );
  console.log("Deployment addresses saved to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });