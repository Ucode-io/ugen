# AI-админки: логин + per-role меню — контекст рабочей сессии

| | |
|---|---|
| **Дата** | 2026-06-12 |
| **Репозитории** | `ugen` (фронт), `ucode_go_admin_api_gateway` (генератор/бэкенд), `ucode_go_auth_service` (auth) |
| **Ветка** | `feat/menu-permission-per-project` |

---

## 1. Цель

Главный админ генерирует AI-админ-панель промптом и задаёт через
[`custom-permissions-table.tsx`](../../src/widgets/permission-manage/ui/custom-permissions-table.tsx)
(`attributes.nav_path` + read/write/update/delete по ролям), какие пункты сайдбара видит приглашённый
end-user. Для этого сгенерированная панель должна: показывать **логин**, аутентифицировать зрителя
через `/v2/login`, тянуть его права (`nav-map`) и фильтровать сайдбар. В preview внутри ugen логин
не нужен (админ уже залогинен) — логин только для end-user'ов.

---

## 2. Что уже было в коде (на старте сессии)

- `GET /v2/custom-permission/nav-map` (token-auth) — **реализован**
  ([custom_permission.go](../../../ucode_backend/ucode_go_admin_api_gateway/api/handlers/v2/custom_permission.go)).
- Авто-резолв `admin_panel → auth_mode=login` и сохранение в `mcp_project.project_env` — **реализован**
  (`resolveGeneratedAuthMode`, [ai_messaging.go](../../../ucode_backend/ucode_go_admin_api_gateway/api/handlers/v1/ai_messaging.go)).
- Поле `nav_path` в ugen-UI — **есть**.
- Auth-четвёрка (`src/lib/auth.ts`, `src/lib/permissions.ts`, `src/components/auth/LoginPage.tsx`,
  `src/components/auth/ProtectedRoute.tsx`) — **уже лежит в шаблоне** `project_template.json`
  (коммит `6bb534a`), причём `auth.ts`/`permissions.ts` рабочие.
- Промпт + манифест уже говорят модели «эти файлы PRE-BUILT, не генерируй».

---

## 3. Найденные проблемы и решения

### 3.1 Генератор отдавал заглушку LoginPage → ИСПРАВЛЕНО (бэкенд, в staging)

**Симптом:** в сгенерированной панели `LoginPage.tsx` — заглушка (`// Simulate login`, без реального
`/v2/login`), сайдбар статичный. При сабмите логина ничего не происходило.

**Корень:** модель **игнорирует** PRE-BUILT-контракт и всё равно эмитит свой стаб-`LoginPage` по
каноническому пути; инъекция шаблона работала по принципу «добавить только если файла ещё нет» —
поэтому стаб модели побеждал рабочий шаблонный файл.

**Фикс (запушен в staging):** коммит **`072ca3e`** "Force pre-built auth runtime over model output in
generated panels" в `ucode_go_admin_api_gateway`, ветка `staging`.
- Добавлен `mergeTemplateScaffold()` +
  `forceTemplatePaths` в [template_loader.go](../../../ucode_backend/ucode_go_admin_api_gateway/api/handlers/v1/template_loader.go):
  auth-четвёрка **всегда перезаписывает** вывод модели; остальные файлы шаблона по-прежнему
  добавляются только если не сгенерены.
- Подключено во всех трёх местах инъекции (single-call, chunked app, chunked website) в
  [ai_messaging_agents.go](../../../ucode_backend/ucode_go_admin_api_gateway/api/handlers/v1/ai_messaging_agents.go).
- `go build ./...` проходит. Влияет только на **новые** генерации.

> Для уже сгенерённой панели давалась ручная замена `LoginPage.tsx` (подключить реальные
> `login()`/`fetchClientTypes()` из `auth.ts` + `initNavMapFromAuth()` из `permissions.ts`).

### 3.2 Добавление end-user'а: вариант A → ОТКАЧЕН

**Что было:** инвайт в ugen звал auth-service `POST /v2/user` (`V2CreateUser`) и падал с
`GRPC_ERROR: cant get service resource`.

**Вариант A (пробовали):** создавать end-user'а через object API `POST /v2/items/{table_slug}` в
login-таблицу, обходя auth-service. Юзер создавался, **но залогиниться им нельзя**.

**Почему вариант A неверен (откатили):** `/v2/login` аутентифицирует через `authenticateUser` →
`GetByUsername` в **auth-service `user`-таблице**
([session_service_v2.go:2837](../../../ucode_backend/ucode_go_auth_service/grpc/service/session_service_v2.go)).
Object-API создаёт строку только в **object login-таблице** → в auth-таблице юзера нет →
`/v2/login` → `user not found`. Только `V2CreateUser` пишет атомарно в **обе** таблицы (+ membership)
и хеширует пароль → именно его и надо использовать.

**Статус:** вариант A **откачен** в ugen (4 файла — `user-api.ts`, `api/users.ts`,
`invite-user-modal.tsx`, `users-management.tsx` — возвращены к исходному `/v2/user`-флоу;
изменения некоммиченные).

### 3.3 Оригинальный `cant get service resource` = mismatch project_id

`/v2/user` резолвит builder-ресурс по **ucode_project_id** (`947c9395`), а не по **mcp-id**
(`57cdb097`). Это разные id одного проекта. Доказано пробами:
- `GET /v2/user?project-id=947c9395` → **OK**;
- `GET /v2/user?project-id=57cdb097` → `cant get service resource`.

И генератор (`VITE_UCODE_PROJECT_ID`), и ugen-стор (`ucodeProjectId`) читают одно поле
`mcp_project.ucode_project_id` (генератор — `mcpProject.GetUcodeProjectId()`; ugen —
`setUcodeProjectId(projectData.ucode_project_id)` в project-client.tsx). Значит на текущей панели
`ucodeProjectId` = `947c9395`, и после отката варианта A инвайт уйдёт с правильным project_id.

---

## 4. Текущее состояние

| Что | Где | Статус |
|-----|-----|--------|
| Force-overwrite auth-четвёрки | `ucode_go_admin_api_gateway` @ `staging` `072ca3e` | ✅ закоммичен + запушен |
| Откат варианта A | `ugen` (4 файла) | ◻️ некоммичен (working tree) |
| Ручной фикс LoginPage текущей панели | пользователь вставил | ✅ применён |

---

## 5. Следующие шаги (тест end-to-end)

1. Удалить «битых» юзеров `BuxBux3@gmail.com`, `BuxBux123@gmail.com` (они только в object login-таблице).
2. Заново добавить юзера через «Invite User» (идёт `/v2/user` с project_id `947c9395`).
3. Залогиниться им в панель.

**Ожидаемо:** добавление без `GRPC_ERROR`, юзер появляется в auth-таблице → `/v2/login` находит → вход.

**Если на шаге 2 снова `cant get service resource`:** `ucodeProjectId` не резолвится — нужен либо
точечный фикс project_id в инвайте, либо backend-фикс (чтобы `/v2/user` брал проект из API-ключа,
а не из тела запроса). Для диагностики — ответ `GET /v1/mcp_project/{id}` (поля `ucode_project_id`,
`environment_id`).

---

## 6. Открытые риски

- **D1:** `GET /v2/custom-permission/nav-map` требует `role_id` + `client_type_id` из токена end-user'а.
  Если auth-service не кладёт `client_type_id` в токен — nav-map отдаёт 400, и после логина сайдбар
  пустой / спиннер. В runtime не проверено. (В ручном LoginPage есть fallback `setUcodePermissions({})`,
  чтобы не залипнуть на спиннере.)
- Старые уже опубликованные панели не получают рабочий логин, пока не перегенерированы (force-overwrite
  влияет только на новые генерации).

---

## 7. Ключевые факты архитектуры (выяснено в сессии)

- **Две системы юзеров:** платформенные/builder-юзеры (auth `user`-таблица, `/v2/user`) vs end-user'ы
  login-таблицы (object API). `/v2/login` ходит в **auth** `user`-таблицу.
- **Два project_id одного проекта:** mcp-id (роут ugen, напр. `57cdb097`) vs ucode_project_id
  (ресурс/логин, напр. `947c9395`). Admin-gateway принимает mcp-id и мапит; auth-service `/v2/user`
  требует ucode_project_id.
- **Шаблон админки** = `project_template.json` (`//go:embed`,
  [template_loader.go](../../../ucode_backend/ucode_go_admin_api_gateway/api/handlers/v1/template_loader.go)),
  21 файл, добавляется в выдачу после `mergeChunks`.
- **env-инъекция:** `VITE_API_BASE_URL`, `VITE_X_API_KEY`, `VITE_UCODE_AUTH_MODE`,
  `VITE_UCODE_PROJECT_ID` (=ucode_project_id), `VITE_UCODE_ENVIRONMENT_ID` (injectEnvFile).
- **Preview-bypass:** ugen инъектит `window.__UCODE_PREVIEW_CONTEXT = {trusted:true}` + postMessage
  `UCODE_PREVIEW_CONTEXT` (preview-html.ts / project-preview-viewer.tsx); `ProtectedRoute` это уважает.

---

## 8. Сессия 2 (2026-06-12): логин панели падает `user not found` у ВСЕХ — рассинхрон service_resource ↔ resource_env_id

**Симптом.** В сгенерированной test-page панели любой `/v2/login` → `rpc error: code = NotFound desc = user not found`.
Воспроизводилось на нескольких приглашённых юзерах (`BuxBux123@`, `Buxoy123@`).

### 8.1 Итоговая первопричина (доказана) — ЭТО БЭКЕНД, не ugen

`/v2/login` резолвит builder-ресурс через
`ServiceResource.GetSingle(environment_id=9f0dea88, project_id=947c9395, BUILDER_SERVICE)`
([session.go:38-50](../../../ucode_backend/ucode_go_admin_api_gateway/api/handlers/v2/session.go)) и кладёт результат в
`login.ResourceEnvironmentId`. Объектный логин коннектится строго к этому пулу
(`psqlpool.Get(ResourceEnvironmentId)` — [login.go:37](../../../ucode_backend/ucode_go_object_builder_service/storage/postgres/login.go))
и ищет `WHERE user_id_auth=$1 AND client_type_id=$2`
([items.go:98](../../../ucode_backend/ucode_go_object_builder_service/pkg/helper/items.go)).

**Для этого проекта `GetSingle(9f0dea88, 947c9395, BUILDER)` отдаёт ПУСТОЙ/другой пул, а реальные данные
(auth-юзеры + object login-строки) лежат в `resource_env_id = eda1deb7` (туда же ходит api-key `P-KOiv…`).**
Логин читает один ресурс, данные — в другом → `UserFound=false` → `user not found` для кого угодно.

### 8.2 Все id проекта (для бэкенд-хэндофа)

| Что | Значение |
|---|---|
| mcp-id (ugen-route / `project_id` в Bearer-токене) | `76b58e67-933b-43a6-a202-a8a03b2cafbd` |
| ucode_project_id (`VITE_UCODE_PROJECT_ID`, тело `/v2/login`) | `947c9395-8e18-4e5f-968d-be4bdf76402a` |
| environment_id (`VITE_UCODE_ENVIRONMENT_ID`, заголовок `Environment-Id`) | `9f0dea88-2920-4806-ab47-b70a039144a2` |
| **resource_env_id (пул с данными, куда пишет api-key)** | **`eda1deb7-54c6-4ac9-b065-adc29eec1801`** |
| api_key (`VITE_X_API_KEY` = `projectData.api_key`) | `P-KOiv6HYn2y1xozMlsDoFQhW17pOgDSPe` |
| company_id | `224d54b8-94b6-4102-862c-b5d95dd3e7ec` |
| test-page subdomain (origin) | `0d3e13a4-b8e6-4114-bb47-00b4c9f230bf` |
| Bearer (Administrator, scope mcp `76b58e67`, exp 1781332071 — короткоживущий) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...cHJvamVjdF9pZCI6Ijc2YjU4ZTY3...fQ.bVpjjh1iNrKGLPYKsYIUpVnTKmOYBQIkb4og_YkuMhw` |

Прочие id, всплывавшие в диагностике:
- `be7405d0-6624-4af3-b268-8643f73c7550` — `project-id`, который ugen использовал в list-запросе `/v2/items/users` (origin localhost:3000).
- `e29984a8-625b-47ff-9b70-5038120cffff` — `project_id` роли «Бухгалтер» (id-пространство кастомных ролей).

| Сущность | id | детали |
|---|---|---|
| client_type «Бухгалтер» | `4019ff31-9811-4258-ab67-d680ad16955e` | `project_id=null`, `is_system`, `table_slug="users"`, `confirm_by=UNDECIDED` |
| role «Бухгалтер» | `0648685c-b4ab-43c3-a959-c0f71a3fb952` | `project_id=e29984a8` |
| client_type «Administrator» | `9d7fb23b-590f-4b27-8e03-2ab365e623a1` | `project_id=947c9395`, `confirm_by=PHONE` |
| role «DEFAULT ADMIN» | `658fb075-92ac-48e8-8c7f-8d2424b9e810` | `project_id=947c9395` |
| auth-юзер Buxoy (= object `user_id_auth`) | `ac4f4030-ef99-443a-8ee8-48bcaa794451` | `login=Buxoy123@gmail.com`, `email=null`, ACTIVE |
| object-строка Buxoy (guid) | `5ad21f81-a3fa-495c-b2de-a4137590752c` | `user_id_auth=ac4f4030`, `client_type=4019ff31` |
| Administrator user | `eb4675e9-03d8-400e-aad7-e8c76af95480` | `login=email=Skavarodka123@gmail.com` |

### 8.3 Решающие пробы (живые запросы)

| Проба | Результат | Вывод |
|---|---|---|
| `/v2/login` env=`9f0dea88`, Buxoy, **верный** пароль | `NotFound: user not found` | — |
| `/v2/login` env=`9f0dea88`, Buxoy, **неверный** пароль | **тот же** `NotFound` (не «wrong password») | падает **до/независимо от** пароля |
| `/v2/login` env=`9f0dea88`, **Administrator** (идеальная запись) | **тот же** `NotFound` | **сломано для ВСЕХ** → не про юзера |
| `/v2/login` env=`eda1deb7` (resource_env_id) | `Unknown: cant get service resource` | `eda1deb7` — не environment_id, как env не зарегистрирован |
| auth `/v2/user` (auth-api), scope `947c9395`+`4019ff31` | `count=1` → `ac4f4030` | auth-юзер ЕСТЬ и слинкован; **дубликатов нет** |
| object `/v2/items/users` (api-key `P-KOiv`) | Buxoy + Administrator | данные в ресурсе ключа = `eda1deb7` |
| object `/v2/items/client_type` (api-key) | Бухгалтер/Воспитатель/Заведующая (`project=null`) + Administrator (`947c9395`) — вместе | один общий ресурс данных |
| Bearer read `/v2/items` project `947c9395` | `PermissionDenied` | токен скоупнут на mcp `76b58e67` |

### 8.4 Что НЕ является причиной (опровергнуто пробами)

- **НЕ object-only / битая связка:** auth-юзер `ac4f4030` существует, его `id` = `user_id_auth` object-строки.
- **НЕ дубликат auth-юзера:** в проекте ровно один Buxoy, `email=null`.
- **НЕ устаревшая панель:** `VITE_UCODE_PROJECT_ID`/`VITE_UCODE_ENVIRONMENT_ID`/`VITE_X_API_KEY` **точно совпадают** с текущим `mcp_project`. ⇒ **перегенерация НЕ поможет** (генератор зальёт те же значения — [ai_messaging_agents.go:1040](../../../ucode_backend/ucode_go_admin_api_gateway/api/handlers/v1/ai_messaging_agents.go) `injectEnvFile`).
- **НЕ среда-split на уровне юзера и НЕ Вариант A:** дублировать login-строку бесполезно — у Администратора запись идеальная, и он всё равно не входит.

### 8.5 Фикс (бэкенд-команде) — ❌ ОТМЕНЁН, см. §9: гипотеза опровергнута, выполнять НЕ надо

Привести builder service-resource для **env `9f0dea88` + project `947c9395`** так, чтобы его `resource_environment_id`
указывал на пул `eda1deb7` (где реально данные = то, что отдаёт api-key `P-KOiv`). Либо:
1. поправить запись `service_resource` (env `9f0dea88` + project `947c9395` + `BUILDER_SERVICE` → `eda1deb7`); **или**
2. если `9f0dea88` — отдельная (test/preview) среда с собственным пустым пулом, а данные в `eda1deb7`, то решить
   единый источник: либо логин должен ходить в env, чей builder-ресурс = `eda1deb7`, либо ugen должен писать юзеров в
   пул env `9f0dea88`. Сейчас «куда пишем» (`P-KOiv→eda1deb7`) и «откуда логинимся» (`9f0dea88→другой пул`) разъехались.

**Для диагностики на бэкенде:** лог `!!!V2Login--->` в auth-сервисе + фактическое значение `resource_environment_id`,
которое подставляется в `psqlpool.Get(...)` — оно покажет «чужой» пул вместо `eda1deb7`.

---

## 9. Сессия 3 (2026-06-12): НАСТОЯЩАЯ первопричина — панель не шлёт `"type":"default"` в /v2/login. ИСПРАВЛЕНО

### 9.1 Гипотеза §8 опровергнута прямой инспекцией БД (доступ суперюзером к staging PG 95.217.155.57:30034)

Проверены **все** звенья цепочки (947c9395 + 9f0dea88) — данные НЕ разъехались:

| Звено | Факт |
|---|---|
| `service_resource` (company_service DB) | 7 строк для проекта `947c9395`, env `9f0dea88`, BUILDER → resource `42feb47b` (созданы 2026-06-12 05:01) |
| `resource_environment` | `(42feb47b, 9f0dea88)` → **`e29984a8`** → БД `kindercrm_947c9395..._p_postgres_svcs` |
| Пул kindercrm (`e29984a8`) | **ВСЕ данные панели ЗДЕСЬ**: 66 таблиц, children=5, employees=6, groups=5, client_type=4 (Бухгалтер/Воспитатель/Заведующая/Administrator), users=2 (Buxoy + Administrator, оба корректно слинкованы `user_id_auth`/`client_type_id`), custom_permission=1 |
| Пул `eda1deb7` (skavarodka) | принадлежит ДРУГОМУ проекту `76b58e67` (**NexaERP**, 01.04) — доменных таблиц там НЕТ; гипотеза §8 «данные в eda1deb7» неверна |
| api-key `P-KOiv…` (auth DB `api_keys`) | project `947c9395`, env `9f0dea88` — тот же пул, что и логин |
| auth-юзеры + `user_project` | Buxoy и Administrator: записи с project `947c9395`, env `9f0dea88`, ACTIVE — идеальные |

⚠️ `76b58e67` — НЕ «mcp-id того же проекта», а отдельный старый проект NexaERP. Применение фикса §8.5
(перенаправить BUILDER-ресурс на `eda1deb7`) направило бы логин в ЧУЖОЙ пустой пул и сломало бы всё.

### 9.2 Настоящая первопричина (доказана кодом и live-пробами)

`V2LoginRequest.Type` — строка из JSON-поля `"type"`. В `authenticateUser`
([session_service_v2.go:2843](../../../ucode_backend/ucode_go_auth_service/grpc/service/session_service_v2.go))
`switch req.GetType()` имеет case'ы только для `"default"`/phone/email/google и **не имеет default-ветки**:
при пустом `type` возвращается `nil, nil` → V2Login:823 видит `user == nil` → `errUserNotFound` —
**до проверки пароля, для любого юзера**. Именно это объясняет «тот же NotFound при неверном пароле» из §8.3.

Шаблонный `auth.ts` (project_template.json) слал `{username, password, client_type, project_id}` — **без `type`**.

Live-пробы (staging admin-api.ucode.run, Buxoy):
- без `type` → `NotFound: user not found` (баг воспроизведён);
- `"type":"default"` + неверный пароль → `crypto/bcrypt: hashedPassword is not the hash…` (юзер НАЙДЕН);
- E2E с временным юзером (известный пароль, созданы auth+user_project+object-строки, после теста удалены):
  `"type":"default"` → **200, access/refresh-токены**; в токене есть `client_type_id` и `role_id` →
  `GET /v2/custom-permission/nav-map` → **OK** `{"/children":{read:false,…}}` — **риск D1 (§6) снят**.

Попутная находка: юзер с `email/phone/tin/google_id = NULL` валит `GetByUsername` сканом
(`cannot scan NULL into *string`); `V2CreateUser` пишет `''`, так что штатный инвайт-флоу не задет.

### 9.3 Применённые фиксы (working tree, не закоммичены)

1. **Генератор** `ucode_go_admin_api_gateway` @ `feat/menu-permission-per-project`:
   в `project_template.json` → `src/lib/auth.ts` → `login()` добавлено `type: 'default'` в тело `/v2/login`.
   Действует на новые генерации (auth-четвёрка force-overwrite, §3.1).
2. **Auth-service** `ucode_go_auth_service` @ `master`:
   `authenticateUser` — `case config.Default, "":` (пустой `type` = обычный логин).
   После деплоя чинит **уже опубликованные** панели (включая текущую) без перегенерации.

`go build ./...` — обе сборки OK. Достаточно задеплоить **любой один** из двух фиксов, чтобы текущая
панель залогинилась; (1) нужен для новых генераций, (2) страхует все старые.

### 9.4 Тест после деплоя

Логин в панель Buxoy123@gmail.com (client_type Бухгалтер) → токен → сайдбар фильтруется по nav-map
(сейчас у Бухгалтера `/children: read=false` — пункт должен скрыться).
