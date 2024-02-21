import { useEffect } from "react";
import { create } from "zustand";

import { leitenRequest } from "../controllers/leitenRequest";
import { getUser, IUser } from "./requests";

interface IState {
  user: IUser | null;
}

const useExampleStore = create<IState>(() => ({
  user: null,
}));
const useGetController = leitenRequest(
  useExampleStore,
  "user",
  (value: string) => getUser(value),
);

const Example = () => {
  const status = useGetController((state) => state.status);

  useEffect(() => {
    useGetController.action("userId");

    return () => {
      useGetController.clear();
    };
  }, []);

  return <>{status !== "loading" ? <Request /> : "loading..."}</>;
};

const Request = () => {
  const user = useExampleStore((state) => state.user);

  return user ? (
    <>
      <div>Name: {user.name}</div>
      <div>Surname: {user.surname}</div>
    </>
  ) : null;
};
