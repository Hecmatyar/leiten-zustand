import { create } from "zustand";

import {
  ILeitenLoading,
  initialLeitenLoading,
} from "../interfaces/ILeitenLoading";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const useLeitenRequestStore = create<{
  [key: string]: ILeitenLoading<any, any>;
}>(() => ({}));

type TupleOfKeys = [string] | string[];
type TupleOfStates<T extends TupleOfKeys> = {
  [K in keyof T]: ILeitenLoading<any, any>;
};

export const leitenMap = <T extends TupleOfKeys, Response>(
  keys: T,
  selector: (values: TupleOfStates<T>) => Response,
) => {
  return (state: { [key: string]: ILeitenLoading<any, any> }) =>
    selector(
      keys.map(
        (key) => state[key] || initialLeitenLoading(),
      ) as TupleOfStates<T>,
    );
};

// export const selector = leitenMap(
//   ["1", "2"],
//   ([state1, state2]) => ({loading: state1.status === "loading" && state2.status === "loading", status: state2.status}),
// );
// const { loading, status } = useLeitenRequests(selector);

// const a = () => {
//   const status = useLeitenRequest(selector);
//   const status = userController.useRequest(state => state.status);
