import { ReactNode } from "react";

import { ILoadingStatus } from "../interfaces/ILoadingStatus";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ISwitcherProps {
  status: ILoadingStatus;
  children: ReactNode;
  error?: any;
}

export const StatusSwitcher = ({ status, children, error }: ISwitcherProps) => {
  return (
    <>
      {status === "loaded" && <>{children}</>}
      {status === "loading" && <>loading...</>}
      {status === "error" && <>{error?.message}</>}
    </>
  );
};
