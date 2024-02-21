import { ILoadingStatus } from "./ILoadingStatus";

export type ILeitenLoading<Payload, Result> = {
  status: ILoadingStatus;
  error?: string | null;
  payload?: Payload | null;
  requestId?: string;
};

export const initialLeitenLoading = <Payload, Result>(
  initialStatus?: ILoadingStatus,
): ILeitenLoading<Payload, Result> => ({
  status: initialStatus || "init",
  error: undefined,
  payload: undefined,
  requestId: undefined,
});
