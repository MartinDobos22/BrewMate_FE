# SQL migrácie a schéma (BrewMate)

SQL skripty sú rozdelené podľa typu zmeny, nie podľa toho, či ide o hotfix alebo čistú inštaláciu. Všetky skripty sú v `db/migrations/` a sú pomenované tak, aby bolo jasné poradie alebo účel.

## Štruktúra priečinkov

- `db/migrations/extensions/` – PostgreSQL rozšírenia.
- `db/migrations/legacy/` – odstránenie starých tabuliek/funkcií.
- `db/migrations/schema/` – vytváranie alebo úpravy tabuliek a FK.
- `db/migrations/functions/` – helper funkcie a business logika pre štatistiky.
- `db/migrations/triggers/` – triggre pre `updated_at` a štatistiky.
- `db/migrations/rls/` – RLS (row-level security) politiky.
- `db/migrations/indexes/` – indexy pre výkon.

## Obsah skriptov

### Extensions
- **`extensions/00_extensions.sql`** – aktivuje potrebné rozšírenia (napr. `pgcrypto`).
- **`extensions/hotfix_00_extensions.sql`** – bezpečne doplní rozšírenia na existujúcej DB.

### Legacy cleanup
- **`legacy/01_drop_legacy.sql`** – odstraňuje staré tabuľky, triggre a helper funkcie pre idempotentné spúšťanie.

### Schema (tabuľky a FK)
- **`schema/02_create_tables_core.sql`** – vytvára jadro používateľských tabuliek (`app_users`, `user_taste_profile`, `user_taste_profiles`).
- **`schema/03_create_tables_activity.sql`** – tabuľky pre aktivitu a agregácie (brew history, learning events, recepty, uložené kávy, scan udalosti, štatistiky).
- **`schema/hotfix_01_create_shadow_tables.sql`** – vytvorí `app_users` a `user_taste_profile`, ak neexistujú.
- **`schema/hotfix_03_retarget_user_id_fks.sql`** – preklopí `user_id` na `text` a nastaví FK na `app_users`.
- **`schema/hotfix_04_extend_taste_profiles.sql`** – pridá quiz polia do `user_taste_profiles`.

### Functions
- **`functions/04_functions_stats.sql`** – funkcie pre `updated_at` a agregovanie štatistík.
- **`functions/hotfix_05_functions_stats.sql`** – nahradí štatistické funkcie variantmi s `text` user_id.

### Triggers
- **`triggers/05_triggers.sql`** – triggre pre `updated_at` a zmeny štatistík.
- **`triggers/hotfix_06_triggers.sql`** – obnoví triggre, aby používali nové funkcie.

### RLS policies
- **`rls/06_rls_policies.sql`** – zapne RLS a nastaví politiky prístupu podľa `auth.uid()`.
- **`rls/hotfix_02_drop_rls_policies.sql`** – dočasne zruší politiky pred typovými zmenami.
- **`rls/hotfix_07_rls_policies.sql`** – znovu zapne RLS a vytvorí politiky.

### Indexes
- **`indexes/07_indexes.sql`** – indexy pre výkon (GIN na JSON/tags, `user_id`, `created_at`).
- **`indexes/hotfix_08_indexes.sql`** – doplní chýbajúce indexy podľa `user_id`.

## Poznámky k spúšťaniu

- **Čistá inštalácia:** spúšťajte súbory v logickom poradí podľa prefixov (extensions → legacy → schema → functions → triggers → rls → indexes).
- **Úpravy existujúcej DB:** vyberte len tie skripty, ktoré potrebujete, pričom zachovajte závislosti medzi nimi.
