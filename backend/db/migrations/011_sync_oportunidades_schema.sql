-- Migration 011: alinha Oportunidades com o schema real usado pelo backend.
-- Idempotente: no banco que ja tem a coluna `data`, nao faz nada de novo.
ALTER TABLE `Oportunidades`
  MODIFY COLUMN `descricao` TEXT NULL,
  MODIFY COLUMN `tipo` ENUM('vaga','evento','palestra','bolsa') NOT NULL;

SET @existe := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Oportunidades'
    AND COLUMN_NAME = 'data'
);
SET @sql := IF(@existe = 0,
  'ALTER TABLE `Oportunidades` ADD COLUMN `data` DATE NULL AFTER `local`',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
