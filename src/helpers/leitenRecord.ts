import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand/esm";

import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ILeitenRecordEffects<VALUE, State> {
  patchEffect?: (value: VALUE) => Partial<State>;
  sideEffect?: (value: { prev: VALUE; next: VALUE }) => void;
}

export interface ILeitenRecord<VALUE> {
  patch: (value: Partial<VALUE>) => void;
  set: (value: VALUE) => void;
  get: () => VALUE;
  clear: () => void;
}

export const leitenRecord = <
  Store extends object,
  P extends DotNestedKeys<Store>,
>(
  store: StoreApi<Store>,
  path: P extends string
    ? DotNestedValue<Store, P> extends Array<any>
      ? never
      : DotNestedValue<Store, P> extends object | null
        ? P
        : never
    : never,
  effects?: ILeitenRecordEffects<DotNestedValue<Store, P>, Store>,
): ILeitenRecord<DotNestedValue<Store, P>> => {
  type VALUE = DotNestedValue<Store, P>;

  const initialValue = get(store.getState(), path, "_empty") as VALUE;
  if (initialValue === "_empty" || typeof initialValue !== "object") {
    throw new Error(
      "[leitenRecord] The defined path does not match the required structure",
    );
  }

  const getState = (): VALUE => {
    const value = get(store.getState(), path, "_empty") as VALUE | "_empty";
    return value !== "_empty" ? value : initialValue;
  };

  const setState = (next: VALUE) => {
    const prev = getState();
    const draftState = produce(store.getState(), (draft) => {
      set(draft, path, next);
    });
    const nextState = effects?.patchEffect
      ? { ...draftState, ...effects.patchEffect(next) }
      : draftState;
    store.setState(nextState);
    effects?.sideEffect?.({ prev, next });
  };

  const clear = () => {
    const nextState = produce(store.getState(), (draft) => {
      set(draft, path, initialValue);
    });
    store.setState(nextState);
  };

  const patch = (value: Partial<VALUE>) => {
    setState({ ...getState(), ...value });
  };

  return { clear, set: setState, get: getState, patch };
};
