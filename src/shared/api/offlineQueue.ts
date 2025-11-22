interface QueuedOperation {
  id: string
  type: 'settings' | 'data'
  dataType?: string
  data: any
  timestamp: number
  retries: number
}

const QUEUE_STORAGE_KEY = 'mixId_offline_queue'
const MAX_RETRIES = 3
const MAX_QUEUE_SIZE = 50 // Maximum number of operations in queue
const MAX_QUEUE_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

class OfflineQueue {
  private queue: QueuedOperation[] = []

  constructor() {
    this.loadQueue()
    this.cleanupOldOperations()
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error loading offline queue:', error)
      this.queue = []
    }
  }

  private saveQueue() {
    try {
      // Limit queue size before saving
      if (this.queue.length > MAX_QUEUE_SIZE) {
        // Keep only the most recent operations
        this.queue = this.queue
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_QUEUE_SIZE)
      }
      
      const queueJson = JSON.stringify(this.queue)
      // Check if data is too large (localStorage limit is ~5-10MB)
      if (queueJson.length > 4 * 1024 * 1024) {
        // If too large, keep only the most recent 20 operations
        console.warn('Offline queue too large, keeping only most recent operations')
        this.queue = this.queue
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 20)
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue))
      } else {
        localStorage.setItem(QUEUE_STORAGE_KEY, queueJson)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old operations')
        // Clear old operations and try again
        this.queue = this.queue
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10)
        try {
          localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue))
        } catch (e) {
          console.error('Failed to save queue after cleanup:', e)
          // Last resort: clear the queue
          this.queue = []
          localStorage.removeItem(QUEUE_STORAGE_KEY)
        }
      } else {
        console.error('Error saving offline queue:', error)
      }
    }
  }

  private cleanupOldOperations() {
    const now = Date.now()
    const initialLength = this.queue.length
    this.queue = this.queue.filter((op) => now - op.timestamp < MAX_QUEUE_AGE)
    
    if (this.queue.length < initialLength) {
      console.log(`Cleaned up ${initialLength - this.queue.length} old operations from queue`)
      this.saveQueue()
    }
  }

  enqueue(type: 'settings' | 'data', data: any, dataType?: string): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const operation: QueuedOperation = {
      id,
      type,
      dataType,
      data,
      timestamp: Date.now(),
      retries: 0,
    }

    this.queue.push(operation)
    this.saveQueue()
    return id
  }

  async processQueue(processFn: (operation: QueuedOperation) => Promise<void>) {
    const operations = [...this.queue]
    
    for (const operation of operations) {
      try {
        await processFn(operation)
        this.remove(operation.id)
      } catch (error) {
        console.error(`Error processing queued operation ${operation.id}:`, error)
        operation.retries++
        
        if (operation.retries >= MAX_RETRIES) {
          console.warn(`Operation ${operation.id} exceeded max retries, removing from queue`)
          this.remove(operation.id)
        } else {
          this.saveQueue()
        }
      }
    }
  }

  remove(id: string) {
    this.queue = this.queue.filter((op) => op.id !== id)
    this.saveQueue()
  }

  clear() {
    this.queue = []
    this.saveQueue()
  }

  getQueue(): QueuedOperation[] {
    return [...this.queue]
  }

  getQueueSize(): number {
    return this.queue.length
  }
}

export const offlineQueue = new OfflineQueue()

