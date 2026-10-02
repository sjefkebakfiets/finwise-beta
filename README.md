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
v0.2.4
Nieuwe functionaliteit
Deze update breidt de hypotheekmodule van Finwise uit met een uitgebreide aflossings- en scenariofunctie. De bestaande hypotheekgegevens, betalingen en fiscale instellingen vormen hierbij de basis voor prognoses.
- Aflossingscalculator
  - Berekening van extra maandelijkse aflossingen.
  - Voorbeeldscenario's van €100, €200, €400 en €500 per maand.
  - Mogelijkheid om zelf een extra aflossingsbedrag in te voeren.
  - Berekening van de resterende looptijd en verwachte hypotheekvrije datum.
  - Inzicht in toekomstige rente en mogelijke rentebesparing.
  - Inzicht in tijdwinst door extra aflossen.
- Scenario's vergelijken
  - Huidige hypotheek zonder extra aflossing.
  - Verschillende scenario's met extra maandelijkse aflossingen.
  - Vergelijking met een scenario waarbij hetzelfde bedrag wordt belegd.
  - Verwacht beleggingsrendement is instelbaar.
  - Overzichtelijke vergelijking van de financiële uitkomsten.
- Hypotheekprognose
  - Prognose van de hypotheekschuld richting €0.
  - Ontwikkeling van de schuld door reguliere én extra aflossingen.
  - Weergave van belangrijke hypotheekmomenten, waaronder einde rentevaste periode en hypotheek-einddatum.
  - Jaarlijks overzicht van de verwachte hypotheekontwikkeling.
- Automatische berekeningen
  - Rente en aflossing worden automatisch doorgerekend op basis van de beschikbare hypotheekgegevens.
  - Ondersteuning voor annuïtaire, lineaire en aflossingsvrije hypotheekdelen.
  - Berekening van bruto en indicatieve netto hypotheeklasten.
- Hypotheekrenteaftrek & eigenwoningforfait
  - De eerder toegevoegde WOZ-waarde, het eigenwoningforfait en belastingpercentage worden meegenomen in de prognoses.
  - Effect van dalende rentelasten op de geschatte hypotheekrenteaftrek wordt zichtbaar.
  - Netto fiscale effecten blijven nadrukkelijk een indicatieve berekening.
  
v0.2.3 
1. Eigen Woning Forfait toegevoegd in hypotheek module

v0.2.2 
1. Hypotheek rente aftrek toegevoegd aan de hypotheek module. 

v0.2.1 
1. Hypotheek pagina toegevoegd ter voorbereiding volgende update. 
2. Prisma schedule voorbereid voor hypotheek
3. Design aangepast en logo toegevoegd

v0.2 
1. Basis Versie

