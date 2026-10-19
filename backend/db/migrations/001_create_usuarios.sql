-- Migration 001: tabela base Usuarios
-- DDL estático (sem entrada de usuário). A proteção contra SQL injection
-- acontece na camada de aplicacao, usando prepared statements (mysql2).
-- Aqui o foco de seguranca e integridade: charset utf8mb4, tipos corretos,
-- chaves e indices unicos para evitar dados duplicados/inconsistentes.

CREATE TABLE IF NOT EXISTS `Usuarios` (
  `idUsuario`     INT NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255) NOT NULL,
  -- senha armazena o HASH (bcrypt = 60 chars). Nunca guardar senha em texto puro.
  `senha`         VARCHAR(255) NOT NULL,
  `tipo_usuario`  ENUM('profissional', 'entidade_parceira', 'admin') NOT NULL,
  `data_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idUsuario`),
  UNIQUE KEY `uq_usuarios_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
