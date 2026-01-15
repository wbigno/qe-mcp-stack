/**
 * CarePayment Application Architecture Data
 * Infrastructure data for the 5 CarePayment repositories:
 * - Core (ServiceLayer API)
 * - Core.Common (Core.Common API)
 * - Payments (Payments API)
 * - PreCare (PreCare API)
 * - ThirdPartyIntegrations (Integration API)
 *
 * This data is displayed in the Infrastructure Dashboard
 */

export const infrastructureData = {
  applications: {
    servicelayer: {
      name: "ServiceLayer API",
      repository: "Core",
      tech: ".NET Framework 4.8",
      color: "bg-red-500",
      framework: "ASP.NET Web API 2",
      deployment: "IIS Web Application",
      baseUrl: "http://localhost:15155/",
      baseUrls: {
        local: "http://localhost:15155/",
        dev: "https://servicelayerapi-dev-usw-appservice.azurewebsites.net/",
        qa: "https://servicelayerapi-dev-usw-appservice-qa.azurewebsites.net/",
        qa2: "https://servicelayerapi-dev-usw-appservice-qa2.azurewebsites.net/",
        staging:
          "https://servicelayerapi-staging-usw-appservice.azurewebsites.net/",
        preprod:
          "https://cpyt-as-usw1-prod-servicelayer-preprod.cpyt-ase-usw1-prod.p.azurewebsites.net/",
        prod: "https://cpyt-as-usw1-prod-servicelayer.cpyt-ase-usw1-prod.p.azurewebsites.net/",
      },
      authentication: "API Key (ServiceLayerAccessKey)",
      features: [
        "Member Portal Operations",
        "Payment Operations",
        "PreCare Enrollment",
        "Provider Operations",
        "Terms & Conditions",
      ],
      integrations: {
        payeezy: {
          name: "Payeezy",
          type: "payment",
          color: "text-green-700",
          purpose: "Payment processing gateway for card transactions",
          baseUrl: "https://cert.api.firstdata.com",
          authentication: {
            method: "API Secret",
            config: "PayeezyPaymentJsApiSecret in app settings",
          },
          features: [
            "Card payment processing",
            "Transaction authorization",
            "Payment capture",
          ],
          endpoints: [
            {
              method: "POST",
              path: "/payment/v1/charges",
              purpose: "Process payment",
            },
            {
              method: "POST",
              path: "/payment/v1/tokens",
              purpose: "Tokenize card",
            },
          ],
          requestStructure: {
            headers: {
              "Content-Type": "application/json",
              apikey: "API Key from config",
              token: "HMAC token",
            },
            body: {
              merchant_ref: "string",
              transaction_type: "purchase | authorize",
              method: "credit_card",
              amount: "integer (cents)",
              currency_code: "USD",
              credit_card: {
                type: "visa | mastercard | amex | discover",
                cardholder_name: "string",
                card_number: "string",
                exp_date: "MMYY",
                cvv: "string",
              },
            },
          },
          responseStructure: {
            transaction_status: "approved | declined",
            validation_status: "success | failure",
            transaction_type: "purchase",
            transaction_id: "string",
            transaction_tag: "string",
            method: "credit_card",
            amount: "integer",
            currency: "USD",
            card: {
              type: "string",
              cardholder_name: "string",
              card_number: "string (masked)",
              exp_date: "MMYY",
            },
          },
          errorHandling:
            "Retry logic with exponential backoff, logs to Application Insights",
          failover: "None - single provider",
          configuration: {
            PayeezyPaymentJsApiSecret: "API secret key",
            PayeezyPaymentJsBaseUrl: "Base URL for Payeezy",
            PaymentProviderStubEnabled: "Enable stub for testing",
          },
          codeImplementation: `// Example: Process Payeezy payment
var client = new HttpClient();
client.DefaultRequestHeaders.Add("apikey", apiKey);
client.DefaultRequestHeaders.Add("token", GenerateHmacToken());

var request = new {
    merchant_ref = "ORDER-123",
    transaction_type = "purchase",
    method = "credit_card",
    amount = 10000, // $100.00 in cents
    currency_code = "USD",
    credit_card = new {
        type = "visa",
        cardholder_name = "John Doe",
        card_number = "4111111111111111",
        exp_date = "1225",
        cvv = "123"
    }
};

var response = await client.PostAsJsonAsync(
    "https://cert.api.firstdata.com/payment/v1/charges",
    request
);

var result = await response.Content.ReadAsAsync<PayeezyResponse>();`,
        },
        stripe: {
          name: "Stripe (via Payments API)",
          type: "payment",
          color: "text-green-700",
          purpose:
            "Alternative payment processing via Payments API abstraction",
          baseUrl: "Via Payments API",
          authentication: {
            method: "Via Payments API",
            config: "Payments.Api.Url configuration",
          },
          features: [
            "Card payment processing",
            "Tokenization",
            "Subscription management",
          ],
          endpoints: [
            {
              method: "POST",
              path: "/Payments/Stripe",
              purpose: "Process Stripe payment via Payments API",
            },
          ],
          requestStructure: {
            body: {
              accountNumber: "string",
              amount: "decimal",
              paymentMethodToken: "string",
              description: "string",
            },
          },
          responseStructure: {
            success: "boolean",
            transactionId: "string",
            status: "string",
            message: "string",
          },
        },
        paymentsapi: {
          name: "Payments API",
          type: "api",
          color: "text-purple-600",
          purpose: "Centralized payment processing and tokenization service",
          baseUrl: "https://localhost:44391/",
          authentication: {
            method: "API Key from Azure Key Vault",
            config: "X-API-Key header",
          },
          features: [
            "Payment processing",
            "Card tokenization",
            "Payment method storage",
          ],
          endpoints: [
            {
              method: "POST",
              path: "/Payments/Payeezy",
              purpose: "Process Payeezy payment",
            },
            {
              method: "GET",
              path: "/CarePayment/FiServ/PaymentInformations/{accountNumber}",
              purpose: "Get payment information",
            },
          ],
          codeImplementation: `// Example: Process payment via Payments API
var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-API-Key", apiKey);

var request = new {
    accountNumber = "12345",
    amount = 100.00m,
    cardNumber = "4111111111111111",
    expiryDate = "1225",
    cvv = "123"
};

var response = await client.PostAsJsonAsync(
    "https://localhost:44391/Payments/Payeezy", 
    request
);`,
          configuration: {
            "Payments.Api.Url": "Base URL for Payments API",
            "AzureKeyVault.PaymentsApiKey": "API key stored in Key Vault",
          },
        },
        integrationapi: {
          name: "Integration API",
          type: "api",
          color: "text-purple-600",
          purpose: "External integrations and specialized operations",
          baseUrl: "http://localhost:50708/services/",
          authentication: {
            method: "Multi-API Key or OAuth 2.0",
            config: "X-API-Key header or Bearer token",
          },
          features: [
            "Payment provider integrations",
            "Tokenization",
            "Digital engagement tracking",
          ],
          endpoints: [
            {
              method: "GET",
              path: "/v1/accounts/accountNumber/{accountNumber}",
              purpose: "Get account by account number",
            },
            {
              method: "POST",
              path: "/v1/payments",
              purpose: "Process payment",
            },
            {
              method: "POST",
              path: "/v1/tokenize",
              purpose: "Tokenize payment method",
            },
          ],
          codeImplementation: `// Example: Get account via Integration API
var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-API-Key", apiKey);

var response = await client.GetAsync(
    $"{baseUrl}/v1/accounts/accountNumber/{accountNumber}"
);

var account = await response.Content.ReadAsAsync<AccountResponse>();`,
        },
        niceincontact: {
          name: "Nice InContact",
          type: "external",
          color: "text-orange-600",
          purpose:
            "Call center integration for agent management and call logging",
          baseUrl:
            "https://api-c48.nice-incontact.com/inContactAPI/services/v22.0/",
          authentication: {
            method: "OAuth 2.0 Client Credentials",
            config: "NiceInContact.Api.* settings",
          },
          features: [
            "Agent lookup",
            "Call logging",
            "Contact management",
            "Skill assignment",
          ],
          endpoints: [
            { method: "POST", path: "/token", purpose: "Get OAuth token" },
            {
              method: "GET",
              path: "/agents/{agentId}",
              purpose: "Get agent details",
            },
            { method: "POST", path: "/contacts", purpose: "Log call contact" },
          ],
          configuration: {
            "NiceInContact.Api.BaseUrl": "API base URL",
            "NiceInContact.Api.ClientId": "OAuth client ID",
            "NiceInContact.Api.ClientSecret": "OAuth client secret",
          },
          codeImplementation: `// Example: Get OAuth token and call agent API
var tokenRequest = new {
    grant_type = "client_credentials",
    client_id = clientId,
    client_secret = clientSecret,
    scope = "RealTimeApi"
};

var tokenResponse = await client.PostAsJsonAsync(
    "https://api-c48.nice-incontact.com/inContactAPI/services/v22.0/token",
    tokenRequest
);

var token = await tokenResponse.Content.ReadAsAsync<TokenResponse>();

client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token.access_token}");
var agentResponse = await client.GetAsync($"/agents/{agentId}");`,
        },
        revspring: {
          name: "RevSpring",
          type: "external",
          color: "text-orange-600",
          purpose: "Payment processing and correspondence management",
          baseUrl: "https://api-staging.revspringinc.com/api/rest/",
          authentication: {
            method: "OAuth token-based",
            config: "RevSpring.Api.* settings",
          },
          features: [
            "Payment processing",
            "Statement generation",
            "Correspondence management",
          ],
          endpoints: [
            { method: "POST", path: "/payments", purpose: "Process payment" },
            {
              method: "GET",
              path: "/statements/{accountId}",
              purpose: "Get statements",
            },
          ],
          configuration: {
            "RevSpring.Api.BaseUrl": "API base URL",
            "RevSpring.Api.ClientId": "52612",
            "RevSpring.Api.ClientSecret": "OAuth secret",
          },
        },
        redis: {
          name: "Redis Cache",
          type: "cache",
          color: "text-red-600",
          purpose: "Distributed caching for session state and data caching",
          baseUrl: "localhost:6379 (configurable)",
          authentication: {
            method: "Connection string",
            config: "RedisConnectionString",
          },
          features: ["Session caching", "Data caching", "Distributed cache"],
          cacheStrategy: {
            sessionState: {
              ttl: "120 minutes",
              keys: "Session:{sessionId}",
              usage: "User session data",
            },
            accountData: {
              ttl: "15 minutes",
              keys: "Account:{accountNumber}",
              usage: "Frequently accessed account data",
            },
            lookupData: {
              ttl: "60 minutes",
              keys: "Lookup:{type}:{id}",
              usage: "Logo configs, site data",
            },
          },
          codeImplementation: `// Example: Cache account data
var redis = ConnectionMultiplexer.Connect(connectionString);
var db = redis.GetDatabase();

// Set cache with expiration
var accountJson = JsonConvert.SerializeObject(account);
await db.StringSetAsync(
    $"Account:{accountNumber}", 
    accountJson, 
    TimeSpan.FromMinutes(15)
);

// Get from cache
var cached = await db.StringGetAsync($"Account:{accountNumber}");
if (cached.HasValue) {
    var account = JsonConvert.DeserializeObject<Account>(cached);
    return account;
}

// Cache miss - fetch from database
var account = await _repository.GetAccountAsync(accountNumber);
await db.StringSetAsync($"Account:{accountNumber}", 
    JsonConvert.SerializeObject(account), 
    TimeSpan.FromMinutes(15)
);`,
          configuration: {
            RedisConnectionString: "localhost:6379,password=xxx,ssl=true",
            GenericRedisConnectionString: "Shared Redis connection",
          },
        },
        hangfire: {
          name: "Hangfire Jobs",
          type: "background",
          color: "text-yellow-600",
          purpose: "Background job processing for async operations",
          baseUrl: "SQL Server storage",
          authentication: {
            method: "SQL Server connection",
            config: "Connection string",
          },
          features: [
            "Recurring jobs",
            "Fire-and-forget jobs",
            "Delayed jobs",
            "Continuations",
          ],
          jobs: [
            {
              name: "Settlement Processing",
              schedule: "Daily at 2 AM",
              description: "Process daily settlements for all accounts",
              code: 'RecurringJob.AddOrUpdate("settlement", () => ProcessSettlements(), Cron.Daily(2))',
            },
            {
              name: "Statement Generation",
              schedule: "Monthly on 1st",
              description: "Generate monthly statements",
              code: 'RecurringJob.AddOrUpdate("statements", () => GenerateStatements(), Cron.Monthly(1))',
            },
            {
              name: "Recurring Card Processing",
              schedule: "Hourly",
              description: "Process recurring card payments",
              code: 'RecurringJob.AddOrUpdate("recurring-cards", () => ProcessRecurringCards(), Cron.Hourly)',
            },
            {
              name: "Alert Processing",
              schedule: "Every 5 minutes",
              description: "Process system alerts",
              code: 'RecurringJob.AddOrUpdate("alerts", () => ProcessAlerts(), "*/5 * * * *")',
            },
          ],
          codeImplementation: `// Example: Enqueue background job
BackgroundJob.Enqueue<SettlementProcessor>(
    x => x.ProcessSettlement(accountId)
);

// Schedule recurring job
RecurringJob.AddOrUpdate(
    "recurring-card-processing",
    () => ProcessRecurringCards(),
    Cron.Hourly
);

// Schedule delayed job
BackgroundJob.Schedule(
    () => SendStatement(accountId),
    TimeSpan.FromHours(24)
);

// Continuation (chain jobs)
var jobId = BackgroundJob.Enqueue(() => ProcessPayment(paymentId));
BackgroundJob.ContinueJobWith(jobId, () => SendConfirmation(paymentId));`,
          configuration: {
            "Hangfire:DashboardPath": "/hangfire",
            "RecurringCard.BatchSize": "100",
            "RecurringCard.BatchStaggerMinutes": "5",
          },
        },
        sqlserver: {
          name: "SQL Server",
          type: "database",
          color: "text-gray-600",
          purpose: "Primary data storage for all application data",
          baseUrl: "Connection string configured",
          authentication: {
            method: "SQL Authentication or Windows Auth",
            config: "Connection strings in Web.config",
          },
          databases: [
            "CarePayment",
            "MessageContext",
            "CBRContext",
            "UserAccountContext",
          ],
          tables: {
            CardAccount: "Card-based patient accounts",
            SitePatientAccount: "Site-specific patient accounts",
            Logo: "Provider/logo configurations",
            Site: "Healthcare facility information",
            Transaction: "Payment transactions",
            Message: "Communication messages",
            Document: "Document storage metadata",
          },
          codeImplementation: `// Example: Entity Framework query with includes
using (var context = new CarePaymentContext()) {
    var account = await context.CardAccounts
        .Include(a => a.Site)
        .Include(a => a.Logo)
        .Include(a => a.Transactions.OrderByDescending(t => t.TransactionDate))
        .Include(a => a.Messages)
        .FirstOrDefaultAsync(a => a.AccountNumber == accountNumber);
}

// Example: Repository pattern with caching
public async Task<CardAccount> GetAccountAsync(string accountNumber) {
    // Check cache first
    var cached = await _cache.GetAsync($"Account:{accountNumber}");
    if (cached != null) return cached;
    
    // Fetch from database
    var account = await _context.CardAccounts
        .AsNoTracking()
        .Where(a => a.AccountNumber == accountNumber)
        .FirstOrDefaultAsync();
    
    // Cache result
    await _cache.SetAsync($"Account:{accountNumber}", account, TimeSpan.FromMinutes(15));
    return account;
}`,
          connectionStrings: {
            primary:
              "Data Source=server;Initial Catalog=CarePayment;User Id=xxx;Password=xxx",
            readOnly: "Separate read-only connection for reporting queries",
          },
        },
        azure: {
          name: "Azure Services",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Cloud services for monitoring, storage, and configuration",
          services: {
            applicationInsights: {
              name: "Application Insights",
              purpose: "Telemetry and monitoring",
              config: "AppInsightsAppInstrumentationKey",
              tracks: [
                "Requests",
                "Exceptions",
                "Dependencies",
                "Custom events",
              ],
            },
            keyVault: {
              name: "Azure Key Vault",
              purpose: "Secret management",
              uri: "https://kv-usw1-dev.vault.azure.net/",
              secrets: ["API keys", "Connection strings", "Certificates"],
            },
            blobStorage: {
              name: "Azure Blob Storage",
              purpose: "Document storage",
              container: "compliance-documents-local",
              stores: ["Compliance documents", "Statements", "Reports"],
            },
            eventGrid: {
              name: "Azure Event Grid",
              purpose: "Event publishing",
              topic: "cpyt-usw-dev-eventgrid",
              events: [
                "Payment processed",
                "Account updated",
                "Statement generated",
              ],
            },
          },
          codeImplementation: `// Application Insights
var telemetry = new TelemetryClient();
telemetry.TrackEvent("PaymentProcessed", new Dictionary<string, string> {
    { "AccountNumber", accountNumber },
    { "Amount", amount.ToString() }
});

// Key Vault
var client = new SecretClient(new Uri(keyVaultUri), new DefaultAzureCredential());
var secret = await client.GetSecretAsync("PaymentsApiKey");

// Blob Storage
var blobClient = new BlobContainerClient(connectionString, containerName);
await blobClient.UploadBlobAsync(fileName, stream);

// Event Grid
var client = new EventGridPublisherClient(new Uri(topicEndpoint), new AzureKeyCredential(key));
await client.SendEventAsync(new EventGridEvent("PaymentProcessed", "CarePayment", "1.0", data));`,
        },
      },
      swagger: {
        enabled: true,
        url: "http://localhost:15155/swagger/docs/v1",
        urls: {
          local: "http://localhost:15155/swagger/docs/v1",
          dev: "https://servicelayerapi-dev-usw-appservice.azurewebsites.net/swagger/docs/v1",
          qa: "https://servicelayerapi-dev-usw-appservice-qa.azurewebsites.net/swagger/docs/v1",
          qa2: "https://servicelayerapi-dev-usw-appservice-qa2.azurewebsites.net/swagger/docs/v1",
          staging:
            "https://servicelayerapi-staging-usw-appservice.azurewebsites.net/swagger/docs/v1",
          preprod:
            "https://cpyt-as-usw1-prod-servicelayer-preprod.cpyt-ase-usw1-prod.p.azurewebsites.net/swagger/docs/v1",
          prod: "https://cpyt-as-usw1-prod-servicelayer.cpyt-ase-usw1-prod.p.azurewebsites.net/swagger/docs/v1",
        },
        version: "v1",
      },
      hangfire: {
        enabled: true,
        urls: {
          dev: "https://devhangfire.carepayment.com/hangfire",
          qa: "https://qahangfire.carepayment.com/hangfire/",
          qa2: "https://qa2hangfire.carepayment.com/hangfire/",
          staging: "https://staginghangfire.carepayment.com/hangfire/",
          prod: "https://hangfire.carepayment.com/hangfire/",
        },
      },
      dependencies: {
        core: [
          "CarePayment.ServiceLayer.Api.Models",
          "CarePayment.DAL",
          "CarePayment.Infrastructure",
          "CarePayment.ServiceLocation",
          "CarePayment.Redis",
        ],
        business: [
          "CarePayment.Estimation.Providers",
          "CarePayment.OmniChannel.Models",
          "CarePayment.ApplicationInsights.Providers",
          "CarePayment.FeatureFlags",
          "CarePayment.Notifications",
        ],
        nuget: [
          "Core.Common.Shared (v2025.10.20.1)",
          "Entity Framework 6.x",
          "Hangfire (v1.8.20)",
          "Application Insights (v2.21.0)",
          "AutoMapper",
        ],
      },
    },
    carelink: {
      name: "CareLink (Provider Portal)",
      repository: "Core",
      tech: ".NET Framework 4.8",
      color: "bg-blue-500",
      framework: "ASP.NET MVC 5",
      deployment: "IIS Web Application",
      baseUrl: "https://carelink.carepayment.com",
      baseUrls: {
        local: "http://localhost:54879/",
        dev: "https://devcarelink.carepayment.com/",
        qa: "https://carelink-dev-usw-appservice-qa.azurewebsites.net/",
        qa2: "https://carelink-dev-usw-appservice-qa2.azurewebsites.net/",
        staging: "https://stagingcarelink.carepayment.com/",
        preprod:
          "https://cpyt-as-usw1-prod-carelink-2-preprod.cpyt-ase-usw1-prod.p.azurewebsites.net/",
        prod: "https://carelink.carepayment.com/",
      },
      environmentLinks: {
        dev: "https://devcarelink.carepayment.com/",
        qa: "https://carelink-dev-usw-appservice-qa.azurewebsites.net/",
        qa2: "https://carelink-dev-usw-appservice-qa2.azurewebsites.net/",
        staging: "https://stagingcarelink.carepayment.com/",
        preprod:
          "https://cpyt-as-usw1-prod-carelink-2-preprod.cpyt-ase-usw1-prod.p.azurewebsites.net/",
        prod: "https://carelink.carepayment.com/",
      },
      authentication: "Forms Authentication with SQL Membership",
      features: [
        "Account Management",
        "Settlement Processing",
        "Payment Processing",
        "Statement Management",
        "Compliance Documents",
      ],
      swagger: {
        enabled: false,
        url: "",
        version: "",
      },
      integrations: {
        servicelayer: {
          name: "ServiceLayer API",
          type: "api",
          color: "text-purple-600",
          purpose: "Core business operations and account management",
          baseUrl: "http://localhost:15155/",
          authentication: {
            method: "API Key",
            config: "ServiceLayerAccessKey",
          },
          features: [
            "Account operations",
            "Payment processing",
            "Transaction history",
          ],
        },
        integrationapi: {
          name: "Integration API",
          type: "api",
          color: "text-purple-600",
          purpose: "Integration-specific operations",
          baseUrl: "http://localhost:50708/services/",
          authentication: { method: "API Key", config: "IntegrationApiKey" },
        },
        paymentsapi: {
          name: "Payments API",
          type: "api",
          color: "text-purple-600",
          purpose: "Payment processing",
          baseUrl: "https://localhost:44391/",
          authentication: { method: "API Key", config: "PaymentsApiKey" },
        },
        azure: {
          name: "Azure (Insights, Blob, KeyVault)",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Cloud services",
        },
        redis: {
          name: "Redis Cache",
          type: "cache",
          color: "text-red-600",
          purpose: "Session and data caching",
        },
        hangfire: {
          name: "Hangfire Jobs",
          type: "background",
          color: "text-yellow-600",
          purpose: "Background job processing",
        },
        sqlserver: {
          name: "SQL Server",
          type: "database",
          color: "text-gray-600",
          purpose: "Data storage",
          databases: ["CarePayment", "MessageContext"],
        },
      },
    },
    memberportal: {
      name: "Member Portal",
      repository: "Core",
      tech: ".NET Framework 4.8",
      color: "bg-green-500",
      framework: "ASP.NET MVC 5",
      deployment: "IIS Web Application",
      baseUrl: "https://member.carepayment.com",
      baseUrls: {
        local: "http://localhost:52763/",
        dev: "https://devmember.carepayment.com/",
        qa: "https://qamember.carepayment.com/",
        qa2: "https://member-dev-usw-appservice-qa2.azurewebsites.net/",
        staging: "https://stagingmember.carepayment.com/",
        preprod:
          "https://cpyt-as-usw1-prod-member-preprod.cpyt-ase-usw1-prod.p.azurewebsites.net/",
        prod: "https://member.carepayment.com/",
      },
      environmentLinks: {
        dev: "https://devmember.carepayment.com/",
        qa: "https://qamember.carepayment.com/",
        qa2: "https://member-dev-usw-appservice-qa2.azurewebsites.net/",
        staging: "https://stagingmember.carepayment.com/",
        preprod:
          "https://cpyt-as-usw1-prod-member-preprod.cpyt-ase-usw1-prod.p.azurewebsites.net/",
        prod: "https://member.carepayment.com/",
      },
      authentication: "Azure AD B2C (OAuth 2.0 / OpenID Connect)",
      features: [
        "Account Summary",
        "Payment Processing",
        "Payment Methods",
        "Statements",
        "Contact Management",
      ],
      swagger: {
        enabled: false,
        url: "",
        version: "",
      },
      integrations: {
        servicelayer: {
          name: "ServiceLayer API",
          type: "api",
          color: "text-purple-600",
          purpose: "All member portal operations",
          baseUrl: "http://localhost:15155/",
          authentication: {
            method: "API Key",
            config: "ServiceLayerAccessKey",
          },
          features: [
            "Account data",
            "Payment processing",
            "Statement retrieval",
          ],
        },
        azureadb2c: {
          name: "Azure AD B2C",
          type: "auth",
          color: "text-indigo-600",
          purpose: "User authentication and identity management",
          baseUrl: "https://memberportaldev.b2clogin.com",
          authentication: {
            method: "OAuth 2.0 / OpenID Connect",
            config: "ida:ClientId, ida:Tenant",
          },
          features: [
            "Sign-in",
            "Sign-up",
            "Password reset",
            "Profile management",
          ],
        },
        paymentsapi: {
          name: "Payments API",
          type: "api",
          color: "text-purple-600",
          purpose: "Secure payment processing",
          baseUrl: "https://localhost:44391/",
          authentication: { method: "API Key", config: "PaymentsApiKey" },
          features: ["Card payments", "Tokenization"],
        },
        redis: {
          name: "Redis Cache",
          type: "cache",
          color: "text-red-600",
          purpose: "Session and data caching",
          baseUrl: "localhost:6379",
        },
        sqlserver: {
          name: "SQL Server",
          type: "database",
          color: "text-gray-600",
          purpose: "Data storage",
          databases: ["CarePayment"],
        },
      },
      dependencies: {
        core: [
          "CarePayment.ServiceLayer.Api.Models",
          "CarePayment.DAL",
          "CarePayment.Infrastructure",
        ],
        nuget: [
          "Core.Common.Shared",
          "Entity Framework 6.x",
          "Microsoft.IdentityModel.Tokens",
        ],
      },
    },
    providerportal: {
      name: "Provider Portal (Servicing)",
      repository: "Core",
      tech: ".NET Framework 4.8",
      color: "bg-purple-500",
      framework: "ASP.NET Web Forms",
      deployment: "IIS Web Application",
      baseUrl: "https://provider.carepayment.com",
      baseUrls: {
        local: "http://localhost:50001/",
        dev: "https://provider-dev-usw-appservice.azurewebsites.net/",
        qa: "https://provider-dev-usw-appservice-qa.azurewebsites.net/",
        qa2: "https://provider-dev-usw-appservice-qa2.azurewebsites.net/",
        staging: "https://stagingprovider.carepayment.com/",
        preprod:
          "https://cpyt-as-usw1-prod-provider-preprod.cpyt-ase-usw1-prod.p.azurewebsites.net/",
        prod: "https://provider.carepayment.com/",
      },
      environmentLinks: {
        dev: "https://provider-dev-usw-appservice.azurewebsites.net/",
        qa: "https://provider-dev-usw-appservice-qa.azurewebsites.net/",
        qa2: "https://provider-dev-usw-appservice-qa2.azurewebsites.net/",
        staging: "https://stagingprovider.carepayment.com/",
        preprod:
          "https://cpyt-as-usw1-prod-provider-preprod.cpyt-ase-usw1-prod.p.azurewebsites.net/",
        prod: "https://provider.carepayment.com/",
      },
      authentication: "Forms Authentication with SQL Membership",
      features: [
        "Account Management",
        "Payment Processing",
        "Reporting",
        "User Administration",
      ],
      swagger: {
        enabled: false,
        url: "",
        version: "",
      },
      integrations: {
        servicelayer: {
          name: "ServiceLayer API",
          type: "api",
          color: "text-purple-600",
          purpose: "All provider operations",
          baseUrl: "http://localhost:15155/",
          authentication: {
            method: "API Key",
            config: "ServiceLayerAccessKey",
          },
        },
        devexpress: {
          name: "DevExpress Reporting",
          type: "reporting",
          color: "text-pink-600",
          purpose: "Report generation and UI components",
          baseUrl: "Local DLLs v12.1",
          features: ["Grid controls", "Report designer", "Chart controls"],
        },
        ssrs: {
          name: "SSRS",
          type: "reporting",
          color: "text-pink-600",
          purpose: "SQL Server Reporting Services",
          baseUrl: "SQL Server",
          features: ["Statement reports", "Financial reports"],
        },
        azure: {
          name: "Azure Services",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Cloud services",
          services: {
            applicationInsights: {
              name: "Application Insights",
              purpose: "Monitoring",
            },
          },
        },
        redis: {
          name: "Redis Cache",
          type: "cache",
          color: "text-red-600",
          purpose: "Caching",
        },
        sqlserver: {
          name: "SQL Server",
          type: "database",
          color: "text-gray-600",
          purpose: "Data storage",
          databases: ["CarePayment"],
        },
      },
      dependencies: {
        core: [
          "CarePayment.DAL",
          "CarePayment.Infrastructure",
          "CarePayment.ServiceLocation",
        ],
        nuget: [
          "Core.Common.Shared",
          "Entity Framework 6.x",
          "DevExpress v12.1",
        ],
      },
    },
    integrationapi: {
      name: "Integration API",
      repository: "ThirdPartyIntegrations",
      tech: ".NET Framework 4.8",
      color: "bg-orange-500",
      framework: "ASP.NET Web API 2",
      deployment: "IIS Web Application",
      baseUrl: "http://localhost:50708/services/",
      baseUrls: {
        local: "http://localhost:50708/services/",
        dev: "https://integrationapi-dev-usw-appservice.azurewebsites.net/services/",
        qa: "https://integrationapi-dev-usw-appservice-qa.azurewebsites.net/services/",
        qa2: "https://integrationapi-dev-usw-appservice-qa2.azurewebsites.net/services/",
        staging:
          "https://integrationapi-staging-usw-appservice.azurewebsites.net/services/",
        preprod:
          "https://cpyt-as-usw1-prod-portals-integration-preprod.cpyt-prod-ase.p.azurewebsites.net/services/",
        prod: "https://cpyt-as-usw1-prod-portals-integration.cpyt-prod-ase.p.azurewebsites.net/services/",
      },
      authentication: "OAuth 2.0, API Keys, IP Whitelisting",
      features: [
        "Payment Processing",
        "Tokenization",
        "Recurring ACH",
        "Digital Engagement",
        "Dialer Eligibility",
      ],
      integrations: {
        payeezy: {
          name: "Payeezy (First Data)",
          type: "payment",
          color: "text-green-700",
          purpose: "Payment processing gateway",
          baseUrl: "https://cert.api.firstdata.com",
          authentication: {
            method: "API Secret",
            config: "PayeezyPaymentJsApiSecret",
          },
          features: ["Payment processing", "Tokenization"],
        },
        paymentsapi: {
          name: "Payments API",
          type: "api",
          color: "text-purple-600",
          purpose: "Payment processing abstraction",
          baseUrl: "https://localhost:44391/",
        },
        azure: {
          name: "Azure (Insights, Event Grid, Table)",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Cloud services",
          services: {
            applicationInsights: {
              name: "Application Insights",
              purpose: "Telemetry",
            },
            eventGrid: { name: "Event Grid", purpose: "Event publishing" },
            tableStorage: {
              name: "Table Storage",
              purpose: "Notification audit",
            },
          },
        },
        marketingcloud: {
          name: "Marketing Cloud (Acoustic)",
          type: "external",
          color: "text-orange-600",
          purpose: "Marketing automation",
          features: ["Email campaigns", "Marketing communications"],
        },
        redis: {
          name: "Redis Cache",
          type: "cache",
          color: "text-red-600",
          purpose: "Caching",
        },
        hangfire: {
          name: "Hangfire Jobs",
          type: "background",
          color: "text-yellow-600",
          purpose: "Background processing",
          jobs: [
            {
              name: "Recurring ACH Processing",
              schedule: "Hourly",
              description: "Process recurring ACH payments",
            },
            {
              name: "Digital Engagement Events",
              schedule: "Real-time",
              description: "Process engagement events",
            },
          ],
        },
        sqlserver: {
          name: "SQL Server",
          type: "database",
          color: "text-gray-600",
          purpose: "Data storage",
        },
      },
      swagger: {
        enabled: true,
        url: "http://localhost:50708/swagger/docs/v1",
        urls: {
          local: "http://localhost:50708/swagger/docs/v1",
          dev: "https://integrationapi-dev-usw-appservice.azurewebsites.net/swagger/docs/v1",
          qa: "https://integrationapi-dev-usw-appservice-qa.azurewebsites.net/swagger/docs/v1",
          qa2: "https://integrationapi-dev-usw-appservice-qa2.azurewebsites.net/swagger/docs/v1",
          staging:
            "https://integrationapi-staging-usw-appservice.azurewebsites.net/swagger/docs/v1",
          preprod:
            "https://cpyt-as-usw1-prod-portals-integration-preprod.cpyt-prod-ase.p.azurewebsites.net/swagger/docs/v1",
          prod: "https://cpyt-as-usw1-prod-portals-integration.cpyt-prod-ase.p.azurewebsites.net/swagger/docs/v1",
        },
        version: "v1",
      },
      dependencies: {
        core: [
          "CarePayment.Integration.Api.Data",
          "CarePayment.Integration.Api.PaymentProviders",
          "CarePayment.DAL",
        ],
        nuget: [
          "Core.Common.Shared",
          "Entity Framework 6.x",
          "Hangfire",
          "FluentValidation",
        ],
      },
    },
    corecommon: {
      name: "Core.Common API",
      repository: "Core.Common",
      tech: ".NET 8.0",
      color: "bg-cyan-500",
      framework: "ASP.NET Core Web API",
      deployment: "IIS / Azure App Service",
      baseUrl: "https://corecommonapi.carepayment.com",
      baseUrls: {
        local: "http://localhost:5000/",
        dev: "https://devcorecommonapi.carepayment.com/",
        qa: "https://qacorecommonapi.carepayment.com/",
        qa2: "https://qa2corecommonapi.carepayment.com/",
        staging:
          "https://core-common-api-dev-usw-appservice-staging.azurewebsites.net/",
        preprod: "https://preprodcorecommonapi.carepayment.com/",
        prod: "https://corecommonapi.carepayment.com/",
      },
      authentication: "JWT Bearer Tokens, API Keys",
      features: [
        "CarePayment Ops",
        "FiServ Ops",
        "OnFile Ops",
        "Epic Ops",
        "OmniChannel Ops",
        "PreCare Ops",
        "CRM Ops",
      ],
      integrations: {
        azure: {
          name: "Azure (Insights, KeyVault, Blob, ServiceBus)",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Cloud services",
          services: {
            applicationInsights: {
              name: "Application Insights",
              purpose: "Telemetry",
            },
            keyVault: {
              name: "Key Vault",
              purpose: "Secret management",
              uri: "https://kv-usw1-dev.vault.azure.net/",
            },
            blobStorage: { name: "Blob Storage", purpose: "Document storage" },
            serviceBus: { name: "Service Bus", purpose: "Messaging" },
          },
        },
        sendgrid: {
          name: "SendGrid",
          type: "email",
          color: "text-teal-600",
          purpose: "Email delivery service",
          baseUrl: "https://api.sendgrid.com",
          authentication: { method: "API Key", config: "SendGrid:ApiKey" },
          features: ["Transactional emails", "Email templates"],
        },
        transunion: {
          name: "TransUnion",
          type: "external",
          color: "text-orange-600",
          purpose: "Credit reporting and scoring",
          features: ["Credit score retrieval", "Credit reporting"],
        },
        omnichannel: {
          name: "OmniChannel",
          type: "service",
          color: "text-green-600",
          purpose: "Multi-channel communication",
          features: ["Email", "SMS", "Push notifications"],
        },
        marketingcloud: {
          name: "Marketing Cloud",
          type: "external",
          color: "text-orange-600",
          purpose: "Marketing automation",
        },
        redis: {
          name: "Redis Cache",
          type: "cache",
          color: "text-red-600",
          purpose: "Caching",
        },
        hangfire: {
          name: "Hangfire Jobs",
          type: "background",
          color: "text-yellow-600",
          purpose: "Background processing",
        },
        sqlserver: {
          name: "SQL Server",
          type: "database",
          color: "text-gray-600",
          purpose: "Data storage",
          databases: ["CarePayment", "CrmContext", "PreCareContext"],
        },
      },
      swagger: {
        enabled: true,
        note: "Swagger requires VPN access",
        url: "https://corecommonapi.carepayment.com/swagger/v1/swagger.json",
        urls: {
          local: "http://localhost:5000/swagger/v1/swagger.json",
          dev: "https://devcorecommonapi.carepayment.com/swagger/v1/swagger.json",
          qa: "https://qacorecommonapi.carepayment.com/swagger/v1/swagger.json",
          qa2: "https://qa2corecommonapi.carepayment.com/swagger/v1/swagger.json",
          staging:
            "https://core-common-api-dev-usw-appservice-staging.azurewebsites.net/swagger/v1/swagger.json",
          preprod:
            "https://preprodcorecommonapi.carepayment.com/swagger/v1/swagger.json",
          prod: "https://corecommonapi.carepayment.com/swagger/v1/swagger.json",
        },
        version: "v1",
      },
      hangfire: {
        enabled: true,
        urls: {
          dev: "https://devcorecommonhangfire.carepayment.com/hangfire",
          qa: "https://qacorecommonhangfire.carepayment.com/hangfire",
          staging: "https://stagingcorecommonhangfire.carepayment.com/hangfire",
          prod: "https://corecommonhangfire.carepayment.com/hangfire",
        },
      },
      dependencies: {
        core: [
          "CarePayment.Core.Common.Services",
          "CarePayment.Core.Common.Data",
          "CarePayment.Core.Common.Core",
        ],
        nuget: [
          "Core.Common.Shared",
          "Entity Framework Core",
          "Hangfire",
          "Serilog",
          "SendGrid",
          "Azure SDK",
        ],
      },
    },
    payments: {
      name: "Payments API",
      repository: "Payments",
      tech: ".NET 8.0",
      color: "bg-emerald-500",
      framework: "ASP.NET Core Web API",
      deployment: "IIS / Azure App Service",
      baseUrl: "https://localhost:44391/",
      baseUrls: {
        local: "https://localhost:44391/",
        dev: "https://devpaymentsapi.carepayment.com/",
        qa: "https://qapaymentsapi.carepayment.com/",
        qa2: "https://qa2paymentsapi.carepayment.com/",
        staging: "https://stagingpaymentsapi.carepayment.com/",
        preprod: "https://preprodpaymentsapi.carepayment.com/",
        prod: "https://paymentsapi.carepayment.com/",
      },
      authentication: "API Key from Azure Key Vault",
      features: [
        "Card Payments",
        "Tokenization",
        "Account Lookup",
        "Logo Information",
      ],
      integrations: {
        payeezy: {
          name: "Payeezy (First Data)",
          type: "payment",
          color: "text-green-700",
          purpose: "Payment processing and tokenization",
          baseUrl: "https://cert.api.firstdata.com",
          authentication: {
            method: "API Secret + HMAC",
            config: "Payeezy configuration",
          },
          features: ["Card payments", "Tokenization", "Payment.js integration"],
          endpoints: [
            {
              method: "POST",
              path: "/payment/v1/charges",
              purpose: "Process payment",
            },
            {
              method: "POST",
              path: "/payment/v1/tokens",
              purpose: "Tokenize card",
            },
          ],
        },
        corecommonapi: {
          name: "Core.Common API",
          type: "api",
          color: "text-purple-600",
          purpose: "Account and logo data",
          baseUrl: "Configurable",
          features: [
            "Account information",
            "Logo configuration",
            "Payment information",
          ],
        },
        azure: {
          name: "Azure (Insights, KeyVault)",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Cloud services",
          services: {
            applicationInsights: {
              name: "Application Insights",
              purpose: "Telemetry",
            },
            keyVault: { name: "Key Vault", purpose: "API key storage" },
          },
        },
        sqlserver: {
          name: "SQL Server (via Core.Common)",
          type: "database",
          color: "text-gray-600",
          purpose: "Data access via Core.Common API",
        },
      },
      swagger: {
        enabled: true,
        note: "Swagger requires VPN access",
        url: "https://localhost:44391/swagger/v1/swagger.json",
        urls: {
          local: "https://localhost:44391/swagger/v1/swagger.json",
          dev: "https://devpaymentsapi.carepayment.com/swagger/v1/swagger.json",
          qa: "https://qapaymentsapi.carepayment.com/swagger/v1/swagger.json",
          qa2: "https://qa2paymentsapi.carepayment.com/swagger/v1/swagger.json",
          staging:
            "https://stagingpaymentsapi.carepayment.com/swagger/v1/swagger.json",
          preprod:
            "https://preprodpaymentsapi.carepayment.com/swagger/v1/swagger.json",
          prod: "https://paymentsapi.carepayment.com/swagger/v1/swagger.json",
        },
        version: "v1",
      },
      hangfire: {
        enabled: true,
        urls: {
          dev: "https://devpaymentshangfire.carepayment.com/hangfire",
          qa: "https://qapaymentshangfire.carepayment.com/hangfire",
          staging: "https://stagingpaymentshangfire.carepayment.com/hangfire",
        },
      },
      dependencies: {
        core: [
          "CarePayment.Payments.Services",
          "CarePayment.Payments.Data",
          "CarePayment.Payments.Core",
        ],
        nuget: [
          "Entity Framework Core",
          "Serilog",
          "Application Insights",
          "Azure SDK",
          "AspNetCore.Authentication.ApiKey",
        ],
      },
    },
    precare: {
      name: "PreCare API",
      repository: "PreCare",
      tech: ".NET 6.0",
      color: "bg-pink-500",
      framework: "ASP.NET Core Web API",
      deployment: "IIS / Azure App Service",
      baseUrl: "https://precare.carepayment.com",
      baseUrls: {
        local: "http://localhost:5001/",
        dev: "https://devprecareapi.carepayment.com/",
        qa: "https://qaprecareapi.carepayment.com/",
        qa2: "https://qa2precareapi.carepayment.com/",
        staging: "https://stagingprecareapi.carepayment.com/",
        preprod: "https://preprodprecareapi.carepayment.com/",
        prod: "https://precareapi.carepayment.com/",
      },
      authentication: "API Key (via ServiceLayer)",
      features: [
        "PreCare Enrollment",
        "Document Management",
        "Member Portal Registration",
      ],
      integrations: {
        servicelayer: {
          name: "ServiceLayer API",
          type: "api",
          color: "text-purple-600",
          purpose: "All PreCare business logic",
          baseUrl: "Configurable via ServiceLayerBaseUrl",
          authentication: {
            method: "API Key",
            config: "ServiceLayerAccessKey",
          },
          features: [
            "PreCare enrollment operations",
            "Tracking logs",
            "Member portal registration",
          ],
          endpoints: [
            {
              method: "POST",
              path: "/PreCare/Submit",
              purpose: "Submit PreCare enrollment",
            },
            {
              method: "GET",
              path: "/PreCare/{id}",
              purpose: "Get enrollment by ID",
            },
            {
              method: "PUT",
              path: "/PreCare/UpdatePreCareInfo",
              purpose: "Update enrollment",
            },
            {
              method: "POST",
              path: "/PreCare/Tracking",
              purpose: "Add tracking log",
            },
          ],
        },
        azureblob: {
          name: "Azure Blob Storage",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Document storage for terms and consent forms",
          baseUrl: "Azure Storage",
          authentication: {
            method: "Connection string",
            config: "BlobStorage configuration",
          },
          features: ["Terms and conditions storage", "Consent form storage"],
          configuration: {
            "BlobStorage:ContainerName": "TermsandConditions",
            "Downloads:ConsentToElectronicCommunications":
              "Consent document filename",
            "Downloads:MemberPortalTermsAndConditions":
              "Terms document filename",
          },
        },
        appinsights: {
          name: "Application Insights",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Telemetry and monitoring",
          features: [
            "Request tracking",
            "Exception logging",
            "Performance monitoring",
          ],
        },
        sqlserver: {
          name: "SQL Server (via ServiceLayer)",
          type: "database",
          color: "text-gray-600",
          purpose: "Data access via ServiceLayer API",
          databases: ["CarePayment (via ServiceLayer)"],
        },
      },
      swagger: {
        enabled: true,
        note: "Swagger requires VPN access",
        url: "https://precareapi.carepayment.com/swagger/v1/swagger.json",
        urls: {
          local: "http://localhost:5001/swagger/v1/swagger.json",
          dev: "https://devprecareapi.carepayment.com/swagger/v1/swagger.json",
          qa: "https://qaprecareapi.carepayment.com/swagger/v1/swagger.json",
          qa2: "https://qa2precareapi.carepayment.com/swagger/v1/swagger.json",
          staging:
            "https://stagingprecareapi.carepayment.com/swagger/v1/swagger.json",
          preprod:
            "https://preprodprecareapi.carepayment.com/swagger/v1/swagger.json",
          prod: "https://precareapi.carepayment.com/swagger/v1/swagger.json",
        },
        version: "v1",
      },
      dependencies: {
        core: ["ServiceLayer API Client", "Document Service", "Health Service"],
        nuget: ["ASP.NET Core", "Azure.Storage.Blobs", "Application Insights"],
      },
    },
    thirdpartyintegrations: {
      name: "Third Party Integrations API",
      repository: "ThirdPartyIntegrations",
      tech: ".NET 8.0",
      color: "bg-amber-500",
      framework: "ASP.NET Core Web API",
      deployment: "Azure App Service",
      baseUrl: "https://thirdpartyintegrationsapi.carepayment.com",
      baseUrls: {
        local: "http://localhost:5002/",
        dev: "https://devthirdpartyintegrationsapi.carepayment.com/",
        qa: "https://qathirdpartyintegrationsapi.carepayment.com/",
        qa2: "https://qa2thirdpartyintegrationsapi.carepayment.com/",
        staging: "https://stagingthirdpartyintegrationsapi.carepayment.com/",
        preprod: "https://preprodthirdpartyintegrationsapi.carepayment.com/",
        prod: "https://thirdpartyintegrationsapi.carepayment.com/",
      },
      authentication: "API Key, OAuth 2.0",
      features: [
        "External API Integrations",
        "Third Party Webhooks",
        "Data Synchronization",
        "Partner Integrations",
      ],
      swagger: {
        enabled: true,
        note: "Swagger requires VPN access",
        url: "https://thirdpartyintegrationsapi.carepayment.com/swagger/v1/swagger.json",
        urls: {
          local: "http://localhost:5002/swagger/v1/swagger.json",
          dev: "https://devthirdpartyintegrationsapi.carepayment.com/swagger/v1/swagger.json",
          qa: "https://qathirdpartyintegrationsapi.carepayment.com/swagger/v1/swagger.json",
          qa2: "https://qa2thirdpartyintegrationsapi.carepayment.com/swagger/v1/swagger.json",
          staging:
            "https://stagingthirdpartyintegrationsapi.carepayment.com/swagger/v1/swagger.json",
          preprod:
            "https://preprodthirdpartyintegrationsapi.carepayment.com/swagger/v1/swagger.json",
          prod: "https://thirdpartyintegrationsapi.carepayment.com/swagger/v1/swagger.json",
        },
        version: "v1",
      },
      hangfire: {
        enabled: true,
        urls: {
          dev: "https://devthirdpartyintegrationsapi.carepayment.com/hangfire",
          qa: "https://qathirdpartyintegrationsapi.carepayment.com/hangfire",
          qa2: "https://qa2thirdpartyintegrationsapi.carepayment.com/hangfire",
          staging:
            "https://stagingthirdpartyintegrationsapi.carepayment.com/hangfire",
          preprod:
            "https://preprodthirdpartyintegrationsapi.carepayment.com/hangfire",
          prod: "https://thirdpartyintegrationsapi.carepayment.com/hangfire",
        },
      },
      integrations: {
        azure: {
          name: "Azure Services",
          type: "cloud",
          color: "text-blue-600",
          purpose: "Cloud infrastructure",
        },
        sqlserver: {
          name: "SQL Server",
          type: "database",
          color: "text-gray-600",
          purpose: "Data storage",
        },
      },
      dependencies: {
        core: [
          "ThirdPartyIntegrations.Services",
          "ThirdPartyIntegrations.Data",
        ],
        nuget: ["ASP.NET Core", "Entity Framework Core", "Hangfire"],
      },
    },
  },
};
