# Configuração de Email - Sistema de Notificações

Para que o sistema de notificações por email funcione, você precisa configurar as variáveis de ambiente no backend.

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis no arquivo `.env` do backend:

```env
# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=zggsffa@gmail.com
SMTP_PASS=sklj vtkt mygt uvlg
SMTP_FROM=zggsffa@gmail.com
```

## Configuração para Gmail

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "App" e escolha "Mail"
3. Selecione "Device" e escolha "Other (Custom name)"
4. Digite "Mentorly" e clique em "Generate"
5. Copie a senha gerada (16 caracteres)
6. Use essa senha no campo `SMTP_PASS`

## Outros Provedores de Email

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Servidor SMTP Personalizado
Ajuste as variáveis conforme a configuração do seu servidor SMTP.

## Testando

Após configurar, ao criar uma nova aula com um email preenchido, o sistema enviará automaticamente um email de notificação.

