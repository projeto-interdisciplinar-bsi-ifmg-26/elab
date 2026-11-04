-- Migration 016: areas de TI de interesse da profissional (N:N com Areas_Atuacao)
-- interesse: 1 (pouco) a 5 (muito). Vira peso no match.
CREATE TABLE IF NOT EXISTS `Profissional_Areas` (
  `Profissionais_idProfissionais` INT NOT NULL,
  `Area_idArea`                   INT NOT NULL,
  `interesse`                     TINYINT UNSIGNED NOT NULL DEFAULT 3,
  PRIMARY KEY (`Profissionais_idProfissionais`, `Area_idArea`),
  KEY `idx_pa_area` (`Area_idArea`),
  CONSTRAINT `chk_pa_interesse` CHECK (`interesse` BETWEEN 1 AND 5),
  CONSTRAINT `fk_pa_profissional`
    FOREIGN KEY (`Profissionais_idProfissionais`) REFERENCES `Profissionais` (`idProfissionais`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pa_area`
    FOREIGN KEY (`Area_idArea`) REFERENCES `Areas_Atuacao` (`idArea`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
