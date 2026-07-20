// Configuration for SES Suppression Portal
const CONFIG = {
    // Application Info
    APP_NAME: 'SES Suppression Portal',
    VERSION: '1.0.0',
    
    // GitHub Pages URL (update with your username)
    BASE_URL: 'https://YOUR-USERNAME.github.io/ses-suppression-portal',
    
    // Demo Mode (set to false when connecting real AWS)
    DEMO_MODE: true,
    
    // API Configuration (for production)
    API: {
        ENDPOINT: 'https://your-api-gateway-url.amazonaws.com/prod',
        REGION: 'us-east-1',
        TIMEOUT: 30000
    },
    
    // AWS SSO Configuration (for production)
    SSO: {
        DOMAIN: 'your-sso-domain.awsapps.com',
        CLIENT_ID: 'your-client-id',
        REDIRECT_URI: 'https://YOUR-USERNAME.github.io/ses-suppression-portal/auth/callback',
        SCOPES: ['openid', 'email', 'profile']
    },
    
    // AWS Regions for SES
    REGIONS: [
        'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
        'us-gov-east-1', 'us-gov-west-1',
        'ap-south-1', 'ap-south-2', 'ap-southeast-1', 'ap-southeast-2',
        'ap-southeast-3', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
        'ca-central-1', 'eu-central-1', 'eu-west-1', 'eu-west-2',
        'eu-west-3', 'eu-north-1', 'eu-south-1', 'eu-south-2',
        'il-central-1', 'me-south-1', 'me-central-1',
        'sa-east-1', 'af-south-1'
    ],
    
    // Search Configuration
    SEARCH: {
        MAX_BATCH_SIZE: 5,
        BATCH_DELAY: 500,
        MAX_RETRIES: 3,
        TIMEOUT_PER_REGION: 10000
    },
    
    // UI Configuration
    UI: {
        ANIMATION_DURATION: 300,
        NOTIFICATION_DURATION: 3000,
        PROGRESS_UPDATE_INTERVAL: 100
    }
};

// Make config globally available
window.CONFIG = CONFIG;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
