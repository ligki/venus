// scripts/2.upgradeV2.ts
const { ethers, upgrades, deployments } = require("hardhat");


async function main() {
    const unitrollerDep = await deployments.get("Unitroller");
    const unitroller = await ethers.getContractAt("Unitroller", unitrollerDep.address);
    const Comptroller = await ethers.getContractFactory("Comptroller")

    // const unitroller = await upgrades.deployProxy(Unitroller, [])
    // console.log(unitroller.address)
    console.log(await upgrades.erc1967.getImplementationAddress(unitroller.address)," getImplementationAddress")
    console.log(await upgrades.erc1967.getAdminAddress(unitroller.address), " getAdminAddress")

    const comptroller = await upgrades.upgradeProxy(unitroller.address, Comptroller)
    console.log(comptroller.address)

}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})