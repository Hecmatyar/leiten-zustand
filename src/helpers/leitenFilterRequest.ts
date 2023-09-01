import { cloneDeep, get, isEqual } from "lodash-es";
import { StoreApi, UseBoundStore } from "zustand";

import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";
import { ILeitenPrimitive, leitenPrimitive } from "./leitenPrimitive";
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

type RecordFilter<T> = {
  (initialObject?: T): IObjectDifferent[];
} & ILeitenRecord<T>;
type PrimitiveFilter<Y> = {
  (initialObject?: Y): IObjectDifferent[];
} & ILeitenPrimitive<Y>;

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

  const filters: Record<string, ILeitenRecord<any> | ILeitenPrimitive<any>> =
    {};
  let prevFilters: Record<string, any> = {};
  const initialFilters: Record<string, any> = {};

  const createFilter = <Path extends DotNestedKeys<Store>>(
    path: Path extends string ? Path : never,
    options?: ILeitenRecordEffects<DotNestedValue<Store, Path>, Store>
  ): DotNestedValue<Store, Path> extends object
    ? RecordFilter<DotNestedValue<Store, Path>>
    : PrimitiveFilter<DotNestedValue<Store, Path>> => {
    type Response = DotNestedValue<Store, Path> extends object
      ? RecordFilter<DotNestedValue<Store, Path>>
      : PrimitiveFilter<DotNestedValue<Store, Path>>;
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

    const controller =
      typeof initial !== "object" ? leitenPrimitive : leitenRecord;

    const record = controller(store, path, {
      sideEffect: (side) => {
        options?.sideEffect?.(side);
        action(path).then();
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
    ExternalPath extends DotNestedKeys<ExternalStore>
  >(
    store: UseBoundStore<StoreApi<ExternalStore>>,
    path: ExternalPath extends string ? ExternalPath : never,
    options?: {
      sideEffect?: (value: {
        prev: DotNestedValue<ExternalStore, ExternalPath>;
        next: DotNestedValue<ExternalStore, ExternalPath>;
      }) => void;
    }
  ) => {
    let prevValue = get(store.getState(), path);
    const haveSubscription = () =>
      !!Object.values((leiten as any)._usages || {}).filter((item) => item)
        .length;

    return store.subscribe((state) => {
      const value = get(state, path);

      if (haveSubscription() && !isEqual(prevValue, value)) {
        prevValue = value;
        options?.sideEffect?.({ prev: prevValue, next: value });

        pureAction().then();
      }
    });
  };

  const pureAction = async () => {
    updatePrevFilters();
    leiten.action();
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

  return Object.assign(leiten, { createFilter, clearAll, listen });
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
