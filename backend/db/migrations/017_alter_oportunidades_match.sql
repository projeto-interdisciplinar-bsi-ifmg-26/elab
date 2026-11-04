-- Migration 017: campos da vaga usados no match
ALTER TABLE `Oportunidades`
  ADD COLUMN `Area_idArea`  INT NULL,
  ADD COLUMN `nivel`        ENUM('estagio','junior','pleno','senior','especialista','qualquer') NOT NULL DEFAULT 'qualquer',
  ADD COLUMN `modalidade`   ENUM('remoto','hibrido','presencial') NULL,
  ADD COLUMN `salario_min`  DECIMAL(10,2) NULL,
  ADD COLUMN `salario_max`  DECIMAL(10,2) NULL,
  ADD KEY `idx_oport_area` (`Area_idArea`),
  ADD CONSTRAINT `fk_oport_area`
    FOREIGN KEY (`Area_idArea`) REFERENCES `Areas_Atuacao` (`idArea`)
    ON DELETE SET NULL ON UPDATE CASCADE;
