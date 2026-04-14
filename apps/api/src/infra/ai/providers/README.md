# Embedding Providers

Adapters that implement the `EmbeddingProvider` interface for semantic search. Ships with four out of the box — add a fifth by following this guide.

- Interface: [`apps/api/src/domain/ai-context/application/providers/embedding-provider.ts`](../../../domain/ai-context/application/providers/embedding-provider.ts)
- Factory wiring: [`apps/api/src/http/@shared/modules/ai-context.module.ts`](../../../http/@shared/modules/ai-context.module.ts)
- Env validation: [`apps/api/src/env/env.ts`](../../../env/env.ts)

## Existing adapters

| File | Provider | Default model | Default dim | Batch size | `document` / `query` input type |
|---|---|---|---|---|---|
| [`voyage.embedding-provider.ts`](./voyage.embedding-provider.ts) | Voyage AI | `voyage-3-lite` | 512 | 128 | Yes — passed as `input_type` to the SDK |
| [`openai.embedding-provider.ts`](./openai.embedding-provider.ts) | OpenAI | `text-embedding-3-small` | 1536 | 2048 | No (same embedding for both) |
| [`google-vertex.embedding-provider.ts`](./google-vertex.embedding-provider.ts) | Google Vertex AI | `text-embedding-004` | 768 | 100 | Yes — `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` |
| [`ollama.embedding-provider.ts`](./ollama.embedding-provider.ts) | Ollama (self-hosted) | `nomic-embed-text` | 768 | 64 | No |

Batch sizes reflect each provider's documented per-request limits; stay at or below them.

## Adding a new provider

Worked example: adding Cohere.

### 1. Implement the adapter

Create `cohere.embedding-provider.ts` in this directory:

```typescript
import { Injectable } from '@nestjs/common';
import { EmbeddingProvider, EmbeddingInputType } from '@/domain/ai-context/application/providers/embedding-provider';
import { EnvService } from '@/env/env.service';

@Injectable()
export class CohereEmbeddingProvider implements EmbeddingProvider {
  readonly dimension: number;
  private readonly batchSize = 96; // Cohere's limit per call

  constructor(private readonly env: EnvService) {
    this.dimension = env.get('EMBEDDING_DIMENSION');
  }

  async embed(texts: string[], inputType: EmbeddingInputType): Promise<number[][]> {
    // Batch, call the API, return number[][] in the same order as `texts`.
    // Map inputType → Cohere's `input_type` ('search_document' vs 'search_query').
  }
}
```

Use the existing four adapters as reference — they all follow the same shape: `constructor(EnvService)`, batch the input, call the SDK, return a vector per input in order.

### 2. Add the enum value

In [`apps/api/src/env/env.ts`](../../../env/env.ts), extend the `EMBEDDING_PROVIDER` enum:

```typescript
EMBEDDING_PROVIDER: z.enum(['voyage', 'openai', 'google', 'ollama', 'cohere']).default('voyage'),
```

### 3. Add per-provider env vars and `superRefine` validation

Still in `env.ts`:

```typescript
COHERE_API_KEY: z.string().min(1).optional(),
COHERE_EMBEDDING_MODEL: z.enum(['embed-english-v3.0', 'embed-multilingual-v3.0']).default('embed-english-v3.0'),
```

Then extend the existing `superRefine` to enforce:

- `COHERE_API_KEY` is required when `EMBEDDING_PROVIDER === 'cohere'`
- `EMBEDDING_DIMENSION` is in the allowed set for the selected model (Cohere v3 models: 1024)

Copy the pattern from the Voyage / OpenAI / Google blocks — they already handle the "required key + allowed dimensions table" shape.

### 4. Wire the factory

In [`apps/api/src/http/@shared/modules/ai-context.module.ts`](../../../http/@shared/modules/ai-context.module.ts), add a `case 'cohere'` to the factory that resolves `EmbeddingProvider`:

```typescript
case 'cohere':
  return new CohereEmbeddingProvider(env);
```

### 5. Add a unit test

Create `apps/api/src/infra/ai/providers/__tests__/unit/cohere.embedding-provider.spec.ts`. Mirror the existing provider specs in that directory: mock the HTTP client, assert batching behavior, assert input-type mapping, assert the returned array length matches the input.

### 6. Document in the README

Add a row to the `## Embedding Providers` table in the repo-root [`README.md`](../../../../../../README.md#embedding-providers) with:

- Provider key (`cohere`)
- Default model
- Default dimension
- Supported dimensions per model
- Required env vars
- One-line "when to use"

## Conventions

- **Always batch.** Never send `texts.length > batchSize` in a single call; chunk and concatenate results.
- **Preserve order.** The caller relies on `result[i]` being the embedding for `texts[i]`.
- **Honor `inputType`.** If the provider distinguishes document vs query embeddings, pass it through. If not, ignore the parameter (still accept it for interface conformance).
- **Throw on partial failure.** If any batch fails, let the error propagate — callers handle retry at a higher level. Do not return partial results.
- **Read `dimension` from `EnvService`.** Never hardcode. The factory + `superRefine` guarantee the value is valid for the selected model by the time the constructor runs.
- **No provider-specific state in the domain layer.** All SDK types, retry logic, and rate-limit handling stay in this `infra/ai/providers/` directory.
