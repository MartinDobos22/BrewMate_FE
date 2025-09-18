import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { showToast } from '../utils/toast';

export type QueueItemStatus = 'pending' | 'conflict' | 'resolved' | 'failed';

export interface QueueItem {
  id: string;
  operation: string;
  payload: any;
  retries: number;
  status?: QueueItemStatus;
  userId?: string;
}

interface SupabaseQueueRecord {
  id: string;
  user_id: string;
  operation: string;
  payload: any;
  retries: number;
  status: QueueItemStatus | string;
  created_at: string;
}

const STORAGE_KEY = 'offline:queue';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const MAX_RETRIES = 3;

/**
 * Trieda spravujúca frontu offline zmien a ich synchronizáciu so Supabase.
 */
export class OfflineSync {
  private static instance: OfflineSync;
  private syncing = false;
  private listeners: ((count: number) => void)[] = [];
  private progressListeners: ((processed: number, total: number) => void)[] = [];

  private constructor() {}

  public static getInstance() {
    if (!this.instance) this.instance = new OfflineSync();
    return this.instance;
  }

  /**
   * Pridanie zmeny do fronty s optimistickou aktualizáciou UI.
   */
  public async enqueue(operation: string, payload: any, userId?: string) {
    const item: QueueItem = {
      id: Date.now().toString(),
      operation,
      payload,
      retries: 0,
      status: 'pending',
      userId: userId ?? this.resolveUserIdFromPayload(payload),
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
  public addListener(cb: (count: number) => void) {
    this.listeners.push(cb);
  }

  public removeListener(cb: (count: number) => void) {
    this.listeners = this.listeners.filter(listener => listener !== cb);
  }

  public addProgressListener(cb: (processed: number, total: number) => void) {
    this.progressListeners.push(cb);
    return () => this.removeProgressListener(cb);
  }

  public removeProgressListener(cb: (processed: number, total: number) => void) {
    this.progressListeners = this.progressListeners.filter(listener => listener !== cb);
  }

  public isSyncing() {
    return this.syncing;
  }

  private notify(count: number) {
    this.listeners.forEach(l => l(count));
  }

  private notifyProgress(processed: number, total: number) {
    this.progressListeners.forEach(listener => listener(processed, total));
  }

  private async getQueue(): Promise<QueueItem[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as QueueItem[];
      return parsed.map(item => ({
        ...item,
        retries: item.retries ?? 0,
        status: item.status ?? 'pending',
        userId: item.userId ?? this.resolveUserIdFromPayload(item.payload),
      }));
    } catch (error) {
      console.warn('OfflineSync: failed to parse queue state', error);
      return [];
    }
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
    try {
      const queueSnapshot = await this.getQueue();
      let queue = [...queueSnapshot];
      const total = queueSnapshot.length;

      this.notifyProgress(0, total);

      if (total === 0) {
        this.syncing = false;
        return;
      }

      let processed = 0;

      for (const originalItem of queueSnapshot) {
        const index = queue.findIndex(q => q.id === originalItem.id);
        if (index === -1) {
          processed += 1;
          this.notifyProgress(processed, total);
          continue;
        }

        const item = queue[index];

        if (item.retries >= MAX_RETRIES) {
          await this.handlePermanentFailure(item, 'Prekročený maximálny počet pokusov');
          queue.splice(index, 1);
          await this.setQueue(queue);
          processed += 1;
          this.notifyProgress(processed, total);
          continue;
        }

        const outcome = await this.processQueueItem(item);

        if (outcome.type === 'complete') {
          queue.splice(index, 1);
          await this.setQueue(queue);
        } else if (outcome.type === 'retry') {
          const retries = item.retries + 1;
          const updatedItem = { ...item, retries };
          if (retries >= MAX_RETRIES) {
            await this.handlePermanentFailure(updatedItem);
            queue.splice(index, 1);
          } else {
            queue[index] = updatedItem;
          }
          await this.setQueue(queue);
        } else {
          await this.handlePermanentFailure(item, outcome.message);
          queue.splice(index, 1);
          await this.setQueue(queue);
        }

        processed += 1;
        this.notifyProgress(processed, total);
      }

      if (queue.length === 0) {
        showToast('Všetky zmeny synchronizované');
      }
    } finally {
      this.syncing = false;
    }
  }

  private resolveUserIdFromPayload(payload: any): string | undefined {
    if (!payload) return undefined;
    if (typeof payload.userId === 'string') return payload.userId;
    if (typeof payload.user_id === 'string') return payload.user_id;
    if (typeof payload.user === 'object' && payload.user && typeof payload.user.id === 'string') {
      return payload.user.id;
    }
    return undefined;
  }

  private getSupabaseHeaders() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return null;
    }

    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: 'return=representation',
    } as const;
  }

  private getSupabaseEndpoint(path: string) {
    if (!SUPABASE_URL) return null;
    return `${SUPABASE_URL.replace(/\/$/, '')}${path}`;
  }

  private async processQueueItem(item: QueueItem): Promise<
    | { type: 'complete' }
    | { type: 'retry'; message?: string }
    | { type: 'failed'; message?: string }
  > {
    const headers = this.getSupabaseHeaders();
    const endpoint = this.getSupabaseEndpoint('/rest/v1/offline_sync_queue');
    const userId = item.userId ?? this.resolveUserIdFromPayload(item.payload);

    if (!headers || !endpoint) {
      console.warn('OfflineSync: Supabase configuration is missing');
      return { type: 'failed', message: 'Supabase konfigurácia chýba' };
    }

    if (!userId) {
      console.warn('OfflineSync: Missing user identifier for queue item', item);
      return { type: 'failed', message: 'Chýba identifikácia používateľa' };
    }

    const body = JSON.stringify({
      user_id: userId,
      operation: item.operation,
      payload: item.payload,
      retries: item.retries,
      status: item.status ?? 'pending',
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      if (response.ok) {
        const created = (await response.json()) as SupabaseQueueRecord[] | SupabaseQueueRecord | undefined;
        const record = Array.isArray(created) ? created[0] : created;

        if (record?.status === 'conflict') {
          const resolved = await this.resolveConflictRecord(record, item, headers, endpoint);
          if (!resolved) {
            return { type: 'retry' };
          }
        }

        return { type: 'complete' };
      }

      if (response.status === 409 || response.status === 422) {
        const conflictRecord = await this.findConflictRecord(item, userId, headers, endpoint);
        if (conflictRecord) {
          const resolved = await this.resolveConflictRecord(conflictRecord, item, headers, endpoint);
          if (resolved) {
            return { type: 'complete' };
          }
        }
        return { type: 'retry', message: 'Čaká sa na vyriešenie konfliktu' };
      }

      if (response.status >= 500 && response.status < 600) {
        return { type: 'retry', message: 'Server dočasne nedostupný' };
      }

      const errorMessage = await this.readErrorMessage(response);
      return {
        type: 'failed',
        message: errorMessage ? `Synchronizácia zlyhala: ${errorMessage}` : 'Synchronizácia zlyhala',
      };
    } catch (error) {
      console.warn('OfflineSync: Failed to process queue item', error);
      return { type: 'retry', message: 'Nepodarilo sa pripojiť k serveru' };
    }
  }

  private async resolveConflictRecord(
    record: SupabaseQueueRecord,
    item: QueueItem,
    headers: ReturnType<OfflineSync['getSupabaseHeaders']>,
    endpoint: string,
  ) {
    if (!headers) return false;
    const mergedPayload = this.mergePayloads(item.payload, record.payload);

    try {
      const response = await fetch(`${endpoint}?id=eq.${record.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          payload: mergedPayload,
          status: 'resolved',
          retries: item.retries,
        }),
      });

      return response.ok;
    } catch (error) {
      console.warn('OfflineSync: Failed to resolve conflict', error);
      return false;
    }
  }

  private mergePayloads(localPayload: any, remotePayload: any) {
    const localTimestamp = this.extractTimestamp(localPayload);
    const remoteTimestamp = this.extractTimestamp(remotePayload);

    if (localTimestamp && remoteTimestamp) {
      return localTimestamp >= remoteTimestamp ? localPayload : remotePayload;
    }

    if (localTimestamp) return localPayload;
    if (remoteTimestamp) return remotePayload;

    if (this.isPlainObject(remotePayload) && this.isPlainObject(localPayload)) {
      return { ...remotePayload, ...localPayload };
    }

    return localPayload ?? remotePayload;
  }

  private extractTimestamp(payload: any) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const candidates = ['updatedAt', 'updated_at', 'timestamp', 'modifiedAt', 'modified_at'];

    for (const key of candidates) {
      const value = (payload as Record<string, any>)[key];
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private async findConflictRecord(
    item: QueueItem,
    userId: string,
    headers: ReturnType<OfflineSync['getSupabaseHeaders']>,
    endpoint: string,
  ) {
    if (!headers) return null;
    const params = new URLSearchParams();
    params.append('select', '*');
    params.append('status', 'eq.conflict');
    params.append('operation', `eq.${item.operation}`);
    params.append('user_id', `eq.${userId}`);
    params.append('order', 'created_at.desc');
    params.append('limit', '1');

    try {
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as SupabaseQueueRecord[];
      return data?.[0] ?? null;
    } catch (error) {
      console.warn('OfflineSync: Failed to fetch conflict record', error);
      return null;
    }
  }

  private async readErrorMessage(response: Response) {
    try {
      const text = await response.text();
      return text || null;
    } catch {
      return null;
    }
  }

  private async handlePermanentFailure(item: QueueItem, message?: string) {
    const headers = this.getSupabaseHeaders();
    const endpoint = this.getSupabaseEndpoint('/rest/v1/offline_sync_queue');
    const userId = item.userId ?? this.resolveUserIdFromPayload(item.payload);

    if (headers && endpoint && userId) {
      const params = new URLSearchParams();
      params.append('select', '*');
      params.append('operation', `eq.${item.operation}`);
      params.append('user_id', `eq.${userId}`);
      params.append('order', 'created_at.desc');
      params.append('limit', '1');

      try {
        const response = await fetch(`${endpoint}?${params.toString()}`, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = (await response.json()) as SupabaseQueueRecord[];
          const record = data?.[0];
          if (record) {
            await fetch(`${endpoint}?id=eq.${record.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ status: 'failed', retries: item.retries }),
            });
          }
        }
      } catch (error) {
        console.warn('OfflineSync: Failed to mark record as failed', error);
      }
    }

    const toastMessage = message ?? 'Synchronizácia zlyhala po viacerých pokusoch';
    showToast(toastMessage);
  }
}

export const offlineSync = OfflineSync.getInstance();
