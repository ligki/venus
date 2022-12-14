import { AbiInput, AbiItem } from "web3-utils";

import { Arg, Command, Fetcher, getFetcherValue, processCommandEvent } from "./Command";
import { Contract, getContract } from "./Contract";
import { getWorldContract } from "./ContractLookup";
import { getAddressV, getArrayV, getBoolV, getEventV, getNumberV, getStringV } from "./CoreValue";
import { Event } from "./Event";
import { Invokation } from "./Invokation";
import { Callable, Sendable, invoke } from "./Invokation";
import { storeAndSaveContract } from "./Networks";
import { mustString } from "./Utils";
import { AddressV, ArrayV, BoolV, EventV, NumberV, StringV, Value } from "./Value";
import { World, addAction } from "./World";

export interface ContractData<T> {
  invokation: Invokation<T>;
  name: string;
  contract: string;
  address?: string;
}

const typeMappings = () => ({
  address: {
    builder: x => new AddressV(x),
    getter: getAddressV,
  },
  "address[]": {
    builder: x => new ArrayV<AddressV>(x),
    getter: x => getArrayV<AddressV>(x),
  },
  string: {
    builder: x => new StringV(x),
    getter: getStringV,
  },
  uint256: {
    builder: x => new NumberV(x),
    getter: getNumberV,
  },
  "uint256[]": {
    builder: x => new ArrayV<NumberV>(x),
    getter: x => getArrayV<NumberV>(x),
  },
  "uint32[]": {
    builder: x => new ArrayV<NumberV>(x),
    getter: x => getArrayV<NumberV>(x),
  },
  "uint96[]": {
    builder: x => new ArrayV<NumberV>(x),
    getter: x => getArrayV<NumberV>(x),
  },
  bool: {
    builder: x => new BoolV(x),
    getter: getBoolV,
  },
});

function buildArg(contractName: string, name: string, input: AbiInput): Arg<Value> {
  const { getter } = typeMappings()[input.type] || {};

  if (!getter) {
    throw new Error(`Unknown ABI Input Type: ${input.type} of \`${name}\` in ${contractName}`);
  }

  return new Arg(name, getter);
}

function getEventName(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getContractObjectFn(contractName, implicit) {
  if (implicit) {
    return async function getContractObject(world: World): Promise<Contract> {
      return getWorldContract(world, [["Contracts", contractName]]);
    };
  } else {
    return async function getContractObject(world: World, event: Event): Promise<Contract> {
      return getWorldContract(world, [["Contracts", mustString(event)]]);
    };
  }
}
export function buildContractEvent(contractName: string, implicit) {
  return async world => {
    const contractDeployer = getContract(contractName);
    const abis: AbiItem[] = await world.saddle.abi(contractName);

    async function build<T extends Contract>(
      world: World,
      from: string,
      params: Event,
    ): Promise<{ world: World; contract: T; data: ContractData<T> }> {
      const constructors = abis.filter(({ type }) => type === "constructor");
      if (constructors.length === 0) {
        constructors.push({
          constant: false,
          inputs: [],
          outputs: [],
          payable: true,
          stateMutability: "payable",
          type: "constructor",
        });
      }

      const fetchers = constructors.map((abi: any) => {
        const nameArg = implicit ? [] : [new Arg("name", getStringV, { default: new StringV(contractName) })];
        const nameArgDesc = implicit ? `` : `name:<String>=${contractName}" `;
        const inputNames = abi.inputs.map(input => getEventName(input.name));
        const args = abi.inputs.map(input => buildArg(contractName, input.name, input));
        return new Fetcher<object, ContractData<T>>(
          `
            #### ${contractName}

            * "${contractName} ${nameArgDesc}${inputNames.join(" ")} - Build ${contractName}
              * E.g. "${contractName} Deploy"
            }
          `,
          contractName,
          nameArg.concat(args),
          async (world, paramValues) => {
            const name = implicit ? contractName : <string>paramValues["name"].val;
            const params = args.map(arg => paramValues[arg.name]); // TODO: This is just a guess
            const paramsEncoded = params.map(param =>
              typeof param["encode"] === "function" ? param.encode() : param.val,
            );

            return {
              invokation: await contractDeployer.deploy<T>(world, from, paramsEncoded),
              name: name,
              contract: contractName,
            };
          },
          { catchall: true },
        );
      });

      const data = await getFetcherValue<any, ContractData<T>>(`Deploy${contractName}`, fetchers, world, params);
      const invokation = data.invokation;
      delete data.invokation;

      if (invokation.error) {
        throw invokation.error;
      }

      const contract = invokation.value!;
      contract.address = contract._address;
      const index = contractName == data.name ? [contractName] : [contractName, data.name];

      world = await storeAndSaveContract(world, contract, data.name, invokation, [{ index: index, data: data }]);

      return { world, contract, data };
    }

    async function deploy<T extends Contract>(world: World, from: string, params: Event) {
      const { world: nextWorld, contract, data } = await build<T>(world, from, params);
      world = nextWorld;

      world = addAction(
        world,
        `Deployed ${contractName} ${data.contract} to address ${contract._address}`,
        data.invokation,
      );

      return world;
    }

    function commands<T extends Contract>() {
      async function buildOutput(world: World, from: string, fn: string, inputs: object): Promise<World> {
        const paramsEncoded = Object.values(inputs)
          .slice(1)
          .map(param => (typeof param["encode"] === "function" ? param.encode() : param.val));
        const sendable = <Sendable<any>>inputs["contract"].methods[fn](...paramsEncoded);
        const invokation = await invoke(world, sendable, from);

        world = addAction(world, `Invokation of ${fn} with inputs ${paramsEncoded}`, invokation);

        return world;
      }

      const abiCommands = abis
        .filter(({ type }) => type === "function")
        .map((abi: any) => {
          const eventName = getEventName(abi.name);
          const inputNames = abi.inputs.map(input => getEventName(input.name));
          const args = [
            new Arg("contract", getContractObjectFn(contractName, implicit), implicit ? { implicit: true } : {}),
          ].concat(abi.inputs.map(input => buildArg(contractName, input.name, input)));

          return new Command<object>(
            `
            #### ${eventName}

            * "${eventName} ${inputNames.join(" ")}" - Executes \`${abi.name}\` function
          `,
            eventName,
            args,
            (world, from, inputs) => buildOutput(world, from, abi.name, inputs, abi.outputs[0]),
            { namePos: implicit ? 0 : 1 },
          );
        });

      return [
        ...abiCommands,
        new Command<{ params: EventV }>(
          `
            #### ${contractName}

            * "${contractName} Deploy" - Deploy ${contractName}
              * E.g. "Counter Deploy"
          `,
          "Deploy",
          [new Arg("params", getEventV, { variadic: true })],
          (world, from, { params }) => deploy<T>(world, from, params.val),
        ),
      ];
    }

    async function processEvent(world: World, event: Event, from: string | null): Promise<World> {
      return await processCommandEvent<any>(contractName, commands(), world, event, from);
    }

    const command = new Command<{ event: EventV }>(
      `
        #### ${contractName}

        * "${contractName} ...event" - Runs given ${contractName} event
        * E.g. "${contractName} Deploy"
      `,
      contractName,
      [new Arg("event", getEventV, { variadic: true })],
      (world, from, { event }) => {
        return processEvent(world, event.val, from);
      },
      { subExpressions: commands() },
    );

    return command;
  };
}

export async function buildContractFetcher(world: World, contractName: string, implicit: boolean) {
  const abis: AbiItem[] = await world.saddle.abi(contractName);

  function fetchers() {
    async function buildOutput(world: World, fn: string, inputs: object, output: AbiItem): Promise<Value> {
      const callable = <Callable<any>>inputs["contract"].methods[fn](...Object.values(inputs).slice(1));
      const value = await callable.call();
      const { builder } = typeMappings()[output.type] || {};

      if (!builder) {
        throw new Error(`Unknown ABI Output Type: ${output.type} of \`${fn}\` in ${contractName}`);
      }

      return builder(value);
    }

    return abis
      .filter(({ name }) => !!name)
      .map((abi: any) => {
        const eventName = getEventName(abi.name);
        const inputNames = abi.inputs.map(input => getEventName(input.name));
        const args = [
          new Arg("contract", getContractObjectFn(contractName, implicit), implicit ? { implicit: true } : {}),
        ].concat(abi.inputs.map(input => buildArg(contractName, abi.name, input)));
        return new Fetcher<object, Value>(
          `
          #### ${eventName}

          * "${eventName} ${inputNames.join(" ")}" - Returns the result of \`${abi.name}\` function
        `,
          eventName,
          args,
          (world, inputs) => buildOutput(world, abi.name, inputs, abi.outputs[0]),
          { namePos: implicit ? 0 : 1 },
        );
      });
  }

  async function getValue(world: World, event: Event): Promise<Value> {
    return await getFetcherValue<any, any>(contractName, fetchers(), world, event);
  }

  const fetcher = new Fetcher<{ res: Value }, Value>(
    `
      #### ${contractName}

      * "${contractName} ...args" - Returns ${contractName} value
    `,
    contractName,
    [new Arg("res", getValue, { variadic: true })],
    async (world, { res }) => res,
    { subExpressions: fetchers() },
  );

  return fetcher;
}
