import { create } from "zustand";

import {
  ILeitenLoading,
  initialLeitenLoading,
} from "../interfaces/IContentLoading";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const useLeitenRequests = create<{
  [key: string]: ILeitenLoading<any, any>;
}>(() => ({}));

type TupleOfKeys = [string] | string[];
type TupleOfStates<T extends TupleOfKeys> = {
  [K in keyof T]: ILeitenLoading<any, any>;
};

export const leitenMap = <T extends TupleOfKeys, Response>(
  keys: T,
  selector: (values: TupleOfStates<T>) => Response
) => {
  return (state: { [key: string]: ILeitenLoading<any, any> }) =>
    selector(
      keys.map(
        (key) => state[key] || initialLeitenLoading()
      ) as TupleOfStates<T>
    );
};
