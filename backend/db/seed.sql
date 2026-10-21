-- Seeder para o ELAB
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Habilidades_Oportunidade;
TRUNCATE TABLE Cadastros_Oportunidades;
TRUNCATE TABLE Oportunidades;
TRUNCATE TABLE Entidades_Parceiras;
TRUNCATE TABLE Profissionais;
TRUNCATE TABLE Usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- Usuarios
INSERT INTO Usuarios (email, senha, tipo_usuario) VALUES
('empresa1@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'entidade_parceira'),
('empresa2@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'entidade_parceira'),
('colab1@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'profissional'),
('colab2@elab.com', '$2a$10$J.j8ji5dwT8zJKed2MA0heBZQlE.mImTTODi6ipwgOAHvoN8.ZAz.', 'profissional');

-- Entidades Parceiras
INSERT INTO Entidades_Parceiras (Usuario_idUsuario, nome_organizacao, descricao, cnpj, status_aprovacao) VALUES
(1, 'Tech Sabará', 'Empresa líder em soluções tecnológicas regionais.', '12345678000101', 'aprovada'),
(2, 'Innovate Hub', 'Hub de inovação focado em transformar ideias em negócios.', '87654321000102', 'aprovada');

-- Profissionais
INSERT INTO Profissionais (Usuario_idUsuario, nome, area, cidade) VALUES
(3, 'Ana Souza', 'Desenvolvimento Front-end', 'Sabará, MG'),
(4, 'Carlos Lima', 'Análise de Dados', 'Belo Horizonte, MG');

-- Oportunidades
INSERT INTO Oportunidades (Entidade_Parceira_idEntidade_Parceira, titulo, descricao, tipo, local, data, status) VALUES
(1, 'Dev Front-end Jr', 'Desenvolvimento de interfaces web com React e Tailwind.', 'vaga', 'Remoto', NULL, 'ativo'),
(1, 'Workshop de UX/UI', 'Oficina prática de design inclusivo e Figma.', 'evento', 'Online', '2026-10-25', 'agendado'),
(1, 'Bolsa de Estudos Web', 'Capacitação intensiva em Full Stack JS.', 'bolsa', 'Remoto', '2026-12-01', 'ativo'),
(2, 'Analista de Dados Jr', 'Extração e tratamento de dados com Python e SQL.', 'vaga', 'Híbrido', NULL, 'ativo'),
(2, 'Palestra: Carreira Tech', 'Conversa sobre caminhos no mercado de tecnologia.', 'palestra', 'Belo Horizonte', '2026-11-05', 'agendado');

-- Habilidades das Oportunidades
INSERT INTO Habilidades_Oportunidade (oportunidadeId, habilidade) VALUES
(1, 'javascript'), (1, 'react'), (1, 'css'), (1, 'git'),
(2, 'ux design'), (2, 'figma'), (2, 'acessibilidade'),
(3, 'html'), (3, 'css'), (3, 'javascript'), (3, 'node'),
(4, 'sql'), (4, 'python'), (4, 'power bi'),
(5, 'liderança'), (5, 'carreira');
