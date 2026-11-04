-- Migration 010: arestas do GRAFO DE HABILIDADES (nao direcionado, ponderado).
-- Cada aresta e guardada uma unica vez. A ordem Habilidade_A < Habilidade_B
-- e garantida pelo codigo (seed e services), nao pelo banco.
CREATE TABLE IF NOT EXISTS `Habilidades_Relacionadas` (
  `Habilidade_A` INT NOT NULL,
  `Habilidade_B` INT NOT NULL,
  `peso`         DECIMAL(3,2) NOT NULL,
  PRIMARY KEY (`Habilidade_A`, `Habilidade_B`),
  KEY `idx_hr_b` (`Habilidade_B`),
  CONSTRAINT `chk_hr_peso` CHECK (`peso` > 0 AND `peso` <= 1),
  CONSTRAINT `fk_hr_a` FOREIGN KEY (`Habilidade_A`) REFERENCES `Habilidades` (`idHabilidades`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hr_b` FOREIGN KEY (`Habilidade_B`) REFERENCES `Habilidades` (`idHabilidades`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
