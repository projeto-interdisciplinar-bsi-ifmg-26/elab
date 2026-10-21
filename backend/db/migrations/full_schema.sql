-- Migration 001: Tabela base Usuarios
CREATE TABLE IF NOT EXISTS `Usuarios` (
  `idUsuario`     INT NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255) NOT NULL,
  `senha`         VARCHAR(255) NOT NULL,
  `tipo_usuario`  ENUM('profissional', 'entidade_parceira', 'admin') NOT NULL,
  `data_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idUsuario`),
  UNIQUE KEY `uq_usuarios_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 002: Entidades Parceiras (1:1 com Usuarios)
CREATE TABLE IF NOT EXISTS `Entidades_Parceiras` (
  `idEntidade_Parceira` INT NOT NULL AUTO_INCREMENT,
  `Usuario_idUsuario`   INT NOT NULL,
  `nome_organizacao`    VARCHAR(255) NOT NULL,
  `descricao`           VARCHAR(255) NULL,
  `cnpj`                VARCHAR(14) NOT NULL,
  `status_aprovacao`    ENUM('pendente', 'aprovada', 'rejeitada') NOT NULL DEFAULT 'pendente',
  PRIMARY KEY (`idEntidade_Parceira`),
  UNIQUE KEY `uq_entidade_usuario` (`Usuario_idUsuario`),
  UNIQUE KEY `uq_entidade_cnpj` (`cnpj`),
  CONSTRAINT `fk_entidade_usuario`
    FOREIGN KEY (`Usuario_idUsuario`) REFERENCES `Usuarios` (`idUsuario`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 003: Profissionais (1:1 com Usuarios)
CREATE TABLE IF NOT EXISTS `Profissionais` (
  `idProfissionais`   INT NOT NULL AUTO_INCREMENT,
  `Usuario_idUsuario` INT NOT NULL,
  `nome`              VARCHAR(255) NOT NULL,
  `area`              VARCHAR(255) NULL,
  `bio`               VARCHAR(255) NULL,
  `cidade`            VARCHAR(100) NULL,
  PRIMARY KEY (`idProfissionais`),
  UNIQUE KEY `uq_profissional_usuario` (`Usuario_idUsuario`),
  CONSTRAINT `fk_profissional_usuario`
    FOREIGN KEY (`Usuario_idUsuario`) REFERENCES `Usuarios` (`idUsuario`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 004: Habilidades (Catálogo)
CREATE TABLE IF NOT EXISTS `Habilidades` (
  `idHabilidades`   INT NOT NULL AUTO_INCREMENT,
  `nome_habilidade` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`idHabilidades`),
  UNIQUE KEY `uq_habilidade_nome` (`nome_habilidade`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 005: Oportunidades (Vagas, Eventos, Bolsas, Palestras)
-- Unificamos Eventos e Oportunidades em uma única tabela conforme a lógica do frontend
CREATE TABLE IF NOT EXISTS `Oportunidades` (
  `idOportunidade`                        INT NOT NULL AUTO_INCREMENT,
  `Entidade_Parceira_idEntidade_Parceira` INT NOT NULL,
  `titulo`                                VARCHAR(255) NOT NULL,
  `descricao`                             TEXT NULL,
  `tipo`                                  ENUM('vaga', 'evento', 'palestra', 'bolsa') NOT NULL,
  `local`                                 VARCHAR(255) NULL,
  `data`                                  DATE NULL,
  `status`                                ENUM('ativo', 'agendado', 'encerrado') NOT NULL DEFAULT 'ativo',
  `data_postagem`                         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idOportunidade`),
  KEY `idx_oportunidades_entidade` (`Entidade_Parceira_idEntidade_Parceira`),
  CONSTRAINT `fk_oportunidades_entidade`
    FOREIGN KEY (`Entidade_Parceira_idEntidade_Parceira`)
    REFERENCES `Entidades_Parceiras` (`idEntidade_Parceira`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 006: Inscrições / Candidaturas
CREATE TABLE IF NOT EXISTS `Cadastros_Oportunidades` (
  `Oportunidade_idOportunidade`   INT NOT NULL,
  `Profissionais_idProfissionais` INT NOT NULL,
  `mensagem`                    TEXT NULL,
  `data_aplicacao`                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Oportunidade_idOportunidade`, `Profissionais_idProfissionais`),
  CONSTRAINT `fk_co_oportunidade`
    FOREIGN KEY (`Oportunidade_idOportunidade`) REFERENCES `Oportunidades` (`idOportunidade`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_co_profissional`
    FOREIGN KEY (`Profissionais_idProfissionais`) REFERENCES `Profissionais` (`idProfissionais`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 007: Habilidades da Oportunidade (N:N)
CREATE TABLE IF NOT EXISTS `Habilidades_Oportunidade` (
  `oportunidadeId` INT NOT NULL,
  `habilidade` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`oportunidadeId`, `habilidade`),
  CONSTRAINT `fk_ho_oportunidade`
    FOREIGN KEY (`oportunidadeId`) REFERENCES `Oportunidades` (`idOportunidade`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
