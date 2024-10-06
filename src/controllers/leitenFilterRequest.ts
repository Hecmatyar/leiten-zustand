import { cloneDeep, get, isEqual } from "lodash-es";
import { StoreApi, UseBoundStore } from "zustand";

import { IExtraArgument } from "../interfaces/IExtraArgument";
import { ILeitenEffects } from "../interfaces/ILeitenEffects";
import { ILeitenRequestOptions } from "../interfaces/ILeitenRequestOptions";
import {
  DotNestedKeys,
  DotNestedValue,
  RestrictedStoreApi,
} from "../interfaces/pathTypes";
import { ILeitenPrimitive, leitenPrimitive } from "./leitenPrimitive";
import { ILeitenRecord, leitenRecord } from "./leitenRecord";
import { leitenRequest, resettableStoreSubscription } from "./leitenRequest";
/* eslint-disable @typescript-eslint/no-explicit-any */

type RecordFilter<T> = {
  (initialObject?: T): IObjectDifferent[];
} & ILeitenRecord<T>;
type PrimitiveFilter<Y> = {
  (initialObject?: Y): IObjectDifferent[];
} & ILeitenPrimitive<Y>;

/**
 * Creates a filter request for the "leiten" library.
 *
 * @template Store - The type of the store object.
 * @template Path - The type of the path argument.
 * @template Result - The type of the result produced by the request.
 *
 * @param {UseBoundStore<StoreApi<Store>>} store - The store to bind the filter request to.
 * @param {Path} path - The path to be filtered.
 * @param {(params: void, extraArgument?: IExtraArgument) => Promise<Result>} request - The function that performs the filter request.
 * @param {ILeitenRequestOptions<void, Result>} options - The options object for the filter request.
 *
 * @returns {Object} - An object with methods and properties related to the filter request.
 */
export const leitenFilterRequest = <
  Store extends object,
  Path extends DotNestedKeys<Store>,
  Result extends DotNestedValue<Store, Path> | null | void,
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
  options?: ILeitenRequestOptions<void, Result>,
) => {
  const leiten = leitenRequest(store, path, request, {
    ...options,
    action: (args) => {
      updatePrevFilters();
      return options?.action?.(args);
    },
  });

  const filters: Record<string, ILeitenRecord<any> | ILeitenPrimitive<any>> =
    {};
  let prevFilters: Record<string, any> = {};
  const initialFilters: Record<string, any> = {};

  const createFilter = <Path extends DotNestedKeys<Store>>(
    path: Path extends string ? Path : never,
    options?: ILeitenEffects<DotNestedValue<Store, Path>, Store>,
  ): DotNestedValue<Store, Path> extends object
    ? RecordFilter<DotNestedValue<Store, Path>>
    : PrimitiveFilter<DotNestedValue<Store, Path>> => {
    type Response =
      DotNestedValue<Store, Path> extends object
        ? RecordFilter<DotNestedValue<Store, Path>>
        : PrimitiveFilter<DotNestedValue<Store, Path>>;
    const initial = get(store.getState(), path, undefined);

    function hook(
      initialObject?: DotNestedValue<Store, Path>,
    ): IObjectDifferent[] {
      return store((state) =>
        getObjectDifference(
          get(state, path, initialObject || initial),
          initialObject || initial,
        ),
      );
    }

    const controller =
      typeof initial !== "object" ? leitenPrimitive : leitenRecord;

    const record = controller(store, path, {
      sideEffect: (side) => {
        options?.sideEffect?.(side);
        const filter = get(store.getState(), path);
        if (!isEqual(filter, prevFilters[path])) {
          leiten.action();
        }
      },
      patchEffect: options?.patchEffect,
    });
    prevFilters[path] = record.get();
    filters[path] = record;
    initialFilters[path] = record.get();

    return Object.assign(hook, record) as Response;
  };

  const listen = <
    ExternalStore extends object,
    ExternalPath extends DotNestedKeys<ExternalStore>,
  >(
    store: RestrictedStoreApi<ExternalStore>,
    path: ExternalPath extends string ? ExternalPath : never,
    options?: {
      sideEffect?: (value: {
        prev: DotNestedValue<ExternalStore, ExternalPath>;
        next: DotNestedValue<ExternalStore, ExternalPath>;
      }) => void;
      comparePatch?: (
        value: DotNestedValue<ExternalStore, ExternalPath>,
      ) => any;
    },
  ) => {
    const haveSubscription = () =>
      !!Object.values((leiten as any)._usages || {}).filter((item) => item)
        .length;
    return store.subscribe((state, prevState) => {
      const prevValue = options?.comparePatch
        ? options.comparePatch(get(prevState, path))
        : get(prevState, path);
      const value = options?.comparePatch
        ? options.comparePatch(get(state, path))
        : get(state, path);

      if (haveSubscription() && !isEqual(prevValue, value)) {
        options?.sideEffect?.({
          prev: get(prevState, path),
          next: get(state, path),
        });
        pureAction();
      }
    });
  };

  const pureAction = async () => {
    updatePrevFilters();
    leiten.action();
  };

  const updatePrevFilters = () => {
    prevFilters = Object.keys(filters).reduce(
      (acc, item) => ({
        ...acc,
        [item]: get(store.getState(), item),
      }),
      {},
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

  return Object.assign(leiten, { createFilter, clearAll, listen });
};

export interface IObjectDifferent<S = any> {
  field: string;
  prev: S;
  next: S;
}

export const getObjectDifference = <S>(
  next: any,
  prev: any,
): IObjectDifferent<S>[] => {
  if (typeof next !== "object") {
    if (!isEqual(next, prev)) {
      return [{ field: "_", prev, next }];
    } else {
      return [];
    }
  } else {
    return Object.keys(next).reduce((result, field) => {
      if (!isEqual(next[field], prev[field])) {
        result.push({ field, prev: prev[field], next: next[field] });
      }
      return result;
    }, [] as IObjectDifferent<S>[]);
  }
};
