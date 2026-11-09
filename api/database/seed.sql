-- OCD Live — données initiales : les six formules validées côté frontend.
-- Premium : prix et durée NULL = « tarif sur demande » (non chiffré).
USE ocd_live;

INSERT INTO packages (id, name, description, price, currency, duration_minutes, sessions_count, tier, active, sort_order) VALUES
('demo-discovery', 'Essentiel', 'Un temps dédié pour présenter votre activité.', 15000, 'XOF', 90, 1, 'standard', 1, 1),
('long-format', 'Long format', 'Davantage de temps pour développer votre présentation.', 32000, 'XOF', 240, 1, 'value', 1, 2),
('premium', 'Premium', 'Parlons de vos objectifs de visibilité.', NULL, 'XOF', NULL, 1, 'premium', 1, 3),
('monthly', 'Mensuel', 'Une présence régulière pour votre activité.', 54000, 'XOF', NULL, 4, 'flexible', 1, 4),
('discovery-proposal', 'Découverte', 'Un format court pour une première prise de parole.', 7500, 'XOF', 45, 1, 'flexible', 1, 5),
('duo-proposal', 'Duo', 'Une session à deux voix pour présenter votre projet.', 15000, 'XOF', 90, 1, 'flexible', 1, 6);

-- Aucune règle d'ouverture n'est insérée : les horaires restent à confirmer.
-- Exemple à adapter lorsque les règles seront validées :
-- INSERT INTO availability_rules (mode, weekday, start_time, end_time) VALUES (NULL, 1, '08:00:00', '18:00:00');
