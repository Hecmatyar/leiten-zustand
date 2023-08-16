import { cloneDeep, get, isEqual } from "lodash-es";
import { StoreApi, UseBoundStore } from "zustand";

import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";
import {
  ILeitenRecord,
  ILeitenRecordEffects,
  leitenRecord,
} from "./leitenRecord";
import {
  IExtraArgument,
  ILeitenRequestOptions,
  leitenRequest,
  resettableStoreSubscription,
} from "./leitenRequest";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const leitenFilterRequest = <
  Store extends object,
  Path extends DotNestedKeys<Store>,
  Result extends DotNestedValue<Store, Path> | null | void
>(
  store: UseBoundStore<StoreApi<Store>>,
  path: Path extends string
    ? Result extends void
      ? Path
      : DotNestedValue<Store, Path> extends Result | null
      ? Path
      : never
    : never,
  request: (params: void, extraArgument?: IExtraArgument) => Promise<Result>,
  options?: ILeitenRequestOptions<void, Result>
) => {
  const leiten = leitenRequest(store, path, request, {
    ...options,
    action: (args) => {
      updatePrevFilters();
      return options?.action?.(args);
    },
  });

  const filters: Record<string, ILeitenRecord<any>> = {};
  let prevFilters: Record<string, any> = {};
  const initialFilters: Record<string, any> = {};

  const createFilter = <Path extends DotNestedKeys<Store>>(
    path: Path,
    options?: ILeitenRecordEffects<DotNestedValue<Store, Path>, Store>
  ) => {
    const initial = get(store.getState(), path, undefined);

    function hook(
      initialObject?: DotNestedValue<Store, Path>
    ): IObjectDifferent[] {
      return store((state) =>
        getObjectDifference(
          get(state, path, initialObject || initial),
          initialObject || initial
        )
      );
    }

    const record = leitenRecord(store, path, {
      sideEffect: (side) => {
        options?.sideEffect?.(side);
        action(path).then();
      },
      patchEffect: options?.patchEffect,
    });
    prevFilters[path] = record.get();
    filters[path] = record;
    initialFilters[path] = record.get();

    return Object.assign(hook, record);
  };

  const action = async (path: string) => {
    const filter = get(store.getState(), path);

    if (JSON.stringify(filter) !== JSON.stringify(prevFilters[path])) {
      leiten.action();
    }
  };

  const updatePrevFilters = () => {
    prevFilters = Object.keys(filters).reduce(
      (acc, item) => ({
        ...acc,
        [item]: get(store.getState(), item),
      }),
      {}
    );
  };

  resettableStoreSubscription(store, () => {
    prevFilters = cloneDeep(initialFilters);
  });

  const clearAll = () => {
    leiten.clear();
    Object.keys(filters).forEach((key) => filters[key].clear());
    leiten.action();
  };

  return Object.assign(leiten, { createFilter, clearAll });
};

export interface IObjectDifferent<S = any> {
  field: string;
  prev: S;
  next: S;
}

export const getObjectDifference = <S>(
  next: any,
  prev: any
): IObjectDifferent<S>[] => {
  return Object.keys(next).reduce((result, field) => {
    if (!isEqual(next[field], prev[field])) {
      result.push({ field, prev: prev[field], next: next[field] });
    }
    return result;
  }, [] as IObjectDifferent<S>[]);
};
