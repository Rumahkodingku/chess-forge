# ADR 0008: Design Tokens

- Status: Accepted
- Date: 2026-11-22

## Context

`docs/DESIGN.md` describes a light Next.js marketing system. The PRD requires a dark-first product interface with restrained colour and a chess-specific identity.

## Decision

- Use a dark-only palette.
- Background `#0a0a0b`, surfaces `#111113`, `#17171a`, `#1f1f23`.
- Borders `#2a2a30` and `#3a3a42`.
- Text `#ededf0`, muted `#a1a1aa`.
- Brand accent amber `#e8b45a`.
- Use Geist and Geist Mono.
- Use borders, spacing, and type hierarchy before shadow.
- Use a single amber accent at key moments, not across every control.

## Consequences

The application does not ship a light theme in v1. `DESIGN.md` remains a structural reference, not a colour source. Contrast and focus states must be verified against the dark palette.

## Alternatives considered

- Light-first: conflicts with the PRD.
- Monochrome-only: valid but weaker product identity.
- Dark and light toggle: deferred to avoid theme-testing scope in R0.
