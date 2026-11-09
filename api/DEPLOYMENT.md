# Déploiement et base de contrôle

Ce document prépare le déploiement. **Rien n'est déployé ni exécuté automatiquement.** Aucun SQL de ce document ne doit être lancé sur la base OCD Live actuelle.

## 1. Risques et limites d'InfinityFree (offre gratuite)

Constatés dans la documentation et le forum officiels d'InfinityFree ; à revérifier avant chaque décision.

| Limite | Conséquence pour l'API |
|---|---|
| Contrôle anti-robot JavaScript (`aes.js`, cookie `__test`) sur toutes les URL, désactivation impossible | `curl`, scripts, webhooks, supervision, applications mobiles et services externes reçoivent du HTML au lieu du JSON. Seuls les navigateurs réels fonctionnent. |
| Appels depuis un autre domaine bloqués par le même contrôle | **Frontend et API doivent partager le même domaine.** Un frontend hébergé ailleurs ne pourra pas appeler l'API. |
| Le service est destiné aux sites web, pas à l'hébergement d'API | Risque de suspension ou de restriction, sans recours pour contourner. À accepter explicitement pour une phase de lancement ; sinon prévoir un hébergement adapté. |
| Base MySQL accessible uniquement par du PHP hébergé ou phpMyAdmin | Aucun test, outil ou connexion externe vers la base. Les contrôles directs passent par phpMyAdmin. |
| Aucun fichier utilisable hors `htdocs` ; écriture limitée à `htdocs` (`open_basedir`) | Impossible de placer les secrets hors racine web. Voir le niveau de protection ci-dessous. |
| Pas de variables d'environnement serveur configurables ; `putenv`, `exec`, `proc_open`, `popen`… désactivées ; chemin de sessions personnalisé interdit | Secrets dans `config/secrets.php`. Le code n'utilise aucune de ces fonctions ; les sessions utilisent le chemin par défaut. |
| Fichiers PHP et JS limités à 1 Mo, `.htaccess` à 10 ko | Sans effet sur ce code. |
| Adresse IP vue par PHP possiblement celle d'un proxy | Tous les visiteurs pourraient partager le même compteur anti-abus. À vérifier avec le préflight, puis régler `CLIENT_IP_HEADER` si l'en-tête est fiable. |
| Quotas de requêtes, sauvegardes et supervision non garantis | Prévoir des exports réguliers de la base via phpMyAdmin. |
| `GET_LOCK`, droits `TRIGGER` et `information_schema` non confirmés | Le préflight vérifie `GET_LOCK` en réel. Sans verrou nommé fonctionnel, **ne pas ouvrir les réservations publiques** : la protection contre les doubles réservations repose dessus. |

### Protection des secrets (sans reposer sur `.htaccess` seul)

1. **Jamais de `.env` dans `htdocs` en production** : le code l'ignore lorsqu'il se trouve sous la racine web (hors `APP_ENV=local`).
2. Utiliser `config/secrets.php`, créé directement sur le serveur (jamais dans Git), copie de `config/secrets.example.php`. Appelé directement par HTTP, il n'affiche rien, même si les règles serveur étaient ignorées. S'il est servi comme texte par erreur, son contenu serait en revanche exposé : vérifier après chaque déploiement que `https://domaine/api/config/secrets.php` renvoie une page vide, 403 ou 404, jamais du code PHP.
3. `.htaccess` à la racine de `api/` et dans chaque dossier interne (défense en profondeur, `Require all denied`).
4. Les journaux sont écrits dans `storage/logs/app.log.php`, qui s'arrête dès la première ligne.
5. Privilèges SQL minimaux : l'utilisateur de l'API n'a besoin d'aucun droit DDL. Sur l'offre gratuite, les identifiants de base semblent liés au compte (à confirmer dans le panneau) : privilégier **un compte distinct** pour la base de contrôle afin de ne partager aucun identifiant avec la production.
6. Secrets différents entre contrôle et production : `APP_KEY`, mot de passe de base, jeton de préflight, comptes administrateurs.

**Conséquence assumée** : sur cet hébergement, le secret de base reste dans la racine web. Il est protégé par l'exécution PHP et les règles serveur, mais ce niveau est inférieur à un stockage hors racine. Si un hébergeur le permet, utiliser de vraies variables d'environnement.

## 2. Portabilité

Aucun code ne dépend d'InfinityFree. Pour migrer :

1. Copier `api/` (sans `tests/`, `database/`, `*.md`).
2. Fournir les réglages par variables d'environnement ou `config/secrets.php`. `DB_HOST` peut être `localhost` ailleurs.
3. Activer TLS vers la base si l'hébergeur l'exige : `DB_SSL_CA`.
4. Exporter/importer la base avec ses 16 tables (structure + données) sans transformation.
5. Régler `CORS_ORIGIN`, `SESSION_COOKIE_PATH` (`/api` par défaut) et, derrière un proxy de confiance, `CLIENT_IP_HEADER`.
6. Relancer le préflight sur une API de contrôle équivalente.

Sur un hébergeur avec processus PHP persistants ou CLI, les tests `api/tests/run.php`, `rate.php` et `http.php` s'exécutent sans changement.

## 3. Fichiers à publier

À publier dans `htdocs/api/` : `index.php`, `.htaccess`, `config/` (sans `secrets.example.php` s'il n'est pas voulu), `controllers/`, `middleware/`, `routes/`, `services/`, `utils/`, `storage/` (avec ses `.htaccess` et deux sous-dossiers vides).

**Ne pas publier** : `tests/`, `database/` (anciens scripts d'une autre structure), `README.md`, `DEPLOYMENT.md`, `.env`, `.env.example`, journaux locaux.

Le frontend compilé et l'API doivent se trouver sous le **même nom de domaine**. Le routage de l'application React nécessite une règle de repli vers `index.html` hors `/api` : c'est une opération de déploiement du frontend, non traitée ici.

## 4. Configuration de l'API de contrôle (sous-domaine ou compte distinct)

Créer un second site (sous-domaine) ou, préférablement, un second compte, avec :

```php
// config/secrets.php de CONTRÔLE (exemple de forme, valeurs à générer hors conversation)
return [
    'APP_ENV' => 'production',
    'APP_ROLE' => 'control',
    'APP_KEY' => '<au moins 32 caractères aléatoires, différent de la production>',
    'CORS_ORIGIN' => 'https://<domaine-de-controle>',
    'DB_HOST' => '<hôte SQL indiqué par le panneau, pas localhost>',
    'DB_NAME' => '<base de contrôle>',
    'DB_USER' => '<utilisateur>',
    'DB_PASS' => '<mot de passe>',
    'CONTROL_DB_NAME' => '<base de contrôle>',
    'PREFLIGHT_TOKEN' => '<au moins 32 caractères aléatoires>',
    'RATE_LIMIT_BOOKINGS' => '100',
    'RATE_LIMIT_QUOTES' => '100',
    'RATE_LIMIT_LOGIN' => '50',
];
```

Les secrets s'écrivent dans le fichier serveur, jamais dans une commande, une issue, un rapport ou Git. Le préflight n'existe que si `APP_ROLE=control` et que le jeton fait au moins 32 caractères ; ailleurs il répond comme une route inconnue. Le supprimer en retirant le jeton après usage.

## 5. Préparation de la base de contrôle (manuelle, après déploiement)

Ne jamais pointer la base de contrôle vers la production. À faire dans phpMyAdmin du compte de contrôle :

1. Créer une base vide dédiée.
2. Depuis phpMyAdmin de la production, **exporter en lecture** : structure des 16 tables, plus les données de `packages` et `platform_settings` seulement. Ne pas exporter `customers`, `businesses`, `bookings`, `booking_sessions`, `booking_participants`, `booking_status_history`, `quote_requests`, `payments`, `activity_logs`, `notification_logs`, `customer_consents`, `admin_users`.
3. Importer ce fichier dans la base de contrôle uniquement.
4. Exécuter les instructions suivantes **dans la base de contrôle uniquement**, après relecture :

```sql
INSERT INTO platform_settings (setting_key, setting_value, setting_group, is_public)
VALUES ('environment_marker', 'control', 'system', 0);

-- Ouvertures de test : répéter pour weekday 0 à 6 et pour les deux modes
INSERT INTO availability_rules (weekday, mode, start_time, end_time, is_active)
VALUES (0, 'in_person', '09:00:00', '18:00:00', 1), (0, 'remote', '09:00:00', '18:00:00', 1);

-- Compte administrateur de test ; hash généré localement
INSERT INTO admin_users (name, email, password_hash, role, is_active)
VALUES ('Contrôle', 'controle@example.invalid', '<hash>', 'admin', 1);
```

Hash du mot de passe de test, sans l'écrire dans la commande :

```text
php -r "echo password_hash(trim(fgets(STDIN)), PASSWORD_DEFAULT);"
```

Un compte `manager` de test peut être ajouté pour vérifier son refus. Vérifier que `business_timezone` vaut `Africa/Lome`.

5. Ouvrir le préflight depuis un navigateur ou via les tests : il doit confirmer le rôle, le nom de la base attendue, le marqueur, les 16 tables, `GET_LOCK`, six formules actives et des règles actives pour les deux modes.

## 6. Exécution des tests d'intégration

Les tests s'exécutent depuis votre machine avec Playwright (déjà installé) ; un navigateur réel passe le contrôle anti-robot. Dans CMD, définir les variables du processus (ne pas les enregistrer dans un fichier versionné), puis :

```text
npx playwright test -c api\tests\integration\playwright.config.ts
```

| Variable | Contenu |
|---|---|
| `OCD_TEST_CONFIRM_ISOLATED` | `YES` seulement après vérification de la cible |
| `OCD_TEST_API_URL` | `https://<domaine-de-controle>/api` |
| `OCD_TEST_PREFLIGHT_TOKEN` | jeton du `secrets.php` de contrôle |
| `OCD_TEST_EXPECT_DB` | nom exact de la base de contrôle |
| `OCD_PRODUCTION_DB` | nom de la base de production, pour refus explicite |
| `OCD_TEST_FORBIDDEN_HOSTS` | domaines de production, séparés par des virgules |
| `OCD_TEST_ADMIN_EMAIL`, `OCD_TEST_ADMIN_PASSWORD` | compte administrateur de test |
| `OCD_TEST_DATE` | date future ouverte aux deux modes ; créneaux 09:00, 11:00 et 16:00 libres |
| `OCD_TEST_MONTHLY_DATES` | quatre dates futures distinctes, ouvertes à distance, créneau 14:00 libre |
| `OCD_TEST_MANAGER_EMAIL`, `OCD_TEST_MANAGER_PASSWORD` | facultatifs, pour vérifier le refus du rôle `manager` |
| `OCD_TEST_ROLLBACK_TRIGGER` | `YES` seulement si le déclencheur de l'étape 8 est installé |

Sans confirmation, tous les tests sont ignorés et aucune requête n'est envoyée. Les tests s'arrêtent si l'URL n'est pas HTTPS, si l'hôte est interdit, si le préflight n'est pas valide ou si la base n'est pas celle attendue. Un rapport `test-results\api-integration-report.json` liste les références créées, sans données personnelles ni secrets.

Si le contrôle anti-robot bloque quand même les requêtes, les tests échouent avec un message explicite : dans ce cas, la validation par navigateur automatisé n'est pas possible sur cet hébergement.

## 7. Vérifications directes dans phpMyAdmin (lecture seule)

Remplacer `<NONCE>` par la valeur du rapport. Ces requêtes n'écrivent rien.

```sql
-- Doublons de séance ou chevauchements actifs par mode
SELECT a.id, b.id AS autre
FROM booking_sessions a
JOIN bookings ba ON ba.id = a.booking_id
JOIN booking_sessions b ON a.id < b.id AND a.start_at < b.end_at AND a.end_at > b.start_at
JOIN bookings bb ON bb.id = b.booking_id AND bb.mode = ba.mode
WHERE a.status = 'scheduled' AND b.status = 'scheduled'
  AND ba.status IN ('pending','confirmed','awaiting_payment') AND bb.status IN ('pending','confirmed','awaiting_payment');

-- Clients ou entreprises sans réservation ni devis (rollback)
SELECT 'customers' AS table_name, COUNT(*) FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = c.id) AND NOT EXISTS (SELECT 1 FROM quote_requests q WHERE q.customer_id = c.id)
UNION ALL
SELECT 'businesses', COUNT(*) FROM businesses x
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.business_id = x.id) AND NOT EXISTS (SELECT 1 FROM quote_requests q WHERE q.business_id = x.id);

-- Entreprise appartenant à un autre client que la réservation
SELECT b.id FROM bookings b JOIN businesses x ON x.id = b.business_id WHERE x.customer_id <> b.customer_id;

-- Séances et prix du Mensuel pour les données de test
SELECT b.reference, b.total_amount, COUNT(s.id) AS seances
FROM bookings b JOIN customers c ON c.id = b.customer_id LEFT JOIN booking_sessions s ON s.booking_id = b.id
WHERE c.last_name LIKE CONCAT('%', '<NONCE>') GROUP BY b.id;

-- Demandes Premium sans montant
SELECT reference, proposed_amount FROM quote_requests WHERE proposed_amount IS NOT NULL;
```

Résultats attendus : aucune ligne pour les trois contrôles d'anomalie, quatre séances et 54 000.00 pour le Mensuel, aucune demande Premium avec montant.

## 8. Test de rollback réel (facultatif, base de contrôle uniquement)

Le droit `TRIGGER` peut manquer sur l'hébergement gratuit : sans lui, ce test reste non validé et doit être signalé comme tel. Après accord distinct, dans la base de contrôle :

```sql
DELIMITER $$
CREATE TRIGGER ocd_control_forced_failure BEFORE INSERT ON booking_status_history
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.id = NEW.booking_id AND c.last_name LIKE 'Rollback %') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced failure for rollback test';
  END IF;
END$$
DELIMITER ;
```

Lancer avec `OCD_TEST_ROLLBACK_TRIGGER=YES`, puis supprimer immédiatement : `DROP TRIGGER ocd_control_forced_failure;`. Le test attend une erreur générique 500 et l'absence de lignes partielles (requête de contrôle de l'étape 7).

## 9. Fin des tests

1. Retirer `PREFLIGHT_TOKEN` du serveur de contrôle ou supprimer le site.
2. Supprimer l'API et la base de contrôle, ou conserver les données dans un environnement non public.
3. Ne rien rejouer sur la production sans validation distincte.
4. Les enregistrements de test ne sont jamais nettoyés par un script automatique.

## 10. Avant l'ouverture publique

- Aucun test d'écriture n'a été exécuté sur une base réelle tant que le préflight et les scénarios de contrôle n'ont pas réussi.
- Décider du risque d'hébergement d'une API sur l'offre gratuite ou migrer.
- Vérifier le comportement réel de `REMOTE_ADDR`, des sessions, des journaux et de `GET_LOCK`.
- Valider les règles métier ouvertes : horaires, capacité, durée de blocage d'`awaiting_payment` et conditions de confirmation.
- Prévoir sauvegardes et supervision de la base.
