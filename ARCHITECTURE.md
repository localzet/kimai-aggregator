# Архитектура проекта Kimai Aggregator

## 📁 Структура проекта

Проект организован по принципам **Feature-Sliced Design (FSD)** с адаптацией для React приложения.

```
src/
├── app/                    # Инициализация приложения
│   ├── providers/         # React провайдеры (Mantine, Notifications и т.д.)
│   │   ├── AppProviders.tsx
│   │   └── index.ts
│   └── router/            # Роутинг и навигация
│       ├── guards/        # Защита маршрутов (AuthGuard, SetupGuard)
│       ├── components/    # Компоненты роутера (InitialRedirect, ErrorPage)
│       ├── router.tsx     # Конфигурация маршрутов
│       └── index.ts
│
├── features/              # Бизнес-фичи приложения (изолированы)
│   ├── auth/             # Авторизация
│   ├── dashboard/        # Дашборд
│   ├── timesheet/        # Таблица времени
│   ├── financial/        # Финансы
│   ├── settings/         # Настройки
│   └── ...               # Другие фичи
│
├── widgets/              # Композитные UI компоненты
│   ├── header/           # Виджеты хедера
│   │   ├── HeaderStatusIndicator.tsx
│   │   ├── NotificationsButton.tsx
│   │   ├── LogoutButton.tsx
│   │   └── index.ts
│   ├── sidebar/          # Виджеты сайдбара
│   │   ├── NavigationMenu.tsx
│   │   └── index.ts
│   └── layout/           # Layout компоненты
│       ├── MainLayout.tsx
│       ├── types.ts
│       └── index.ts
│
├── entities/              # Доменные сущности
│   ├── timesheet/        # Сущность "Таблица времени"
│   ├── financial/        # Сущность "Финансы"
│   └── settings/         # Сущность "Настройки"
│
├── shared/                # Переиспользуемый код
│   ├── api/              # API клиенты
│   │   ├── backendApi.ts
│   │   ├── kimaiApi.ts
│   │   ├── websocket.ts
│   │   └── index.ts
│   ├── hooks/            # Переиспользуемые хуки
│   │   ├── useSettings.ts
│   │   ├── useDashboardData.ts
│   │   └── index.ts
│   ├── ui/               # Базовые UI компоненты
│   │   ├── RouterLink.tsx
│   │   ├── page.tsx
│   │   ├── loading-screen.tsx
│   │   ├── table/
│   │   └── metrics/
│   ├── utils/            # Утилиты
│   ├── types/             # Типы
│   └── constants/         # Константы
│
├── pages/                 # Страницы (композиция features и widgets)
│   ├── AuthPage.tsx
│   ├── DashboardPage.tsx
│   ├── SettingsPage.tsx
│   └── ...
│
├── theme/                 # Тема и стили
│   ├── theme.ts
│   └── overrides/
│
├── App.tsx                # Главный компонент приложения
├── main.tsx               # Entry point
└── global.css             # Глобальные стили
```

## 🏗️ Принципы архитектуры

### 1. **Feature-Sliced Design (FSD)**

- **app/** - Инициализация приложения, провайдеры, роутинг
- **features/** - Бизнес-логика по фичам (изолированы друг от друга)
- **widgets/** - Композитные UI компоненты
- **entities/** - Доменные сущности
- **shared/** - Переиспользуемый код (не зависит от фич)

### 2. **Правила импортов**

- ✅ `shared` может импортировать только из `shared`
- ✅ `entities` может импортировать только из `shared`
- ✅ `features` может импортировать из `shared`, `entities`, `widgets`
- ✅ `widgets` может импортировать из `shared`, `entities`
- ✅ `pages` может импортировать из всех слоев
- ✅ `app` может импортировать из всех слоев

### 3. **Разделение ответственности**

- **app/** - Инициализация, конфигурация, провайдеры
- **features/** - Бизнес-логика конкретных фич
- **widgets/** - Композитные компоненты, используемые в нескольких местах
- **entities/** - Доменные модели и бизнес-логика сущностей
- **shared/** - Переиспользуемый код без бизнес-логики

## 📦 Структура слоев

### App Layer (`app/`)

Инициализация приложения, провайдеры, роутинг.

**Компоненты:**
- `AppProviders` - Объединение всех провайдеров
- `Router` - Конфигурация маршрутов
- `AuthGuard` - Защита маршрутов от неавторизованных пользователей
- `SetupGuard` - Защита маршрутов, требующих настройки

### Features Layer (`features/`)

Бизнес-фичи приложения. Каждая фича изолирована и содержит:
- Компоненты фичи
- Хуки фичи (если специфичны для фичи)
- Типы фичи

**Пример структуры фичи:**
```
features/dashboard/
├── components/
│   ├── DashboardMetrics.tsx
│   └── WeekProgress.tsx
├── hooks/
│   └── useDashboardData.ts (если специфичен для фичи)
└── index.ts
```

### Widgets Layer (`widgets/`)

Композитные UI компоненты, используемые в нескольких местах.

**Примеры:**
- `HeaderStatusIndicator` - Индикатор статуса в хедере
- `NavigationMenu` - Меню навигации
- `MainLayout` - Главный layout приложения

### Entities Layer (`entities/`)

Доменные сущности с бизнес-логикой.

**Примеры:**
- `timesheet` - Сущность "Таблица времени"
- `financial` - Сущность "Финансы"
- `settings` - Сущность "Настройки"

### Shared Layer (`shared/`)

Переиспользуемый код без бизнес-логики.

**Подкатегории:**
- `api/` - API клиенты
- `hooks/` - Переиспользуемые хуки
- `ui/` - Базовые UI компоненты
- `utils/` - Утилиты
- `types/` - Типы
- `constants/` - Константы

## 🔄 Структура

Проект использует следующую структуру:

- `components/` → Компоненты страниц (будут перемещены в `features/*/components/`)
- `widgets/layout/MainLayout.tsx` → Главный layout
- `app/router/router.tsx` → Конфигурация роутера
- `app/router/guards/` → Защита маршрутов

## 📝 Best Practices

1. **Именование файлов:**
   - Компоненты: `PascalCase.tsx`
   - Хуки: `useCamelCase.ts`
   - Утилиты: `camelCase.ts`
   - Типы: `types.ts` или `index.ts`

2. **Экспорты:**
   - Всегда используйте `index.ts` для публичных экспортов
   - Не экспортируйте внутренние детали реализации

3. **Импорты:**
   - Используйте path alias `@/` для абсолютных путей
   - Группируйте импорты: внешние → внутренние → относительные

4. **Документация:**
   - Добавляйте JSDoc комментарии для публичных API
   - Описывайте назначение компонентов и функций

## 🚀 Разработка

При добавлении новой фичи:

1. Создайте папку в `features/`
2. Добавьте компоненты в `features/*/components/`
3. Добавьте специфичные хуки в `features/*/hooks/`
4. Экспортируйте через `features/*/index.ts`
5. Используйте в страницах через `pages/`

При создании переиспользуемого компонента:

1. Определите, где он должен быть:
   - Если используется в одной фиче → `features/*/components/`
   - Если используется в нескольких местах → `widgets/`
   - Если базовый UI компонент → `shared/ui/`

