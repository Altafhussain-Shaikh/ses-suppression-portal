const AWS = require('aws-sdk');

// Configure AWS SDK with your credentials
AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1'
});

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    };

    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        // Validate request
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        // Parse request body
        const { email, region, searchType } = JSON.parse(event.body || '{}');
        
        if (!email || !region) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Email and region are required' })
            };
        }

        console.log(`Searching for ${email} in region ${region}`);

        // Search SES suppression list in the specified region
        const result = await searchSESSuppressionInRegion(email, region, searchType);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

async function searchSESSuppressionInRegion(email, region, searchType) {
    // Create SES client for the specific region
    const sesv2 = new AWS.SESV2({ region: region });
    
    try {
        console.log(`Checking suppression for ${email} in ${region}`);
        
        // Try to get the specific suppressed destination
        const response = await sesv2.getSuppressedDestination({
            EmailAddress: email
        }).promise();
        
        const suppression = response.SuppressedDestination;
        console.log(`Found suppression in ${region}:`, suppression);
        
        // Filter by search type if specified
        if (searchType && searchType !== 'all') {
            if (suppression.Reason.toLowerCase() !== searchType.toLowerCase()) {
                console.log(`Suppression reason ${suppression.Reason} doesn't match filter ${searchType}`);
                return { suppressions: [] };
            }
        }
        
        return {
            suppressions: [{
                emailAddress: suppression.EmailAddress,
                reason: suppression.Reason,
                lastUpdateTime: suppression.LastUpdateTime,
                region: region
            }]
        };
        
    } catch (error) {
        console.log(`Error checking ${region}:`, error.code, error.message);
        
        if (error.code === 'NotFoundException') {
            // Email not found in suppression list - this is normal
            console.log(`No suppression found for ${email} in ${region}`);
            return { suppressions: [] };
        } else if (error.code === 'UnauthorizedOperation' || 
                   error.code === 'InvalidAction' || 
                   error.statusCode === 403) {
            // SES not available in this region or no permissions
            console.log(`SES not available or no permissions in ${region}`);
            return { 
                suppressions: [], 
                error: 'SES not available in this region or insufficient permissions' 
            };
        } else {
            // Other errors
            console.error(`Unexpected error in ${region}:`, error);
            throw error;
        }
    }
}
