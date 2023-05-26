import { create } from "zustand";

import {
  ILeitenGroupRequestParams,
  leitenGroupRequest,
  leitenMap,
  useLeitenRequests,
} from "../../helpers";
import { getCard, ICard } from "../requests";

interface IState {
  info: { keys: string[] };
  cards: Record<string, ICard>;
  array: ICard[];
}

const useExampleStore = create<IState>(() => ({
  info: { keys: ["1", "2", "3"] },
  cards: {},
  array: [],
}));
export const useGroupController = leitenGroupRequest(
  useExampleStore,
  "cards",
  async (props: ILeitenGroupRequestParams<string>) => {
    return getCard(props.params);
  },
  {
    fulfilled: ({ result, payload }) => {
      // console.log("everything ok", result.type, payload);
    },
  }
);

const GroupRequest = () => {
  const cards = useExampleStore((state) => state.info?.keys);

  return (
    <>
      {cards?.map((id) => (
        <Card id={id} />
      ))}
      <Statuses />
    </>
  );
};

const Card = ({ id }: { id: string }) => {
  const content = useExampleStore((state) => state.cards[id]);
  const status = useGroupController(id, (state) => state.status);

  return (
    <>
      {status === "waiting" ? (
        "waiting..."
      ) : status === "init" ? (
        <>init</>
      ) : (
        <>
          Info
          <div>value: {content?.value}</div>
          <div>type: {content?.type}</div>
        </>
      )}

      {status !== "loaded" && (
        <button
          onClick={() =>
            useGroupController.call([{ key: id, params: id }], {
              status: "waiting",
            })
          }
        >
          load info
        </button>
      )}
    </>
  );
};

const Statuses = () => {
  const loading = useLeitenRequests(selector);

  return <>Merged statuses for "1" and "2": {loading}</>;
};

// you can write selector and merge params of request
export const selector = leitenMap(
  ["1", "2"], //you can receive keys from requestController, example useController.key;
  ([first, second]) => first.status === "loading" && second.status === "loading"
);
