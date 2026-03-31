import { db } from './schema';
import { SyncQueueItem } from '../types';

class SyncEngine {
  private isProcessing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
    }
  }

  async enqueue(operation: 'create' | 'update' | 'delete', table: string, payload: any) {
    const item: SyncQueueItem = {
      operation,
      table,
      payload,
      timestamp: Date.now(),
      retries: 0
    };

    await db.syncQueue.add(item);
    
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || !navigator.onLine) return;
    
    this.isProcessing = true;
    console.log('SyncEngine: Starting queue processing...');

    try {
      const items = await db.syncQueue.orderBy('timestamp').toArray();
      
      for (const item of items) {
        try {
          await this.syncItem(item);
          await db.syncQueue.delete(item.id!);
          console.log(`SyncEngine: Successfully synced ${item.table} ${item.operation}`);
        } catch (error) {
          console.error(`SyncEngine: Failed to sync item ${item.id}`, error);
          await db.syncQueue.update(item.id!, { 
            retries: item.retries + 1,
            lastError: error instanceof Error ? error.message : String(error)
          } as any);
          
          // If too many retries, maybe stop processing for now
          if (item.retries > 5) break;
        }
      }

      if (items.length > 0) {
        window.dispatchEvent(new CustomEvent('sync-complete'));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async syncItem(item: SyncQueueItem) {
    // In a real app, this would be an API call
    // For this demo, we'll simulate a network request
    console.log(`SyncEngine: Replaying ${item.operation} on ${item.table}`, item.payload);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  }
}

export const syncEngine = new SyncEngine();
