-- Migration 003: Profissionais (1:1 com Usuarios)
-- 'Professionaiscol' do diagrama foi interpretado como 'area' (area de atuacao).

CREATE TABLE IF NOT EXISTS `Profissionais` (
  `idProfissionais`   INT NOT NULL AUTO_INCREMENT,
  `Usuario_idUsuario` INT NOT NULL,
  `nome`              VARCHAR(255) NOT NULL,
  `area`              VARCHAR(255) NULL,
  `bio`               VARCHAR(255) NULL,
  `telefone`          VARCHAR(45) NULL,
  `cidade`            VARCHAR(100) NULL,
  `estado`            ENUM(
                        'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                        'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
                      ) NULL,
  `link_github`       VARCHAR(255) NULL,
  `link_linkedin`     VARCHAR(255) NULL,
  PRIMARY KEY (`idProfissionais`),
  UNIQUE KEY `uq_profissional_usuario` (`Usuario_idUsuario`),
  CONSTRAINT `fk_profissional_usuario`
    FOREIGN KEY (`Usuario_idUsuario`) REFERENCES `Usuarios` (`idUsuario`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
