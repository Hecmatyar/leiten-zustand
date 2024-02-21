export interface IKeyword {
  value: string;
  bid: number;
}

export interface ICard {
  value: string;
  type: "bid" | "defaultBid";
}

export interface IUser {
  name: string;
  surname: string;
  keywords: IKeyword[];
  cards: string[];
}

export const getUser = async (
  id: string,
  signal?: AbortSignal,
): Promise<IUser> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const result: IUser = {
        name: "Name" + id,
        surname: "Surname",
        keywords: [],
        cards: ["1", "2"],
      };
      resolve(result);
    }, 2000);
  });
};

export const updateUser = async (user: IUser): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // console.log(user); // send to server
      resolve();
    }, 2000);
  });
};

export const getCard = async (param: string): Promise<ICard> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const result: ICard = {
        type: "bid",
        value: "test" + param,
      };
      resolve(result);
    }, 2000);
  });
};

export interface IChartFilter {
  period: "today" | "yesterday" | "latsWeek" | "lastMonth";
  type: "sales" | "income";
}

export const getChart = async (
  filter: IChartFilter,
  signal?: AbortSignal,
): Promise<number[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const result: number[] = Array(100).fill(2);
      resolve(result);
    }, 2000);
  });
};
