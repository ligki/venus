// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
    const { deployments, getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    const deployerSigner = await hre.ethers.getSigner(deployer);
    console.log('deployerSigner', deployerSigner.address)

    const vUSDC = await deployments.get("VBep20Delegator");
    console.log('VBep20Delegator', vUSDC.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error.length);
    process.exitCode = 1;
});