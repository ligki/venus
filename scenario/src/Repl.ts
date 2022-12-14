import { getSaddle } from "eth-saddle";
import * as fs from "fs";
import * as path from "path";

import { accountAliases } from "./Accounts";
import { throwExpect } from "./Assert";
import { complete } from "./Completer";
import { getNetworkPath } from "./File";
import { createInterface } from "./HistoricReadline";
import { forkWeb3 } from "./Hypothetical";
import { Macros } from "./Macro";
import { loadContracts } from "./Networks";
import { parse } from "./Parser";
import { ReplPrinter } from "./Printer";
import { runCommand } from "./Runner";
import { initWorld, loadDryRun, loadInvokationOpts, loadSettings, loadVerbose } from "./World";

const basePath = process.env.proj_root || process.cwd();
const baseScenarioPath = path.join(basePath, "spec", "scenario");
const baseNetworksPath = path.join(basePath, "networks");

const TOTAL_GAS = 8000000;

function questionPromise(rl): Promise<string> {
  return new Promise(resolve => {
    rl.question(" > ", command => {
      resolve(command);
    });
  });
}

async function loop(world, rl, macros): Promise<any> {
  const command = await questionPromise(rl);

  try {
    const newWorld = await runCommand(world, command, macros);

    return await loop(newWorld, rl, macros);
  } catch (err) {
    world.printer.printError(err);
    return await loop(world, rl, macros);
  }
}

function loadEnvVars(): object {
  return (process.env["env_vars"] || "").split(",").reduce((acc, keyValue) => {
    if (keyValue.length === 0) {
      return acc;
    } else {
      const [key, value] = keyValue.split("=");

      return {
        ...acc,
        [key]: value,
      };
    }
  }, {});
}

async function repl(): Promise<void> {
  // Uck, we need to load core macros :(
  const coreMacros = fs.readFileSync(path.join(baseScenarioPath, "CoreMacros"), "utf8");

  const macros = <Macros>parse(coreMacros, { startRule: "macros" });

  const script = process.env["script"];

  const network = process.env["network"];

  if (!network) {
    throw new Error(`Missing required "network" env argument`);
  }

  let world;

  const rl = await createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: line => complete(world, macros, line),
    path: getNetworkPath(basePath, network, "-history", null),
  });

  const verbose: boolean = !!process.env["verbose"];
  const hypothetical: boolean = !!process.env["hypothetical"];

  const printer = new ReplPrinter(rl, verbose);

  const saddle = await getSaddle(network);
  const accounts: string[] = saddle.wallet_accounts.concat(saddle.accounts).filter(x => !!x);

  world = await initWorld(throwExpect, printer, saddle.web3, saddle, network, accounts, basePath, TOTAL_GAS);
  const contracts = await loadContracts(world);

  world = contracts[0];
  world = loadInvokationOpts(world);
  world = loadVerbose(world);
  world = loadDryRun(world);
  world = await loadSettings(world);

  const contractInfo = contracts[1];

  printer.printLine(`Network: ${network}`);

  if (hypothetical) {
    const forkJsonPath = path.join(baseNetworksPath, `${network}-fork.json`);
    let forkJson;

    try {
      const forkJsonString = fs.readFileSync(forkJsonPath, "utf8");
      forkJson = JSON.parse(forkJsonString);
    } catch (err) {
      throw new Error(`Cannot read fork configuration from \`${forkJsonPath}\`, ${err}`);
    }
    if (!forkJson["url"]) {
      throw new Error(`Missing url in fork json`);
    }
    if (!forkJson["unlocked"] || !Array.isArray(forkJson.unlocked)) {
      throw new Error(`Missing unlocked in fork json`);
    }

    saddle.web3 = await forkWeb3(saddle.web3, forkJson.url, forkJson.unlocked);
    saddle.accounts = forkJson.unlocked;
    console.log(`Running on fork ${forkJson.url} with unlocked accounts ${forkJson.unlocked.join(", ")}`);
  }

  if (accounts.length > 0) {
    printer.printLine(`Accounts:`);
    accounts.forEach((account, i) => {
      let aliases = world.settings.lookupAliases(account);
      aliases = aliases.concat(accountAliases(i));

      printer.printLine(`\t${account} (${aliases.join(",")})`);
    });
  }

  if (contractInfo.length > 0) {
    world.printer.printLine(`Contracts:`);
    contractInfo.forEach(info => world.printer.printLine(`\t${info}`));
  }

  printer.printLine(`Available macros: ${Object.keys(macros).toString()}`);
  printer.printLine(``);

  if (script) {
    const combined = script.split(",").reduce((acc, script) => {
      printer.printLine(`Running script: ${script}...`);
      const envVars = loadEnvVars();
      if (hypothetical) {
        envVars["hypo"] = true;
      }
      const scriptData: string = fs.readFileSync(script).toString();

      if (Object.keys(envVars).length > 0) {
        printer.printLine(`Env Vars:`);
      }

      const replacedScript = Object.entries(envVars).reduce((data, [key, val]) => {
        printer.printLine(`\t${key}: ${val}`);

        return data.split(`$${key}`).join(val);
      }, scriptData);

      const finalScript = replacedScript.replace(new RegExp(/\$[\w_]+/, "g"), "Nothing");

      return [...acc, ...finalScript.split("\n")];
    }, <string[]>[]);

    return await combined.reduce(async (acc, command) => {
      return await runCommand(await acc, command, macros);
    }, Promise.resolve(world));
    printer.printLine(`Script complete.`);
  } else {
    await loop(world, rl, macros);
  }
}

repl().catch(error => {
  console.error(error);
  process.exit(1);
});
