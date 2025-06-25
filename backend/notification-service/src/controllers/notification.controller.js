// controllers/notification.controller.js - COM SWAGGER
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification.service');
const emailQueueListener = require('../listeners/email-queue-listener');
const pushQueueListener = require('../listeners/push-queue-listener');
const dependencyContainer = require('../utils/dependency-injection');
const rabbitmqConfig = require('../config/rabbitmq');
const logger = require('../utils/logger');

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [⚕️ Sistema]
 *     summary: Health check completo do serviço
 *     description: |
 *       Verifica a saúde de todos os componentes do notification service:
 *       - ✅ Conectividade com RabbitMQ
 *       - ✅ Status dos listeners das filas
 *       - ✅ Conectividade dos provedores (email/push)
 *       - ✅ Estatísticas de processamento
 *     responses:
 *       200:
 *         description: Status de saúde do serviço
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "healthy"
 *               timestamp: "2024-01-15T10:30:00.000Z"
 *               services:
 *                 email:
 *                   success: true
 *                   provider: "local-email-provider"
 *                 push:
 *                   success: true  
 *                   provider: "local-push-provider"
 *               listeners:
 *                 email:
 *                   isRunning: true
 *                   queueName: "emails"
 *                 push:
 *                   isRunning: true
 *                   queueName: "push-notifications"
 *               rabbitmq:
 *                 connected: true
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.get('/health', async (req, res) => {
    try {
        const healthData = await notificationService.testAllServices();
        const stats = notificationService.getDetailedStats();
        
        res.json({
            status: healthData.overall ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            services: healthData,
            stats: stats,
            listeners: {
                email: emailQueueListener.getStats(),
                push: pushQueueListener.getStats()
            },
            rabbitmq: {
                connected: rabbitmqConfig.isConnected()
            },
            providers: dependencyContainer.getProvidersInfo()
        });
    } catch (error) {
        logger.error('❌ Erro no health check:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /api/notifications/test/email:
 *   post:
 *     tags: [📧 Email]
 *     summary: Teste direto de envio de email (sem fila)
 *     description: |
 *       Envia um email diretamente usando o provedor configurado, sem passar pela fila RabbitMQ.
 *       
 *       **💡 Dica**: Use este endpoint para testes rápidos. Para uso em produção, prefira `/queue/email`.
 *       
 *       **🎨 Templates Melhorados**: O sistema agora possui templates específicos para cliente e motorista:
 *       - `ORDER_COMPLETED` → Templates diferenciados para cliente/motorista
 *       - `ORDER_CREATED` → Confirmação de criação de pedido
 *       - `welcome` → Boas-vindas personalizadas
 *       
 *       **🚛 Sistema de Delivery**: Variáveis específicas incluem endereços de origem/destino, 
 *       informações do motorista e detalhes completos da entrega.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Email do destinatário
 *                 example: "cliente@example.com"
 *               type:
 *                 type: string
 *                 enum: [ORDER_COMPLETED, ORDER_CREATED, order_completed, order_created, welcome, promotional]
 *                 default: "welcome"
 *                 description: Tipo do email (define template automático)
 *               subject:
 *                 type: string
 *                 description: Assunto (opcional, usa template se não informado)
 *                 example: "🎉 Pedido #123 entregue com sucesso!"
 *               body:
 *                 type: string
 *                 description: Corpo do email (opcional, usa template se não informado)
 *               template:
 *                 type: string
 *                 description: Template específico a ser usado
 *                 example: "order-completed"
 *               variables:
 *                 type: object
 *                 description: Variáveis para substituição no template
 *                 example:
 *                   customerName: "João Silva"
 *                   orderId: 123
 *                   recipientType: "CUSTOMER"
 *           examples:
 *             customer_order_completed:
 *               summary: 🎉 Pedido Entregue - Cliente
 *               description: Email para cliente quando pedido é finalizado
 *               value:
 *                 to: "joao.silva@email.com"
 *                 type: "ORDER_COMPLETED"
 *                 variables:
 *                   orderId: 12345
 *                   customerName: "João Silva"
 *                   recipientType: "CUSTOMER"
 *                   orderDescription: "Pizza Margherita + Refrigerante"
 *                   deliveryAddress: "Rua das Flores, 123 - Centro, São Paulo"
 *                   originAddress: "Pizzaria do João - Rua Principal, 456"
 *                   completedAt: "25/06/2025 14:30"
 *                   orderStatus: "DELIVERIED"
 *                   hasImage: true
 *                   imageUrl: "https://storage.com/delivery-photo.jpg"
 *             driver_order_completed:
 *               summary: ✅ Entrega Finalizada - Motorista
 *               description: Email para motorista quando entrega é concluída
 *               value:
 *                 to: "carlos.motorista@email.com"
 *                 type: "ORDER_COMPLETED"
 *                 variables:
 *                   orderId: 12345
 *                   customerName: "Carlos Entregador"
 *                   recipientType: "DRIVER"
 *                   orderDescription: "Pizza Margherita + Refrigerante"
 *                   deliveryAddress: "Rua das Flores, 123 - Centro, São Paulo"
 *                   originAddress: "Pizzaria do João - Rua Principal, 456"
 *                   completedAt: "25/06/2025 14:30"
 *                   customerId: 67890
 *                   isDriver: true
 *                   pickupAddress: "Pizzaria do João - Rua Principal, 456"
 *             order_created:
 *               summary: 📦 Novo Pedido - Cliente
 *               description: Email de confirmação quando pedido é criado
 *               value:
 *                 to: "maria.santos@email.com"
 *                 type: "ORDER_CREATED"
 *                 variables:
 *                   orderId: 12346
 *                   customerName: "Maria Santos"
 *                   orderDescription: "Hambúrguer Especial + Batata Frita"
 *                   deliveryAddress: "Av. Paulista, 1000 - Bela Vista, São Paulo"
 *                   createdAt: "25/06/2025 13:45"
 *                   estimatedTime: "35-45 minutos"
 *             welcome_customer:
 *               summary: 👋 Boas-vindas - Novo Cliente
 *               description: Email de boas-vindas para novo usuário
 *               value:
 *                 to: "novo.cliente@email.com"
 *                 type: "welcome"
 *                 variables:
 *                   customerName: "Ana Costa"
 *                   userType: "CUSTOMER"
 *             welcome_driver:
 *               summary: 🚛 Boas-vindas - Novo Motorista
 *               description: Email de boas-vindas para novo motorista
 *               value:
 *                 to: "novo.motorista@email.com"
 *                 type: "welcome"
 *                 variables:
 *                   customerName: "Roberto Silva"
 *                   userType: "DRIVER"
 *     responses:
 *       200:
 *         description: Email processado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email de teste processado"
 *                 result:
 *                   type: object
 *                   description: Resultado do processamento
 *                 testData:
 *                   type: object
 *                   description: Dados que foram enviados
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/test/email', async (req, res) => {
    try {
        const { 
            to = 'test@example.com', 
            type = 'welcome',
            subject,
            body,
            template,
            variables = {}
        } = req.body;
        
        const testEmailData = {
            messageId: `test_email_${Date.now()}`,
            to,
            type,
            subject,
            body,
            template,
            variables,
            timestamp: new Date().toISOString()
        };

        const result = await notificationService.processNotification('email', testEmailData);

        res.json({
            success: true,
            message: 'Email de teste processado',
            result,
            testData: testEmailData
        });

    } catch (error) {
        logger.error('❌ Erro no teste de email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/test/push:
 *   post:
 *     tags: [🔔 Push]
 *     summary: Teste direto de push notification (sem fila)
 *     description: |
 *       Envia uma push notification diretamente, sem passar pela fila RabbitMQ.
 *       
 *       **💡 Dica**: Use este endpoint para testes rápidos. Para uso em produção, prefira `/queue/push`.
 *       
 *       **🎨 Templates Automáticos**: Se `title` ou `body` não forem informados, 
 *       o sistema usa templates baseados no `type`:
 *       - `welcome` → "Bem-vindo! 👋"
 *       - `order_created` → "Pedido criado! 📦"
 *       - `order_completed` → "Pedido entregue! ⭐"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID do usuário destinatário
 *                 example: "user123"
 *               type:
 *                 type: string
 *                 enum: [welcome, order_created, order_completed, evaluation_reminder, promotional]
 *                 default: "welcome"
 *                 description: Tipo da notificação
 *               title:
 *                 type: string
 *                 description: Título (opcional, usa template se não informado)
 *                 example: "Bem-vindo! 👋"
 *               body:
 *                 type: string
 *                 description: Corpo (opcional, usa template se não informado)
 *                 example: "Obrigado por se cadastrar!"
 *               data:
 *                 type: object
 *                 description: Dados adicionais da notificação
 *                 example:
 *                   action: "OPEN_PROFILE"
 *               deepLink:
 *                 type: string
 *                 description: Deep link da notificação
 *                 example: "app://profile"
 *           examples:
 *             welcome:
 *               summary: Boas-vindas
 *               value:
 *                 userId: "user123"
 *                 type: "welcome"
 *                 data:
 *                   action: "OPEN_PROFILE"
 *             order_completed:
 *               summary: Pedido finalizado
 *               value:
 *                 userId: "user456"
 *                 type: "order_completed"
 *                 data:
 *                   orderId: 123
 *                   action: "EVALUATE_ORDER"
 *                 deepLink: "app://evaluate/123"
 *     responses:
 *       200:
 *         description: Push notification processada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Push notification de teste processada"
 *                 result:
 *                   type: object
 *                   description: Resultado do processamento
 *                 testData:
 *                   type: object
 *                   description: Dados que foram enviados
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/test/push', async (req, res) => {
    try {
        const { 
            userId = 'test-user-123',
            type = 'welcome',
            title = 'Notificação de Teste',
            body = 'Esta é uma notificação de teste.',
            data = { test: true },
            deepLink = 'app://home'
        } = req.body;
        
        const testPushData = {
            messageId: `test_push_${Date.now()}`,
            userId,
            type,
            title,
            body,
            data,
            deepLink,
            timestamp: new Date().toISOString()
        };

        const result = await notificationService.processNotification('push', testPushData);

        res.json({
            success: true,
            message: 'Push notification de teste processada',
            result,
            testData: testPushData
        });

    } catch (error) {
        logger.error('❌ Erro no teste de push:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/queue/email:
 *   post:
 *     tags: [📬 Filas]
 *     summary: Publicar mensagem na fila de emails
 *     description: |
 *       **🚀 Método Recomendado**: Publica uma mensagem na fila `emails` do RabbitMQ 
 *       para processamento assíncrono.
 *       
 *       **⚡ Vantagens**:
 *       - Processamento assíncrono e resiliente
 *       - Dead Letter Queue para tratamento de falhas
 *       - Retry automático em caso de problemas temporários
 *       - Melhor performance para alto volume
 *       
 *       **🎨 Sistema de Templates Avançado**: 
 *       
 *       | Tipo | Para Quem | Template | Variáveis Especiais |
 *       |------|-----------|----------|-------------------|
 *       | `ORDER_COMPLETED` | Cliente | "🎉 Pedido entregue!" | `deliveryAddress`, `completedAt` |
 *       | `ORDER_COMPLETED` | Motorista | "✅ Entrega finalizada!" | `pickupAddress`, `customerId` |
 *       | `ORDER_CREATED` | Cliente | "📦 Pedido criado!" | `estimatedTime` |
 *       | `welcome` | Ambos | "Bem-vindo!" | `userType` |
 *       
 *       **🚛 Detecta automaticamente** se é cliente ou motorista através de `recipientType`!
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailMessage'
 *           examples:
 *             realistic_customer_delivery:
 *               summary: 🎉 Entrega Concluída - Cliente Real
 *               description: Email real de finalização para cliente
 *               value:
 *                 to: "ana.silva@gmail.com"
 *                 type: "ORDER_COMPLETED"
 *                 priority: "high"
 *                 variables:
 *                   orderId: 67890
 *                   customerName: "Ana Silva"
 *                   recipientType: "CUSTOMER"
 *                   orderDescription: "2x Hambúrguer Artesanal + Batata Rústica + Refrigerante 350ml"
 *                   deliveryAddress: "Rua das Palmeiras, 145 - Jardim Europa, São Paulo - SP"
 *                   originAddress: "Burger House - Av. Paulista, 2000 - Consolação, São Paulo"
 *                   completedAt: "25/06/2025 19:45"
 *                   completedAtISO: "2025-06-25T19:45:00.000Z"
 *                   orderStatus: "DELIVERIED"
 *                   driverId: 12345
 *                   hasImage: true
 *                   imageUrl: "https://delivery-photos.com/order-67890.jpg"
 *                   isDriver: false
 *             realistic_driver_delivery:
 *               summary: ✅ Entrega Concluída - Motorista Real
 *               description: Email real de finalização para motorista
 *               value:
 *                 to: "carlos.santos@entregadores.com"
 *                 type: "ORDER_COMPLETED"
 *                 priority: "high"
 *                 variables:
 *                   orderId: 67890
 *                   customerName: "Carlos Santos"
 *                   recipientType: "DRIVER"
 *                   orderDescription: "2x Hambúrguer Artesanal + Batata Rústica + Refrigerante 350ml"
 *                   deliveryAddress: "Rua das Palmeiras, 145 - Jardim Europa, São Paulo - SP"
 *                   originAddress: "Burger House - Av. Paulista, 2000 - Consolação, São Paulo"
 *                   pickupAddress: "Burger House - Av. Paulista, 2000 - Consolação, São Paulo"
 *                   completedAt: "25/06/2025 19:45"
 *                   customerId: 45678
 *                   isDriver: true
 *                   hasImage: true
 *                   imageUrl: "https://delivery-photos.com/order-67890.jpg"
 *             pizza_order_created:
 *               summary: 📦 Nova Pizza - Pedido Criado
 *               description: Confirmação de novo pedido de pizza
 *               value:
 *                 to: "joao.oliveira@hotmail.com"
 *                 type: "ORDER_CREATED"
 *                 priority: "normal"
 *                 variables:
 *                   orderId: 55432
 *                   customerName: "João Oliveira"
 *                   orderDescription: "Pizza Portuguesa Grande + Pizza Calabresa Média + Coca-Cola 2L"
 *                   deliveryAddress: "Rua São João, 890 - Centro, Campinas - SP"
 *                   createdAt: "25/06/2025 18:30"
 *                   estimatedTime: "40-50 minutos"
 *             customer_welcome:
 *               summary: 👋 Bem-vindo - Novo Cliente
 *               description: Primeiro email para cliente cadastrado
 *               value:
 *                 to: "maria.costa@yahoo.com"
 *                 type: "welcome"
 *                 variables:
 *                   customerName: "Maria Costa"
 *                   userType: "CUSTOMER"
 *             driver_welcome:
 *               summary: 🚛 Bem-vindo - Novo Motorista
 *               description: Primeiro email para motorista cadastrado
 *               value:
 *                 to: "roberto.driver@gmail.com"
 *                 type: "welcome"
 *                 variables:
 *                   customerName: "Roberto Fernandes"
 *                   userType: "DRIVER"
 *             promotional_weekend:
 *               summary: 🎯 Promoção Final de Semana
 *               description: Email promocional customizado
 *               value:
 *                 to: "cliente.vip@exemplo.com"
 *                 type: "promotional"
 *                 subject: "🔥 FINAL DE SEMANA ESPECIAL - 25% OFF em todos os pedidos!"
 *                 variables:
 *                   customerName: "Cliente VIP"
 *                   discountPercent: 25
 *                   validUntil: "27/06/2025"
 *                   minOrderValue: "R$ 30,00"
 *                   promoCode: "WEEKEND25"
 *     responses:
 *       200:
 *         description: Mensagem publicada na fila com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mensagem publicada na fila de emails"
 *                 messageId:
 *                   type: string
 *                   example: "queue_email_1642248600000"
 *                 queue:
 *                   type: string
 *                   example: "emails"
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: 'Campo "to" é obrigatório'
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/queue/email', async (req, res) => {
    try {
        const { 
            to, 
            type = 'welcome',
            subject,
            body,
            template,
            variables,
            priority = 'normal'
        } = req.body;
        
        if (!to) {
            return res.status(400).json({
                success: false,
                error: 'Campo "to" é obrigatório'
            });
        }

        const emailMessage = {
            messageId: `queue_email_${Date.now()}`,
            to,
            type,
            subject,
            body,
            template,
            variables: variables || {},
            priority,
            timestamp: new Date().toISOString()
        };

        await rabbitmqConfig.publishEmailMessage(emailMessage);

        res.json({
            success: true,
            message: 'Mensagem publicada na fila de emails',
            messageId: emailMessage.messageId,
            queue: 'emails'
        });

    } catch (error) {
        logger.error('❌ Erro ao publicar na fila de emails:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/queue/push:
 *   post:
 *     tags: [📬 Filas]
 *     summary: Publicar mensagem na fila de push notifications
 *     description: |
 *       **🚀 Método Recomendado**: Publica uma mensagem na fila `push-notifications` 
 *       do RabbitMQ para processamento assíncrono.
 *       
 *       **⚡ Vantagens**:
 *       - Processamento assíncrono e resiliente
 *       - Dead Letter Queue para tratamento de falhas
 *       - Retry automático em caso de problemas temporários
 *       - Suporte a deep links e dados customizados
 *       
 *       **📱 Templates Automáticos**: O serviço possui templates baseados no `type`:
 *       
 *       | Tipo | Template | Deep Link |
 *       |------|----------|-----------|
 *       | `order_created` | "Pedido criado! 📦" | `app://track/{{orderId}}` |
 *       | `order_completed` | "Pedido entregue! ⭐" | `app://evaluate/{{orderId}}` |
 *       | `evaluation_reminder` | "Avalie sua entrega! ⭐" | `app://evaluate/{{orderId}}` |
 *       | `welcome` | "Bem-vindo! 👋" | `app://home` |
 *       | `promotional` | "{{title}}" | `app://promotions` |
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PushMessage'
 *           examples:
 *             order_created:
 *               summary: 📦 Pedido Criado
 *               description: Notificação quando um novo pedido é criado
 *               value:
 *                 userId: "user123"
 *                 type: "order_created"
 *                 data:
 *                   orderId: 123
 *                   action: "TRACK_ORDER"
 *             order_completed:
 *               summary: ✅ Pedido Finalizado
 *               description: Notificação de entrega concluída
 *               value:
 *                 userId: "user456"
 *                 type: "order_completed"
 *                 data:
 *                   orderId: 123
 *                   action: "EVALUATE_ORDER"
 *                 deepLink: "app://evaluate/123"
 *             evaluation_reminder:
 *               summary: ⭐ Lembrete de Avaliação
 *               description: Lembrete para avaliar o pedido
 *               value:
 *                 userId: "user789"
 *                 type: "evaluation_reminder"
 *                 data:
 *                   orderId: 123
 *                   driverName: "Carlos"
 *                 deepLink: "app://evaluate/123"
 *             promotional:
 *               summary: 🎯 Promocional
 *               description: Notificação promocional
 *               value:
 *                 userId: "user999"
 *                 type: "promotional"
 *                 title: "🔥 Oferta Especial!"
 *                 body: "20% de desconto em todos os pedidos hoje!"
 *                 data:
 *                   campaign: "WEEKEND_SPECIAL"
 *                   discount: 20
 *                 deepLink: "app://promotions"
 *     responses:
 *       200:
 *         description: Mensagem publicada na fila com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Mensagem publicada na fila de push notifications"
 *                 messageId:
 *                   type: string
 *                   example: "queue_push_1642248600000"
 *                 queue:
 *                   type: string
 *                   example: "push-notifications"
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: 'Campo "userId" é obrigatório'
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/queue/push', async (req, res) => {
    try {
        const { 
            userId,
            type = 'welcome',
            title,
            body,
            data,
            deepLink,
            priority = 'normal'
        } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Campo "userId" é obrigatório'
            });
        }

        const pushMessage = {
            messageId: `queue_push_${Date.now()}`,
            userId,
            type,
            title,
            body,
            data: data || {},
            deepLink,
            priority,
            timestamp: new Date().toISOString()
        };

        await rabbitmqConfig.publishPushMessage(pushMessage);

        res.json({
            success: true,
            message: 'Mensagem publicada na fila de push notifications',
            messageId: pushMessage.messageId,
            queue: 'push-notifications'
        });

    } catch (error) {
        logger.error('❌ Erro ao publicar na fila de push:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/queue/email/test:
 *   post:
 *     tags: [📬 Filas]
 *     summary: Publicar mensagem de teste na fila de emails
 *     description: |
 *       **🧪 Testes Pré-configurados**: Publica mensagens de teste que simulam 
 *       cenários reais do sistema de delivery.
 *       
 *       **🚀 Cenários Disponíveis**:
 *       - Entrega finalizada para cliente
 *       - Entrega finalizada para motorista  
 *       - Novo pedido criado
 *       - Boas-vindas
 *       
 *       Se não especificado, usa cenário de entrega finalizada para cliente.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Email destinatário (opcional)
 *                 example: "test@example.com"
 *               type:
 *                 type: string
 *                 enum: [ORDER_COMPLETED, ORDER_CREATED, welcome]
 *                 description: Tipo do teste (opcional)
 *                 example: "ORDER_COMPLETED"
 *               scenario:
 *                 type: string
 *                 enum: [customer_delivery, driver_delivery, new_order, welcome_customer, welcome_driver]
 *                 description: Cenário pré-configurado (opcional)
 *                 example: "customer_delivery"
 *           examples:
 *             customer_delivery_test:
 *               summary: 🎉 Teste - Cliente Recebeu Entrega
 *               value:
 *                 to: "cliente.teste@email.com"
 *                 scenario: "customer_delivery"
 *             driver_delivery_test:
 *               summary: ✅ Teste - Motorista Finalizou Entrega
 *               value:
 *                 to: "motorista.teste@email.com"
 *                 scenario: "driver_delivery"
 *             new_order_test:
 *               summary: 📦 Teste - Novo Pedido Criado
 *               value:
 *                 to: "cliente.novo@email.com"
 *                 scenario: "new_order"
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SuccessResponse'
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/queue/email/test', async (req, res) => {
    try {
        const { to, type, scenario } = req.body;
        
        // Cenários pré-configurados baseados no sistema real
        const testScenarios = {
            customer_delivery: {
                to: to || 'cliente.teste@delivery.com',
                type: 'ORDER_COMPLETED',
                variables: {
                    orderId: 98765,
                    customerName: 'Ana Teste Cliente',
                    recipientType: 'CUSTOMER',
                    orderDescription: 'Pizza Portuguesa Grande + Refrigerante 2L',
                    deliveryAddress: 'Rua de Teste, 123 - Centro, Test City',
                    originAddress: 'Pizzaria Teste - Av. Principal, 456',
                    completedAt: new Date().toLocaleString('pt-BR'),
                    completedAtISO: new Date().toISOString(),
                    orderStatus: 'DELIVERIED',
                    driverId: 54321,
                    hasImage: true,
                    imageUrl: 'https://test-storage.com/delivery-photo-test.jpg',
                    isDriver: false
                }
            },
            driver_delivery: {
                to: to || 'motorista.teste@delivery.com',
                type: 'ORDER_COMPLETED',
                variables: {
                    orderId: 98765,
                    customerName: 'Carlos Teste Motorista',
                    recipientType: 'DRIVER',
                    orderDescription: 'Pizza Portuguesa Grande + Refrigerante 2L',
                    deliveryAddress: 'Rua de Teste, 123 - Centro, Test City',
                    originAddress: 'Pizzaria Teste - Av. Principal, 456',
                    pickupAddress: 'Pizzaria Teste - Av. Principal, 456',
                    completedAt: new Date().toLocaleString('pt-BR'),
                    customerId: 12345,
                    isDriver: true,
                    hasImage: true,
                    imageUrl: 'https://test-storage.com/delivery-photo-test.jpg'
                }
            },
            new_order: {
                to: to || 'cliente.teste@delivery.com',
                type: 'ORDER_CREATED',
                variables: {
                    orderId: 98766,
                    customerName: 'João Teste Cliente',
                    orderDescription: 'Hambúrguer Especial + Batata Frita + Suco Natural',
                    deliveryAddress: 'Av. Teste, 789 - Bairro Novo, Test City',
                    createdAt: new Date().toLocaleString('pt-BR'),
                    estimatedTime: '35-45 minutos'
                }
            },
            welcome_customer: {
                to: to || 'novo.cliente@delivery.com',
                type: 'welcome',
                variables: {
                    customerName: 'Maria Nova Cliente',
                    userType: 'CUSTOMER'
                }
            },
            welcome_driver: {
                to: to || 'novo.motorista@delivery.com',
                type: 'welcome',
                variables: {
                    customerName: 'Roberto Novo Motorista',
                    userType: 'DRIVER'
                }
            }
        };
        
        // Usar cenário especificado ou padrão
        const selectedScenario = scenario || 'customer_delivery';
        const testData = testScenarios[selectedScenario] || testScenarios.customer_delivery;
        
        // Sobrescrever tipo se especificado
        if (type) {
            testData.type = type;
        }
        
        const testMessage = await emailQueueListener.publishTestMessage(testData);
        
        res.json({
            success: true,
            message: `Mensagem de teste "${selectedScenario}" publicada na fila de emails`,
            scenario: selectedScenario,
            testMessage
        });

    } catch (error) {
        logger.error('❌ Erro ao publicar teste na fila de emails:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/queue/push/test:
 *   post:
 *     tags: [📬 Filas]
 *     summary: Publicar mensagem de teste na fila de push
 *     description: |
 *       Publica uma mensagem de teste pré-configurada na fila de push notifications.
 *       Útil para testes rápidos do sistema de filas.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID do usuário (opcional)
 *                 example: "test-user"
 *               type:
 *                 type: string
 *                 description: Tipo do teste (opcional)
 *                 example: "welcome"
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SuccessResponse'
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/queue/push/test', async (req, res) => {
    try {
        const testMessage = await pushQueueListener.publishTestMessage(req.body);
        
        res.json({
            success: true,
            message: 'Mensagem de teste publicada na fila de push',
            testMessage
        });

    } catch (error) {
        logger.error('❌ Erro ao publicar teste na fila de push:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/providers/email/switch:
 *   post:
 *     tags: [⚙️ Provedores]
 *     summary: Trocar provedor de email em runtime
 *     description: |
 *       **🔄 Troca Dinâmica**: Alterna entre provedores de email sem necessidade 
 *       de reiniciar o serviço.
 *       
 *       **📋 Provedores Disponíveis**:
 *       - **`local`**: Simulação para desenvolvimento/testes
 *         - ✅ Não requer configuração externa
 *         - ✅ Logs detalhados do que seria enviado
 *         - ✅ Estatísticas completas
 *       
 *       - **`azure`**: Azure Functions para produção
 *         - ✅ Envio real de emails
 *         - ✅ Integração com Azure Functions
 *         - ⚙️ Requer `AZURE_FUNCTIONS_BASE_URL` e `AZURE_FUNCTIONS_API_KEY`
 *       
 *       **💡 Casos de Uso**:
 *       - Desenvolvimento → Produção
 *       - Testes A/B de provedores
 *       - Fallback em caso de problemas
 *       - Manutenção sem downtime
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderSwitch'
 *           examples:
 *             to_azure:
 *               summary: 🔄 Trocar para Azure
 *               description: Ativar envio real via Azure Functions
 *               value:
 *                 provider: "azure"
 *             to_local:
 *               summary: 🔄 Trocar para Local
 *               description: Voltar para simulação local
 *               value:
 *                 provider: "local"
 *     responses:
 *       200:
 *         description: Provedor trocado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email provider trocado para: azure"
 *                 newProvider:
 *                   type: string
 *                   example: "AzureEmailProvider"
 *       400:
 *         description: Provedor inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: 'Provider deve ser "local" ou "azure"'
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/providers/email/switch', async (req, res) => {
    try {
        const { provider } = req.body;
        
        if (!provider || !['local', 'azure'].includes(provider.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Provider deve ser "local" ou "azure"'
            });
        }

        dependencyContainer.switchEmailProvider(provider);
        
        res.json({
            success: true,
            message: `Email provider trocado para: ${provider}`,
            newProvider: dependencyContainer.getEmailProvider().constructor.name
        });

    } catch (error) {
        logger.error('❌ Erro ao trocar email provider:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/providers/push/switch:
 *   post:
 *     tags: [⚙️ Provedores]
 *     summary: Trocar provedor de push em runtime
 *     description: |
 *       **🔄 Troca Dinâmica**: Alterna entre provedores de push notifications 
 *       sem necessidade de reiniciar o serviço.
 *       
 *       **📋 Provedores Disponíveis**:
 *       - **`local`**: Simulação para desenvolvimento/testes
 *         - ✅ Não requer configuração externa
 *         - ✅ Logs detalhados do que seria enviado
 *         - ✅ Suporte a deep links e dados customizados
 *       
 *       - **`azure`**: Azure Functions para produção
 *         - ✅ Push notifications reais
 *         - ✅ Integração com Azure Functions
 *         - ⚙️ Requer configuração do Azure Functions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProviderSwitch'
 *     responses:
 *       200:
 *         description: Provedor trocado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Push provider trocado para: azure"
 *                 newProvider:
 *                   type: string
 *                   example: "AzurePushProvider"
 *       400:
 *         description: Provedor inválido
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/providers/push/switch', async (req, res) => {
    try {
        const { provider } = req.body;
        
        if (!provider || !['local', 'azure'].includes(provider.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Provider deve ser "local" ou "azure"'
            });
        }

        dependencyContainer.switchPushProvider(provider);
        
        res.json({
            success: true,
            message: `Push provider trocado para: ${provider}`,
            newProvider: dependencyContainer.getPushProvider().constructor.name
        });

    } catch (error) {
        logger.error('❌ Erro ao trocar push provider:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/providers:
 *   get:
 *     tags: [⚙️ Provedores]
 *     summary: Obter informações dos provedores ativos
 *     description: |
 *       Retorna informações detalhadas sobre os provedores atualmente configurados,
 *       incluindo configurações e estatísticas de uso.
 *       
 *       **📊 Informações Incluídas**:
 *       - Nome e tipo do provedor
 *       - Configurações ativas
 *       - Estatísticas de envio
 *       - Tempo de atividade
 *       - Status de conectividade
 *     responses:
 *       200:
 *         description: Informações dos provedores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 email:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "LocalEmailProvider"
 *                     config:
 *                       type: object
 *                       example:
 *                         provider: "local-email-provider"
 *                         type: "local"
 *                         features: ["template-support", "variable-substitution"]
 *                     stats:
 *                       type: object
 *                       example:
 *                         sent: 150
 *                         errors: 2
 *                         uptime: 3600000
 *                 push:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "LocalPushProvider"
 *                     config:
 *                       type: object
 *                       example:
 *                         provider: "local-push-provider"
 *                         type: "local"
 *                         features: ["single-notification", "broadcast", "deep-links"]
 *                     stats:
 *                       type: object
 *                       example:
 *                         sent: 75
 *                         broadcasts: 5
 *                         errors: 0
 *                         uptime: 3600000
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.get('/providers', (req, res) => {
    try {
        const providersInfo = dependencyContainer.getProvidersInfo();
        res.json(providersInfo);
    } catch (error) {
        logger.error('❌ Erro ao obter info dos provedores:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/providers/test:
 *   get:
 *     tags: [⚙️ Provedores]
 *     summary: Testar conectividade de todos os provedores
 *     description: |
 *       Executa testes de conectividade em todos os provedores configurados.
 *       
 *       **🧪 Testes Realizados**:
 *       - Conectividade com Azure Functions (se configurado)
 *       - Simulação de envio (providers locais)
 *       - Validação de configurações
 *       - Tempo de resposta
 *       
 *       **💡 Use este endpoint para**:
 *       - Verificar se Azure Functions está acessível
 *       - Validar configurações antes de trocar providers
 *       - Diagnóstico de problemas de conectividade
 *       - Monitoramento periódico
 *     responses:
 *       200:
 *         description: Resultados dos testes de conectividade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 email:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     provider:
 *                       type: string
 *                       example: "local-email-provider"
 *                     status:
 *                       type: string
 *                       example: "connected"
 *                     message:
 *                       type: string
 *                       example: "Provedor local funcionando corretamente"
 *                 push:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     provider:
 *                       type: string
 *                       example: "local-push-provider"
 *                     status:
 *                       type: string
 *                       example: "connected"
 *                 overall:
 *                   type: boolean
 *                   example: true
 *                   description: Status geral (true se todos os provedores estão funcionando)
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.get('/providers/test', async (req, res) => {
    try {
        const testResults = await dependencyContainer.testAllProviders();
        res.json(testResults);
    } catch (error) {
        logger.error('❌ Erro no teste dos provedores:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/stats:
 *   get:
 *     tags: [📊 Estatísticas]
 *     summary: Obter estatísticas detalhadas do serviço
 *     description: |
 *       Retorna métricas completas de performance e uso do notification service.
 *       
 *       **📈 Métricas Incluídas**:
 *       - Total de notificações processadas
 *       - Breakdown por tipo (email/push)
 *       - Taxa de erro e sucesso
 *       - Tempo de atividade (uptime)
 *       - Estatísticas por provedor
 *       - Performance dos sub-serviços
 *       
 *       **💡 Use para**:
 *       - Monitoramento de performance
 *       - Identificação de problemas
 *       - Relatórios de uso
 *       - Planejamento de capacidade
 *     responses:
 *       200:
 *         description: Estatísticas detalhadas do serviço
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                   example: "notification-service"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 uptime:
 *                   type: object
 *                   properties:
 *                     milliseconds:
 *                       type: number
 *                       example: 3600000
 *                     seconds:
 *                       type: number
 *                       example: 3600
 *                     minutes:
 *                       type: number
 *                       example: 60
 *                     hours:
 *                       type: number
 *                       example: 1
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalProcessed:
 *                       type: number
 *                       example: 1500
 *                       description: Total de notificações processadas
 *                     emailsProcessed:
 *                       type: number
 *                       example: 900
 *                       description: Emails processados
 *                     pushProcessed:
 *                       type: number
 *                       example: 600
 *                       description: Push notifications processadas
 *                     errors:
 *                       type: number
 *                       example: 15
 *                       description: Total de erros
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T09:30:00.000Z"
 *                 subServices:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: object
 *                       properties:
 *                         service:
 *                           type: string
 *                           example: "email"
 *                         processed:
 *                           type: number
 *                           example: 900
 *                         errors:
 *                           type: number
 *                           example: 10
 *                         provider:
 *                           type: object
 *                           example:
 *                             sent: 890
 *                             errors: 10
 *                             uptime: 3600000
 *                     push:
 *                       type: object
 *                       properties:
 *                         service:
 *                           type: string
 *                           example: "push"
 *                         processed:
 *                           type: number
 *                           example: 600
 *                         errors:
 *                           type: number
 *                           example: 5
 *                 healthStatus:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: boolean
 *                       example: true
 *                       description: Status geral de saúde (erro < 10%)
 *                     errorRate:
 *                       type: number
 *                       example: 0.01
 *                       description: Taxa de erro (0.01 = 1%)
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.get('/stats', (req, res) => {
    try {
        const stats = notificationService.getDetailedStats();
        res.json(stats);
    } catch (error) {
        logger.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/stats/reset:
 *   post:
 *     tags: [📊 Estatísticas]
 *     summary: Resetar estatísticas do serviço
 *     description: |
 *       **⚠️ Ação Destrutiva**: Reseta todas as estatísticas do serviço para zero.
 *       
 *       **🔄 O que é resetado**:
 *       - Contadores de mensagens processadas
 *       - Contadores de erros
 *       - Estatísticas de tempo de atividade
 *       - Métricas dos provedores
 *       
 *       **💡 Use quando**:
 *       - Início de novo período de monitoramento
 *       - Após manutenção ou atualizações
 *       - Para limpar dados de teste
 *       - Debugging e troubleshooting
 *     responses:
 *       200:
 *         description: Estatísticas resetadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Estatísticas resetadas"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.post('/stats/reset', (req, res) => {
    try {
        notificationService.resetStats();
        res.json({
            success: true,
            message: 'Estatísticas resetadas',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('❌ Erro ao resetar estatísticas:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/rabbitmq/config:
 *   get:
 *     tags: [🐰 RabbitMQ]
 *     summary: Obter configuração das filas RabbitMQ
 *     description: |
 *       Retorna informações sobre a configuração atual do RabbitMQ,
 *       incluindo status de conexão e configuração das filas.
 *       
 *       **📋 Informações Incluídas**:
 *       - Status de conexão com RabbitMQ
 *       - Configuração dos exchanges
 *       - Configuração das filas (emails, push-notifications)
 *       - Bindings entre exchanges e filas
 *       - Configurações de Dead Letter Queue
 *       
 *       **💡 Use para**:
 *       - Verificar se RabbitMQ está conectado
 *       - Debugar problemas de filas
 *       - Validar configurações
 *       - Documentar arquitetura
 *     responses:
 *       200:
 *         description: Configuração do RabbitMQ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                   example: true
 *                   description: Status da conexão com RabbitMQ
 *                 config:
 *                   type: object
 *                   properties:
 *                     exchanges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "notification.exchange"
 *                           type:
 *                             type: string
 *                             example: "topic"
 *                           options:
 *                             type: object
 *                             example:
 *                               durable: true
 *                     queues:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "emails"
 *                           options:
 *                             type: object
 *                             example:
 *                               durable: true
 *                               arguments:
 *                                 x-dead-letter-exchange: "notification.dlx"
 *                                 x-message-ttl: 3600000
 *                           bindings:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 exchange:
 *                                   type: string
 *                                   example: "notification.exchange"
 *                                 routingKey:
 *                                   type: string
 *                                   example: "email"
 *       500:
 *         $ref: '#/components/responses/ErrorResponse'
 */
router.get('/rabbitmq/config', (req, res) => {
    try {
        const config = rabbitmqConfig.getQueueConfig();
        res.json({
            connected: rabbitmqConfig.isConnected(),
            config
        });
    } catch (error) {
        logger.error('❌ Erro ao obter config RabbitMQ:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;