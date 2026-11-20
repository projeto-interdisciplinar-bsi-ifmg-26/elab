-- Migration 021: foto de perfil (arquivo WebP aleatorio em backend/uploads/fotos).
-- Idempotente: so adiciona a coluna se ela ainda nao existir.
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuarios' AND COLUMN_NAME = 'foto_arquivo');
SET @s := IF(@c = 0, 'ALTER TABLE `Usuarios` ADD COLUMN `foto_arquivo` VARCHAR(255) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
