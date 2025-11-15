// IndexedDB для кэширования данных
import dayjs from 'dayjs'

const DB_NAME = 'kimai-aggregator'
const DB_VERSION = 1

const STORES = {
  TIMESHEETS: 'timesheets',
  PROJECTS: 'projects',
  ACTIVITIES: 'activities',
  METADATA: 'metadata',
}

class Database {
  constructor() {
    this.db = null
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

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

  async getTimesheets(startDate, endDate) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TIMESHEETS], 'readonly')
      const store = transaction.objectStore(STORES.TIMESHEETS)
      const request = store.getAll()

      request.onsuccess = () => {
        const allTimesheets = request.result || []
        // Если даты не указаны, возвращаем все
        if (!startDate || !endDate) {
          resolve(allTimesheets)
          return
        }
        // Фильтруем по датам в памяти, так как begin может быть в разных форматах
        const filtered = allTimesheets.filter(entry => {
          if (!entry.begin) return false
          const beginDate = new Date(entry.begin)
          const start = startDate instanceof dayjs ? startDate.toDate() : new Date(startDate)
          const end = endDate instanceof dayjs ? endDate.toDate() : new Date(endDate)
          return beginDate >= start && beginDate <= end
        })
        resolve(filtered)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveTimesheets(timesheets) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.TIMESHEETS], 'readwrite')
      const store = transaction.objectStore(STORES.TIMESHEETS)

      timesheets.forEach(timesheet => {
        store.put(timesheet)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getProjects() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.PROJECTS], 'readonly')
      const store = transaction.objectStore(STORES.PROJECTS)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async saveProjects(projects) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.PROJECTS], 'readwrite')
      const store = transaction.objectStore(STORES.PROJECTS)

      projects.forEach(project => {
        store.put(project)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getActivities() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.ACTIVITIES], 'readonly')
      const store = transaction.objectStore(STORES.ACTIVITIES)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async saveActivities(activities) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.ACTIVITIES], 'readwrite')
      const store = transaction.objectStore(STORES.ACTIVITIES)

      activities.forEach(activity => {
        store.put(activity)
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getMetadata(key) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.METADATA], 'readonly')
      const store = transaction.objectStore(STORES.METADATA)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result?.value || null)
      request.onerror = () => reject(request.error)
    })
  }

  async saveMetadata(key, value) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.METADATA], 'readwrite')
      const store = transaction.objectStore(STORES.METADATA)
      const request = store.put({ key, value, updatedAt: new Date().toISOString() })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearAll() {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
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

