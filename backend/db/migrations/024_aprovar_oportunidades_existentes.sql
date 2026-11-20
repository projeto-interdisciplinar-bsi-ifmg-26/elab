-- Migration 024: aprova as publicacoes que ja existiam antes da moderacao.
-- Idempotente: depois de rodar uma vez nao ha mais 'pendente' antigo nesse momento.
UPDATE `Oportunidades`
SET `status_moderacao` = 'aprovada', `moderada_em` = NOW()
WHERE `status_moderacao` = 'pendente';
