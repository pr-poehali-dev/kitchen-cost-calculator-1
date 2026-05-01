# CLAUDE.md — Инструкция по проекту

## Что это за проект

**Мебельная CRM** для компании ООО «Интерьерные решения» (г. Саратов).
Система управления заказами на изготовление корпусной мебели (кухни, шкафы, гардеробные).

Основные задачи системы:
- Вести клиентскую базу с воронкой продаж
- Считать стоимость заказов (калькулятор материалов + услуг + наценок)
- Генерировать договоры и документы (HTML для печати, DOCX для скачивания)
- Управлять базой материалов, поставщиков, производителей
- Учитывать расходы и считать маржинальность

---

## Стек и архитектура

```
Frontend:  React + TypeScript + Vite + Tailwind CSS + shadcn/ui
Backend:   Python 3.11 Cloud Functions
Database:  PostgreSQL (psycopg2, Simple Query Protocol только)
Storage:   S3 (boto3, bucket.poehali.dev)
Auth:      JWT токены (localStorage: kuhni_pro_token)
```

### Слои приложения
```
Frontend (/src)  →  HTTP  →  Backend (/backend)  →  PostgreSQL / S3
```
- SQL никогда не пишется во фронтенде
- Секреты никогда не попадают во фронтенд
- Все запросы к бэкенду через `API_URLS` из `src/config/api.ts`

---

## Навигация (разделы)

```typescript
type Section = 'home' | 'clients' | 'calc' | 'blocks' | 'services' | 'base' | 'expenses' | 'settings' | 'users'
```

| Section | Компонент | Описание |
|---------|-----------|----------|
| `home` | `HomePage` | Дашборд: KPI, воронка, доставки, напоминания |
| `clients` | `ClientsPage` | CRM: список клиентов, карточки |
| `calc` | `CalcPage` | Калькулятор стоимости заказа |
| `blocks` | `BlocksPage` | Библиотека сохранённых блоков |
| `services` | `ServicesPage` | Блоки услуг (монтаж, доставка) |
| `base` | `BasePage` | База: материалы, услуги, поставщики, производители |
| `expenses` | `ExpensesPage` | Расходы и наценки |
| `settings` | `SettingsPage` | Настройки: компания, акцент, бэкап |
| `users` | `AdminPanel` | Только для role === 'admin' |

---

## API эндпоинты

```typescript
// src/config/api.ts
export const API_URLS = {
  clients:  'https://functions.poehali.dev/48534318-9b07-4f30-9a75-98efb43248e7',
  auth:     'https://functions.poehali.dev/b1d7d64b-25fc-4b8e-96d8-087b2255d942',
  admin:    'https://functions.poehali.dev/e48c5260-c45a-48c2-be96-d451e6422c7b',
  appState: 'https://functions.poehali.dev/a257bd1a-a3a1-40e0-95b5-bbd561a371e4',
}
```

### Clients API (GET/POST ?action=...)
- `list` — список клиентов (пагинация, фильтры, поиск)
- `get&id=UUID` — один клиент + фото + история
- `create` — создать клиента
- `update&id=UUID` — обновить клиента
- `status&id=UUID` — сменить статус
- `upload_photo&id=UUID` — загрузить фото (base64)
- `delete_photo&photo_id=UUID` — удалить фото
- `delete&id=UUID` — удалить клиента
- `generate_doc` — сгенерировать HTML документ
- `generate_docx` — сгенерировать DOCX документ

### App State API (без action)
- `GET` — загрузить state текущего пользователя
- `POST {state: ...}` — сохранить state

### Auth API
- `POST {action: 'login', login, password}` — авторизация → JWT токен
- `POST {action: 'logout'}` — выход

---

## Аутентификация

```typescript
// Токен хранится в:
localStorage.getItem('kuhni_pro_token')

// Заголовок в запросах:
Authorization: `Bearer ${token}`

// Бэкенд читает из:
headers.get('X-Authorization') || headers.get('Authorization')
// (платформа remaps Authorization → X-Authorization)

// JWT payload содержит:
{ sub: userId, login: string, role: 'admin'|'user', user_id: number }
```

---

## Хранилище (Store)

Главное хранилище: `src/store/useStore.ts` — `useSyncExternalStore`

### Слайсы
```
src/store/slices/
  catalogSlice.ts      — материалы, производители, поставщики
  projectSlice.ts      — проекты (расчёты), активный проект
  servicesSlice.ts     — блоки услуг
  expensesSlice.ts     — расходы и наценки
  settingsSlice.ts     — настройки приложения
  savedBlocksSlice.ts  — библиотека блоков
  templatesSlice.ts    — шаблоны расчётов
```

### Ключевые функции стора
```typescript
useStore()               // хук — читать state и вызывать actions
loadStateFromDb(token)   // загрузить state из БД при логине
saveStateToDb()          // сохранить state в БД (авто через debounce)
forceSetGlobalState(s)   // перезаписать весь state (при загрузке из БД)
setStoreToken(token)     // установить токен для авто-сохранения
```

### Структура AppState
```typescript
interface AppState {
  manufacturers: Manufacturer[]
  vendors: Vendor[]
  materials: Material[]
  services: Service[]
  expenseGroups: ExpenseGroup[]
  expenses: ExpenseItem[]
  settings: Settings
  projects: Project[]
  activeProjectId: string | null
  templates: CalcTemplate[]
  savedBlocks: SavedBlock[]
  savedAt?: number
}
```

### Settings внутри state
```typescript
interface Settings {
  currency: string           // '₽' по умолчанию
  markupMaterial: number     // % наценки на материалы
  markupService: number      // % наценки на услуги
  units: Unit[]              // ед. измерения
  materialTypes: MaterialType[]
  materialCategories: MaterialCategory[]
  company?: CompanyInfo
}
```

---

## База данных

### Таблицы
```sql
users              — id, login, password_hash, role, status, plan, created_at, last_login
subscriptions      — пользовательские подписки
app_state          — id, user_id (UNIQUE), state (JSONB), updated_at
clients            — все поля клиента (см. ниже)
client_photos      — id, client_id, s3_key, url, created_at
client_history     — id, client_id, user_id, user_name, action, description, old_value, new_value, created_at
```

### Таблица clients — все поля
```sql
id UUID PRIMARY KEY
user_id INTEGER          -- владелец записи
last_name TEXT
first_name TEXT
middle_name TEXT
phone TEXT
email TEXT
messenger TEXT           -- 'WhatsApp'|'Telegram'|'Viber'|'Звонок'
delivery_city TEXT
delivery_street TEXT
delivery_house TEXT
delivery_apartment TEXT
delivery_floor TEXT
delivery_entrance TEXT
delivery_elevator BOOLEAN
delivery_note TEXT
designer TEXT
measurer TEXT
status TEXT              -- см. статусы ниже
contract_number TEXT
contract_date DATE
total_amount NUMERIC
prepaid_amount NUMERIC
balance_due NUMERIC
payment_type TEXT
custom_payment_scheme TEXT
production_days INTEGER
delivery_date DATE
manager_name TEXT
passport_series TEXT
passport_number TEXT
passport_issued_by TEXT
passport_issued_date DATE
passport_code TEXT
birth_date DATE
comment TEXT
reminder_date DATE
reminder_note TEXT
delivery_cost NUMERIC
assembly_cost NUMERIC
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Статусы клиента
```
new → measure → agreement → production → delivery → done | cancelled
```
На русском: Новый → Замер → Согласование → Производство → Доставка → Закрыт | Отказ

### Миграции
```
db_migrations/
  V0001__create_users_and_subscriptions.sql
  V0002__set_leonid_admin.sql
  V0003__create_app_state.sql
  V0004__create_clients_system.sql
  V0005__add_delivery_assembly_cost.sql
  V0006__add_manager_name_to_clients.sql
  V0007__add_user_id_to_app_state.sql
  V0008__app_state_user_id_unique_constraint.sql
  V0009__assign_orphan_state_to_admin.sql
```
Следующая миграция: **V0010__...**

---

## Документы (генерация)

Функция `_build_contract_html(c, doc_type)` в `backend/clients/index.py`

### Типы HTML-документов (doc_type)
```
contract        — договор бытового подряда
tech            — технический проект
delivery        — договор на доставку
act             — акт выполненных работ
act_assembly    — акт сборки
measure         — бланк замера
delivery_calc   — расчёт стоимости доставки
assembly_calc   — расчёт стоимости сборки
assembly_extra  — доп. работы при сборке
tech_spec       — спецификация оборудования
```

### Типы DOCX-документов
```
contract        — основной договор
assembly        — договор на услуги сборки
rules           — правила эксплуатации
act_delivery    — акт приёмки доставки
act_assembly    — акт выполнения сборки
```

### CSS документов (`_doc_style`)
- Шрифт: PT Serif (Google Fonts)
- Размер страницы: A4 (210×297мм)
- Поля: 20мм сверху/справа/снизу, 25мм слева
- Класс `.page` — контейнер страницы с тенью
- `@media print` — убирает тень, фон

---

## Структура Frontend

```
src/
├── App.tsx                    — точка входа, роутинг по Section
├── config/api.ts              — API_URLS
├── auth/
│   ├── useAuth.ts             — хук авторизации
│   ├── LoginPage.tsx
│   └── AdminPanel.tsx
├── clients/                   — CRM модуль
│   ├── ClientsPage.tsx        — список клиентов
│   ├── ClientCard.tsx         — карточка клиента (6 вкладок)
│   ├── tabs/
│   │   ├── TabOverview.tsx    — статус, даты, напоминание
│   │   ├── TabData.tsx        — личные данные, паспорт, адрес
│   │   ├── TabContract.tsx    — договор, суммы, оплата
│   │   ├── TabHistory.tsx     — история действий
│   │   └── shared.tsx
│   ├── documents/
│   │   ├── DocCard.tsx
│   │   └── DocCardWithStatus.tsx
│   └── list/
│       ├── ClientListItems.tsx
│       ├── ClientsFilters.tsx
│       ├── ClientsPagination.tsx
│       └── ClientsToolbar.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── CalcPage.tsx           — оболочка
│   ├── BlocksPage.tsx
│   ├── BasePage.tsx           — оболочка
│   ├── ServicesPage.tsx
│   ├── ExpensesPage.tsx
│   ├── SettingsPage.tsx
│   ├── calc/                  — калькулятор
│   │   ├── CalcPage.tsx       — основная логика
│   │   ├── CalcBlock.tsx
│   │   ├── CalcRow.tsx
│   │   ├── CalcSummary.tsx
│   │   ├── ClientViewPanel.tsx — настройки PDF для клиента
│   │   ├── TemplatesPanel.tsx
│   │   ├── ComparePanel.tsx
│   │   └── exportPdf.ts
│   ├── base/                  — база материалов
│   │   ├── MaterialsTab.tsx
│   │   ├── ServicesTab.tsx
│   │   ├── VendorsTab.tsx
│   │   ├── ManufacturersTab.tsx
│   │   └── materials/         — импорт прайсов (TMF, СКАТ, Boyard, Excel)
│   ├── expenses/
│   ├── settings/
│   └── home/
├── store/
│   ├── useStore.ts            — главный хук
│   ├── types.ts               — ВСЕ TypeScript типы
│   ├── stateCore.ts           — глобальный state, listeners
│   ├── initialState.ts        — начальный state
│   └── slices/                — 7 слайсов
├── components/
│   ├── Layout.tsx             — навигация + sidebar
│   ├── GlobalSearch.tsx       — глобальный поиск (Cmd+K)
│   └── ui/                    — shadcn/ui компоненты
│       └── icon.tsx           — ВСЕГДА использовать этот враппер для иконок
├── hooks/
│   ├── usePushNotifications.ts
│   └── use-mobile.tsx
└── lib/utils.ts
```

---

## Дизайн и стили

### Акцентный цвет
Меняется через `data-accent` на `document.documentElement`:
```
gold    (hsl 38,60%,58%)   — дефолт
blue    (hsl 210,80%,60%)
emerald (hsl 160,60%,45%)
violet  (hsl 260,60%,65%)
rose    (hsl 340,70%,60%)
orange  (hsl 25,90%,55%)
```
Сохраняется в `localStorage.getItem('kuhni_pro_accent')`

### Иконки — ОБЯЗАТЕЛЬНО через враппер
```tsx
// ПРАВИЛЬНО:
import Icon from '@/components/ui/icon'
<Icon name="Home" size={24} />
<Icon name="CustomIcon" fallback="CircleAlert" />

// НЕПРАВИЛЬНО:
import { Home } from 'lucide-react'  // так не делать
```

### Компоненты UI
Все компоненты shadcn/ui в `src/components/ui/` — использовать их, не изобретать новые.

### CSS переменные
Определены в `src/index.css` — использовать CSS переменные, а не захардкоженные цвета.

---

## Backend — правила написания

### Структура функции
```python
# /backend/function-name/index.py
def handler(event: dict, context) -> dict:
    """Описание на русском языке"""
    ...
```

### Обязательный порядок в handler
1. CORS headers
2. OPTIONS preflight
3. Верификация токена
4. Логика

### CORS шаблон
```python
if event.get('httpMethod') == 'OPTIONS':
    return {'statusCode': 200, 'headers': {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
        'Access-Control-Max-Age': '86400'
    }, 'body': ''}
```

### База данных (psycopg2)
```python
import psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
# ТОЛЬКО Simple Query Protocol — без параметров %s через execute если Extended не нужен
# Для INSERT/UPDATE использовать %s placeholders через cursor.execute(sql, params)
```

### S3
```python
s3 = boto3.client('s3',
    endpoint_url='https://bucket.poehali.dev',  # только этот endpoint
    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
)
s3.put_object(Bucket='files', Key='...', Body=data)
cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/..."
```

### После изменений бэкенда — ВСЕГДА вызвать sync_backend

---

## Ключевые бизнес-правила

### Расчёт цены с наценкой
```typescript
// Из useStore:
calcPriceWithMarkup(basePrice, 'materials' | 'services')
// Ищет активные expenses типа 'markup' с applyTo === applyTo
// Если нет — берёт settings.markupMaterial / markupService
```

### Типы расходов (ExpenseItem.type)
- `markup` — наценка на материалы/услуги (applyTo: materials|services|total|block)
- `percent` — процент от базы (applyTo: total)
- `fixed` — фиксированная сумма

### Форматирование чисел
```typescript
// Разделитель тысяч — пробел (не запятая):
// 150 000 ₽ — правильно
// 150,000 ₽ — неправильно
```

### Договора
- Номер договора: `{contractPrefix}{year}-{number}` (например К-2026-001)
- Компания-подрядчик: ООО «Интерьерные решения»
- Город: г. Саратов

---

## Частые ошибки — не допускать

1. **Иконки напрямую** из lucide-react — только через `<Icon name="..." />`
2. **SQL во фронтенде** — никогда, только через HTTP к бэкенду
3. **Секреты во фронтенде** — никогда, только в os.environ бэкенда
4. **Забыть sync_backend** после изменений Python-функций
5. **Забыть миграцию** при изменении схемы БД
6. **Одинаковый цвет** текста и фона кнопки — проверять tailwind.config.ts
7. **Extended Query Protocol** в psycopg2 — только Simple Query
8. **Импортировать** компоненты не через `@/` алиас
9. **Хардкодить цвета** вместо CSS переменных
10. **Не добавить** `Access-Control-Allow-Origin` в ответ бэкенда

---

## Файлы которые нельзя трогать без крайней необходимости

- `src/store/types.ts` — изменения ломают весь стор
- `src/store/stateCore.ts` — ядро реактивности
- `backend/auth/index.py` — авторизация
- `db_migrations/` — только добавлять, не редактировать существующие
- `src/config/api.ts` — URL берутся из func2url.json автоматически
