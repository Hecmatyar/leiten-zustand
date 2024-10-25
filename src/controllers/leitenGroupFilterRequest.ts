import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi, UseBoundStore } from "zustand";

import { IExtraArgument } from "../interfaces/IExtraArgument";
import { ILeitenEffects } from "../interfaces/ILeitenEffects";
import {
  AcceptableType,
  ArrayElementType,
  DotNestedKeys,
  DotNestedValue,
  ValueOf,
} from "../interfaces/pathTypes";
import { getObjectDifference, IObjectDifferent } from "./leitenFilterRequest";
import {
  ILeitenGroupRequestArrayOption,
  ILeitenGroupRequestOption,
  ILeitenGroupRequestParams,
  leitenGroupRequest,
} from "./leitenGroupRequest";
import { resettableStoreSubscription } from "./leitenRequest";

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Represents a function that filters and manages group data based on given parameters.
 *
 * @template Store - The type of the application store.
 * @template P - The type of the path to the group data.
 * @template Result - The type of the result after filtering the group data.
 *
 * @param {UseBoundStore<StoreApi<Store>>} store - The store object.
 * @param {P} path - The path to the group data in the store.
 * @param {(params: ILeitenGroupRequestParams<void>, extraArgument?: IExtraArgument) => Promise<Result>} request - The function that handles the group request.
 * @param {ILeitenGroupRequestOption<void, Result> | ILeitenGroupRequestArrayOption<void, Result>} [options] - The options for the group request.
 *
 * @returns {LeitenGroupApi<Result>} - An object with methods to filter and manage group data.
 */
export const leitenGroupFilterRequest = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  Result extends DotNestedValue<Store, P> extends Record<
    string,
    AcceptableType<Store>
  >
    ? ValueOf<DotNestedValue<Store, P>>
    : ArrayElementType<DotNestedValue<Store, P>>,
>(
  store: UseBoundStore<StoreApi<Store>>,
  path: P extends string
    ? Result extends void
      ? P
      : DotNestedValue<Store, P> extends Record<string, Result> | Array<Result>
        ? P
        : never
    : never,
  request: (
    params: ILeitenGroupRequestParams<void>,
    extraArgument?: IExtraArgument,
  ) => Promise<Result>,
  options?: DotNestedValue<Store, P> extends Record<
    string,
    AcceptableType<Store>
  >
    ? ILeitenGroupRequestOption<void, Result>
    : ILeitenGroupRequestArrayOption<void, Result>,
) => {
  const leiten = leitenGroupRequest(store, path, request, {
    ...options,
    action: (args) => {
      const key = args.payload.key;
      updatePrevFilters(key);
      return options?.action?.(args);
    },
  } as DotNestedValue<Store, P> extends Record<string, AcceptableType<Store>>
    ? ILeitenGroupRequestOption<void, Result>
    : ILeitenGroupRequestArrayOption<void, Result>);

  const filters: Record<string, IGroupRecord<any>> = {};
  const prevFilters: Record<string, Record<string, any>> = {};

  const createFilter = <Path extends DotNestedKeys<Store>>(
    path: Path extends string
      ? DotNestedValue<Store, Path> extends Record<string, unknown>
        ? Path
        : never
      : never,
    options: ILeitenEffects<ValueOf<DotNestedValue<Store, Path>>, Store> & {
      initialValue: ValueOf<DotNestedValue<Store, Path>>;
    },
  ) => {
    prevFilters[path] = {};
    type VALUE = ValueOf<DotNestedValue<Store, Path>>;

    function hook(
      key: string,
      referenceObject?: VALUE,
    ): IObjectDifferent<VALUE>[] {
      return store((state) =>
        getObjectDifference(get(state, `${path}.${key}`), referenceObject),
      );
    }

    const getState = (key: string): VALUE | undefined => {
      return get(store.getState(), `${path}.${key}`, undefined);
    };

    const setState = (key: string, next: VALUE) => {
      const prev = getState(key);
      const draftState = produce(store.getState(), (draft) => {
        set(draft, `${path}.${key}`, next);
      });
      const nextState = options.patchEffect
        ? { ...draftState, ...options.patchEffect(next) }
        : draftState;
      store.setState(nextState);
      options.sideEffect?.({ prev: prev || options.initialValue, next });
      action(key, path, options.initialValue);
    };

    const clear = (key: string) => {
      setState(key, options.initialValue);
    };

    const patch = (key: string, value: Partial<VALUE>) => {
      const prev: object = (getState(key) || options.initialValue) as any;
      setState(key, { ...prev, ...value } as VALUE);
    };

    const record = { clear, patch, set: setState, get: getState };

    filters[path] = record;

    return Object.assign(hook, record);
  };

  const action = async (key: string, path: string, initialValue: any) => {
    const nextFilters = get(store.getState(), `${path}.${key}`);

    if (
      JSON.stringify(nextFilters) !==
      JSON.stringify(prevFilters[path][key] || initialValue)
    ) {
      leiten.action([{ key, params: undefined }]);
    }
  };

  const updatePrevFilters = (key: string) => {
    Object.keys(filters).forEach((item) => {
      prevFilters[item][key] = get(store.getState(), `${item}.${key}`);
    });
  };

  resettableStoreSubscription(store, () => {
    Object.keys(filters).forEach((path) => {
      prevFilters[path] = {};
    });
  });

  const clearAll = () => {
    leiten.clear();
    const keys = Object.keys(leiten.requests);
    Object.keys(filters).forEach((key) =>
      keys.forEach((k) => filters[key]?.clear(k)),
    );
  };

  return Object.assign(leiten, { createFilter, clearAll });
};

interface IGroupRecord<VALUE> {
  clear: (key: string) => void;
  patch: (key: string, value: Partial<VALUE>) => void;
  set: (key: string, next: VALUE) => void;
  get: (key: string) => VALUE | undefined;
}
