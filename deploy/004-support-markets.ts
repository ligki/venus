import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const deployerSigner = await hre.ethers.getSigner(deployer);
  console.log('1')
  const vUSDC = await deployments.get("vUSDC");
  const vETH = await deployments.get("vETH");

  
  const accessControlManagerDeployment = await deployments.get("AccessControlManager");
  const accessControlManager = await ethers.getContractAt("AccessControlManager", accessControlManagerDeployment.address);

  const address = await deployerSigner.getAddress();
  console.log(address);
  const balance = await deployerSigner.getBalance();
  console.log(balance.toString());

  await accessControlManager.connect(deployerSigner).grantRole('0x0000000000000000000000000000000000000000000000000000000000000000', deployerSigner.address);
  await accessControlManager.connect(deployerSigner).giveCallPermission(vUSDC.address, '_supportMarket(address)', deployerSigner.address);
  await accessControlManager.connect(deployerSigner).giveCallPermission(vETH.address, '_supportMarket(address)', deployerSigner.address);

  // console.log('2')
  // const comptrollerDeployment = await deployments.get("Comptroller");
  // const comptroller = await ethers.getContractAt("Comptroller", comptrollerDeployment.address);

  // console.log('3')
  // await comptroller.connect(deployerSigner)._supportMarket(vUSDC.address);
  // console.log('4')
  // await comptroller.connect(deployerSigner)._supportMarket(vETH.address);
};

func.tags = ["VBep20"];

export default func;
