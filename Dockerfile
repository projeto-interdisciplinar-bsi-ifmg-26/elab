# ELAB: backend (Express) e frontend (estático) no mesmo processo.
# O server.js serve ../frontend, por isso o contexto de build é a raiz do repo.
FROM node:22-bookworm-slim

# sharp traz binários pré-compilados para linux-x64/glibc; não precisa de toolchain.
ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app/backend

# Dependências primeiro (cache de camada): só reinstala quando o lock muda.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Código da aplicação + frontend servido pelo Express.
COPY backend/ ./
COPY frontend/ /app/frontend/

# Volume nomeado monta aqui; o entrypoint garante a existência e o dono.
RUN mkdir -p uploads/curriculos uploads/fotos uploads/postagens \
    && chown -R node:node /app

USER node

EXPOSE 3000

# Espera o banco, aplica migrations/seed e sobe o servidor.
ENTRYPOINT ["node", "docker/entrypoint.js"]
CMD ["node", "server.js"]
