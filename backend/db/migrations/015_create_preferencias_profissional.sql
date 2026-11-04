-- Migration 015: preferencias de busca (1:1 com Profissionais)
CREATE TABLE IF NOT EXISTS `Preferencias_Profissional` (
  `Profissionais_idProfissionais` INT NOT NULL,
  `modalidade`                    ENUM('remoto','hibrido','presencial','indiferente') NOT NULL DEFAULT 'indiferente',
  `aceita_clt`                    TINYINT(1) NOT NULL DEFAULT 1,
  `aceita_pj`                     TINYINT(1) NOT NULL DEFAULT 1,
  `aceita_estagio`                TINYINT(1) NOT NULL DEFAULT 0,
  `pretensao_min`                 DECIMAL(10,2) NULL,
  `aceita_mudar_cidade`           TINYINT(1) NOT NULL DEFAULT 0,
  `interesse_vagas`               TINYINT(1) NOT NULL DEFAULT 1,
  `interesse_eventos`             TINYINT(1) NOT NULL DEFAULT 1,
  `interesse_palestras`           TINYINT(1) NOT NULL DEFAULT 1,
  `interesse_bolsas`              TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`Profissionais_idProfissionais`),
  CONSTRAINT `fk_pref_profissional`
    FOREIGN KEY (`Profissionais_idProfissionais`) REFERENCES `Profissionais` (`idProfissionais`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
