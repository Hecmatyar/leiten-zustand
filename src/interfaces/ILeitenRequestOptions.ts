import { ILoadingStatus } from "./ILoadingStatus";

export interface ILeitenRequestOptions<Payload, Result> {
  fulfilled?: (
    options: Omit<IRequestCallback<Payload, Result>, "error" | "fetchError">,
  ) => void;
  rejected?: (
    options: Omit<IRequestCallback<Payload, Result>, "result">,
  ) => void;
  abort?: (
    options: Omit<IRequestCallback<Payload, Result>, "error" | "result">,
  ) => void;
  resolved?: (
    options: Omit<IRequestCallback<Payload, Result>, "result" | "error">,
  ) => void;
  action?: (
    options: Omit<IRequestCallback<Payload, Result>, "error" | "result">,
  ) => void;
  initialStatus?: ILoadingStatus;
  cache?: {
    name: string;
    key: (payload: Payload) => string | object;
    value: number;
  };
  retry?: {
    delay: (retry: number) => number;
    count: (payload: Payload) => number;
  };
  optimisticUpdate?: (params: Payload) => Result;
}

interface IRequestCallback<Payload, Result> {
  previousResult: Result;
  result: Result;
  payload: Payload;
  requestId: string;
  error?: string;
}
