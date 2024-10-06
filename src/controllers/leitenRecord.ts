import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand/esm";

import { ILeitenEffects } from "../interfaces/ILeitenEffects";
import { DotNestedKeys, DotNestedValue } from "../interfaces/pathTypes";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ILeitenRecord<VALUE> {
  patch: (value: Partial<VALUE>) => void;
  set: (value: VALUE) => void;
  get: () => VALUE;
  clear: () => void;
}

/**
 * Creates a Leiten record object that allows managing a specific value within a Store.
 * @template Store - The type of the store object.
 * @template P - The type of the path to the value within the store object.
 * @param {StoreApi<Store>} store - The store object.
 * @param {P extends string
 ? DotNestedValue<Store, P> extends Array<any>
 ? never
 : DotNestedValue<Store, P> extends object | null
 ? P
 : never
 : never} path - The path to the value within the store object.
 * @param {ILeitenRecordEffects<DotNestedValue<Store, P>, Store>} [effects] - Optional effects for the Leiten record.
 * @throws {Error} - Throws an error if the initial value is not an object or "_empty".
 * @returns {ILeitenRecord<DotNestedValue<Store, P>>} - The created Leiten record object.
 */
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
  effects?: ILeitenEffects<DotNestedValue<Store, P>, Store>,
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
