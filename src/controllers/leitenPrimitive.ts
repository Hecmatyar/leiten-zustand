import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand";

import { ILeitenEffects } from "../interfaces/ILeitenEffects";
import { DotNestedKeys, DotNestedValue } from "../interfaces/pathTypes";

export type ILeitenPrimitive<VALUE> = {
  set: (value: VALUE) => void;
  get: () => VALUE;
  clear: () => void;
};

/**
 * A function that creates a primitive value handler for a nested property in a store.
 *
 * @template Store - The type of the store object.
 * @template P - The type of the nested property path.
 *
 * @param {StoreApi<Store>} store - The store object.
 * @param {P extends string ? P : never} path - The nested property path.
 * @param {ILeitenPrimitiveEffects<DotNestedValue<Store, P>, Store>} [effects] - Optional effects for manipulating the value.
 *
 * @throws {Error} The defined path does not exist.
 *
 * @returns {ILeitenPrimitive<DotNestedValue<Store, P>>} An object with methods for manipulating the primitive value.
 */
export const leitenPrimitive = <
  Store extends object,
  P extends DotNestedKeys<Store>,
>(
  store: StoreApi<Store>,
  path: P extends string ? P : never,
  effects?: ILeitenEffects<DotNestedValue<Store, P>, Store>,
): ILeitenPrimitive<DotNestedValue<Store, P>> => {
  type VALUE = DotNestedValue<Store, P>;

  const initialValue = get(store.getState(), path, "_empty") as VALUE;
  if (initialValue === "_empty") {
    throw new Error("[leitenPrimitive] The defined path does not exist");
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

  return { set: setState, get: getState, clear };
};
