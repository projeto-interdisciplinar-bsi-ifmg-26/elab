-- Migration 023: moderacao das publicacoes (fila do admin).
-- Idempotente: cada coluna so e adicionada se ainda nao existir.
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Oportunidades' AND COLUMN_NAME = 'status_moderacao');
SET @s := IF(@c = 0, 'ALTER TABLE `Oportunidades` ADD COLUMN `status_moderacao` ENUM(''pendente'',''aprovada'',''rejeitada'') NOT NULL DEFAULT ''pendente''', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Oportunidades' AND COLUMN_NAME = 'motivo_moderacao');
SET @s := IF(@c = 0, 'ALTER TABLE `Oportunidades` ADD COLUMN `motivo_moderacao` VARCHAR(255) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Oportunidades' AND COLUMN_NAME = 'moderada_em');
SET @s := IF(@c = 0, 'ALTER TABLE `Oportunidades` ADD COLUMN `moderada_em` DATETIME NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
