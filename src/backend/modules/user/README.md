# User Module

CRUD de perfil e gestao de usuarios.

## Endpoints

### GET /api/users/me

Retorna o perfil do usuario autenticado.

**Acesso:** Autenticado (qualquer role)

**Request:** Nenhum body. O userId e extraido do JWT (`session.sub`).

**Response 200:**

| Campo       | Tipo    | Descricao                          |
|-------------|---------|------------------------------------|
| `id`        | string  | UUID do usuario                    |
| `name`      | string  | Nome completo                      |
| `phone`     | string  | Telefone internacional             |
| `email`     | string? | E-mail (pode ser null)             |
| `role`      | string  | USER, OPERATOR, TENANT ou OWNER    |
| `active`    | boolean | Status ativo                       |
| `createdAt` | string  | ISO 8601                           |
| `updatedAt` | string  | ISO 8601                           |

**Erros:**

| Status | Code      | Quando                       |
|--------|-----------|------------------------------|
| 401    | UNAUTHORIZED | Token ausente ou invalido |
| 404    | NOT_FOUND | Usuario nao encontrado       |

---

### PATCH /api/users/me

Atualiza nome e/ou e-mail do usuario autenticado.

**Acesso:** Autenticado (qualquer role)

**Request Body (todos opcionais):**

| Campo   | Tipo    | Validacao                    |
|---------|---------|------------------------------|
| `name`  | string  | min 1, max 255               |
| `email` | string? | formato e-mail, max 255, aceita null para remover |

**Response 200:** Mesmo schema de `GET /me` com dados atualizados.

**Regras de negocio:**

1. O usuario so pode editar o proprio perfil — userId vem do JWT
2. Nao e possivel alterar `phone`, `role` ou `active` por esta rota
3. Enviar `email: null` remove o e-mail do perfil

**Erros:**

| Status | Code             | Quando                   |
|--------|------------------|--------------------------|
| 401    | UNAUTHORIZED     | Token ausente ou invalido |
| 404    | NOT_FOUND        | Usuario nao encontrado   |
| 422    | VALIDATION_ERROR | Body invalido (Zod)      |

---

### GET /api/users

Lista usuarios com paginacao e filtros.

**Acesso:** TENANT, OWNER

**Query Params:**

| Param    | Tipo    | Default | Descricao                          |
|----------|---------|---------|------------------------------------|
| `page`   | number  | 1       | Pagina atual (min 1)               |
| `limit`  | number  | 20      | Itens por pagina (min 1, max 100)  |
| `role`   | string  | —       | Filtrar por role (USER, OPERATOR, TENANT, OWNER) |
| `active` | string  | —       | Filtrar por status ("true" ou "false") |
| `search` | string  | —       | Busca por nome ou telefone (ILIKE %term%) |

**Response 200:**

```json
{
  "data": [{ "id": "...", "name": "...", ... }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Regras de negocio:**

1. Apenas TENANT e OWNER podem acessar esta rota
2. A busca (`search`) faz ILIKE no `name` e `phone` simultaneamente
3. Resultados ordenados por `createdAt` ascendente

**Erros:**

| Status | Code         | Quando                     |
|--------|--------------|----------------------------|
| 401    | UNAUTHORIZED | Token ausente ou invalido  |
| 403    | FORBIDDEN    | Role insuficiente          |

---

### GET /api/users/:id

Busca um usuario pelo ID.

**Acesso:** TENANT, OWNER

**Path Params:**

| Param | Tipo   | Validacao |
|-------|--------|-----------|
| `id`  | string | UUID v4   |

**Response 200:** Mesmo schema de `GET /me`.

**Erros:**

| Status | Code         | Quando                     |
|--------|--------------|----------------------------|
| 401    | UNAUTHORIZED | Token ausente ou invalido  |
| 403    | FORBIDDEN    | Role insuficiente          |
| 404    | NOT_FOUND    | UUID nao encontrado        |

---

### PATCH /api/users/:id

Atualiza dados de um usuario.

**Acesso:** OWNER

**Path Params:**

| Param | Tipo   | Validacao |
|-------|--------|-----------|
| `id`  | string | UUID v4   |

**Request Body (todos opcionais):**

| Campo    | Tipo    | Validacao                          |
|----------|---------|------------------------------------|
| `name`   | string  | min 1, max 255                     |
| `email`  | string? | formato e-mail, max 255, aceita null |
| `role`   | string  | USER, OPERATOR, TENANT ou OWNER    |
| `active` | boolean | true ou false                      |

**Response 200:** Mesmo schema de `GET /me` com dados atualizados.

**Regras de negocio:**

1. Apenas OWNER pode alterar dados de outros usuarios
2. Permite alterar `role` e `active` (promover/rebaixar, ativar/desativar)
3. Verifica se o usuario alvo existe antes de atualizar

**Erros:**

| Status | Code             | Quando                   |
|--------|------------------|--------------------------|
| 401    | UNAUTHORIZED     | Token ausente ou invalido |
| 403    | FORBIDDEN        | Role insuficiente         |
| 404    | NOT_FOUND        | UUID nao encontrado      |
| 422    | VALIDATION_ERROR | Body invalido (Zod)      |

---

### DELETE /api/users/:id

Desativa um usuario (soft delete).

**Acesso:** OWNER

**Path Params:**

| Param | Tipo   | Validacao |
|-------|--------|-----------|
| `id`  | string | UUID v4   |

**Response 200:**

| Campo     | Tipo   | Descricao                        |
|-----------|--------|----------------------------------|
| `message` | string | "Usuario desativado com sucesso" |

**Regras de negocio:**

1. Apenas OWNER pode desativar usuarios
2. Soft delete: seta `active = false` e atualiza `updatedAt`
3. Nao remove dados do banco — o usuario pode ser reativado via `PATCH /:id`
4. Se o usuario ja estiver inativo, retorna erro `ALREADY_INACTIVE`

**Erros:**

| Status | Code             | Quando                       |
|--------|------------------|------------------------------|
| 401    | UNAUTHORIZED     | Token ausente ou invalido    |
| 403    | FORBIDDEN        | Role insuficiente            |
| 404    | NOT_FOUND        | UUID nao encontrado          |
| 422    | ALREADY_INACTIVE | Usuario ja esta inativo      |

---

## Schemas (Zod)

| Schema                          | Arquivo            | Uso                           |
|---------------------------------|--------------------|-------------------------------|
| `userProfileSchema`             | types/dtos/dtos.ts | Response de perfil            |
| `updateMyProfileRequestSchema`  | types/dtos/dtos.ts | Body do PATCH /me             |
| `updateUserRequestSchema`       | types/dtos/dtos.ts | Body do PATCH /:id            |
| `listUsersQuerySchema`          | types/dtos/dtos.ts | Query params do GET /          |
| `paginatedUsersResponseSchema`  | types/dtos/dtos.ts | Response do GET / (paginado)  |
| `messageResponseSchema`         | types/dtos/dtos.ts | Response do DELETE /:id       |
| `userEntitySchema`              | types/entities/entities.ts | Validacao da entidade User |
| `errorResponseSchema`           | shared/dtos.ts     | Resposta padrao de erro       |

## Permissoes por role

| Endpoint           | USER | OPERATOR | TENANT | OWNER |
|--------------------|------|----------|--------|-------|
| GET /me            |  x   |    x     |   x    |   x   |
| PATCH /me          |  x   |    x     |   x    |   x   |
| GET /              |      |          |   x    |   x   |
| GET /:id           |      |          |   x    |   x   |
| PATCH /:id         |      |          |        |   x   |
| DELETE /:id        |      |          |        |   x   |

## Arquitetura

```
1_module.ts     — Composicao: repository -> service -> handler -> register(app)
2_api.ts        — Definicao das 6 rotas OpenAPI
3_handler.ts    — IUserHandler: extrai session/params/body, verifica role, chama service
4_service.ts    — IUserService: regras de negocio, conversao UserRow -> UserProfile
5_repository.ts — IUserRepository: queries Drizzle (findById, findAll, update, softDelete)
```
