import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand";
import { UseBoundStore } from "zustand/esm";

import {
  DotNestedKeys,
  DotNestedValue,
  ValueOf,
} from "../interfaces/dotNestedKeys";
import { getObjectDifference, IObjectDifferent } from "./leitenFilterRequest";
import {
  AcceptableGroupRequestType,
  ILeitenGroupRequestArrayOption,
  ILeitenGroupRequestOption,
  ILeitenGroupRequestParams,
  leitenGroupRequest,
} from "./leitenGroupRequest";
import { ILeitenRecordEffects } from "./leitenRecord";
import { resettableStoreSubscription } from "./leitenRequest";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const leitenGroupFilterRequest = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  Result extends DotNestedValue<Store, P> extends Record<
    string,
    AcceptableGroupRequestType<Store>
  >
    ? NonNullable<DotNestedValue<Store, P>[string]>
    : DotNestedValue<Store, P> extends Array<AcceptableGroupRequestType<Store>>
    ? NonNullable<DotNestedValue<Store, P>[number]>
    : DotNestedValue<Store, P>
>(
  store: UseBoundStore<StoreApi<Store>>,
  path: P extends string
    ? Result extends void
      ? P
      : DotNestedValue<Store, P> extends Record<string, Result> | Array<Result>
      ? P
      : never
    : never,
  request: (params: ILeitenGroupRequestParams<void>) => Promise<Result>,
  options?: DotNestedValue<Store, P> extends Record<
    string,
    AcceptableGroupRequestType<Store>
  >
    ? ILeitenGroupRequestOption<void, Result>
    : ILeitenGroupRequestArrayOption<void, Result>
) => {
  const leiten = leitenGroupRequest(store, path, request, {
    ...options,
    action: (args) => {
      const key = args.payload.key;
      updatePrevFilters(key);
      return options?.action?.(args);
    },
  } as DotNestedValue<Store, P> extends Record<string, AcceptableGroupRequestType<Store>> ? ILeitenGroupRequestOption<void, Result> : ILeitenGroupRequestArrayOption<void, Result>);

  const filters: Record<string, IGroupRecord<any>> = {};
  const prevFilters: Record<string, Record<string, any>> = {};

  const createFilter = <Path extends DotNestedKeys<Store>>(
    path: Path extends string
      ? DotNestedValue<Store, Path> extends Record<string, unknown>
        ? Path
        : never
      : never,
    options: ILeitenRecordEffects<
      ValueOf<DotNestedValue<Store, Path>>,
      Store
    > & {
      initialValue: ValueOf<DotNestedValue<Store, Path>>;
    }
  ) => {
    prevFilters[path] = {};
    type VALUE = ValueOf<DotNestedValue<Store, Path>>;

    function hook(
      key: string,
      referenceObject?: VALUE
    ): IObjectDifferent<VALUE>[] {
      return store((state) =>
        getObjectDifference(get(state, `${path}.${key}`), referenceObject)
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

  const clear = () => {
    leiten.clear();
    const keys = Object.keys(leiten.requests);
    Object.keys(filters).forEach((key) =>
      keys.forEach((k) => filters[key]?.clear(k))
    );
  };

  return Object.assign(leiten, { createFilter, clear });
};

interface IGroupRecord<VALUE> {
  clear: (key: string) => void;
  patch: (key: string, value: Partial<VALUE>) => void;
  set: (key: string, next: VALUE) => void;
  get: (key: string) => VALUE | undefined;
}
