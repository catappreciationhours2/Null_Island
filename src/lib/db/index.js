// src/lib/db/index.js
// Clean IndexedDB wrapper using idb.
// When you migrate to Turso, only this file changes.
// @ts-nocheck

import { openDB } from 'idb';
const DB_NAME = 'null_island';
const DB_VERSION = 2;

const isBrowser = typeof window !== undefined;

let dbPromise = null; // Hold the connection variable here instead

// Helper to safely resolve the local db connection stream
async function getDB() {
  if (!isBrowser) return null;
  
  // 🧠 Only initialize the database if it hasn't been opened yet!
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('tasks',     { keyPath: 'id' });
          db.createObjectStore('player',    { keyPath: 'id' });
          db.createObjectStore('inventory', { keyPath: 'id' });
          db.createObjectStore('awards',    { keyPath: 'id' });
          db.createObjectStore('log',       { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('quests')) {
            db.createObjectStore('quests', { keyPath: 'id' });
          }
        }
      }
    });
  }
  
  return await dbPromise;
}


export const db = {
  // ── PLAYER ──
  async getPlayer() {
    const db = await getDB();
    if (!db) return null;
    return db.get('player', 'main');
  },
  async savePlayer(data) {
    const db = await getDB();
    if (!db) return null;
    return db.put('player', { ...data, id: 'main' });
  },

  // ── TASKS ──
  async getTasks() {
    const db = await getDB();
    if (!db) return null;
    const all = await db.getAll('tasks');
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
  async saveTask(task) {
    const db = await getDB();
    if (!db) return null;
    return db.put('tasks', task);
  },
  async deleteTask(id) {
    const db = await getDB();
    if (!db) return null;
    return db.delete('tasks', id);
  },

  // ── INVENTORY ──
  async getInventory() {
    const db = await getDB();
    if (!db) return null;
    return db.getAll('inventory');
  },
  async addInventoryItem(item) {
    const db = await getDB();
    if (!db) return null;
    return db.put('inventory', { 
        id: crypto.randomUUID(), 
        acquiredAt: Date.now(), 
        ...item });
  },

  // ── AWARDS ──
  async getAwards() {
    const db = await getDB();
    if (!db) return null;
    return db.getAll('awards');
  },
  async saveAward(award) {
    const db = await getDB();
    if (!db) return null;
    return db.put('awards', award);
  },

  // ── LOG ──
  async addLog(entry) {
    const db = await getDB();
    if (!db) return null;
    return db.put('log', { 
        id: crypto.randomUUID(), 
        ts: Date.now(), 
        ...entry });
  },
  async getLog() {
    const db = await getDB();
    if (!db) return null;
    const all = await db.getAll('log');
    return all.sort((a, b) => b.ts - a.ts);
  }
};