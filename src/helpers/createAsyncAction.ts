import { nanoid } from "nanoid";

import { IExtraArgument } from "../interfaces/IExtraArgument";
import { ILoadingStatus } from "../interfaces/ILoadingStatus";

interface IAsyncReaction<Payload, Result> {
  fulfilled?: (result: Result, params: Payload, requestId: string) => void;
  rejected?: (params: Payload, error: string, requestId?: string) => void;
  abort?: (params: Payload, requestId: string) => void;
  resolved?: (params: Payload, requestId: string) => void;
  action?: (
    params: Payload,
    status?: ILoadingStatus,
    requestId?: string,
  ) => void;
}

export function createAsyncActions<Payload, Result>(
  payloadCreator: (
    params: Payload,
    extraArgument?: IExtraArgument,
  ) => Promise<Result>,
  extra?: IAsyncReaction<Payload, Result>,
) {
  const abortRef: { current: (() => void) | null } = { current: null };
  const abort = () => {
    abortRef.current?.();
  };

  const action = (
    params: Payload,
    options?: { status?: ILoadingStatus; requestId?: string },
  ) => {
    const requestId = options?.requestId || nanoid();
    let controller: AbortController | null = new AbortController();
    extra?.action?.(params, options?.status, requestId);
    payloadCreator(params, { signal: controller.signal })
      .then((result) => {
        extra?.fulfilled?.(result, params, requestId);
      })
      .catch((error) => {
        if (error.message === "The user aborted a request.") {
          extra?.abort?.(params, requestId);
        } else {
          extra?.rejected?.(params, error, requestId);
        }
      })
      .finally(() => {
        controller = null;
        abortRef.current = null;
        if (extra?.resolved) {
          extra?.resolved?.(params, requestId);
        }
      });
    const abort = () => {
      if (controller) {
        controller.abort();
      }
      controller = null;
    };
    abortRef.current = abort;
    return abort;
  };
  return { action, abort };
}
