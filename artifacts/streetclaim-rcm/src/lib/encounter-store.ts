import { openDB, DBSchema, IDBPDatabase } from "idb";

export type SyncStatus = "pending" | "synced" | "failed";

export interface EncounterRecord {
  id: string;
  patientName: string;
  dateOfService: string;
  latitude: number | null;
  longitude: number | null;
  clinicalNote: string;
  syncStatus: SyncStatus;
  createdAt: string;
  codes?: string[];
  posCode?: string;
}

interface StreetClaimDB extends DBSchema {
  encounters: {
    key: string;
    value: EncounterRecord;
    indexes: { "by-status": SyncStatus };
  };
}

let dbPromise: Promise<IDBPDatabase<StreetClaimDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<StreetClaimDB>("streetclaim-db", 1, {
      upgrade(db) {
        const store = db.createObjectStore("encounters", { keyPath: "id" });
        store.createIndex("by-status", "syncStatus");
      },
    });
  }
  return dbPromise;
}

export async function saveEncounter(
  data: Omit<EncounterRecord, "id" | "createdAt" | "syncStatus">
): Promise<EncounterRecord> {
  const db = await getDB();
  const record: EncounterRecord = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
  };
  await db.put("encounters", record);
  return record;
}

export async function listEncounters(): Promise<EncounterRecord[]> {
  const db = await getDB();
  const all = await db.getAll("encounters");
  return all.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getEncounter(id: string): Promise<EncounterRecord | undefined> {
  const db = await getDB();
  return db.get("encounters", id);
}

export async function markSynced(id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get("encounters", id);
  if (record) {
    record.syncStatus = "synced";
    await db.put("encounters", record);
  }
}

export async function markFailed(id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get("encounters", id);
  if (record) {
    record.syncStatus = "failed";
    await db.put("encounters", record);
  }
}

export async function updateEncounterCodes(
  id: string,
  codes: string[],
  posCode: string
): Promise<void> {
  const db = await getDB();
  const record = await db.get("encounters", id);
  if (record) {
    record.codes = codes;
    record.posCode = posCode;
    await db.put("encounters", record);
  }
}
