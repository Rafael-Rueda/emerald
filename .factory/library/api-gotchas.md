# API Gotchas

- **Spaces Endpoint Missing**: The public API lacks a `GET /api/public/spaces` endpoint. Because of this, clients relying on knowing all spaces (e.g. `sitemap.ts`) might resort to using mock data (`@emerald/mocks`) to determine `KNOWN_SPACES`.
- **Multiple Default Versions**: The public versions API can return multiple versions with `isDefault: true` simultaneously. Client route resolvers currently pick the first default returned by API order, as there is no DB invariant ensuring only one default exists per space.
