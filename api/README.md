# OCD Live — API

API REST en PHP natif (≥ 8.2), PDO + MySQL 8, échanges JSON. Pas de framework.

## Prérequis

- PHP ≥ 8.2 avec extensions `pdo_mysql`, `mbstring`, `json`.
- MySQL 8+ (InnoDB requis : transactions pour les réservations).

## Installation

```bash
cp .env.example .env          # renseigner DB_* et CORS_ORIGIN
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
php -S 127.0.0.1:8000 -t .   # démarrage local
```

En Apache, le `.htaccess` route tout vers `index.php` et interdit `config/`, `storage/`, `database/`, etc.

## Endpoints

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/packages` | Six formules actives |
| GET | `/api/availability?mode=&date=` (`&package_id|duration`) | Fenêtres d'ouverture + créneaux occupés |
| POST | `/api/bookings` | Demande de réservation (transaction + verrou anti-conflit) |
| POST | `/api/quotes` | Demande de devis Premium |

Réponses : `{success, message, data|errors}` — codes 200/201/400/404/405/409/422/429/500.

### POST /api/bookings — corps

```json
{
  "first_name": "Ama", "last_name": "Mensah",
  "email": "ama@example.com", "phone": "+22890000000", "whatsapp": "+22890000000",
  "package_id": "demo-discovery", "mode": "remote",
  "date": "2026-12-01", "time": "10:15",
  "business": {"name": "Atelier Ama", "sector": "Mode", "country": "Togo", "city": "Lomé", "address": "", "description": "", "offerings": "", "social": ""},
  "location": "Mon atelier", "connection": "Fibre"
}
```

Le champ `website` sert de honeypot anti-spam : rempli, la requête est acceptée mais rien n'est enregistré.

## Sécurité

Requêtes préparées PDO, validation serveur (`utils/Validator`), CORS restreint à `CORS_ORIGIN`, rate-limit par IP (fichiers dans `storage/rate-limit`), messages génériques, erreurs journalisées dans `storage/logs/app.log`, `.env` hors Git, verrou nommé MySQL `GET_LOCK` + transaction InnoDB contre les doubles réservations, statut `pending` jamais auto-confirmé.

## Décisions métier en attente

- Jours/heures d'ouverture (`availability_rules` vide : `/api/availability` répond `unconfigured` plutôt que d'inventer des créneaux).
- Horizon de réservation, capacités par mode (`resources`), indisponibilités.
- Conditions de passage `pending → confirmed`.
- Tarif et contenu du Premium (canal `quotes` seulement).
