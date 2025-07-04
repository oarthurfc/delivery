# 📦 Delivery System

Um sistema completo de entregas desenvolvido como projeto acadêmico na PUC Minas, implementando uma arquitetura moderna com aplicativo móvel Flutter, microsserviços em backend e infraestrutura serverless na nuvem.

## 🎥 Demonstração
> 📂 Os vídeos de demonstração estão organizados na pasta [`docs/videos`](docs/videos) deste repositório.
<p align="center">
  <table>
    <tr>
      <!-- Card 1 -->
      <td align="center" style="padding: 10px;">
        <a href="https://www.youtube.com/shorts/lNh5pR27yVE" target="_blank" style="text-decoration: none;">
          <img src="https://img.youtube.com/vi/lNh5pR27yVE/hqdefault.jpg" width="300" alt="Vídeo 1" style="border-radius: 10px; border: 1px solid #ddd;">
          <br>
          <img src="https://img.shields.io/badge/YouTube-Assistir-red?style=flat-square&logo=youtube" alt="Assistir no YouTube">
          <br>
          <strong style="color: #333; font-family: Arial, sans-serif;">Desenvolvimento Mobile</strong>
        </a>
      </td>
      <!-- Card 2: Vídeo fornecido -->
      <td align="center" style="padding: 10px;">
        <a href="https://www.youtube.com/watch?v=tKkOWpcZqjU" target="_blank" style="text-decoration: none;">
          <img src="https://img.youtube.com/vi/tKkOWpcZqjU/hqdefault.jpg" width="300" alt="Vídeo 2" style="border-radius: 10px; border: 1px solid #ddd;">
          <br>
          <img src="https://img.shields.io/badge/YouTube-Assistir-red?style=flat-square&logo=youtube" alt="Assistir no YouTube">
          <br>
          <strong style="color: #333; font-family: Arial, sans-serif;">Arquitetura de Microsserviços</strong>
        </a>
      </td>
      <!-- Card 3: Em Produção -->
      <td align="center" style="padding: 10px;">
        <a href="https://www.youtube.com/watch?v=tKkOWpcZqjU" target="_blank" style="text-decoration: none;">
          <img src="https://img.youtube.com/vi/tKkOWpcZqjU/hqdefault.jpg" width="300" alt="Vídeo 2" style="border-radius: 10px; border: 1px solid #ddd;">
          <br>
          <img src="https://img.shields.io/badge/YouTube-Assistir-red?style=flat-square&logo=youtube" alt="Assistir no YouTube">
          <br>
          <strong style="color: #333; font-family: Arial, sans-serif;">Arquitetura de Serverless</strong>
        </a>
      </td>
  </table>
</p>


## 🚀 Visão Geral

O projeto Delivery é uma solução completa para gerenciamento e rastreamento de entregas, oferecendo interfaces dedicadas para clientes e motoristas. O sistema foi desenvolvido seguindo os princípios de arquitetura moderna, com foco em escalabilidade, performance e experiência do usuário.

**Principais características:**
- 📱 Aplicativo móvel híbrido desenvolvido em Flutter
- 🔧 Arquitetura de microsserviços para o backend
- ☁️ Integração com Azure Functions para notificações serverless
- 📍 Rastreamento em tempo real com geolocalização
- 🔔 Sistema de notificações push e emails
- 📸 Captura de fotos para comprovação de entrega
- 🐰 Comunicação assíncrona via RabbitMQ

## 📁 Estrutura do Projeto

```
delivery/
├── mobile/                   # Aplicativo móvel Flutter
│   ├── lib/                  # Código fonte Dart
│   ├── android/              # Configurações Android
│   ├── ios/                  # Configurações iOS
│   └── pubspec.yaml          # Dependências Flutter
│
├── backend/                  # Microsserviços e API Gateway
│   ├── docker-compose.yml    # Orquestração dos serviços
│   ├── api-gateway/          # Gateway de APIs (Spring Cloud Gateway)
│   ├── auth-service/         # Serviço de autenticação (Node.js)
│   ├── order-service/        # Serviço de pedidos (Java 21)
│   ├── tracking-service/     # Serviço de rastreamento (Node.js)
│   └── notification-service/ # Serviço de notificações (Node.js + Azure Functions)
│
├── cloud/                    # Infraestrutura serverless
│   ├── functions/            # Funções serverless
│   ├── infrastructure/       # Configurações de infraestrutura
│   └── ci-cd/                # Pipelines de deploy
│
└── docs/                     # Documentação do projeto
    ├── api/                  # Documentação das APIs
    ├── architecture/         # Diagramas de arquitetura
    └── deployment/           # Guias de deployment
```

## 🏗️ Fases do Desenvolvimento

### Fase 1: Desenvolvimento Mobile - [Docs](docs/especificacoes_entregas/entrega_01.md)
A primeira fase focou na criação do aplicativo móvel usando Flutter, implementando interfaces distintas para clientes e motoristas. O app inclui funcionalidades como rastreamento em tempo real, histórico de pedidos, captura de fotos com geolocalização para comprovação de entrega, e armazenamento offline com SQLite. Também foram implementadas notificações push, sistema de preferências com Shared Preferences, e tratamento robusto de erros para cenários como falta de conectividade e permissões negadas.

### Fase 2: Arquitetura de Microsserviços - [Docs](docs/especificacoes_entregas/entrega_02.md)
Na segunda fase, foi desenvolvido o backend utilizando arquitetura de microsserviços, criando serviços independentes para autenticação (com JWT), gerenciamento de pedidos (CRUD completo), rastreamento em tempo real, e sistema de notificações. A comunicação entre serviços foi implementada tanto de forma síncrona (REST) quanto assíncrona (mensageria), com um API Gateway centralizando o roteamento e autenticação. Esta arquitetura garante escalabilidade, manutenibilidade e isolamento de falhas.

### Fase 3: Infraestrutura Serverless - [Docs](docs/especificacoes_entregas/entrega_03.md)
A fase final integrou componentes serverless na arquitetura existente, complementando os microsserviços tradicionais com funções serverless (Azure Functions) e serviços gerenciados. Esta implementação inclui um sistema de notificações robusto baseado em funções serverless, integração entre RabbitMQ e Azure Functions para processamento assíncrono de emails e notificações push, e gerenciamento de eventos em tempo real. O resultado é uma infraestrutura híbrida que combina a confiabilidade dos microsserviços com a escalabilidade e o baixo custo operacional das funções serverless.

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Flutter SDK (versão 3.0+)
- Dart SDK
- Android Studio / Xcode (para desenvolvimento mobile)
- Docker (para microsserviços)
- Node.js 20+ (para serviço de autenticação)
- Java 21 JDK (para serviços Java)
- Maven (incluído nos wrappers dos projetos)
- Conta em provedor de nuvem (AWS/Google Cloud/Azure) para fase serverless

### Executando o Mobile
```bash
cd mobile/
flutter pub get
flutter run
```

### Executando os Microsserviços

1. Navegue até a pasta backend:
```bash
cd backend/
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Construa e inicie os serviços com Docker Compose:
```bash
# Na primeira execução ou quando houver mudanças no código
docker-compose build  # Constrói ou reconstrói as imagens
docker-compose up -d  # Inicia os containers

# OU use um único comando
docker-compose up -d --build  # Constrói e inicia em um único comando
```

O sistema iniciará os seguintes serviços:
- API Gateway (porta 8000): Ponto de entrada único para todas as APIs
- Serviço de Autenticação (Node.js): Gerencia autenticação e JWT
- Serviço de Pedidos (Java): Gerenciamento de pedidos
- Serviço de Rastreamento (Node.js): Rastreamento em tempo real
- Serviço de Notificações (Node.js): Sistema de emails e notificações push
- MongoDB: Banco de dados para autenticação
- PostgreSQL: Banco de dados para pedidos e rastreamento
- RabbitMQ: Sistema de mensageria

Após a inicialização, você pode acessar:
- API Gateway: http://localhost:8000 (todas as requisições devem passar por aqui)
- RabbitMQ Management: http://localhost:15672 (usuário/senha do .env)

Comandos úteis:
```bash
# Construir todas as imagens
docker-compose build

# Construir uma imagem específica
docker-compose build auth-service

# Verificar status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f auth-service

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (útil para "limpar" bancos de dados)
docker-compose down -v
```

### Deploy Serverless


## 📚 Documentação

Para informações detalhadas sobre arquitetura, APIs e deployment, consulte a pasta `docs/`.

## 🛠️ Tecnologias Utilizadas

- **Mobile:** Flutter, Dart, SQLite, GPS, Camera
- **Backend:** Spring Boot, Node.js, PostgreSQL, MongoDB, RabbitMQ
- **Cloud:** Azure Functions, Azure Storage
- **DevOps:** Docker, Docker Compose, Maven

---

