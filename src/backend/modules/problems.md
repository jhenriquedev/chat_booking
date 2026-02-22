# Code Review — src/backend/modules/

## Bugs corrigidos

### 1. `ALREADY_INACTIVE` retornava HTTP 500
**Arquivo:** `core/error/error.handler.ts`
O código de erro `ALREADY_INACTIVE` não estava mapeado no `STATUS_MAP`, caindo no fallback 500 em vez de retornar 409 (Conflict).
**Correção:** Adicionado `ALREADY_INACTIVE: 409` ao `STATUS_MAP`.

### 2. `rows[0]` sem null check em `create()`/`update()` de todos os repositories
Após `.returning()`, `rows[0]` pode ser `undefined`, mas o tipo promete `Result<XRow>`. Isso causava crash em `toProfile()` ao chamar `.toISOString()` em `undefined`.
**Correção:** Adicionado `if (!rows[0]) throw new Error(...)` antes do return em 21 locais across 10 repositories (auth, user, tenant, business, operator, services, notification, availability, schedule, appointment).

### 3. `addMinutes` gerava horários > 24:00 no schedule
**Arquivo:** `booking/schedule/4_service.ts`
A função `addMinutes` podia retornar horários como `25:30`, gerando slots com `startTime`/`endTime` inválidos no banco.
**Correção:** Adicionado cap `if (total >= 1440) return "24:00"` para sinalizar overflow, fazendo o loop de geração parar corretamente.

### 4. `releaseSlot` falha silenciosa no cancel de appointment
**Arquivo:** `booking/appointment/4_service.ts`
A função `releaseSlot` retornava `Promise<void>` e ignorava erros de `findSlotByOperatorDateAndTime` e `updateSlotStatus`. O cancel concluía com sucesso mesmo quando o slot não era liberado.
**Correção:** Substituído por transação atômica (`cancelWithSlotRelease`) que faz rollback se qualquer operação falhar.

### 5. Operator delete não revertia role do user
**Arquivo:** `operator/4_service.ts`
Ao desativar um operador via `softDelete`, o role do user permanecia como `OPERATOR` — impedindo que o user fosse reutilizado como user normal.
**Correção:** Adicionado revert de role para `USER` em transação atômica com o `softDelete`.

### 6. Operator `findByUserId` não filtrava `active`
**Arquivo:** `operator/5_repository.ts`
A query retornava operators inativos (soft-deleted), impedindo a re-criação de um operator com o mesmo userId.
**Correção:** Adicionado `eq(operators.active, true)` ao filtro da query.

### 7. TENANT com `tenantId=null` via todos os businesses no `listAll`
**Arquivo:** `business/4_service.ts`
O código fazia `tenantId = callerTenantId ?? undefined`, resultando em `undefined` se o TENANT não tivesse tenantId — o que removia o filtro e retornava todos os businesses.
**Correção:** Adicionado guard que retorna `FORBIDDEN` se `callerTenantId` for null para role TENANT.

### 8. Operações multi-step sem transação (estado inconsistente no banco)
Múltiplas operações de escrita eram feitas em queries separadas. Se uma falhasse no meio, o banco ficava em estado inconsistente.

**8a: Tenant create** (`tenant/5_repository.ts` + `tenant/4_service.ts`)
Fluxo: createUser → createTenant → updateUserRole (3 queries separadas).
**Correção:** Novo método `createTenantWithUser` que usa `db.transaction()`.

**8b: Operator create** (`operator/5_repository.ts` + `operator/4_service.ts`)
Fluxo: createOperator → updateUserRole (2 queries separadas).
**Correção:** Novo método `createWithRolePromotion` que usa `db.transaction()`.

**8c: Operator delete** (`operator/5_repository.ts` + `operator/4_service.ts`)
Fluxo: softDelete → updateUserRole (2 queries separadas).
**Correção:** Novo método `softDeleteWithRoleRevert` que usa `db.transaction()`.

**8d: Appointment create** (`booking/appointment/5_repository.ts` + `4_service.ts`)
Fluxo: insertAppointment → updateSlotStatus(BOOKED) (2 queries separadas, race condition possível).
**Correção:** Novo método `createWithSlotBooking` que usa `db.transaction()` com lock otimista (UPDATE ... WHERE status = 'AVAILABLE').

**8e: Appointment cancel** (`booking/appointment/5_repository.ts` + `4_service.ts`)
Fluxo: updateStatus(CANCELLED) → releaseSlot (2 queries separadas).
**Correção:** Novo método `cancelWithSlotRelease` que usa `db.transaction()`.

---

## Problemas pendentes (não corrigidos)

### Segurança
- **getSession() usa cast inseguro** — `c.get("jwtPayload") as SessionPayload` não valida o payload em runtime. Se o JWT contiver campos inesperados, pode causar erros silenciosos. (`session.guard.ts`)
- **ADMIN_API_KEY com mínimo de 16 chars** — Para uma chave administrativa que gerencia owners, considerar mínimo de 32+ caracteres. (`config.ts`)
- **Phone armazenado em texto plano** — O campo `phone` em users guarda o número em plaintext. O hash serve para lookup, mas o plaintext poderia ser criptografado. (`user/schema.ts`)
- **Sem rate limiting** — Nenhum middleware de rate limit. Endpoints públicos como `/api/auth/login` e `/api/businesses/slug/*` são alvos de brute force.

### Tipagem
- **businessHours e socialLinks tipados como unknown** — O model `BusinessRow` define esses campos como `unknown`, e o service faz cast inseguro com `as` no `toProfile()`. (`business/4_service.ts`)
- **biome-ignore lint/suspicious/noExplicitAny em todos os handlers** — 20+ ocorrências. O tipo de retorno `Promise<any>` é necessário pela incompatibilidade com zod-openapi.

### Timezone
- **Schedule: geração de slots sem tratamento de timezone** — `new Date(year, month-1, day)` cria datas no timezone local do servidor. Se o server rodar em timezone diferente de UTC, pode gerar slots no dia errado. (`booking/schedule/4_service.ts`)

### Performance
- **Falta de índices** — Nenhum índice explícito além de PKs e unique constraints. Queries frequentes em `appointments.operatorId`, `appointments.businessId`, `appointments.userId`, `schedule_slots.operatorId + date`, `notifications.userId` se beneficiariam de índices.
- **Subqueries aninhadas** — Filtros por tenantId em notification e appointment usam `IN (SELECT ...)` em vez de JOINs.
- **findAll sempre faz SELECT \*** — Repositories retornam todas as colunas mesmo quando só precisam de algumas.

### Duplicação de código
- **hasRole() duplicada em 7 handlers** — Cada handler redefine a mesma função helper. Deveria ser extraída para utilitário compartilhado.
- **paginationSchema duplicado em 6 módulos** — Cada módulo define seu próprio schema idêntico.
- **messageResponseSchema duplicado em 4 módulos** — Mesmo caso do pagination.
- **Enums de role duplicados** — `UserRoles` definido em múltiplos locais (user/types, session.guard.ts, literais inline).
- **Enums de notification type/channel/status** — 4 definições do mesmo dado (schema, entities, dtos, models).
- **checkOperatorAccess() duplicado** — Mesma lógica em availability, schedule, e appointment.

### Código morto
- **validateEntity() nunca chamado** — Funções `validateUser()`, `validateTenant()`, etc. existem nos entities mas não são usadas.
- **Arquivos enums.ts vazios** — Em 6 módulos, apenas contém comentário.
- **core/http/http.client.ts vazio** — Arquivo sem conteúdo.
- **booking/module.ts vazio** — Arquivo sem conteúdo.

### Melhorias sugeridas (baixa prioridade)
- Constantes mágicas (31 max dias, 480/5 duration, 1000/2000 max notes) estão hardcoded.
- Phone length 20 chars pode ser insuficiente para formatos internacionais.
- Sem audit trail para operações administrativas.
- Sem soft delete explícito no appointment (apenas status change, intencional para auditoria).
