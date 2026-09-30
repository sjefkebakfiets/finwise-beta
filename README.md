# Finwise V0.2

Technische testversie voor deployment via Dockge op TrueNAS.

## Doelmap

/mnt/raid-z-1/apps/dockge/data/finwise/v0.2

## Installatie in Dockge

1. Plaats alle bestanden van deze versie in de V0.2-stackmap.
2. Kopieer `.env.example` naar `.env`.
3. Pas in `.env` minimaal `POSTGRES_PASSWORD` en `NEXTAUTH_SECRET` aan.
4. Zorg dat `DATABASE_URL` hetzelfde database-wachtwoord gebruikt.
5. Start de stack in Dockge met Compose Up.
6. Open:
   http://192.168.178.252:3000
7. Controleer eventueel:
   http://192.168.178.252:3000/api/health

## Database

PostgreSQL-data wordt opgeslagen in:

./postgres

Dit komt dus terecht in:

/mnt/raid-z-1/apps/dockge/data/finwise/v0.2/postgres

## Belangrijk

V0.2 gebruikt `prisma db push` bij het starten. Dit is bewust voor deze geïsoleerde technische testomgeving. Voor een productieversie schakelen we over naar gecontroleerde Prisma migrations.

Authenticatie, uitgebreide budgettering, vermogen, scenario-engine, rapportages en overige modules worden daarna gefaseerd toegevoegd.
