-- OCD Live — schéma MySQL 8 (utf8mb4). InnoDB requis pour les transactions.
CREATE DATABASE IF NOT EXISTS ocd_live CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ocd_live;

CREATE TABLE customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  whatsapp VARCHAR(40) NULL,
  email VARCHAR(190) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customers_email (email)
) ENGINE=InnoDB;

CREATE TABLE businesses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(190) NOT NULL,
  sector VARCHAR(120) NULL,
  country VARCHAR(100) NULL,
  city VARCHAR(120) NULL,
  address VARCHAR(255) NULL,
  description TEXT NULL,
  offerings TEXT NULL,
  social_links VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE packages (
  id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  price INT UNSIGNED NULL COMMENT 'NULL = tarif sur demande',
  currency CHAR(3) NOT NULL DEFAULT 'XOF',
  duration_minutes SMALLINT UNSIGNED NULL COMMENT 'NULL = durée à convenir',
  sessions_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
  tier VARCHAR(20) NOT NULL DEFAULT 'standard',
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(24) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  business_id BIGINT UNSIGNED NULL,
  package_id VARCHAR(40) NOT NULL,
  mode ENUM('in-person','remote') NOT NULL,
  start_at DATETIME NOT NULL COMMENT 'UTC',
  end_at DATETIME NOT NULL COMMENT 'UTC',
  timezone VARCHAR(60) NOT NULL DEFAULT 'Africa/Lome',
  status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_booking_business FOREIGN KEY (business_id) REFERENCES businesses(id),
  CONSTRAINT fk_booking_package FOREIGN KEY (package_id) REFERENCES packages(id),
  INDEX idx_booking_mode_start (mode, start_at),
  INDEX idx_booking_status (status)
) ENGINE=InnoDB;

CREATE TABLE booking_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  session_number TINYINT UNSIGNED NOT NULL,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  status ENUM('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  UNIQUE KEY uq_session (booking_id, session_number),
  CONSTRAINT fk_session_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB;

-- Règles d'ouverture : à renseigner quand les horaires seront confirmés.
CREATE TABLE availability_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mode ENUM('in-person','remote') NULL COMMENT 'NULL = les deux modes',
  weekday TINYINT NOT NULL COMMENT '0 = dimanche',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  INDEX idx_rules_day (weekday, mode)
) ENGINE=InnoDB;

CREATE TABLE availability_exceptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mode ENUM('in-person','remote') NULL,
  date DATE NOT NULL,
  reason VARCHAR(190) NULL,
  INDEX idx_exceptions_date (date, mode)
) ENGINE=InnoDB;

CREATE TABLE resources (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  mode ENUM('in-person','remote') NULL,
  name VARCHAR(120) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE quote_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  business_name VARCHAR(190) NULL,
  sector VARCHAR(120) NULL,
  country VARCHAR(100) NULL,
  city VARCHAR(120) NULL,
  notes TEXT NULL,
  status ENUM('pending','contacted','closed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
