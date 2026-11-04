-- Migration 018: requisitos da vaga por ID de habilidade, com peso.
-- Sao as arestas vaga -> habilidade do grafo de match.
-- importancia: 1 (desejavel) a 5 (essencial).
CREATE TABLE IF NOT EXISTS `Oportunidades_Habilidades` (
  `Oportunidade_idOportunidade` INT NOT NULL,
  `Habilidade_idHabilidades`    INT NOT NULL,
  `importancia`                 TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `obrigatoria`                 TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Oportunidade_idOportunidade`, `Habilidade_idHabilidades`),
  KEY `idx_oh_habilidade` (`Habilidade_idHabilidades`),
  CONSTRAINT `chk_oh_importancia` CHECK (`importancia` BETWEEN 1 AND 5),
  CONSTRAINT `fk_oh_oportunidade`
    FOREIGN KEY (`Oportunidade_idOportunidade`) REFERENCES `Oportunidades` (`idOportunidade`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_oh_habilidade`
    FOREIGN KEY (`Habilidade_idHabilidades`) REFERENCES `Habilidades` (`idHabilidades`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
