export const API = 'http://localhost:3000/api/v1';
export const token = () => localStorage.getItem('elab_token');

export async function api(path, { method = 'GET', body, auth = true } = {}) {

  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth && token()) headers.Authorization = 'Bearer ' + token();

  let res;
  try {
    res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error('Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.');
    }
    throw err;
  }

  if (res.status === 401 && auth) {
    sair();
    throw new Error('Sua sessão terminou. Entre novamente.');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    if (res.ok) throw new Error('O servidor retornou uma resposta inválida.');
  }
  if (!res.ok || !json?.sucesso) {
    throw new Error(json?.erro || 'Não foi possível concluir a solicitação.');
  }
  return json.dados;
}


export function sair() {
  localStorage.removeItem('elab_token');
  localStorage.removeItem('elab_lateral');
  location.href = 'login.html';
}
