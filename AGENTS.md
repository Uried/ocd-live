# OCD Live

Frontend uniquement : React, Vite, TypeScript strict, Tailwind et composants UI composables basés sur Radix. Aucun backend, paiement réel ou stockage de réservation.

## Commandes de vérification

- `npm run lint`
- `npm run build`
- `npm test`
- `npm run test:e2e` (utilise le canal Chromium complet : `npx playwright install --no-shell chromium`; sous Windows, `npx playwright install winldd` si nécessaire)
- `npm run dev` : serveur local sur le port 5173, interface 127.0.0.1.

Sous Windows, les commandes demandées par l’utilisateur sont transmises à CMD via `cmd /c`.

npm 10.9.2 peut échouer avec `edgesOut` lors de la résolution des peers optionnels de Vitest. La mise à jour des dépendances a réussi avec `npx --yes npm@11.6.2 install`, sans modifier le npm global. `playwright-core` est fixé à la même version que Playwright Test pour éviter un conflit de types avec axe-core.

## Architecture

Les pages utilisent des hooks et les contrats de `src/services/repositories`. Le choix de l’implémentation locale se trouve dans `src/services/repositories/index.ts`. Toutes les données de démonstration sont dans `src/mocks/`. Ne pas importer les données mock directement depuis les composants.

## Direction artistique

Charte OCD (« Les Opportunités, C’est Dehors ») : Manrope, noir #101010, fond blanc dominant, gris #F7F7F7, gris foncé #292929 et orange #EF6B07 relevé sur le logo fourni. Le logo officiel transparent est conservé sans recoloration dans `src/assets/images/ocd-logo.png`, avec ses seules marges transparentes retirées. `scripts/prepare-brand.mjs` permet de reproduire ce recadrage et de relever l’orange dominant. Pas de dégradés décoratifs, glassmorphism, statistiques fictives ou promesses commerciales inventées. Photographies d’illustration créditées dans `src/assets/images/credits.json`.

Seule la page d’accueil est autorisée à ce stade. Les offres, contacts, mentions légales et ressources de marque doivent être confirmés avant publication. Les formules chiffrées présentes dans les mocks ne sont pas des offres officielles et ne sont pas exposées sur l’accueil.
