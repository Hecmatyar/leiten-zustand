import { DBSchema } from "idb/build/entry";

import { IndexedDb } from "./indexDB";

const CONTROLLERS_TABLE = "controllers";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ICachedEntity<R> {
  date: number;
  state: R;
  id: string;
}

interface ICacheRequestState extends DBSchema {
  controllers: {
    key: string;
    value: ICachedEntity<any>;
    indexes: { date: number };
  };
  clear: { key: string; value: ICachedEntity<any>; indexes: { date: number } };
}

/**
 * Represents a cache request manager that interacts with IndexedDb.
 * @class
 */
export class CacheControllers {
  private readonly indexedDb: IndexedDb<ICacheRequestState>;

  constructor() {
    this.indexedDb = new IndexedDb("cache", [
      { name: "controllers", indexes: ["date"] },
      { name: "clear", indexes: ["date"] },
    ]);
  }

  get = async (key: string, cache?: number) => {
    const storeKey = "leiten_" + key;
    if (this.indexedDb) {
      if (cache) {
        const cachedData = await this.indexedDb.getValue(
          CONTROLLERS_TABLE,
          storeKey,
        );
        if (cachedData) {
          const hours: number = cache || 24;
          const { date, state } = cachedData;
          if (date > Date.now() - hours * 3_600_000) {
            return state;
          }
        }
      } else {
        this.indexedDb.deleteValue(CONTROLLERS_TABLE, storeKey).then();
      }
    }

    return null;
  };

  set = async (
    key: string,
    state: ICacheRequestState["controllers"]["value"]["state"],
  ) => {
    const storeKey = "leiten_" + key;

    if (this.indexedDb) {
      const data = {
        state,
        id: storeKey,
        date: Date.now(),
      };
      await this.indexedDb.putValue(CONTROLLERS_TABLE, data);
    }
  };

  invalidate = async (key: string) => {
    const storeKey = "leiten_" + key;
    const db = this.indexedDb.getDb();

    if (db) {
      const store = db.transaction("controllers", "readwrite").store;

      for await (const cursor of store) {
        cursor.value.id.includes(storeKey) && cursor.delete();
      }
    }

    return null;
  };

  remove = async (key: string) => {
    const storeKey = "leiten_" + key;
    await this.indexedDb.deleteValue("controllers", storeKey);
  };

  update = async (
    key: string,
    state: ICacheRequestState["controllers"]["value"]["state"],
  ) => {
    const value = await this.get(key, 96);
    if (value) {
      await this.remove(key);
    }
    await this.set(key, state);
  };

  getDb = () => {
    return this.indexedDb.getDb();
  };
}

export const cacheControllers = new CacheControllers();

const cacheControllersCutterTail = async () => {
  setTimeout(async () => {
    const db = cacheControllers.getDb();
    const minDate = Date.now() - 72 * 3_600_000;
    if (db) {
      const cleaningRange = IDBKeyRange.lowerBound(minDate, true);
      const cleaning = await db?.getAllFromIndex(
        "clear",
        "date",
        cleaningRange,
      );
      if (!cleaning || cleaning?.length === 0) {
        const store = db.transaction("controllers", "readwrite").store;
        for await (const cursor of store) {
          cursor.value.date < minDate && cursor.delete();
        }
        db.put("clear", {
          id: "cleaning_" + new Date(),
          state: null,
          date: Date.now(),
        }).then();
      }
    }
  }, 1000);
};

cacheControllersCutterTail().then();
