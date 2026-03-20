# IntersectionObserver in Tests

Vitest's `jsdom` environment does not natively support `IntersectionObserver`. If your component uses it (like TableOfContents), you must mock it in your test file before rendering:

```typescript
beforeAll(() => {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});
```
