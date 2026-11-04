-- Migration 014: formacao academica
CREATE TABLE IF NOT EXISTS `Formacoes_Academicas` (
  `idFormacao`                    INT NOT NULL AUTO_INCREMENT,
  `Profissionais_idProfissionais` INT NOT NULL,
  `instituicao`                   VARCHAR(150) NOT NULL,
  `curso`                         VARCHAR(150) NOT NULL,
  `grau`                          ENUM('tecnico','graduacao','pos','mestrado','doutorado','bootcamp','curso_livre') NOT NULL,
  `status`                        ENUM('concluido','cursando','trancado') NOT NULL DEFAULT 'concluido',
  `data_inicio`                   DATE NULL,
  `data_fim`                      DATE NULL,
  PRIMARY KEY (`idFormacao`),
  KEY `idx_form_profissional` (`Profissionais_idProfissionais`),
  CONSTRAINT `fk_form_profissional`
    FOREIGN KEY (`Profissionais_idProfissionais`) REFERENCES `Profissionais` (`idProfissionais`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
