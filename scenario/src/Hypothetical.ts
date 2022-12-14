import { Ganache } from "eth-saddle/dist/config";
import Web3 from "web3";

import { loadAccounts } from "./Accounts";
import { World } from "./World";

export async function forkWeb3(web3: Web3, url: string, accounts: string[]): Promise<Web3> {
  const lastBlock = await web3.eth.getBlock("latest");
  return new Web3(
    <any>Ganache.provider({
      allowUnlimitedContractSize: true,
      fork: url,
      gasLimit: lastBlock.gasLimit, // maintain configured gas limit
      gasPrice: "20000",
      port: 8546,
      unlocked_accounts: accounts,
    }),
  );
}

export async function fork(world: World, url: string, accounts: string[]): Promise<World> {
  const newWeb3 = await forkWeb3(world.web3, url, accounts);
  const newAccounts = loadAccounts(await newWeb3.eth.getAccounts());

  return world.set("web3", newWeb3).set("accounts", newAccounts);
}
