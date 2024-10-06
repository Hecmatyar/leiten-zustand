import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { StoreApi } from "zustand";

import { createAsyncActions } from "../helpers/createAsyncAction";
import { IExtraArgument } from "../interfaces/IExtraArgument";
import { ILeitenLoading } from "../interfaces/ILeitenLoading";
import { ILeitenRequestOptions } from "../interfaces/ILeitenRequestOptions";
import { ILoadingStatus } from "../interfaces/ILoadingStatus";
import { DotNestedKeys, DotNestedValue } from "../interfaces/pathTypes";
import { useLeitenRequestStore } from "../stores/useLeitenRequestStore";
import { cacheResolver, getQueryHelpers } from "./query/getQueryHelpers";

type UseRequestType<Payload, Result> = <U = ILeitenLoading<Payload, Result>>(
  selector?: (state: ILeitenLoading<Payload, Result>) => U,
) => U;

type QueryPath<
  Store extends object,
  P extends DotNestedKeys<Store>,
  Result extends DotNestedValue<Store, P> | null | void,
> = P extends string
  ? Result extends void
    ? P
    : DotNestedValue<Store, P> extends Result | null
      ? P
      : never
  : never;

export type ILeitenRequest<Payload, Result> = {
  clear: () => void;
  action: (
    params: Payload,
    extraParams?: { status?: ILoadingStatus; requestId?: string },
  ) => void;
  set: (value: Partial<Result> | void, rewrite?: boolean) => void;
  key: string;
  get: () => ILeitenLoading<Payload, Result>;
  invalidate: () => void;
  abort: () => void;
} & UseRequestType<Payload, Result>;

/**
 * Represents a Leiten Request.
 * @template Store - The type of the store object.
 * @template P - The type of the path.
 * @template Payload - The type of the payload.
 * @template Result - The type of the result.
 * @param {StoreApi<Store>} store - The store object.
 * @param {P} path - The path.
 * @param {(params: Payload, extraArgument?: IExtraArgument) => Promise<Result>} payloadCreator - The payload creator function.
 * @param {ILeitenRequestOptions<Payload, Result>} [options] - The options for the request.
 * @returns {ILeitenRequest<Payload, Result>} - The Leiten Request object.
 */
export const leitenRequest = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  Payload,
  Result extends DotNestedValue<Store, P> | null | void,
>(
  store: StoreApi<Store>,
  path: QueryPath<Store, P, Result>,
  payloadCreator: (
    params: Payload,
    extraArgument?: IExtraArgument,
  ) => Promise<Result>,
  options?: ILeitenRequestOptions<Payload, Result>,
): ILeitenRequest<Payload, Result> => {
  const {
    key,
    initialState,
    _setState,
    execute,
    _getState,
    _set,
    reactions,
    clear,
  } = getQueryHelpers(store, path, options);

  const { action: realAction, abort } = createAsyncActions(
    payloadCreator,
    reactions,
  );

  const action = (
    params: Payload,
    actionOptions?: { status?: ILoadingStatus; requestId?: string },
  ) => {
    execute(realAction, params, actionOptions);
  };

  const invalidate = () => {
    options?.cache?.name && cacheResolver.invalidate(options.cache.name).then();
  };

  const usages: Record<string, boolean> = {};
  const useRequest: UseRequestType<Payload, Result> = (selector) => {
    const [id] = useState(() => nanoid());

    useEffect(() => {
      usages[id] = true;

      return () => {
        usages[id] = false;
      };
    }, []);

    return useLeitenRequestStore((state) =>
      (selector || nonTypedReturn)(state[key] || initialState),
    );
  };

  resettableStoreSubscription(store, () => _setState(initialState));

  return Object.assign(useRequest, {
    abort,
    action,
    clear,
    set: _set,
    key,
    get: _getState,
    invalidate,
    _usages: usages,
  }) as ILeitenRequest<Payload, Result>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nonTypedReturn = (value: any) => value;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const resettableStoreSubscription = (
  store: StoreApi<object>,
  callback: () => void,
) => {
  setTimeout(() => {
    const hasResettable =
      (store.getState() as any)["_resettableLifeCycle"] !== undefined;
    if (hasResettable) {
      store.subscribe((next: any, prev: any) => {
        if (next["_resettableLifeCycle"] !== prev["_resettableLifeCycle"])
          callback();
      });
    }
  }, 0);
};
