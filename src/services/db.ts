// IndexedDB для кэширования данных
import dayjs, { Dayjs } from 'dayjs'
import { Timesheet, Project, Activity } from './kimaiApi'

const DB_NAME = 'kimai-aggregator'
const DB_VERSION = 1

const STORES = {
  TIMESHEETS: 'timesheets',
  PROJECTS: 'projects',
  ACTIVITIES: 'activities',
  METADATA: 'metadata',
} as const

class Database {
  private db: IDBDatabase | null = null

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Timesheets store
        if (!db.objectStoreNames.contains(STORES.TIMESHEETS)) {
          const timesheetsStore = db.createObjectStore(STORES.TIMESHEETS, { keyPath: 'id' })
          timesheetsStore.createIndex('begin', 'begin', { unique: false })
          timesheetsStore.createIndex('end', 'end', { unique: false })
        }

        // Projects store
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' })
          projectsStore.createIndex('name', 'name', { unique: false })
        }

        // Activities store
        if (!db.objectStoreNames.contains(STORES.ACTIVITIES)) {
          const activitiesStore = db.createObjectStore(STORES.ACTIVITIES, { keyPath: 'id' })
          activitiesStore.createIndex('name', 'name', { unique: false })
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' })
        }
      }
    })
  }

  async getTimesheets(startDate?: Dayjs | string, endDate?: Dayjs | string): Promise<Timesheet[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.TIMESHEETS], 'readonly')
      const store = transaction.objectStore(STORES.TIMESHEETS)
      const request = store.getAll()

      request.onsuccess = () => {
        const allTimesheets = (request.result || []) as Timesheet[]
        // Если даты не указаны, возвращаем все
        if (!startDate || !endDate) {
          resolve(allTimesheets)
          return
        }
        // Фильтруем по датам в памяти, так как begin может быть в разных форматах
        const filtered = allTimesheets.filter(entry => {
          if (!entry.begin) return false
          const beginDate = new Date(entry.begin)
          const start = dayjs.isDayjs(startDate) ? startDate.toDate() : new Date(startDate as string)
          const end = dayjs.isDayjs(endDate) ? endDate.toDate() : new Date(endDate as string)
          return beginDate >= start && beginDate <= end
        })
        resolve(filtered)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveTimesheets(timesheets: Timesheet[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.TIMESHEETS], 'readwrite')
      const store = transaction.objectStore(STORES.TIMESHEETS)

      timesheets.forEach(timesheet => {
        store.put(timesheet)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getProjects(): Promise<Project[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.PROJECTS], 'readonly')
      const store = transaction.objectStore(STORES.PROJECTS)
      const request = store.getAll()

      request.onsuccess = () => resolve((request.result || []) as Project[])
      request.onerror = () => reject(request.error)
    })
  }

  async saveProjects(projects: Project[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.PROJECTS], 'readwrite')
      const store = transaction.objectStore(STORES.PROJECTS)

      projects.forEach(project => {
        store.put(project)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getActivities(): Promise<Activity[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.ACTIVITIES], 'readonly')
      const store = transaction.objectStore(STORES.ACTIVITIES)
      const request = store.getAll()

      request.onsuccess = () => resolve((request.result || []) as Activity[])
      request.onerror = () => reject(request.error)
    })
  }

  async saveActivities(activities: Activity[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.ACTIVITIES], 'readwrite')
      const store = transaction.objectStore(STORES.ACTIVITIES)

      activities.forEach(activity => {
        store.put(activity)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getMetadata(key: string): Promise<unknown> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.METADATA], 'readonly')
      const store = transaction.objectStore(STORES.METADATA)
      const request = store.get(key)

      request.onsuccess = () => resolve((request.result as { value: unknown } | undefined)?.value || null)
      request.onerror = () => reject(request.error)
    })
  }

  async saveMetadata(key: string, value: unknown): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.METADATA], 'readwrite')
      const store = transaction.objectStore(STORES.METADATA)
      const request = store.put({ key, value, updatedAt: new Date().toISOString() })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction(
        [STORES.TIMESHEETS, STORES.PROJECTS, STORES.ACTIVITIES, STORES.METADATA],
        'readwrite'
      )

      transaction.objectStore(STORES.TIMESHEETS).clear()
      transaction.objectStore(STORES.PROJECTS).clear()
      transaction.objectStore(STORES.ACTIVITIES).clear()
      transaction.objectStore(STORES.METADATA).clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

export const db = new Database()

