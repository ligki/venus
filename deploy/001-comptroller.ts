import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployerSigner = await hre.ethers.getSigner(deployer);
  const address = await deployerSigner.getAddress();
  console.log(address);

  await deploy("VBep20Delegate", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });


  await deploy("AccessControlManager", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  await deploy("Unitroller", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  await deploy("Comptroller", {
    from: deployer,
    log: true,
    autoMine: true,
    args: [],
  });

};

func.tags = ["Comptroller"];

export default func;
