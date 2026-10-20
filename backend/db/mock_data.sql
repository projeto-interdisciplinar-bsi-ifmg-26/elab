-- SCRIPT DE DADOS MOCKADOS À PROVA DE FALHAS PARA ELAB
-- Este script usa subqueries para vincular IDs, evitando erros de 'Duplicate entry'

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `Cadastros_Oportunidades`;
TRUNCATE TABLE `Habilidades_Oportunidade`;
TRUNCATE TABLE `Habilidades_Profissional`;
TRUNCATE TABLE `Oportunidades`;
TRUNCATE TABLE `Eventos`;
TRUNCATE TABLE `Profissionais`;
TRUNCATE TABLE `Entidades_Parceiras`;
TRUNCATE TABLE `Usuarios`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Usuarios
-- Senha 'senha12345' hash bcrypt validado
INSERT INTO `Usuarios` (`email`, `senha`, `tipo_usuario`) VALUES
('empresa1@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'entidade_parceira'),
('empresa2@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'entidade_parceira'),
('colab1@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'profissional'),
('colab2@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'profissional'),
('colab3@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'profissional'),
('admin@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'admin');

-- 2. Entidades Parceiras
INSERT INTO `Entidades_Parceiras` (`Usuario_idUsuario`, `nome_organizacao`, `cnpj`, `descricao`) VALUES
((SELECT idUsuario FROM Usuarios WHERE email = 'empresa1@elab.com'), 'Tech Sabará', '12345678000100', 'Líder em inovação tecnológica na região de Sabará.'),
((SELECT idUsuario FROM Usuarios WHERE email = 'empresa2@elab.com'), 'Innovate BH', '98765432000199', 'Hub de aceleração de startups e talentos tech.');

-- 3. Profissionais
INSERT INTO `Profissionais` (`Usuario_idUsuario`, `nome`, `area`, `cidade`, `bio`) VALUES
((SELECT idUsuario FROM Usuarios WHERE email = 'colab1@elab.com'), 'Ana Silva', 'Frontend', 'Belo Horizonte', 'Desenvolvedora React apaixonada por UX/UI.'),
((SELECT idUsuario FROM Usuarios WHERE email = 'colab2@elab.com'), 'Beatriz Souza', 'Backend', 'Contagem', 'Especialista em Node.js e arquitetura de microsserviços.'),
((SELECT idUsuario FROM Usuarios WHERE email = 'colab3@elab.com'), 'Carla Oliveira', 'Data Science', 'Nova Lima', 'Cientista de dados com foco em Machine Learning e Python.');

-- 4. Habilidades
INSERT INTO `Habilidades` (`nome_habilidade`) VALUES
('javascript'), ('react'), ('node'), ('python'), ('sql'), ('figma'), ('typescript'), ('aws')
ON DUPLICATE KEY UPDATE nome_habilidade=VALUES(nome_habilidade);

-- 5. Habilidades do Profissional
INSERT INTO `Habilidades_Profissional` (`Profissionais_idProfissionais`, `Habilidades_idHabilidades`, `tempo_experiencia_anos`) VALUES
((SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab1@elab.com')), 1, 3),
((SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab1@elab.com')), 2, 3),
((SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab1@elab.com')), 6, 2),
((SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab2@elab.com')), 1, 4),
((SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab2@elab.com')), 3, 4),
((SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab2@elab.com')), 5, 3),
((SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab3@elab.com')), 4, 5),
((SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab3@elab.com')), 5, 4);

-- 6. Oportunidades
INSERT INTO `Oportunidades` (`Entidade_Parceira_idEntidade_Parceira`, `titulo`, `tipo`, `descricao`, `local`, `status`) VALUES
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa1@elab.com')), 'Dev Frontend Jr', 'vaga', 'Vaga para React e Tailwind', 'Remoto', 'ativo'),
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa1@elab.com')), 'Estágio UX/UI', 'vaga', 'Apoio na criação de protótipos no Figma', 'Belo Horizonte', 'ativo'),
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa2@elab.com')), 'Backend Engineer', 'vaga', 'Experiência com Node.js e MongoDB', 'Híbrido', 'ativo'),
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa2@elab.com')), 'Analista de Dados', 'vaga', 'Foco em Python e PowerBI', 'Belo Horizonte', 'ativo'),
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa1@elab.com')), 'Desenvolvedor Fullstack', 'vaga', 'Stack JS/TS completa', 'Remoto', 'ativo');

-- 7. Eventos
INSERT INTO `Eventos` (`Entidade_Parceira_idEntidade_Parceira`, `titulo`, `descricao`, `tipo`) VALUES
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa1@elab.com')), 'Workshop React 2026', 'Imersão em Hooks e Context API', 'workshop'),
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa2@elab.com')), 'Palestra: O Futuro da IA', 'Discussão sobre LLMs no mercado', 'palestra'),
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa1@elab.com')), 'Meetup Sabará Tech', 'Networking entre devs locais', 'meetup'),
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa2@elab.com')), 'Hackathon Innovate', '48h de código para resolver problemas urbanos', 'hackathon'),
((SELECT idEntidade_Parceira FROM Entidades_Parceiras WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'empresa1@elab.com')), 'Webinar de Carreira', 'Como conseguir a primeira vaga em tech', 'palestra');

-- 8. Habilidades das Oportunidades
INSERT INTO `Habilidades_Oportunidade` (`oportunidadeId`, `habilidade`) VALUES
(1, 'javascript'), (1, 'react'), (1, 'typescript'),
(2, 'figma'), (2, 'ux design'),
(3, 'node'), (3, 'sql'), (3, 'aws'),
(4, 'python'), (4, 'sql'),
(5, 'javascript'), (5, 'react'), (5, 'node');

-- 9. Inscrições
INSERT INTO `Cadastros_Oportunidades` (`Oportunidade_idOportunidade`, `Profissionais_idProfissionais`) VALUES
(1, (SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab1@elab.com'))),
(2, (SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab1@elab.com'))),
(3, (SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab2@elab.com'))),
(4, (SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab3@elab.com'))),
(5, (SELECT idProfissionais FROM Profissionais WHERE Usuario_idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = 'colab2@elab.com')));
