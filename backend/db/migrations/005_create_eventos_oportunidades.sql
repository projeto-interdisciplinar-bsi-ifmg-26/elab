-- Migration 005: Eventos e Oportunidades (ambos 1:N a partir de Entidades_Parceiras)
-- O diagrama indica "1 more..." em Oportunidades; incluimos 'status' e 'data_postagem'
-- coerentes com o uso atual do backend.

CREATE TABLE IF NOT EXISTS `Eventos` (
  `idEvento`                           INT NOT NULL AUTO_INCREMENT,
  `Entidade_Parceira_idEntidade_Parceira` INT NOT NULL,
  `titulo`                             VARCHAR(255) NOT NULL,
  `descricao`                          VARCHAR(255) NULL,
  `tipo`                               VARCHAR(45) NULL,
  `data_postagem`                      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idEvento`),
  KEY `idx_eventos_entidade` (`Entidade_Parceira_idEntidade_Parceira`),
  CONSTRAINT `fk_eventos_entidade`
    FOREIGN KEY (`Entidade_Parceira_idEntidade_Parceira`)
    REFERENCES `Entidades_Parceiras` (`idEntidade_Parceira`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Oportunidades` (
  `idOportunidade`                        INT NOT NULL AUTO_INCREMENT,
  `Entidade_Parceira_idEntidade_Parceira` INT NOT NULL,
  `titulo`                                VARCHAR(255) NOT NULL,
  `descricao`                             VARCHAR(255) NULL,
  `tipo`                                  VARCHAR(45) NOT NULL,
  `local`                                 VARCHAR(255) NULL,
  `status`                                ENUM('ativo', 'agendado', 'encerrado') NOT NULL DEFAULT 'ativo',
  `data_postagem`                         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idOportunidade`),
  KEY `idx_oportunidades_entidade` (`Entidade_Parceira_idEntidade_Parceira`),
  CONSTRAINT `fk_oportunidades_entidade`
    FOREIGN KEY (`Entidade_Parceira_idEntidade_Parceira`)
    REFERENCES `Entidades_Parceiras` (`idEntidade_Parceira`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
