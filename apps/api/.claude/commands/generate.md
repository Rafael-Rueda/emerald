---
description: Create an artifact following the project's Architecture pattern. Use to create new entities, services, repositories, or any other artifact in the application.
argument-hint: [artifact] [bounded-context] [name]
allowed-tools: Read, Write, Glob
---

# Create Domain Entity

## ALLOWED ARTIFACTS

```json
{
    "ALLOWED_ARTIFACTS": [
        {
            "name": "entity",
            "description": "The heart of your domain. Represents objects that have a unique identity and a continuous lifecycle (e.g., a User remains the same user even if their name changes).",
            "layer": "domain"
        },
        {
            "name": "value-object",
            "description": "Objects defined by their attributes rather than an ID. They are immutable and self-validating. If you change a property, you create a new instance.",
            "layer": "domain"
        },
        {
            "name": "use-case",
            "description": "Represents a user intention or system command. It orchestrates fetching entities, executing domain methods, and persisting results without containing complex business rules.",
            "layer": "domain"
        },
        {
            "name": "repository",
            "description": "Defines the contract (interface) for how the domain accesses data. The actual implementation resides in the infrastructure layer.",
            "layer": ["infra", "domain"]
        },
        {
            "name": "error",
            "description": "Custom error classes representing specific business rule failures (e.g., InsufficientFundsError), decoupling the domain from generic HTTP errors.",
            "layer": "domain"
        },
        {
            "name": "controller",
            "description": "The entry point for requests (usually HTTP/REST). It receives input, invokes the appropriate Use Case, and returns a response.",
            "layer": "http"
        },
        {
            "name": "service",
            "description": "Domain Service containing business logic that does not naturally belong to a single Entity or Value Object, operating across multiple entities.",
            "layer": "http"
        },
        {
            "name": "schema",
            "description": "Defines the shape and validation of data entering or leaving the API. Ensures the data contract (DTOs).",
            "layer": "http"
        },
        {
            "name": "presenter",
            "description": "Responsible for formatting raw domain data into the specific format the client needs (View Model), often filtering out sensitive data.",
            "layer": "http"
        },
        {
            "name": "mapper",
            "description": "The translator. Converts data between different layers to keep them isolated (e.g., converting a Domain Entity to a Database Model).",
            "layer": "infra"
        },
        {
            "name": "pipe",
            "description": "Used for transforming and validating input data before it reaches the Controller method.",
            "layer": "http"
        },
        {
            "name": "guard",
            "description": "Determines if a request is allowed to proceed (Authentication/Authorization) by checking who the user is and if they have access.",
            "layer": "http"
        },
        {
            "name": "decorator",
            "description": "Adds metadata or behavior to classes and methods declaratively (e.g., marking a route as public or extracting the current user).",
            "layer": "http"
        },
        {
            "name": "enum",
            "description": "Defines a fixed set of named constants, ensuring strict typing for states or categories.",
            "layer": "http"
        },
        {
            "name": "provider",
            "description": "Encapsulates external logic or infrastructure tools injected into the application (e.g., a hashing provider like Bcrypt or an Email service).",
            "layer": ["infra", "domain"]
        }
    ]
}
```

## Arguments

- `$1` - The name of artifact being created (e.g., `entity`, `service`). List available in ALLOWED_ARTIFACTS. DO NOT accept other artifacts that are not in that list.
- `$2` - Bounded context or module name (e.g., `identity`, `catalog`)
- `$3` - Artifact's name in kebab-case (e.g., `product`, `order-item`)

## Task

Create a new `$1`, named `$3` in the bounded context/module `$2`.

## Denied cases

- [MUST DO] You must deny the request to the user if you tried, tried, and didn't find in the list of allowed artifacts the artifact which the user is requesting, even with proper interpretation and overthinking. In that scenario you must ask the user for more information in order to fit in a proper artifact, matching perfectly with the allowed artifacts list.
