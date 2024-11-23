const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting contract verification...");

    // Read deployment addresses
    const deploymentPath = path.join(__dirname, "../deployment-addresses.json");
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ Deployment addresses file not found!");
        return;
    }

    const deployedAddresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

    // Skip verification for local networks
    if (deployedAddresses.network === "localhost" || deployedAddresses.network === "hardhat") {
        console.log("⏩ Skipping verification for local network");
        return;
    }

    // Verify PriceOracle
    if (deployedAddresses.priceOracle) {
        console.log("🔍 Verifying PriceOracle...");
        try {
            await hre.run("verify:verify", {
                address: deployedAddresses.priceOracle,
                constructorArguments: []
            });
            console.log("✅ PriceOracle verified successfully");
        } catch (error) {
            console.error("❌ Error verifying PriceOracle:", error);
        }
    }

    // Verify TokenVault
    if (deployedAddresses.tokenVault) {
        console.log("🔍 Verifying TokenVault...");
        try {
            await hre.run("verify:verify", {
                address: deployedAddresses.tokenVault,
                constructorArguments: []
            });
            console.log("✅ TokenVault verified successfully");
        } catch (error) {
            console.error("❌ Error verifying TokenVault:", error);
        }
    }

    // Verify LendingPool
    if (deployedAddresses.lendingPool) {
        console.log("🔍 Verifying LendingPool...");
        try {
            await hre.run("verify:verify", {
                address: deployedAddresses.lendingPool,
                constructorArguments: []
            });
            console.log("✅ LendingPool verified successfully");
        } catch (error) {
            console.error("❌ Error verifying LendingPool:", error);
        }
    }

    // Verify LiquidationManager
    if (deployedAddresses.liquidationManager) {
        console.log("🔍 Verifying LiquidationManager...");
        try {
            await hre.run("verify:verify", {
                address: deployedAddresses.liquidationManager,
                constructorArguments: [
                    deployedAddresses.priceOracle,
                    deployedAddresses.lendingPool
                ]
            });
            console.log("✅ LiquidationManager verified successfully");
        } catch (error) {
            console.error("❌ Error verifying LiquidationManager:", error);
        }
    }

    console.log("🎉 Contract verification complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });