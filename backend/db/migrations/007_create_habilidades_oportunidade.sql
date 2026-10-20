-- Migration 007: Tabela de juncao N:N entre Oportunidades e Habilidades
-- Esta tabela permite que cada vaga/evento exija multiplas habilidades
-- e que uma habilidade esteja presente em varias oportunidades.

CREATE TABLE IF NOT EXISTS `Habilidades_Oportunidade` (
  `oportunidadeId` INT NOT NULL,
  `habilidade` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`oportunidadeId`, `habilidade`),
  CONSTRAINT `fk_ho_oportunidade`
    FOREIGN KEY (`oportunidadeId`) REFERENCES `Oportunidades` (`idOportunidade`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
