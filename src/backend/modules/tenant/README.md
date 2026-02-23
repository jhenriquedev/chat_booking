# Tenant Module

Gestao de tenants (donos de negocio) no sistema multi-tenant.

## Endpoints

### POST /api/tenants

Cria um novo tenant a partir de um telefone. Busca ou cria o usuario automaticamente.

**Acesso:** OWNER

**Request Body:**

| Campo   | Tipo   | Obrigatorio | Descricao                                        |
|---------|--------|-------------|--------------------------------------------------|
| `phone` | string | Sim         | Telefone internacional (ex: +5511999999999)      |
| `name`  | string | Nao         | Nome do tenant (usa o telefone se nao informado) |

**Response 201:** Perfil do tenant criado (ver schema abaixo).

**Regras de negocio:**

1. Busca usuario pelo hash do telefone
2. Se usuario existe: verifica que nao e OWNER e que ainda nao e tenant
3. Se usuario nao existe: cria usuario com role TENANT
4. Se usuario existe: promove role para TENANT
5. Cria registro na tabela tenants em transacao atomica
6. Retorna tenant com dados do usuario (nome, telefone)

**Erros:**

| Status | Code             | Quando                              |
|--------|------------------|-------------------------------------|
| 403    | FORBIDDEN        | Role insuficiente ou usuario e OWNER |
| 409    | ALREADY_EXISTS   | Telefone ja vinculado a um tenant   |
| 422    | VALIDATION_ERROR | Body invalido (Zod)                 |

---

### GET /api/tenants

Lista tenants com paginacao.

**Acesso:** OWNER

**Query Params:**

| Param    | Tipo   | Default | Descricao                          |
|----------|--------|---------|------------------------------------|
| `page`   | number | 1       | Pagina atual (min 1)               |
| `limit`  | number | 20      | Itens por pagina (min 1, max 100)  |
| `active` | string | —       | Filtrar por status ("true"/"false") |

**Response 200:**

```json
{
  "data": [{ "id": "...", "userId": "...", "userName": "...", ... }],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

### GET /api/tenants/:id

Busca um tenant pelo ID.

**Acesso:** TENANT (proprio), OWNER

**Regras de negocio:**

1. TENANT so pode ver o proprio registro (compara tenantId do JWT com o :id)
2. OWNER ve qualquer tenant

**Erros:**

| Status | Code      | Quando                     |
|--------|-----------|----------------------------|
| 403    | FORBIDDEN | TENANT tentando ver outro  |
| 404    | NOT_FOUND | UUID nao encontrado        |

---

### PATCH /api/tenants/:id

Atualiza dados de um tenant.

**Acesso:** OWNER

**Request Body (todos opcionais):**

| Campo    | Tipo    | Descricao                |
|----------|---------|--------------------------|
| `active` | boolean | Ativar/desativar tenant  |

**Regras de negocio:**

1. Apenas OWNER pode alterar tenants
2. Desativar um tenant bloqueia acesso a todas as businesses associadas

---

### DELETE /api/tenants/:id

Desativa um tenant (soft delete).

**Acesso:** OWNER

**Response 200:**

| Campo     | Tipo   | Descricao                       |
|-----------|--------|---------------------------------|
| `message` | string | "Tenant desativado com sucesso" |

**Regras de negocio:**

1. Soft delete em transacao atomica: seta `active = false` no tenant, businesses e operators associados
2. Se ja estiver inativo, retorna erro `ALREADY_INACTIVE`
3. Tenant pode ser reativado via `PATCH /:id` (businesses e operators precisam ser reativados individualmente)

---

## Schema de response (TenantProfile)

| Campo       | Tipo    | Descricao                  |
|-------------|---------|----------------------------|
| `id`        | string  | UUID do tenant             |
| `userId`    | string  | UUID do usuario vinculado  |
| `userName`  | string  | Nome do usuario (JOIN)     |
| `userPhone` | string  | Telefone do usuario (JOIN) |
| `active`    | boolean | Status ativo               |
| `createdAt` | string  | ISO 8601                   |
| `updatedAt` | string  | ISO 8601                   |

## Schemas (Zod)

| Schema                          | Arquivo            | Uso                        |
|---------------------------------|--------------------|----------------------------|
| `tenantProfileSchema`           | types/dtos/dtos.ts | Response de perfil         |
| `createTenantRequestSchema`     | types/dtos/dtos.ts | Body do POST               |
| `updateTenantRequestSchema`     | types/dtos/dtos.ts | Body do PATCH              |
| `listTenantsQuerySchema`        | types/dtos/dtos.ts | Query params do GET /      |
| `paginatedTenantsResponseSchema`| types/dtos/dtos.ts | Response do GET / (paginado)|
| `messageResponseSchema`         | types/dtos/dtos.ts | Response do DELETE         |
| `errorResponseSchema`           | shared/dtos.ts     | Resposta padrao de erro    |

## Permissoes por role

| Endpoint         | USER | OPERATOR | TENANT | OWNER |
|------------------|------|----------|--------|-------|
| POST /           |      |          |        |   x   |
| GET /            |      |          |        |   x   |
| GET /:id         |      |          | proprio|   x   |
| PATCH /:id       |      |          |        |   x   |
| DELETE /:id      |      |          |        |   x   |

## Arquitetura

```
1_module.ts     — Composicao: tenantRepo + userRepo -> service -> handler -> register(app)
2_api.ts        — Definicao das 5 rotas OpenAPI
3_handler.ts    — ITenantHandler: verifica role, extrai session/params/body
4_service.ts    — ITenantService: regras de negocio, promocao de role, conversao row -> profile
5_repository.ts — ITenantRepository: queries Drizzle com JOIN em users, updateUserRole
```

## Dependencias

- **User schema**: JOIN em users para trazer nome/telefone no response, busca por phoneHash na criacao
- **Business schema**: desativa businesses associadas no soft delete
- **Operator schema**: desativa operators associados no soft delete
- **Promove role**: ao criar tenant, atualiza `users.role` para "TENANT"
