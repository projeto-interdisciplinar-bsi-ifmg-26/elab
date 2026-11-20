export const API = '/api/v1';
export const token = () => localStorage.getItem('elab_token');

async function requisitar(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  const ehFormData = body instanceof FormData;
  if (body && !ehFormData) headers['Content-Type'] = 'application/json';
  if (auth && token()) headers.Authorization = 'Bearer ' + token();

  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers,
      body: body ? (ehFormData ? body : JSON.stringify(body)) : undefined
    });
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
  return res;
}

async function lerJson(res) {
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

export async function api(path, opcoes) {
  return lerJson(await requisitar(path, opcoes));
}

export async function baixar(path, nomeSugerido = 'arquivo') {
  const res = await requisitar(path);
  if (!res.ok) {
    let json;
    try {
      json = await res.json();
    } catch { /* corpo não é JSON */ }
    throw new Error(json?.erro || 'Não foi possível baixar o arquivo.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeSugerido;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function sair() {
  localStorage.removeItem('elab_token');
  localStorage.removeItem('elab_lateral');
  location.href = 'login.html';
}
