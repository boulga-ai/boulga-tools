# Migrations Supabase — Boulga AI

Trois fichiers, a appliquer dans l'ordre :

1. `migrations/0001_init.sql` — les 7 tables + index.
2. `migrations/0002_rls.sql` — RLS (lecture seule cote client, admin voit tout), trigger de
   creation de profil + quotas a l'inscription, seed du super admin.
3. `migrations/0003_storage.sql` — les 3 buckets Storage (`uploads`, `generated`, `temp`) et
   leurs policies de lecture.
4. `migrations/0004_quota_functions.sql` — fonction `increment_quota_usage` (decrement
   atomique de `words_used`/`downloads_used`), appelee par le backend via `client.rpc(...)`.

## Appliquer les migrations

### Option A — Supabase CLI (recommande)

```bash
npx supabase login
npx supabase link --project-ref <votre-project-ref>
npx supabase db push
```

### Option B — SQL Editor (dashboard Supabase)

Coller le contenu de chaque fichier, dans l'ordre (0001 puis 0002 puis 0003), dans
Supabase Studio → SQL Editor → New query → Run.

## Notes

- Le compte `boulgacorporation@gmail.com` doit exister dans `auth.users` avant ou apres le
  trigger : le trigger le detecte a l'inscription, et le `UPDATE` de fin de `0002_rls.sql`
  rattrape le cas ou le compte existait deja.
- Le nettoyage planifie des buckets `uploads` (30j) et `temp` (24h) necessite `pg_cron`
  (extension Supabase) ou une tache planifiee externe — requetes fournies en commentaire
  dans `0003_storage.sql`.
- Toute ecriture sur `quotas`, `usage_logs`, `subscriptions`, `documents`,
  `academic_sessions`, `conversations` et `profiles.current_tier` passe exclusivement par le
  backend FastAPI via `service_role` (qui bypass RLS). Le client ne fait que lire.
