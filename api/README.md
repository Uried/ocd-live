# OCD Live — API V1

PHP natif >= 8.2, PDO MySQL, MariaDB 11.4.13, extensions `pdo_mysql`, `mbstring` et `json`. Aucune modification du frontend, aucun paiement ni notification automatique. Les comptes administrateurs existants sont utilisés ; aucun compte par défaut n'est créé.

## Base existante uniquement

Les 16 tables de la base existante sont la référence. **Ne pas exécuter `database/schema.sql` ni `database/seed.sql`** : ces anciens scripts correspondent à une autre structure et ne servent pas à installer cette V1. Aucune migration ni création de table n'est nécessaire. Ne pas importer un export par-dessus une base en exploitation.

`customers` et `businesses.customer_id` stockent les coordonnées normalisées. `bookings` conserve l'en-tête et les snapshots du nom, du montant de la formule et de sa devise. `booking_sessions` contient les dates UTC réelles et le fuseau métier. Le prix de la formule mensuelle est enregistré une seule fois : 54 000 XOF n'est pas multiplié par quatre.

## Configuration

Ordre de résolution : variables d'environnement du serveur, puis `config/secrets.php` (modèle `config/secrets.example.php`, créé sur le serveur, jamais dans Git), puis `.env` pour le développement local. Un `.env` situé sous la racine web publique est **ignoré** hors `APP_ENV=local`. Aucun identifiant par défaut n'est utilisé. Voir `DEPLOYMENT.md` pour le déploiement, les limites de l'hébergement gratuit et la base de contrôle.

- `APP_ENV=production` : cookies administrateurs HTTPS obligatoires.
- `APP_ROLE=production|control` : une API de contrôle (`control`) utilise une autre base, une autre `APP_KEY` et un autre domaine ; elle seule active le préflight protégé par `PREFLIGHT_TOKEN`.
- `DB_SSL_CA` : certificat optionnel pour une connexion TLS à la base ; `SESSION_COOKIE_PATH` (`/api` par défaut) ; `CLIENT_IP_HEADER` seulement derrière un proxy de confiance ; `RATE_LIMIT_BOOKINGS|QUOTES|LOGIN` (5 par défaut, plus élevés uniquement en contrôle).
- `APP_KEY` : secret stable, aléatoire, d'au moins 32 caractères, nécessaire à l'idempotence. À générer avec un gestionnaire de secrets ou `bin2hex(random_bytes(32))`, sans le publier ni le committer. Une rotation modifie les références dérivées des clés ; prévoir une stratégie de conservation avant toute rotation.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` : accès à la base existante avec un utilisateur dédié et des privilèges minimaux. Aucune permission DDL requise.
- `CORS_ORIGIN` : origine frontend exacte, sans chemin ni joker.
- `SESSION_COOKIE_SECURE=1` : ne peut être désactivé qu'avec `APP_ENV=local`, pour le développement HTTP local.
- `RATE_LIMIT_DIRECTORY` : optionnel ; répertoire privé des compteurs, par défaut `api/storage/rate-limit`. Tous les processus de déploiement doivent utiliser le même stockage avec `flock` fiable.

Le serveur doit autoriser les sessions PHP, `GET_LOCK`, `RELEASE_LOCK` et l'écriture privée dans `storage/logs` et le répertoire des compteurs. Les sessions et compteurs nécessitent un stockage partagé fiable ou une politique de déploiement adaptée si plusieurs serveurs sont utilisés.

`platform_settings.business_timezone` est obligatoire et lu en base. Aucun créneau n'est annoncé si sa disponibilité ne peut pas être vérifiée. Les prix/devises proviennent des formules existantes. Les paramètres de notifications ne sont pas consultés : ils n'ont aucun effet en V1.

Pour un contrôle local, depuis la racine du dépôt, sous Windows :

```text
cmd /c php -S 127.0.0.1:8000 api\index.php
```

Ce routeur local envoie toutes les requêtes vers le point d'entrée, sans servir les fichiers internes. En production Apache, activer `mod_rewrite`, autoriser le `.htaccess` et HTTPS. Pour Nginx, interdire explicitement les fichiers et répertoires internes et router uniquement l'API vers `index.php` ; `.htaccess` ne s'applique pas à Nginx. Ne pas publier les fichiers SQL, tests, logs ou `.env`.

## Endpoints publics

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/packages` | Formules actives, IDs numériques, codes, prix décimaux, modes autorisés, durée par séance et nombre de séances |
| GET | `/api/settings` | Paramètres publics autorisés : nom, devise et contacts, sans réglages internes |
| GET | `/api/availability?mode=remote&date=2099-01-05&package_id=1` | Plages vérifiées et intervalles occupés |
| POST | `/api/bookings` | Enregistrement transactionnel d'une demande `pending` |
| POST | `/api/quotes` | Enregistrement transactionnel d'une demande Premium `pending`, sans prix inventé |

Les corps POST doivent être des objets JSON, de 64 Kio maximum. `mode` accepte `in_person` et `remote` ; `in-person` est normalisé vers `in_person`. `package_id` est un ID numérique obtenu via le catalogue, jamais un ancien identifiant de mock. Une durée envoyée par le client ne détermine jamais la durée réservée ; `duration` est refusé sur l'endpoint de disponibilités.

`Idempotency-Key` est obligatoire sur les deux créations : 16 à 128 caractères `[A-Za-z0-9_-]`, générés aléatoirement par soumission. Réutiliser la même clé en cas de timeout. Même clé et données normalisées identiques : HTTP 200 avec la référence existante ; contenu différent : HTTP 409. Première création validée par commit : HTTP 201. La référence dépend d'un HMAC et d'une contrainte UNIQUE existante ; l'empreinte du contenu est conservée transactionnellement dans `activity_logs`, sans nouvelle table. Ne pas supprimer ces journaux de création sans stratégie d'archivage préservant l'idempotence et les snapshots de planification.

Exemple de corps de réservation (les dates doivent correspondre à une ouverture réellement configurée) :

```json
{
  "first_name": "Ama",
  "last_name": "Mensah",
  "phone": "+22890000000",
  "whatsapp": "+22890000000",
  "email": "ama@example.com",
  "mode": "remote",
  "package_id": 1,
  "date": "2099-01-05",
  "time": "10:15",
  "business": {
    "business_name": "Atelier Ama",
    "activity_sector": "Mode",
    "country": "Togo",
    "city": "Lomé",
    "address": "",
    "description": "Présentation de l'activité",
    "products_services": "Accessoires",
    "social_facebook": null,
    "social_instagram": null,
    "social_tiktok": null,
    "social_website": null
  },
  "customer_notes": null,
  "connection_location": "Mon atelier",
  "equipment_notes": "Ordinateur et fibre",
  "website": ""
}
```

L'e-mail et les données commerciales complémentaires sont optionnels ; prénom, nom, téléphone, nom d'activité et mode sont requis. Pour le devis, utiliser les mêmes coordonnées et `business`, avec `message` et, facultativement, `desired_date` / `desired_time`, sans `package_id`, date de séance obligatoire ou montant Premium. Le backend vérifie que PREMIUM est actif et autorise le mode demandé. Le honeypot `website` non vide produit un refus 422, jamais une fausse référence.

Les réponses sont `{success, message, data}` ou `{success:false, message, errors}`. Une erreur ne contient ni SQL, ni secret, ni trace technique. Codes utilisés : 200/201/204, 400, 401, 403, 404, 405, 409, 413, 415, 422, 429, 500 et 503. En cas d'incertitude réseau après commit, réessayer avec la même clé.

## Disponibilités et concurrence

- Capacité V1 validée : une séance simultanée par mode ; présentiel et distance peuvent se chevaucher. Aucun studio ni assistant individuel n'est modélisé.
- `availability_rules.weekday` utilise 0 = dimanche, 6 = samedi. Seules les règles `is_active=1` du mode sont utilisées.
- `start_time > end_time` représente une ouverture traversant minuit ; des heures égales sont refusées comme configuration ambiguë.
- `availability_exceptions` s'applique au mode ou à `all`. Fermeture sans horaires : journée entière. Fermeture avec horaires : soustraction de l'intervalle. Ouverture avec horaires : remplacement des horaires habituels du jour. Les fermetures priment, y compris sur les ouvertures exceptionnelles et le report de la veille. Une exception incohérente fait échouer la vérification sans annoncer de disponibilité.
- Sans horaires ni ouverture exceptionnelle, aucune disponibilité n'est annoncée.
- Les intersections utilisent les instants UTC complets, y compris les séances commencées la veille. Les plages adjacentes ne constituent pas un conflit. Les règles, exceptions et occupations des jours suivants sont vérifiées si la formule traverse minuit.
- Les plages retournées comprennent `start_at`, `end_at` et, avec une formule, `latest_start_at` : dernière heure de début pouvant accueillir la durée complète. Ce ne sont pas des réservations ni des garanties de maintien de disponibilité.
- Les réservations `pending`, `confirmed` et les anciens états `awaiting_payment` bloquent leurs séances `scheduled`. Aucun endpoint V1 ne crée `awaiting_payment` ni ne consulte `payments`. Pas d'expiration automatique inventée.
- Les écritures de calendrier sont sérialisées par un verrou nommé global au mode, couvrant tous les jours et toutes les séances concernées. Les noms incluent une empreinte de la base. Acquisition ordonnée avant transaction, vérification après acquisition, commit/rollback avant libération explicite dans `finally`. Délai d'attente : refus 409 réessayable. Tous les futurs chemins d'écriture devront respecter ce protocole.
- Les heures inexistantes lors d'un changement de fuseau sont refusées ; pour cette base, le fuseau configuré est Africa/Lome. Confirmer la convention UTC de toute donnée importée avant exploitation.

## Administration sécurisée — API uniquement

Aucune interface React ajoutée. Comptes actifs `admin` et `super_admin` uniquement ; `manager` refusé. Mots de passe vérifiés via `password_verify`, ID de session renouvelé, cookie HttpOnly/SameSite=Strict/Secure en production, expiration après 30 minutes d'inactivité ou 8 heures maximum. Le rôle et l'état du compte sont relus à chaque requête protégée.

1. GET `/api/admin/session` avec conservation des cookies pour obtenir `csrf_token`.
2. POST `/api/admin/login` avec JSON `{email,password}`, cookie et en-tête `X-CSRF-Token`.
3. Conserver le cookie et le nouveau token renvoyé après connexion.
4. Envoyer le token sur toutes les mutations administratives. Depuis le navigateur : `credentials: 'include'`, origine exacte autorisée. Cette V1 requiert un déploiement frontend/API same-site pour les cookies SameSite=Strict ; un déploiement cross-site nécessite une adaptation explicite.

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/admin/bookings?page=1` | Liste paginée, 50 réservations par page |
| GET | `/api/admin/bookings/{id}` | Coordonnées, snapshots, séances et historique |
| PATCH | `/api/admin/bookings/{id}/status` | JSON `{status,comment}` ; statut et historique transactionnels |
| POST | `/api/admin/bookings/{id}/sessions` | JSON `{session_number,date,time}` ; planifier une séance manquante |
| GET | `/api/admin/quotes?page=1` | Liste des demandes Premium |
| GET | `/api/admin/quotes/{id}` | Coordonnées et détail du devis |
| POST | `/api/admin/logout` | Fermer la session |

Transitions V1 : `pending` (ou ancien `awaiting_payment`) vers `confirmed`, `cancelled` ou `rejected` ; `confirmed` vers `completed`, `cancelled` ou `no_show`. Aucune confirmation automatique. Une confirmation revérifie les séances datées ; terminer nécessite toutes les séances attendues avec fin passée. Les annulations/rejets libèrent les séances planifiées en les marquant annulées. Pas de réouverture des états terminaux ni de gestion des comptes/paramètres dans cette intervention.

Mensuel : une première séance réelle à la création, objectif de quatre séances enregistré dans le journal de création. Les séances manquantes apparaissent dans le détail comme `to_plan` avec dates nulles **dans la réponse uniquement**, sans ligne fictive en base. L'administration programme les numéros manquants avec la durée de la formule enregistrée lors de la création. Une répétition du même numéro/date/heure ne crée pas une nouvelle ligne ; une autre date sur un numéro existant produit 409. Cet endpoint ne déplace pas une séance déjà enregistrée. Pour les anciennes réservations sans métadonnées de création, durée et nombre de séances sont lus dans leur formule actuelle : vérifier les cas historiques avant utilisation.

## Vérifications

Depuis la racine du dépôt, sous Windows :

```text
cmd /c "for /r api %f in (*.php) do @php -l %f"
cmd /c php api\tests\run.php
cmd /c php api\tests\rate.php
cmd /c php api\tests\http.php
npx playwright test -c api\tests\integration\playwright.config.ts
```

- `run.php` : services métier avec doublures PDO en mémoire. Aucun SQL exécuté, donc ne valide pas le moteur MariaDB ni la syntaxe effective des requêtes.
- `rate.php` : 20 processus PHP sur des fichiers temporaires, test réel de concurrence des compteurs ; nettoyage limité aux fichiers créés par le test.
- `http.php` : serveur PHP local temporaire, base volontairement non configurée, contrôles des erreurs JSON, droits anonymes, CSRF, CORS et absence de faux succès. Aucune écriture SQL. Le serveur est arrêté à la fin.
- `api\tests\integration\api-integration.spec.ts` : **désactivé par défaut**, exécuté avec Playwright car l'offre gratuite d'InfinityFree bloque `curl` et les scripts. Il exige une API `APP_ROLE=control` déjà déployée, une base de contrôle indépendante, un préflight valide et `OCD_TEST_CONFIRM_ISOLATED=YES` ; toutes les variables sont listées dans `DEPLOYMENT.md`. Il refuse HTTP, les hôtes interdits, un rôle ou un nom de base inattendu et l'absence du marqueur de contrôle. Il couvre isolation, formules, disponibilité, courses de même mode et de modes différents, répétition, relations et snapshots, Mensuel, statut, Premium, refus anonyme/manager et rollback réel optionnel. Il n'exécute aucun SQL, ne crée aucune table et ne nettoie rien : **ne jamais le diriger vers la production**.

Les tests réels de persistance, concurrence MariaDB et droits des comptes existants restent à exécuter sur la base de contrôle autorisée. Un rollback après erreur de stockage est couvert par injection sur doublure PDO ; sa validation réelle nécessite un environnement de faute contrôlé. La protection Apache doit être vérifiée sur l'hébergement réel. Sans ces vérifications, la V1 ne doit pas être déclarée prête pour la production.
