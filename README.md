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

# Release notes:
v0.2.1 
-Hypotheek pagina toegevoegd ter voorbereiding volgende update. 
-Prisma schedule voorbereid voor hypotheek
-Design aangepast en logo toegevoegd

v0.2 
Basis Versie

