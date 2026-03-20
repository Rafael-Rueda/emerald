# React Imports in Tests and Client Components

When creating test files (especially with React Testing Library) or `"use client"` components in this monorepo, you must explicitly include `import React from 'react';`. 
Omitting this will lead to `React is not defined` errors during Vitest runs.
