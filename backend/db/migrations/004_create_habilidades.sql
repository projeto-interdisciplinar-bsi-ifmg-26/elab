-- Migration 004: Habilidades (catalogo) e tabela de juncao N:N com Profissionais

CREATE TABLE IF NOT EXISTS `Habilidades` (
  `idHabilidades`   INT NOT NULL AUTO_INCREMENT,
  `nome_habilidade` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`idHabilidades`),
  UNIQUE KEY `uq_habilidade_nome` (`nome_habilidade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Habilidades_Profissional` (
  `Profissionais_idProfissionais` INT NOT NULL,
  `Habilidades_idHabilidades`     INT NOT NULL,
  `tempo_experiencia_anos`        INT NULL,
  PRIMARY KEY (`Profissionais_idProfissionais`, `Habilidades_idHabilidades`),
  KEY `idx_hp_habilidade` (`Habilidades_idHabilidades`),
  CONSTRAINT `fk_hp_profissional`
    FOREIGN KEY (`Profissionais_idProfissionais`) REFERENCES `Profissionais` (`idProfissionais`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hp_habilidade`
    FOREIGN KEY (`Habilidades_idHabilidades`) REFERENCES `Habilidades` (`idHabilidades`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
