import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { showToast } from '../utils/toast';

export interface QueueItem {
  id: string;
  operation: string;
  payload: any;
  retries: number;
}

const STORAGE_KEY = 'offline:queue';

/**
 * Trieda spravujúca frontu offline zmien a ich synchronizáciu so Supabase.
 */
export class OfflineSync {
  private static instance: OfflineSync;
  private syncing = false;
  private listeners: ((count: number) => void)[] = [];

  private constructor() {}

  public static getInstance() {
    if (!this.instance) this.instance = new OfflineSync();
    return this.instance;
  }

  /**
   * Pridanie zmeny do fronty s optimistickou aktualizáciou UI.
   */
  public async enqueue(operation: string, payload: any) {
    const item: QueueItem = {
      id: Date.now().toString(),
      operation,
      payload,
      retries: 0,
    };
    const queue = await this.getQueue();
    queue.push(item);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    this.notify(queue.length);
  }

  /**
   * Spustenie sledovania pripojenia a synchronizácie.
   */
  public start() {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.processQueue();
      }
    });
  }

  /**
   * Zaregistruj listener na zmeny dĺžky fronty.
   */
  public addListener(cb: (count: number) => void): () => void {
    this.listeners.push(cb);
    void this.getQueue()
      .then((queue) => {
        cb(queue.length);
      })
      .catch(() => {
        cb(0);
      });
    return () => this.removeListener(cb);
  }

  public removeListener(cb: (count: number) => void) {
    this.listeners = this.listeners.filter((listener) => listener !== cb);
  }

  private notify(count: number) {
    this.listeners.forEach(l => l(count));
  }

  private async getQueue(): Promise<QueueItem[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  }

  private async setQueue(queue: QueueItem[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    this.notify(queue.length);
  }

  /**
   * Pokúsi sa odoslať položky vo fronte na Supabase REST endpoint.
   */
  public async processQueue() {
    if (this.syncing) return;
    this.syncing = true;
    let queue = await this.getQueue();
    for (const item of queue) {
      if (item.retries >= 3) continue;
      try {
        // príklad POST na Supabase funkciu
        const res = await fetch('https://example.supabase.co/rest/v1/offline_sync_queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: 'public-anon-key' },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          queue = queue.filter(q => q.id !== item.id);
          await this.setQueue(queue);
        } else {
          item.retries += 1;
        }
      } catch (err) {
        item.retries += 1;
      }
    }
    await this.setQueue(queue.filter(q => q.retries < 3));
    if ((await this.getQueue()).length === 0) {
      showToast('Všetky zmeny synchronizované');
    }
    this.syncing = false;
  }
}

export const offlineSync = OfflineSync.getInstance();
