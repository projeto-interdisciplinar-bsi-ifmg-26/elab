-- Migration 019: garante colunas de Profissionais que a 003 declara mas o banco legado nao tem.
-- Idempotente: so adiciona a coluna se ela ainda nao existir.
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Profissionais' AND COLUMN_NAME = 'telefone');
SET @s := IF(@c = 0, 'ALTER TABLE `Profissionais` ADD COLUMN `telefone` VARCHAR(45) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Profissionais' AND COLUMN_NAME = 'estado');
SET @s := IF(@c = 0, 'ALTER TABLE `Profissionais` ADD COLUMN `estado` CHAR(2) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Profissionais' AND COLUMN_NAME = 'link_github');
SET @s := IF(@c = 0, 'ALTER TABLE `Profissionais` ADD COLUMN `link_github` VARCHAR(255) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Profissionais' AND COLUMN_NAME = 'link_linkedin');
SET @s := IF(@c = 0, 'ALTER TABLE `Profissionais` ADD COLUMN `link_linkedin` VARCHAR(255) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
