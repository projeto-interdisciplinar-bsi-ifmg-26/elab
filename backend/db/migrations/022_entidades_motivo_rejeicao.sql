-- Migration 022: motivo da rejeicao do cadastro de empresa (preenchido pelo admin).
-- Idempotente: so adiciona a coluna se ela ainda nao existir.
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Entidades_Parceiras' AND COLUMN_NAME = 'motivo_rejeicao');
SET @s := IF(@c = 0, 'ALTER TABLE `Entidades_Parceiras` ADD COLUMN `motivo_rejeicao` VARCHAR(255) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
