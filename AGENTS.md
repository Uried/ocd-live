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

Nom de la plateforme : OCD Live. Direction : Modern African Business + Premium Live Experience. Manrope, orange historique #EF6B07 (vérifié dans le commit a29d81c et la version déployée), survol #DE6206, noir #171717, blanc dominant et fonds clairs existants. Texte noir sur les boutons orange pour préserver le contraste ; repères orange pour les liens actifs et le focus. Texte secondaire #686660 pour préserver le contraste sur les fonds chauds ; #777777 n’est pas adapté à tous les petits textes. Rayons : 10px petits éléments, 14px contrôles, 22px cartes, 32px grandes compositions, adaptés à 20/24px sur mobile. Le PNG fourni, plus vif que la photo de référence, reste inchangé ; le mot Live reste noir. La photographie réelle `studio.webp` est issue du visuel des locaux fourni (415×739), sans agrandissement ni retouche, et se distingue explicitement des illustrations Unsplash dans les crédits. Préférer une photo officielle plus définie pour une prochaine livraison. `scripts/inspect-design.mjs` capture une URL en 390 et 1440px ; `scripts/prepare-studio.mjs` convertit la référence JPEG en WebP. Pas de dégradés décoratifs, glassmorphism, statistiques fictives ou promesses commerciales inventées.

L’accueil et le parcours `/reservation` sont autorisés. Grille validée par l’utilisateur : Essentiel 1 h 30 à 15 000 FCFA ; Long format 4 h à 32 000 FCFA (20 % de réduction horaire) ; Mensuel quatre séances de 1 h 30 à 54 000 FCFA (10 % de réduction), calendrier à convenir ; Découverte 45 minutes à 7 500 FCFA ; Duo une session commune de 1 h 30 à deux intervenants à 15 000 FCFA sans supplément. Les suggestions initiales Découverte et Duo sont désormais validées ; leur origine reste tracée par `internalProposal`. Le Premium reste sur demande, la promotion Boovan n’est pas validée et ne doit pas être présentée comme incluse. Contacts, mentions légales et ressources de marque doivent être confirmés avant publication.

Le parcours conserve son brouillon en mémoire dans `BookingFlowLayout` pendant la navigation interne, sans stockage persistant des informations personnelles. `getSlots(mode, packageId)` renvoie des créneaux couvrant la durée complète du package ; une durée indéfinie ne produit aucun créneau. La fin du parcours prépare une sélection sans enregistrer de réservation. Les styles cuivre #A65325 sont isolés dans `src/styles/booking.css`, sans remplacer l’orange de l’accueil. Les tests `tests/booking.spec.ts` couvrent la comparaison, l’accessibilité, les retours et le changement de durée.

## Expérience utilisateur et contenu public

L’interface publique ne doit jamais révéler que les données sont locales ou que le site est un prototype. Interdiction absolue d’afficher : « Version de démonstration », « Aucune réservation réelle », « Données fictives », « Mode test », « Simulation », « API bientôt disponible », « Fonctionnalité en cours de développement » ou tout badge/avertissement équivalent. Les données locales sont présentées naturellement, comme un vrai service commercial : messages professionnels, confirmations élégantes, parcours cohérents. Ne jamais exposer l’architecture technique aux visiteurs. Si une fonctionnalité n’est pas implémentée, la masquer ou prévoir une interface cohérente sans prétendre qu’une action a été effectuée (pas de fausse fonctionnalité interactive). Les marqueurs internes (`isDemo`, ids `demo-*`) restent dans les données et ne sont jamais rendus.
