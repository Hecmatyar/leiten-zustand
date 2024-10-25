import { useEffect } from "react";
import { create } from "zustand";

import { leitenModal } from "../controllers/leitenModal";
import { leitenRequest } from "../controllers/leitenRequest";
import { getUser, IUser } from "./requests";

interface IState {
  modal: { name: string; id: string };
  user: IUser | null;
}

const useExampleStore = create<IState>(() => ({
  modal: { name: "", id: "" },
  user: null,
}));
const useGetController = leitenRequest(useExampleStore, "user", (id: string) =>
  getUser(id),
);
export const useModalController = leitenModal(useExampleStore, "modal");

const Example = () => {
  const [open] = useModalController();

  return (
    <>
      <button
        onClick={() =>
          useModalController.open({ name: "SimpleName", id: "userId" })
        }
      ></button>
      {open && <Modal />}
    </>
  );
};

const Modal = () => {
  const [modal, user] = useExampleStore((state) => [state.modal, state.user]);
  const status = useGetController((state) => state.status);

  useEffect(() => {
    useGetController.action(modal.id);
  }, []);

  return (
    <>
      name: {modal.name} <br />
      {status !== "loading" ? (
        <div>Surname: {user?.surname}</div>
      ) : (
        "loading user info..."
      )}
    </>
  );
};
