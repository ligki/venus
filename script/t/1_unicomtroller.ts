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
    console.log("1")

    const comptrollerDep = await deployments.get("Comptroller");
    const comptroller = await ethers.getContractAt("Comptroller", comptrollerDep.address);
    console.log("comptroller", comptroller.address)


    console.log("2")
    const unitrollerDep = await deployments.get("Unitroller");
    const unitroller = await ethers.getContractAt("Unitroller", unitrollerDep.address);
    console.log("unitroller", unitroller.address)


    console.log("3")
    const comptrollerSigner = await hre.ethers.getSigner(comptroller.address)
    console.log("comptrollerSigner", comptrollerSigner)

    // console.log("4")
    // console.log(unitroller)
    await unitroller.connect(comptrollerSigner)._acceptImplementation();
    console.log("5")

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error.length);
    process.exitCode = 1;
});