// Email Validation Test Script
// Open browser console and run this to test email validation

function testEmailValidation() {
    // Enhanced email regex pattern (same as in the application)
    function isValidEmail(email) {
        if (!email || typeof email !== 'string') {
            console.log('Email validation failed: empty or not a string', email);
            return false;
        }
        
        email = email.trim();
        
        if (email.length === 0) {
            console.log('Email validation failed: empty after trim');
            return false;
        }
        
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        const isValid = emailRegex.test(email);
        console.log('Email validation result:', email, '-> Valid:', isValid);
        
        return isValid;
    }

    console.log('=== Email Validation Tests ===');
    
    // Test cases
    const testEmails = [
        'test@example.com',           // Valid
        'user.name@domain.com',       // Valid  
        'user+tag@example.org',       // Valid
        'user123@test-domain.com',    // Valid
        'invalid.email',              // Invalid - no @
        '@domain.com',                // Invalid - no local part
        'user@',                      // Invalid - no domain
        'user@domain',                // Invalid - no TLD
        '',                           // Invalid - empty
        ' test@example.com ',         // Valid - should trim
        'user@domain.c',              // Valid - single letter TLD
        'very.long.email.address@very.long.domain.name.com' // Valid
    ];
    
    testEmails.forEach(email => {
        const result = isValidEmail(email);
        console.log(`"${email}" -> ${result ? '✅ VALID' : '❌ INVALID'}`);
    });
    
    console.log('=== End Tests ===');
}

// Run the tests
console.log('Run testEmailValidation() to test email validation');
