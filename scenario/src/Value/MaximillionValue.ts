import { Arg, Fetcher, getFetcherValue } from "../Command";
import { Maximillion } from "../Contract/Maximillion";
import { getMaximillion } from "../ContractLookup";
import { Event } from "../Event";
import { AddressV, Value } from "../Value";
import { World } from "../World";

export async function getMaximillionAddress(world: World, maximillion: Maximillion): Promise<AddressV> {
  return new AddressV(maximillion._address);
}

export function maximillionFetchers() {
  return [
    new Fetcher<{ maximillion: Maximillion }, AddressV>(
      `
        #### Address

        * "Maximillion Address" - Returns address of maximillion
      `,
      "Address",
      [new Arg("maximillion", getMaximillion, { implicit: true })],
      (world, { maximillion }) => getMaximillionAddress(world, maximillion),
    ),
  ];
}

export async function getMaximillionValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Maximillion", maximillionFetchers(), world, event);
}
