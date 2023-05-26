/* eslint-disable @typescript-eslint/no-explicit-any */
export type ILoadingStatus =
  | "init"
  | "loading"
  | "loaded"
  | "waiting"
  | "progress"
  | "error";

export interface IContentLoading<Content, Payload = undefined> {
  content: Content | null;
  status: ILoadingStatus;
  error?: any;
  payload?: Payload | null;
  requestId?: string;
}

export const initialContentLoading = <Content, Payload>(
  value: Content | null,
  initialStatus?: ILoadingStatus
): IContentLoading<Content, Payload> => ({
  content: value,
  status: initialStatus || "loading",
  error: undefined,
  payload: undefined,
  requestId: undefined,
});

export type ILeitenLoading<Payload, Result> = Omit<
  IContentLoading<Result, Payload>,
  "content"
>;

export const initialLeitenLoading = <Payload, Result>(
  initialStatus?: ILoadingStatus
): ILeitenLoading<Payload, Result> => ({
  status: initialStatus || "init",
  error: undefined,
  payload: undefined,
  requestId: undefined,
});
