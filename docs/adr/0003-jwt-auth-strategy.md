# ADR-0003: JWT stateless auth, bcrypt rounds = 10, token expiry = 1h

**Date:** 2026-05-31
**Status:** Accepted
**PR:** [#22](https://github.com/pedrosouza423/next-saas-rbac/pull/22)

## Context

PR #22 implementou as rotas de autenticação por e-mail/senha. Três decisões foram tomadas
explicitamente durante o code review e valem documentação:

1. **JWT vs session:** qual mecanismo de sessão usar
2. **bcrypt rounds:** qual cost factor usar em produção
3. **Token expiry:** quanto tempo um `PASSWORD_RECOVER` token deve viver

## Decisions

### 1. JWT stateless (sem session store)

**Decisão:** usar `@fastify/jwt` com tokens HS256. Nenhum registro de sessão no banco.

**Razão:** A arquitetura é uma SaaS multi-tenant com API consumida por múltiplos clientes
(web, mobile futuro, CLI). JWT permite verificação stateless — qualquer instância da API
valida o token sem consultar banco. Session store adicionaria dependência de Redis ou tabela
extra de sessões, aumentando complexidade operacional sem benefício claro nesta fase.

**Trade-offs:**
- ✅ Sem estado extra no DB, escala horizontal trivialmente
- ✅ Clientes apenas guardam o token — sem cookie/session management
- ❌ Não é possível invalidar um token individual antes de expirar (logout não invalida o token)
- ❌ Se `JWT_SECRET` vazar, todos os tokens emitidos são comprometidos

**Mitigação do logout:** a expiração de 7 dias limita a janela de abuso. Revogação por
lista negra pode ser adicionada futuramente se necessário.

### 2. bcrypt rounds = 10 (constante `BCRYPT_ROUNDS`)

**Decisão:** cost factor 10, centralizado em `apps/api/src/lib/constants.ts`.

**Razão:** O código original usava `6` (piso para testes unitários do bcryptjs). OWASP
recomenda `≥ 10` em produção (12+ preferível, mas 10 é o mínimo seguro). Cost 6 deixa hashes
~16× mais vulneráveis a força-bruta em caso de vazamento do banco.

O literal `6` estava duplicado em `create-account.ts` e `reset-password.ts` sem constante
compartilhada — risco de inconsistência futura.

```ts
// apps/api/src/lib/constants.ts
export const BCRYPT_ROUNDS = 10
```

**Trade-offs:**
- ✅ Hashes consistentes em todos os fluxos (cadastro e reset)
- ✅ Um lugar para ajustar se o valor precisar mudar
- ❌ Cost 10 é ~4× mais lento que cost 6 (alguns ms por hash — aceitável para auth)

### 3. Token PASSWORD_RECOVER expira em 1 hora

**Decisão:** tokens de reset de senha expiram 1 hora após a criação.

**Razão:** Janela suficiente para o usuário checar e-mail e completar o reset, sem deixar
um token válido por tempo indefinido caso o e-mail seja comprometido depois.

Ao rejeitar um token expirado, ele é **deletado imediatamente** (cleanup eager):

```ts
if (token.createdAt < oneHourAgo) {
  await prisma.token.delete({ where: { id: token.id } })
  throw new BadRequestError('Token expired.')
}
```

Sem o delete, tokens expirados acumulariam na tabela `Token` indefinidamente. O delete
garante que um token só pode ser usado uma vez (ou expirado e limpo).

**Verificação de tipo no token:**

```ts
if (!token || token.type !== 'PASSWORD_RECOVER') {
  throw new BadRequestError('Invalid token.')
}
```

Defesa futura: se novos `TokenType` forem adicionados (ex: `EMAIL_VERIFY`), um UUID desse
tipo não pode ser usado para resetar senha.

## Consequences

- `JWT_SECRET` é env var **obrigatória** (mín. 8 chars) — servidor não sobe sem ela
- Logout no cliente é apenas "deletar o token localmente" — sem invalidação server-side
- Para aumentar segurança do JWT no futuro: adicionar `jti` (JWT ID) + lista negra no Redis
- Para aumentar segurança do bcrypt: apenas mudar `BCRYPT_ROUNDS` em `constants.ts`
