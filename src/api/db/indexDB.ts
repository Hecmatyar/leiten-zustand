import {
  IDBPDatabase,
  IndexNames,
  openDB,
  StoreKey,
  StoreNames,
  StoreValue,
} from "idb";
import { DBSchema } from "idb/build/entry";

/**
 * Class representing an IndexedDb.
 */
export class IndexedDb<DBTypes extends DBSchema> {
  private readonly database: string;
  private db: IDBPDatabase<DBTypes> | undefined;

  constructor(
    database: string,
    tables: {
      name: StoreNames<DBTypes>;
      indexes?: IndexNames<DBTypes, StoreNames<DBTypes>>[];
    }[],
  ) {
    this.database = database;
    this.initDatabase(tables).then();
  }

  public async createObjectStore(
    tables: {
      name: StoreNames<DBTypes>;
      indexes?: IndexNames<DBTypes, StoreNames<DBTypes>>[];
    }[],
  ) {
    try {
      const toCreate: typeof tables = [];

      if (!this.db) {
        this.db = await openDB(this.database);
      }

      for (const table of tables) {
        if (!this.db.objectStoreNames.contains(table.name)) {
          toCreate.push(table);
        }
      }

      if (toCreate.length) {
        this.db?.close();
        const newVersion = this.db?.version + 1;
        this.db = await openDB<DBTypes>(this.database, newVersion, {
          upgrade(db: IDBPDatabase<DBTypes>) {
            toCreate.forEach((table) => {
              const store = db.createObjectStore(table.name, { keyPath: "id" });
              table.indexes?.forEach((index) =>
                store.createIndex(index, String(index)),
              );
            });
          },
        });
      }
    } catch (error) {
      // console.log("indexedDB createObjectStore", error);
      return false;
    }
  }

  public async getValue(
    tableName: StoreNames<DBTypes>,
    id: IDBKeyRange | StoreKey<DBTypes, StoreNames<DBTypes>>,
  ) {
    if (this.db) {
      const tx = this.db.transaction(tableName, "readonly");
      const store = tx.objectStore(tableName);
      const response = await store.get(id);
      await tx.done;
      return response;
    } else {
      return null;
    }
  }

  public async getAllValue(tableName: StoreNames<DBTypes>) {
    if (this.db) {
      const tx = this.db.transaction(tableName, "readonly");
      const store = tx.objectStore(tableName);
      const response = await store.getAll();
      await tx.done;
      return response;
    } else {
      return null;
    }
  }

  public async putValue(
    tableName: StoreNames<DBTypes>,
    value: StoreValue<DBTypes, StoreNames<DBTypes>>,
  ) {
    if (this.db) {
      const tx = this.db.transaction(tableName, "readwrite");
      const store = tx.objectStore(tableName);
      await store.put(value);
      await tx.done;
    } else {
      return null;
    }
  }

  public async putBulkValue(
    tableName: StoreNames<DBTypes>,
    values: StoreValue<DBTypes, StoreNames<DBTypes>>[],
  ) {
    if (this.db) {
      const tx = this.db.transaction(tableName, "readwrite");
      const store = tx.objectStore(tableName);
      for (const value of values) {
        await store.put(value);
      }
      await tx.done;
      return this.getAllValue(tableName);
    } else {
      return null;
    }
  }

  public async deleteValue(
    tableName: StoreNames<DBTypes>,
    id: IDBKeyRange | StoreKey<DBTypes, StoreNames<DBTypes>>,
  ) {
    if (this.db) {
      const tx = this.db.transaction(tableName, "readwrite");
      const store = tx.objectStore(tableName);
      const result = await store.get(id);
      if (!result) {
        return result;
      }
      await store.delete(id);
      await tx.done;
      return id;
    } else {
      return null;
    }
  }

  public getDb() {
    return this.db;
  }

  private async initDatabase(
    tables: {
      name: StoreNames<DBTypes>;
      indexes?: IndexNames<DBTypes, StoreNames<DBTypes>>[];
    }[],
  ) {
    try {
      this.db = await openDB(this.database);
      await this.createObjectStore(tables);
    } catch (error) {
      localStorage.setItem("IndexedDBErrors", String(error));
      // console.error("Error initializing IndexedDB:", error);
    }
  }
}
