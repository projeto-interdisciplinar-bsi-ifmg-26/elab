-- Migration 006: tabelas de juncao N:N (inscricoes)
-- Cadastros_Oportunidades: Profissionais <-> Oportunidades
-- Cadastros_Eventos: Profissionais <-> Eventos

CREATE TABLE IF NOT EXISTS `Cadastros_Oportunidades` (
  `Oportunidade_idOportunidade`   INT NOT NULL,
  `Profissionais_idProfissionais` INT NOT NULL,
  `data_aplicacao`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Oportunidade_idOportunidade`, `Profissionais_idProfissionais`),
  KEY `idx_co_profissional` (`Profissionais_idProfissionais`),
  CONSTRAINT `fk_co_oportunidade`
    FOREIGN KEY (`Oportunidade_idOportunidade`) REFERENCES `Oportunidades` (`idOportunidade`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_co_profissional`
    FOREIGN KEY (`Profissionais_idProfissionais`) REFERENCES `Profissionais` (`idProfissionais`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Cadastros_Eventos` (
  `Eventos_idEvento`              INT NOT NULL,
  `Profissionais_idProfissionais` INT NOT NULL,
  `data_aplicacao`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Eventos_idEvento`, `Profissionais_idProfissionais`),
  KEY `idx_ce_profissional` (`Profissionais_idProfissionais`),
  CONSTRAINT `fk_ce_evento`
    FOREIGN KEY (`Eventos_idEvento`) REFERENCES `Eventos` (`idEvento`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ce_profissional`
    FOREIGN KEY (`Profissionais_idProfissionais`) REFERENCES `Profissionais` (`idProfissionais`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
