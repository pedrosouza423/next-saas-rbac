# ADR-0001: Object.setPrototypeOf in custom Error subclasses

**Date:** 2026-05-29
**Status:** Accepted

## Context

Classes que estendem `Error` em TypeScript, quando compiladas por esbuild/tsc para alvo ES5 ou
inferior, usam patching de prototype inline. Quando uma instância de erro cruza limites de módulo,
a cadeia de prototypes pode quebrar e `instanceof` retorna falso.

Exemplo do problema:

```ts
// User module
class UnauthorizedError extends Error { }

// Auth module
try { ... } catch (error) {
  console.log(error instanceof UnauthorizedError) // pode ser false!
}
```

No global error handler do Fastify, se `instanceof` falhar em todos os ramos, o erro cai na
fallback (500 genérico) em vez de retornar o status correto da classe (401, 404, etc).

## Decision

Todos os error classes (`BadRequestError`, `UnauthorizedError`, `NotFoundError`) chamam
`Object.setPrototypeOf(this, new.target.prototype)` no construtor:

```ts
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
  readonly statusCode = 401
}
```

Isso garante que o prototype está correto **em runtime**, independente do alvo de compilação.

## Consequences

- `instanceof` checks funcionam corretamente após compilação
- Trade-off: 1-2 linhas de boilerplate por classe de erro
- Tamanho: negligenciável (Object.setPrototypeOf é chamado apenas quando erro é instanciado)
- Alternativas consideradas (e rejeitadas):
  - Aumentar alvo de compilação para ES2015+: reduziria compatibilidade
  - Usar error codes em vez de classes: perde type safety
  - Usar herança vs composição: mais complexo, menos type-safe

