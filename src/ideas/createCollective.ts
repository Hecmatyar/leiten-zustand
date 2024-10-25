import { produce } from "immer";
import { mapValues, set } from "lodash-es";
import type {
  Mutate,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
} from "zustand";
import { create, UseBoundStore } from "zustand";

import {
  DotNestedKeys,
  DotNestedValue,
  RestrictedStoreApi,
} from "../interfaces/pathTypes";

export interface ILeitenCollectiveState {
  _: unknown;
}

const useStore = create<ILeitenCollectiveState>(
  () => ({ _: null }) as unknown as ILeitenCollectiveState,
);

export const useCollectiveStore = useStore as UseBoundStore<
  Mutate<RestrictedStoreApi<ILeitenCollectiveState>, []>
>;

/**
 * Creates a Leiten Collective store with the specified initializer and collective fields.
 *
 * @template T - The type of the state object.
 * @template Mos - The type of the mutators.
 *
 * @param {StateCreator<T, [], Mos>} initializer - The function used to create the initial state.
 * @param {Partial<{[K in DotNestedKeys<ILeitenCollectiveState>]: (s: T) => DotNestedValue<ILeitenCollectiveState, K>}>} collectiveFields - The collective fields used to update the state
 *.
 *
 * @returns {UseBoundStore<Mutate<StoreApi<T>, Mos>>} - The Leiten Collective store.
 */
export const createCollective = <
  T,
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, [], Mos>,
  collectiveFields: Partial<{
    [K in DotNestedKeys<ILeitenCollectiveState>]: (
      s: T,
    ) => DotNestedValue<ILeitenCollectiveState, K>;
  }>,
): UseBoundStore<Mutate<StoreApi<T>, Mos>> => {
  const store = create<T, Mos>(initializer);
  if (collectiveFields && Object.keys(collectiveFields).length) {
    const setValues = (state: T) => {
      const nextState = produce(useStore.getState(), (draft) => {
        mapValues(collectiveFields, (selector, key) => {
          if (selector) {
            set(draft, key, selector(state));
          }
        });
      });
      useStore.setState(nextState);
    };
    setValues(store.getState());
    store.subscribe(setValues);
  }
  return store;
};
