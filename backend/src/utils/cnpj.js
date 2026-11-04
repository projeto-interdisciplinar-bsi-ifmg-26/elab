// Remove pontuacao e devolve so os digitos (aceita "11.222.333/0001-81").
function normalizarCnpj(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function digitoVerificador(base) {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// Valida tamanho, sequencias repetidas e os dois digitos verificadores.
function cnpjValido(valor) {
  const cnpj = normalizarCnpj(valor);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const d1 = digitoVerificador(cnpj.slice(0, 12));
  const d2 = digitoVerificador(cnpj.slice(0, 12) + d1);
  return cnpj.endsWith(String(d1) + String(d2));
}

module.exports = { normalizarCnpj, cnpjValido };
