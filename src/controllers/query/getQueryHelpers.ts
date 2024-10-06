import { produce } from "immer";
import { md5 } from "js-md5";
import { get, isEqual, set } from "lodash-es";
import { nanoid } from "nanoid";
import { StoreApi } from "zustand";

import { cacheControllers } from "../../api/db/cacheControllers";
import {
  ILeitenLoading,
  initialLeitenLoading,
} from "../../interfaces/ILeitenLoading";
import { ILeitenRequestOptions } from "../../interfaces/ILeitenRequestOptions";
import { ILoadingStatus } from "../../interfaces/ILoadingStatus";
import { DotNestedKeys, DotNestedValue } from "../../interfaces/pathTypes";
import { useLeitenRequestStore } from "../../stores/useLeitenRequestStore";

export const getQueryHelpers = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  Payload,
  Result extends DotNestedValue<Store, P> | null | void,
>(
  store: StoreApi<Store>,
  path: P,
  options?: ILeitenRequestOptions<Payload, Result>,
) => {
  let retry = {
    ...initialRetry,
  };
  const key = nanoid(12);
  const initialState = initialLeitenLoading<Payload, Result>(
    options?.initialStatus,
  );
  const initialContent = get(store.getState(), path, null) as Result;

  const _setState = (state: ILeitenLoading<Payload, Result>) => {
    useLeitenRequestStore.setState({ [key]: state });
  };
  //Mutate the useLeitenRequestStore to add the initial state without notify subscribers
  useLeitenRequestStore.getState()[key] = initialState;
  const _getState = (): ILeitenLoading<Payload, Result> => {
    return useLeitenRequestStore.getState()[key] || initialState;
  };

  const _setContent = (content: Result) => {
    const nextState = produce(store.getState(), (draft) => {
      set(draft, path, content);
    });
    store.setState(nextState);
  };

  const _getContent = (): Result => {
    const result = get(store.getState(), path, "_empty") as Result | "_empty";
    if (result !== "_empty") {
      return result || initialContent;
    } else {
      return initialContent;
    }
  };

  const _set = (value: Partial<Result> | void, rewrite = false) => {
    if (typeof value === "object") {
      const state = _getContent();
      const objectContent = rewrite
        ? ({ ...value } as Result)
        : ({ ...state, ...value } as Result);
      const content = typeof value === "object" ? objectContent : value;
      _setContent(content);
    } else {
      value !== undefined && value !== null && _setContent(value);
    }
  };

  let previousResult: Result = _getContent();

  const reactions = {
    action: (payload: Payload, status?: ILoadingStatus, requestId?: string) => {
      _setState({
        status: status ?? "loading",
        payload,
        error: null,
        requestId: requestId,
      });
      options?.action?.({
        previousResult,
        requestId: requestId || "",
        payload,
      });
      previousResult = _getContent();

      if (options?.optimisticUpdate) {
        _setContent(options.optimisticUpdate(payload));
      }
    },
    fulfilled: (result: Result, payload: Payload, requestId: string) => {
      retry = { ...initialRetry };
      const state = _getState();
      state.status !== "loaded" && _setState({ ...state, status: "loaded" });
      if (requestId === state.requestId) {
        if (
          result !== undefined &&
          (!options?.optimisticUpdate || !isEqual(_getContent(), result))
        ) {
          _setContent(result);
        }
        if (options?.cache) {
          const identifier = options.cache.key(payload);
          const cacheKey =
            typeof identifier === "object"
              ? JSON.stringify(identifier)
              : identifier;

          cacheResolver.update([options.cache.name, cacheKey], result).then();
        }
        options?.fulfilled?.({ previousResult, requestId, payload, result });
      }
    },
    rejected: (payload: Payload, error: string, requestId?: string) => {
      retry = { ...retry, count: retry.count + 1 };
      if (options?.retry && options.retry.count(payload) >= retry.count) {
        retry.action();
      } else {
        const state = _getState();
        _setState({ ...state, status: "error", error });
        options?.rejected?.({
          previousResult,
          requestId: requestId || "",
          payload,
          error,
        });
        if (options?.optimisticUpdate) {
          _setContent(previousResult);
        }
      }
    },
    abort: (payload: Payload, requestId: string) => {
      const state = _getState();
      if (state.requestId === requestId) {
        _setState(initialState);
        options?.abort?.({ previousResult, requestId, payload });
        if (options?.optimisticUpdate) {
          _setContent(previousResult);
        }
      }
    },
    resolved: (payload: Payload, requestId: string) => {
      options?.resolved?.({ previousResult, requestId, payload });
    },
  };

  const clear = () => {
    _setState(initialState);
    _setContent(initialContent);
  };

  const execute = (
    realAction: (
      payload: Payload,
      actionOptions?: { status?: ILoadingStatus; requestId?: string },
    ) => void,
    payload: Payload,
    actionOptions?: { status?: ILoadingStatus; requestId?: string },
  ) => {
    const action = () => realAction(payload, actionOptions);
    retry = { count: 0, action };

    if (options?.cache) {
      const identifier = options.cache.key(payload);
      const cacheKey =
        typeof identifier === "object"
          ? JSON.stringify(identifier)
          : identifier;
      cacheResolver
        .get<Result>([options.cache.name, cacheKey], options.cache.value)
        .then((content) => {
          action();
          if (content) {
            _setContent(content);
            _setState({
              status: "loaded",
              payload,
              requestId: actionOptions?.requestId || _getState().requestId,
            });
          }
        });
    } else {
      action();
    }
  };

  return {
    key,
    initialState,
    initialContent,
    _setState,
    _getState,
    _setContent,
    _getContent,
    _set,
    reactions,
    clear,
    execute,
  };
};

const initialRetry = {
  count: 0,
  action: () => {},
};

export const cacheResolver = {
  get: async <Response>(
    cacheKeys: [string, string | undefined],
    period: number,
  ): Promise<Response | undefined | null> => {
    const key = cacheKeys[0] + "_" + md5(cacheKeys[1] || "_");
    return (await cacheControllers.get(key, period)) as Response;
  },

  set: async <Result>(
    cacheKeys: [string, string | undefined],
    value: Result,
  ) => {
    const key = cacheKeys[0] + "_" + md5(cacheKeys[1] || "_");
    await cacheControllers.set(key, value);
  },

  update: async <Result>(
    cacheKeys: [string, string | undefined],
    value: Result,
  ) => {
    const key = cacheKeys[0] + "_" + md5(cacheKeys[1] || "_");
    await cacheControllers.update(key, value);
  },

  invalidate: async (cacheKey: string) => {
    await cacheControllers.invalidate(cacheKey);
  },

  remove: async (cacheKeys: [string, string | undefined]) => {
    const key = cacheKeys[0] + "_" + md5(cacheKeys[1] || "_");
    await cacheControllers.remove(key);
  },
};
