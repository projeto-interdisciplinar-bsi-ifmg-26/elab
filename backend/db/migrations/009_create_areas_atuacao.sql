-- Migration 009: arvore de areas de atuacao (auto-referencia: area > subarea)
CREATE TABLE IF NOT EXISTS `Areas_Atuacao` (
  `idArea`          INT NOT NULL AUTO_INCREMENT,
  `nome`            VARCHAR(100) NOT NULL,
  `slug`            VARCHAR(100) NOT NULL,
  `Area_Pai_idArea` INT NULL,
  PRIMARY KEY (`idArea`),
  UNIQUE KEY `uq_area_slug` (`slug`),
  KEY `idx_area_pai` (`Area_Pai_idArea`),
  CONSTRAINT `fk_area_pai`
    FOREIGN KEY (`Area_Pai_idArea`) REFERENCES `Areas_Atuacao` (`idArea`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
