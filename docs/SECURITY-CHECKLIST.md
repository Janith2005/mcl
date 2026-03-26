# Security Audit Checklist — Influence Pirates

Last reviewed: 2026-03-26

## Authentication & Authorization

- [ ] All endpoints require authentication (except `/health`, `/login`, `/signup`, `/webhooks/stripe`)
- [ ] RLS enabled on all tables (verified in migration `20260324000002`)
- [ ] API keys hashed with bcrypt (verified in `auth.py`)
- [ ] Session tokens expire appropriately

## Network & Transport

- [ ] CORS restricted to production domain in production
- [ ] HTTPS enforced in production

## Data Access

- [ ] No raw SQL — all queries through Supabase client
- [ ] File uploads validated (type, size)

## Secrets & Configuration

- [ ] Environment variables not logged
- [ ] Stripe webhook signature verified
- [ ] No secrets committed to source control

## Rate Limiting & Abuse Prevention

- [ ] Rate limiting active (Phase 7.1)

## Monitoring

- [ ] Sentry error tracking configured
- [ ] Structured logging with no PII leakage
