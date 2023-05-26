import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand/esm";

import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ILeitenRecordEffects<VALUE, State> {
  patchEffect?: (value: VALUE) => Partial<State>;
  sideEffect?: (value: { prev: VALUE; next: VALUE }) => void;
}

export interface ILeitenRecord<VALUE> {
  patch: (value: Partial<VALUE>) => void;
  set: (value: VALUE) => void;
  clear: () => void;
}

export const leitenRecord = <
  Store extends object,
  P extends DotNestedKeys<Store>
>(
  store: StoreApi<Store>,
  path: P extends string
    ? DotNestedValue<Store, P> extends Array<any>
      ? never
      : DotNestedValue<Store, P> extends object | null
      ? P
      : never
    : never,
  effects?: ILeitenRecordEffects<DotNestedValue<Store, P>, Store>
): ILeitenRecord<DotNestedValue<Store, P>> => {
  type VALUE = DotNestedValue<Store, P>;
  const initialValue = get(store.getState(), path, "_empty") as
    | VALUE
    | "_empty";
  if (initialValue === "_empty" || typeof initialValue !== "object") {
    throw new Error(
      "[leitenRecord] The defined path does not match the required structure"
    );
  }

  const getState = (): VALUE => {
    const value = get(store.getState(), path, "_empty") as VALUE | "_empty";
    return value !== "_empty" ? value : initialValue;
  };

  const setState = (value: VALUE) => {
    const prev = getState();
    const draftState = produce(store.getState(), (draft) => {
      set(draft, path, value);
    });
    const nextState = effects?.patchEffect
      ? { ...effects.patchEffect(value), ...draftState }
      : draftState;
    store.setState(nextState);
    effects?.sideEffect?.({ prev, next: value });
  };

  const clear = () => {
    setState(initialValue);
  };

  const patch = (value: Partial<VALUE>) => {
    setState({ ...getState(), ...value });
  };

  return { clear, set: setState, patch };
};
