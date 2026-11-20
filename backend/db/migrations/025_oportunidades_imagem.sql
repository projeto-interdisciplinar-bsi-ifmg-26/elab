-- Migration 025: imagem (banner) das publicacoes.
-- Idempotente: a coluna so e adicionada se ainda nao existir.
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Oportunidades' AND COLUMN_NAME = 'imagem_arquivo');
SET @s := IF(@c = 0, 'ALTER TABLE `Oportunidades` ADD COLUMN `imagem_arquivo` VARCHAR(255) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
