-- Migration 002: Entidades_Parceiras (1:1 com Usuarios)

CREATE TABLE IF NOT EXISTS `Entidades_Parceiras` (
  `idEntidade_Parceira` INT NOT NULL AUTO_INCREMENT,
  `Usuario_idUsuario`   INT NOT NULL,
  `nome_organizacao`    VARCHAR(255) NOT NULL,
  `descricao`           VARCHAR(255) NULL,
  `cnpj`                VARCHAR(14) NOT NULL,
  `tipo_entidade`       VARCHAR(45) NULL,
  `status_aprovacao`    ENUM('pendente', 'aprovada', 'rejeitada') NOT NULL DEFAULT 'pendente',
  PRIMARY KEY (`idEntidade_Parceira`),
  UNIQUE KEY `uq_entidade_usuario` (`Usuario_idUsuario`),
  UNIQUE KEY `uq_entidade_cnpj` (`cnpj`),
  CONSTRAINT `fk_entidade_usuario`
    FOREIGN KEY (`Usuario_idUsuario`) REFERENCES `Usuarios` (`idUsuario`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
