// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const BigNum = require("bignumber.js");
const ethers = require("ethers");

async function main() {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer } = await getNamedAccounts();

    const deployerSigner = await hre.ethers.getSigner(deployer);
    const address = await deployerSigner.getAddress();

    const comptrollerDeployment = await deployments.get("Comptroller");
    const interestRateModelVUSDCDeployment = await deployments.get("InterestRateModelVUSDC");
    const usdcDeployment = await deployments.get("USDC");
    const vBep20DelegateDeployment = await deployments.get("VBep20Delegate");

    //   vDelegator = await deploy("VBep20Delegator", [
    //     underlying._address,
    //     comptroller._address,
    //     interestRateModel._address,
    //     exchangeRate,
    //     name,
    //     symbol,
    //     decimals,
    //     admin,
    //     vDelegatee._address,
    //     encodeParameters(["address", "address"], [vDaiMaker._address, vDaiMaker._address]),
    //   ]);

    console.log("2")
    await deploy("VBep20Delegator", {
        from: deployer,
        args: [
            usdcDeployment.address,
            comptrollerDeployment.address,
            interestRateModelVUSDCDeployment.address,
            '2000000000000000000',
            "Venus USDC",
            "vUSDC",
            18,
            address,
            vBep20DelegateDeployment.address,
            encodeParameters(["address", "address"], [usdcDeployment.address, usdcDeployment.address])
        ],
        log: true,
        autoMine: true,
    });

    const vBep20DelegatorDeployment = await deployments.get("VBep20Delegator");
    console.log(vBep20DelegatorDeployment.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error.length);
    process.exitCode = 1;
});

function encodeParameters(types: string[], values: any[]) {
    const abi = new ethers.utils.AbiCoder();
    const valuesPatched = values.map((v: number) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return !(v instanceof BigNum) ? v : v.toFixed();
    });
    return abi.encode(types, valuesPatched);
}
