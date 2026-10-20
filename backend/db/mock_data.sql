-- SCRIPT DE DADOS MOCKADOS PARA ELAB
-- Execute no banco 'elab'

-- 1. Usuarios
-- Senha 'senha12345' hash bcrypt: $2a$10$zT/qYpS.S7H8ZpMvGqS3i.P7tS6G8U1eUuX0z1u5S1u7S1u7S1u7S (Exemplo aproximado)
-- NOTA: Use hashes reais se for testar login.
INSERT INTO `Usuarios` (`email`, `senha`, `tipo_usuario`) VALUES
('empresa@elab.com', '$2a$10$zT/qYpS.S7H8ZpMvGqS3i.P7tS6G8U1eUuX0z1u5S1u7S1u7S1u7S', 'entidade_parceira'),
('colab@elab.com', '$2a$10$zT/qYpS.S7H8ZpMvGqS3i.P7tS6G8U1eUuX0z1u5S1u7S1u7S1u7S', 'profissional'),
('admin@elab.com', '$2a$10$zT/qYpS.S7H8ZpMvGqS3i.P7tS6G8U1eUuX0z1u5S1u7S1u7S1u7S', 'admin');

-- 2. Entidades Parceiras
INSERT INTO `Entidades_Parceiras` (`nome_entidade`, `cnpj`, `email_contato`) VALUES
('Tech Sabará', '12.345.678/0001-00', 'contato@techsabara.com');

-- 3. Profissionais
INSERT INTO `Profissionais` (`Usuarios_idUsuario`, `nome`, `curriculo`) VALUES
(2, 'Colaborador Teste', 'Desenvolvedor Fullstack com experiência em React e Node.js');

-- 4. Habilidades
INSERT INTO `Habilidades` (`nome_habilidade`) VALUES
('javascript'), ('react'), ('sql'), ('python'), ('node'), ('ux design'), ('html'), ('css');

-- 5. Habilidades do Profissional
INSERT INTO `Habilidades_Profissional` (`Profissionais_idProfissionais`, `Habilidades_idHabilidades`, `tempo_experiencia_anos`) VALUES
(1, 1, 3), (1, 2, 2), (1, 5, 2);

-- 6. Oportunidades
INSERT INTO `Oportunidades` (`Entidade_Parceira_idEntidade_Parceira`, `titulo`, `tipo`, `descricao`, `local`, `status`) VALUES
(1, 'Dev Front-end Jr.', 'vaga', 'Desenvolvimento de interfaces web com JavaScript e React, em time ágil.', 'Remoto', 'ativo'),
(1, 'Analista de Dados Jr.', 'vaga', 'Análise de dados e criação de dashboards.', 'Belo Horizonte, MG', 'ativo'),
(1, 'Estágio em Back-end', 'vaga', 'Estágio com Node.js e APIs REST, com mentoria.', 'Híbrido', 'ativo');

-- 7. Eventos
INSERT INTO `Eventos` (`Entidade_Parceira_idEntidade_Parceira`, `titulo`, `descricao`, `tipo`) VALUES
(1, 'Workshop de UX', 'Oficina prática de pesquisa e prototipação para iniciantes.', 'workshop'),
(1, 'Carreira em Tecnologia', 'Mulheres da área contam suas trajetórias e respondem perguntas.', 'palestra');

-- 8. Habilidades das Oportunidades (Tabela de juncao que precisei criar no repo)
-- Nota: Como a migration 004 não tinha Habilidades_Oportunidade,
-- vou criar a tabela aqui para o script funcionar.
CREATE TABLE IF NOT EXISTS `Habilidades_Oportunidade` (
  `oportunidadeId` INT NOT NULL,
  `habilidade` VARCHAR(100) NOT NULL,
  FOREIGN KEY (`oportunidadeId`) REFERENCES `Oportunidades` (`idOportunidade`) ON DELETE CASCADE
);

INSERT INTO `Habilidades_Oportunidade` (`oportunidadeId`, `habilidade`) VALUES
(1, 'javascript'), (1, 'react'),
(2, 'sql'), (2, 'python'),
(3, 'node'), (3, 'sql');

-- 9. Inscricoes (Cadastros_Oportunidades)
INSERT INTO `Cadastros_Oportunidades` (`Oportunidade_idOportunidade`, `Profissionais_idProfissionais`) VALUES
(1, 1);
