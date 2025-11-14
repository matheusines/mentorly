# Sistema de Agendamento de Aulas (Mentorly)

Nosso projeto se trata de um sistema de agendamento de aulas para professores. Este projeto atualmente implementa autenticação segura, um painel de usuário protegido e gerenciamento de aulas com atualizações em tempo real. O cliente por trás do projeto é um amigo de um dos integrantes do grupo, que trabalha com aulas particulares e buscava uma plataforma para agendar suas aulas.

## Stack de Tecnologias


<div>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white" alt="Bootstrap" />
</div>


O projeto é dividido em um Frontend (React) e um Backend (Node.js/Express) que consome os serviços do Supabase.

* **Frontend:** React, TypeScript, Vite, React Router
* **Backend (API):** Node.js, Express.js
* **Backend (BaaS):** Supabase (Auth, Database, Realtime)
* **Database:** PostgreSQL (via Supabase)
* **Estilização:** CSS Puro, Bootstrap

## Funcionalidades Implementadas

* **Autenticação Segura (Supabase Auth):**
    * Sistema de cadastro e login com e-mail e senha gerenciado pelo Supabase.
    * As senhas são gerenciadas de forma segura pelo Supabase Auth.

* **Backend API Protegida (Node.js):**
    * Middleware (`authMiddleware.js`) que protege os endpoints da API (`/api/me`, `/api/profiles/me`).
    * A API valida o token (JWT) do Supabase antes de permitir o acesso aos dados.

* **Painel de Professor Protegido (React):**
    * O acesso à rota `/agenda` é protegido (`RequireAuth`).
    * Usuários não logados são redirecionados automaticamente para a página de login.

* **Gerenciamento de Aulas (CRUD):**
    * Usuários podem cadastrar novas aulas (aluno, data, hora, local).
    * Usuários podem listar todas as suas aulas.
    * Usuários podem excluir aulas.

* **Atualizações em Tempo Real (Supabase Realtime):**
    * A lista de aulas na agenda é atualizada automaticamente para o usuário sempre que uma nova aula é adicionada ou removida, sem a necessidade de recarregar a página.


## Demonstração (Showcase)

Telas da aplicação em funcionamento:

### Página de Login
[Página de Login]
<img width="1159" height="843" alt="mentorly login" src="https://github.com/user-attachments/assets/7303febf-726f-4a27-b780-2328a692cf09" />

### Painel de Agendamento (portal do professor)
[Painel de Agendamento com Aulas]
<img width="1863" height="631" alt="Portal do professor" src="https://github.com/user-attachments/assets/b8871033-9bcc-4b38-82ac-d834e477e700" />


## Como Rodar Localmente

### Pré-requisitos

* **Node.js** (v18 ou superior) e **npm**.

---

### Comandos

1.  Instale as dependências (usando `ci` para garantir consistência) # (use um terminal na pasta do frontend):
    ```bash
    npm ci
    ```

2.  Rode o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

A aplicação estará disponível em `http://localhost:5173`.

# Integrantes:
Diogo Barboza de Souza 12745657  
Matheus dos Santos Ines 12546784  
Yudi Asano Ramos 1287355
