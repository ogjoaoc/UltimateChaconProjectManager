# Sistema de Gestão de Artefatos Scrum

Este projeto é um sistema de gerenciamento de tarefas Scrum desenvolvido para a
disciplina de **Engenharia de Software**.

O sistema possui: - **Backend** em **Django REST** (Python) -
**Frontend** em **React + Vite** - Banco de dados: SQLite
(padrão)

------------------------------------------------------------------------

## Como rodar o projeto

### Pré-requisitos

Certifique-se de ter instalado: - [Python
3.10+](https://www.python.org/downloads/) - [Node.js
18+](https://nodejs.org/)


------------------------------------------------------------------------

## Backend 

### Instalar dependências

``` bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate   # Windows

pip install -r requirements.txt
```

### Rodar as migrações

``` bash
python manage.py migrate
```

### Rodar o servidor

``` bash
python manage.py runserver
```

O backend ficará disponível em: **http://127.0.0.1:8000/**

------------------------------------------------------------------------

## Frontend 

### Instalar dependências

``` bash
cd frontend
npm install
```

### Rodar o servidor de desenvolvimento

``` bash
npm run dev
```

O frontend ficará disponível em: **http://127.0.0.1:5173/**

------------------------------------------------------------------------


## Equipe

- Arthur Luiz Lima de Araújo
- Arthur da Silva Pereira Bispo
- João Carlos Gonçalves de Oliveira Filho
- Ana Luísa de Souza Paraguassu
- Tauã Valentim de A. M. Frade
