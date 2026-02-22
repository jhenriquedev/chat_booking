# Tenant Module

Gestao de tenants (donos de negocio) no sistema multi-tenant.

## Endpoints

### POST /api/tenants

Cria um novo tenant vinculando um usuario existente.

**Acesso:** OWNER

**Request Body:**

| Campo    | Tipo   | Obrigatorio | Descricao                |
|----------|--------|-------------|--------------------------|
| `userId` | string | Sim         | UUID do usuario a vincular |

**Response 201:** Perfil do tenant criado (ver schema abaixo).

**Regras de negocio:**

1. Verifica se o usuario existe
2. Verifica se o usuario ja nao e tenant (userId unique)
3. Cria o registro na tabela tenants
4. Promove o role do usuario para TENANT automaticamente
5. Retorna tenant com dados do usuario (nome, telefone)

**Erros:**

| Status | Code           | Quando                     |
|--------|----------------|----------------------------|
| 403    | FORBIDDEN      | Role insuficiente          |
| 404    | NOT_FOUND      | Usuario nao encontrado     |
| 409    | ALREADY_EXISTS | Usuario ja e tenant        |
| 422    | VALIDATION_ERROR | Body invalido (Zod)      |

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

1. Soft delete: seta `active = false`
2. Se ja estiver inativo, retorna erro `ALREADY_INACTIVE`
3. Tenant pode ser reativado via `PATCH /:id`

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
| `tenantEntitySchema`            | types/entities/entities.ts | Validacao da entidade |
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

- **User module**: usa `IUserRepository.findById` para verificar usuario na criacao
- **User schema**: JOIN em users para trazer nome/telefone no response
- **Promove role**: ao criar tenant, atualiza `users.role` para "TENANT"
