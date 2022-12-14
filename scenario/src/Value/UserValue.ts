import { Arg, Fetcher, getFetcherValue } from "../Command";
import { getAddressV } from "../CoreValue";
import { Event } from "../Event";
import { AddressV, Value } from "../Value";
import { World } from "../World";

export function userFetchers() {
  return [
    new Fetcher<{ account: AddressV }, AddressV>(
      `
        #### Address

        * "User <User> Address" - Returns address of user
          * E.g. "User Geoff Address" - Returns Geoff's address
      `,
      "Address",
      [new Arg("account", getAddressV)],
      async (world, { account }) => account,
      { namePos: 1 },
    ),
  ];
}

export async function getUserValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("User", userFetchers(), world, event);
}
