// lib/indexeddb.ts
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'note-platform-db';
const VERSION = 2;

export interface SyncOperation {
    id?: number;
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    noteId: string; // 临时 ID 或 真实 ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    timestamp: number;
}

export async function initDB() {
    return openDB(DB_NAME, VERSION, {
        upgrade(db) {
            // 存储笔记内容，用于离线展示
            if (!db.objectStoreNames.contains('notes')) {
                db.createObjectStore('notes', { keyPath: 'id' });
            }
            // 存储待同步的操作队列
            if (!db.objectStoreNames.contains('syncQueue')) {
                db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
            }
        },
    });
}