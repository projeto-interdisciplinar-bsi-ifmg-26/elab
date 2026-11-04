-- Migration 008: adiciona categoria as Habilidades (ex: linguagem, framework, banco, cloud, soft)
ALTER TABLE `Habilidades`
  ADD COLUMN `categoria` VARCHAR(50) NULL AFTER `nome_habilidade`,
  ADD KEY `idx_habilidades_categoria` (`categoria`);
