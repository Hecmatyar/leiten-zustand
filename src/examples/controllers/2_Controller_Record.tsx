import { useEffect } from "react";
import { create } from "zustand";

import { leitenRecord, leitenRequest } from "../../helpers";
import { getUser, IUser, updateUser } from "../requests";

interface IState {
  user: IUser | null;
}

const useExampleStore = create<IState>(() => ({
  user: null,
}));
const useGetController = leitenRequest(
  useExampleStore,
  "user",
  (value: string) => getUser(value)
);
const recordController = leitenRecord(useExampleStore, "user", {
  sideEffect: () => {
    // something after
  },
});

const useUpdateController = leitenRequest(
  useExampleStore,
  "user",
  async (_params: void) => {
    const user = useExampleStore.getState().user;
    user && updateUser(user);
  }
);

const Example = () => {
  const user = useExampleStore((state) => state.user);
  const status = useGetController((state) => state.status);

  useEffect(() => {
    useGetController.action("userId");
  }, []);

  const handleUpdateName = (name: string) => {
    recordController.patch({ name });
  };

  return (
    <>
      {status !== "loading" ? (
        <>
          <input
            defaultValue={user?.name}
            onChange={(e) => handleUpdateName(e.target.value)}
          />
          <div>Surname: {user?.surname}</div>
          <button onClick={() => useUpdateController.action()}>Save</button>
        </>
      ) : (
        "loading..."
      )}
    </>
  );
};
