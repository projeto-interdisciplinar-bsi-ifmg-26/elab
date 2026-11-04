-- Migration 012: perfil completo da profissional (estilo Indeed)
ALTER TABLE `Profissionais`
  ADD COLUMN `titulo_profissional`      VARCHAR(120) NULL AFTER `area`,
  ADD COLUMN `resumo`                   TEXT NULL AFTER `bio`,
  ADD COLUMN `nivel`                    ENUM('estagio','junior','pleno','senior','especialista') NULL,
  ADD COLUMN `anos_experiencia`         TINYINT UNSIGNED NULL,
  ADD COLUMN `disponibilidade`          ENUM('imediata','15_dias','30_dias','empregada_aberta','nao_procurando') NOT NULL DEFAULT 'imediata',
  ADD COLUMN `link_portfolio`           VARCHAR(255) NULL,
  ADD COLUMN `curriculo_arquivo`        VARCHAR(255) NULL,
  ADD COLUMN `curriculo_nome_original`  VARCHAR(255) NULL,
  ADD COLUMN `curriculo_atualizado_em`  DATETIME NULL,
  ADD COLUMN `perfil_publico`           TINYINT(1) NOT NULL DEFAULT 1;
