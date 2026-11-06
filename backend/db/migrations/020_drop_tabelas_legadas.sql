-- Migration 020: remove tabelas legadas sem uso.
-- Eventos e Cadastros_Eventos nunca foram usadas: eventos, palestras e bolsas vivem em Oportunidades (coluna tipo)
-- e as inscricoes em Cadastros_Oportunidades.
-- Habilidades_Oportunidade (texto livre) foi substituida por Oportunidades_Habilidades (requisitos estruturados).
-- Ordem importa por causa das chaves estrangeiras: Cadastros_Eventos referencia Eventos.
-- Idempotente: IF EXISTS permite repetir sem erro.
DROP TABLE IF EXISTS `Cadastros_Eventos`;
DROP TABLE IF EXISTS `Eventos`;
DROP TABLE IF EXISTS `Habilidades_Oportunidade`;