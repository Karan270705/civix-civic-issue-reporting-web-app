-- ─── Civix Database Schema ──────────────────────────────────────────────────
-- Run this file once to set up the database.
-- Compatible with MySQL 5.7+ and MariaDB 10.3+
-- 
-- Steps:
--   1. Open phpMyAdmin (http://localhost/phpmyadmin) or MySQL CLI
--   2. Create database: CREATE DATABASE civix_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   3. Select civix_db and run this file

CREATE DATABASE IF NOT EXISTS civix_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE civix_db;

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- Fields align with Angular frontend User model:
--   id, username, email, bio, profile_image, created_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    username      VARCHAR(30)     NOT NULL,
    email         VARCHAR(255)    NOT NULL,
    password      VARCHAR(255)    NOT NULL,    -- bcrypt hash (never plaintext)
    bio           TEXT            DEFAULT NULL,
    profile_image TEXT            DEFAULT NULL, -- URL to avatar image
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_email    (email),
    UNIQUE KEY uq_username (username),
    INDEX  idx_email       (email)          -- fast lookup on login
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- ISSUES
-- Aligns with Angular Issue model:
--   id, title, description, image_url, location, lat, lng,
--   category, status, created_by (FK), created_at, vote_count
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issues (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    title         VARCHAR(120)    NOT NULL,
    description   TEXT            NOT NULL,
    image_url     TEXT            DEFAULT NULL,
    location      VARCHAR(255)    NOT NULL,
    lat           DECIMAL(10, 6)  DEFAULT NULL,
    lng           DECIMAL(10, 6)  DEFAULT NULL,
    category      ENUM('pothole','garbage','water','electricity','other') NOT NULL DEFAULT 'other',
    status        ENUM('reported','verified','in_progress','resolved')    NOT NULL DEFAULT 'reported',
    vote_count    INT             NOT NULL DEFAULT 0,
    created_by    INT UNSIGNED    NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX  idx_status     (status),
    INDEX  idx_category   (category),
    INDEX  idx_created_by (created_by),
    INDEX  idx_created_at (created_at),
    CONSTRAINT fk_issues_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- VOTES
-- Tracks per-user votes to prevent duplicate voting.
-- Aligns with angular Issue.user_vote ('up' | 'down' | null)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS votes (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    issue_id   INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    vote_type  ENUM('up','down') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_vote (issue_id, user_id),   -- one vote per user per issue
    CONSTRAINT fk_votes_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    CONSTRAINT fk_votes_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- SOLUTIONS
-- Aligns with Angular Solution model:
--   id, issue_id, user_id, solution_text, upvotes, is_accepted, created_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS solutions (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    issue_id      INT UNSIGNED NOT NULL,
    user_id       INT UNSIGNED NOT NULL,
    solution_text TEXT         NOT NULL,
    upvotes       INT          NOT NULL DEFAULT 0,
    is_accepted   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_sol_issue   (issue_id),
    INDEX idx_sol_user    (user_id),
    CONSTRAINT fk_sol_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    CONSTRAINT fk_sol_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- COMMENTS
-- Aligns with Angular Comment model:
--   id, issue_id, user_id, text, created_at, username
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comments (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    issue_id   INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    text       TEXT         NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_cmt_issue (issue_id),
    CONSTRAINT fk_cmt_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    CONSTRAINT fk_cmt_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
