export const params = new URLSearchParams(location.search);
export const PUBLICAS = ['index', 'login', 'registro'];

export let user = null;
export const setUser = u => { user = u; };
