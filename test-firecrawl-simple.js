#!/usr/bin/env bun

// Simple test script to verify Firecrawl API works
const FIRECRAWL_API_KEY = "fc-9f93092b569548abbc4338eeced7a024";

async function testFirecrawlAPI() {
    console.log('🧪 Testing Firecrawl API...');

    try {
        // Test 1: Simple connection test
        console.log('1. Testing API connection...');
        const testResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'https://example.com',
                pageOptions: {
                    timeout: 10000
                },
                extractors: {
                    title: {
                        selector: 'title',
                        type: 'text'
                    }
                }
            })
        });

        console.log(`   Status: ${testResponse.status} ${testResponse.statusText}`);

        if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.log(`   Error: ${errorText.substring(0, 200)}`);
            return false;
        }

        const testData = await testResponse.json();
        console.log(`   ✅ Connection test successful: ${testData.success}`);

        // Test 2: Try different ENS marketplaces
        const testUrls = [
            'https://ens.domains',
            'https://app.ens.domains',
            'https://opensea.io',
            'https://opensea.io/collection/ens',
            'https://ens.vision',
            'https://www.ens.vision'
        ];

        for (const url of testUrls) {
            console.log(`\n2. Testing crawl with URL: ${url}`);
            try {
                const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: url,
                        pageOptions: {
                            timeout: 30000,
                            waitUntil: 'networkidle'
                        },
                        extractors: {
                            pageTitle: {
                                selector: 'title',
                                type: 'text'
                            },
                            content: {
                                selector: 'body',
                                type: 'text'
                            }
                        }
                    })
                });

                console.log(`   Status: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.log(`   Error: ${errorText.substring(0, 300)}`);
                    continue;
                }

                const data = await response.json();
                console.log(`   ✅ Crawl successful: ${data.success}`);
                console.log(`   📄 Page title: ${data.data?.pageTitle || 'N/A'}`);

                if (data.success) {
                    console.log(`   ✅ Found working URL: ${url}`);
                    return true;
                }
            } catch (error) {
                console.log(`   ❌ Error with ${url}: ${error.message}`);
            }
        }

        return false;

    } catch (error) {
        console.error('❌ Error testing Firecrawl API:', error.message);
        return false;
    }
}

// Run the test
testFirecrawlAPI().then(success => {
    console.log(`\n${success ? '✅' : '❌'} Firecrawl API test ${success ? 'passed' : 'failed'}`);
    process.exit(success ? 0 : 1);
});
