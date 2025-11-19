// IndexedDB для кэширования данных
import dayjs, { Dayjs } from 'dayjs'
import { Timesheet, Project, Activity } from './kimaiApi'

const DB_NAME = 'kimai-aggregator'
const DB_VERSION = 2

const STORES = {
  TIMESHEETS: 'timesheets',
  PROJECTS: 'projects',
  ACTIVITIES: 'activities',
  METADATA: 'metadata',
  PROCESSED_WEEKS: 'processedWeeks',
} as const

type StoredWeek = {
  weekKey?: string
  startDate?: string | Dayjs
  endDate?: string | Dayjs
  entries?: StoredEntry[]
  [key: string]: unknown
}

type StoredEntry = {
  date?: string | Dayjs
  begin?: string
  end?: string
  project?: unknown
  activity?: unknown
  [key: string]: unknown
}

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
        const oldVersion = event.oldVersion || 0

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

        // Processed weeks store (for caching processed week data) - добавляется в версии 2
        if (oldVersion < 2 && !db.objectStoreNames.contains(STORES.PROCESSED_WEEKS)) {
          const weeksStore = db.createObjectStore(STORES.PROCESSED_WEEKS, { keyPath: 'weekKey' })
          weeksStore.createIndex('year', 'year', { unique: false })
          weeksStore.createIndex('week', 'week', { unique: false })
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

      // IndexedDB автоматически обрабатывает batch операции
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

      // IndexedDB автоматически обрабатывает batch операции
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

      // IndexedDB автоматически обрабатывает batch операции
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

  async saveProcessedWeeks(weeks: unknown[]): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.PROCESSED_WEEKS], 'readwrite')
      const store = transaction.objectStore(STORES.PROCESSED_WEEKS)

      // Очищаем старые данные перед сохранением новых
      const clearRequest = store.clear()
      clearRequest.onsuccess = () => {
        // IndexedDB автоматически обрабатывает batch операции
        // Сериализуем Dayjs объекты в строки для сохранения
        const normalizedWeeks = weeks as StoredWeek[]
        normalizedWeeks.forEach((week) => {
          if (week.weekKey) {
            const serializedWeek = {
              ...week,
              // Сериализуем Dayjs в ISO строки
              startDate: week.startDate ? (dayjs.isDayjs(week.startDate) ? week.startDate.toISOString() : week.startDate) : undefined,
              endDate: week.endDate ? (dayjs.isDayjs(week.endDate) ? week.endDate.toISOString() : week.endDate) : undefined,
              // Сериализуем Dayjs в entries
              entries: (week.entries as StoredEntry[] | undefined)?.map((entry) => ({
                ...entry,
                date: entry.date ? (dayjs.isDayjs(entry.date) ? entry.date.toISOString() : entry.date) : undefined,
              })) || [],
              updatedAt: new Date().toISOString(),
            }
            store.put(serializedWeek)
          }
        })

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
      clearRequest.onerror = () => reject(clearRequest.error)
    })
  }

  async getProcessedWeeks(): Promise<unknown[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORES.PROCESSED_WEEKS], 'readonly')
      const store = transaction.objectStore(STORES.PROCESSED_WEEKS)
      const request = store.getAll()

      request.onsuccess = () => {
        const weeks = (request.result || []) as StoredWeek[]
        // Восстанавливаем объекты Dayjs из строк и удаляем служебные поля
        const restoredWeeks = weeks.map((w) => {
          const { updatedAt, startDate, endDate, entries, ...week } = w
          return {
            ...week,
            // Преобразуем строки обратно в объекты Dayjs
            startDate: startDate ? (typeof startDate === 'string' ? dayjs(startDate) : startDate) : undefined,
            endDate: endDate ? (typeof endDate === 'string' ? dayjs(endDate) : endDate) : undefined,
            // Также нужно восстановить Dayjs в entries и все остальные поля
            entries: (entries as StoredEntry[] | undefined)?.map((entry) => ({
              ...entry,
              date: entry.date ? (typeof entry.date === 'string' ? dayjs(entry.date) : entry.date) : undefined,
              // Убеждаемся, что project и activity правильно восстановлены
              project: entry.project,
              activity: entry.activity,
            })) || [],
          }
        })
        resolve(restoredWeeks)
      }
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
        [STORES.TIMESHEETS, STORES.PROJECTS, STORES.ACTIVITIES, STORES.METADATA, STORES.PROCESSED_WEEKS],
        'readwrite'
      )

      transaction.objectStore(STORES.TIMESHEETS).clear()
      transaction.objectStore(STORES.PROJECTS).clear()
      transaction.objectStore(STORES.ACTIVITIES).clear()
      transaction.objectStore(STORES.METADATA).clear()
      transaction.objectStore(STORES.PROCESSED_WEEKS).clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

export const db = new Database()
