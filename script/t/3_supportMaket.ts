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

    const comptrollerDep = await deployments.get("Comptroller");
    const comptroller = await ethers.getContractAt("Comptroller", comptrollerDep.address);

    // const unitrollerDep = await deployments.get("Unitroller");
    // const unitroller = await ethers.getContractAt("Unitroller", unitrollerDep.address);
    //
    // unitroller.connect(unitrollerDep.address)._acceptImplementation();
    const vUSDC = await deployments.get("vUSDC");
    const vETH = await deployments.get("vETH");

    const result1 = await comptroller.connect(deployerSigner)._supportMarket(vUSDC.address);
    console.log(result1)

    const result2 = await comptroller.connect(deployerSigner)._supportMarket(vETH.address);
    console.log(result2)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error.length);
    process.exitCode = 1;
});