#!/usr/bin/env bun

// Test script to verify Firecrawl functionality in production
async function testProductionFirecrawl() {
    console.log('🚀 Testing Firecrawl functionality for production...');

    try {
        // Test the production endpoint
        console.log('🌐 Testing production endpoint...');
        const response = await fetch('https://eliza-app-three.vercel.app/api/firecrawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        console.log('📊 Response status:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Production Firecrawl test successful!');
            console.log('📋 Result:', JSON.stringify(result, null, 2));
        } else {
            const errorText = await response.text();
            console.log('❌ Production Firecrawl test failed:', errorText);
        }

        // Also test the health endpoint
        console.log('\n🏥 Testing health endpoint...');
        const healthResponse = await fetch('https://eliza-app-three.vercel.app/api/health');

        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check successful:', healthData);
        } else {
            console.log('❌ Health check failed:', healthResponse.status);
        }

    } catch (error: any) {
        console.error('❌ Error testing production:', error.message);
    }
}

testProductionFirecrawl();
