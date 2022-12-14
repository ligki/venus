import { Arg, Fetcher, getFetcherValue } from "../Command";
import { ComptrollerImpl } from "../Contract/ComptrollerImpl";
import { getComptrollerImpl } from "../ContractLookup";
import { Event } from "../Event";
import { AddressV, Value } from "../Value";
import { World } from "../World";

export async function getComptrollerImplAddress(world: World, comptrollerImpl: ComptrollerImpl): Promise<AddressV> {
  return new AddressV(comptrollerImpl._address);
}

export function comptrollerImplFetchers() {
  return [
    new Fetcher<{ comptrollerImpl: ComptrollerImpl }, AddressV>(
      `
        #### Address

        * "ComptrollerImpl Address" - Returns address of comptroller implementation
      `,
      "Address",
      [new Arg("comptrollerImpl", getComptrollerImpl)],
      (world, { comptrollerImpl }) => getComptrollerImplAddress(world, comptrollerImpl),
      { namePos: 1 },
    ),
  ];
}

export async function getComptrollerImplValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("ComptrollerImpl", comptrollerImplFetchers(), world, event);
}
