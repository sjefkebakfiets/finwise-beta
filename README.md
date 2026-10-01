# Finwise V0.2

v0.2 Finwise met basis functionaliteit


## Installatie in Dockge

1. Plaats alle bestanden van deze versie in de V0.2-stackmap.
2. Kopieer `.env.example` naar `.env`.
3. Pas in `.env` minimaal `POSTGRES_PASSWORD` en `NEXTAUTH_SECRET` aan.
4. Zorg dat `DATABASE_URL` hetzelfde database-wachtwoord gebruikt.
5. Start de stack in Dockge met Compose Up.
6. Open:
   http://ip:3000
7. Controleer eventueel:
   http://ip:3000/api/health

## Database

PostgreSQL-data wordt opgeslagen in:

./postgres

