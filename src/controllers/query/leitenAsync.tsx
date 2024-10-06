import { md5 } from "js-md5";
import { get, isEqual } from "lodash-es";
import { nanoid } from "nanoid";
import { create } from "zustand";

import { createAsyncActions } from "../../helpers/createAsyncAction";
import { IExtraArgument } from "../../interfaces/IExtraArgument";
import { ILeitenLoading } from "../../interfaces/ILeitenLoading";
import { ILeitenRequestOptions } from "../../interfaces/ILeitenRequestOptions";
import { useLeitenRequestStore } from "../../stores/useLeitenRequestStore";
import { cacheResolver, getQueryHelpers } from "./getQueryHelpers";

/* eslint-disable @typescript-eslint/no-explicit-any */

type IBindLoading<Payload, Result> = ILeitenLoading<Payload, Result> & {
  content: Result | null;
};

interface LeitenBindHookOptions<Payload> {
  enable?: boolean | ((payload: Payload) => boolean);
  payload: Payload;
}

type UseRequestType<Payload, Result> = (
  hookOptions: LeitenBindHookOptions<Payload>,
) => IBindLoading<Payload, Result>;

type LeitenBindResponse<Payload, Result> = {
  action: (payload: Payload) => void;
  invalidate: (cacheKey: string) => void;
  get: (payload: Payload) => ILeitenLoading<Payload, Result>;
  getContent: (payload: Payload) => Result | undefined;
} & UseRequestType<Payload, Result>;

export function leitenAsync<Payload, Result>(
  payloadCreator: (
    params: Payload,
    extraArgument?: IExtraArgument,
  ) => Promise<Result>,
  options?: ILeitenRequestOptions<Payload, Result>,
): LeitenBindResponse<Payload, Result> {
  const baseKey = nanoid(12);
  const useStore = create(() => ({ _: null }));
  const getKey = (params: Payload) =>
    params ? `${baseKey}-${md5(JSON.stringify(params))}` : baseKey;

  const instances: Record<
    string,
    ReturnType<typeof getQueryHelpers> & ReturnType<typeof createAsyncActions>
  > = {};

  let savedPayload: Payload | null = null;
  const action = (params: Payload) => {
    const key = getKey(params);
    if (!instances[key]) {
      const helpers = getQueryHelpers(useStore, key as any, options);
      const actions = createAsyncActions(payloadCreator, helpers.reactions);
      instances[key] = { ...actions, ...helpers };
    }
    instances[key].execute(instances[key].action, params);
    savedPayload = params;
  };

  const invalidate = () => {
    options?.cache?.name && cacheResolver.invalidate(options.cache.name).then();
  };

  const _get = (params: Payload) => {
    const path = getKey(params);
    return instances[path]._getState();
  };

  const getContent = (params: Payload) => {
    const path = getKey(params);
    return instances[path]._getContent();
  };

  const useRequest = (
    hookOptions: LeitenBindHookOptions<Payload>,
  ): IBindLoading<Payload, Result> => {
    const newPayload = hookOptions.payload;
    if ((hookOptions.enable ?? true) && !isEqual(newPayload, savedPayload)) {
      action(newPayload);
    }

    const key = getKey(newPayload);
    const queryInfo = useLeitenRequestStore(
      (state) => state[key] || instances[key].initialState,
    );
    const content = useStore((state) => get(state, key));

    // const clear = instances[path].clear;
    return { ...queryInfo, content };
  };

  return Object.assign(useRequest, {
    action,
    invalidate,
    get: _get,
    getContent,
  }) as LeitenBindResponse<Payload, Result>;
}
