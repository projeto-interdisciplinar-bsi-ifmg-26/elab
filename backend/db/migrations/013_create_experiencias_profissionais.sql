-- Migration 013: historico de experiencias profissionais
CREATE TABLE IF NOT EXISTS `Experiencias_Profissionais` (
  `idExperiencia`                 INT NOT NULL AUTO_INCREMENT,
  `Profissionais_idProfissionais` INT NOT NULL,
  `cargo`                         VARCHAR(150) NOT NULL,
  `empresa`                       VARCHAR(150) NOT NULL,
  `local`                         VARCHAR(150) NULL,
  `data_inicio`                   DATE NOT NULL,
  `data_fim`                      DATE NULL,
  `atual`                         TINYINT(1) NOT NULL DEFAULT 0,
  `descricao`                     TEXT NULL,
  PRIMARY KEY (`idExperiencia`),
  KEY `idx_exp_profissional` (`Profissionais_idProfissionais`),
  CONSTRAINT `fk_exp_profissional`
    FOREIGN KEY (`Profissionais_idProfissionais`) REFERENCES `Profissionais` (`idProfissionais`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
