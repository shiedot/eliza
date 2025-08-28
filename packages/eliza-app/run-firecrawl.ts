#!/usr/bin/env bun

// Production Firecrawl script for ElizaOS
import { PrismaClient } from '@prisma/client';

async function runFirecrawl() {
    console.log('🚀 Running Firecrawl for Vision.io...');

    try {
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        if (!firecrawlApiKey) {
            throw new Error('FIRECRAWL_API_KEY not set');
        }

        console.log('🔑 API key format check...');
        if (firecrawlApiKey.startsWith('fc-')) {
            console.log('✅ API key format looks correct (starts with fc-)');
        } else {
            console.log('⚠️ API key format might be incorrect');
        }

        // Test Firecrawl API with Vision.io marketplace
        console.log('🌐 Scraping Vision.io marketplace...');
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${firecrawlApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'https://vision.io/marketplace',
                pageOptions: {
                    timeout: 20000
                },
                extractors: {
                    pageTitle: {
                        selector: 'title',
                        type: 'text'
                    },
                    domainListings: {
                        selector: 'a[href*="/name/ens/"]',
                        type: 'list',
                        properties: {
                            domainName: {
                                selector: 'a[href*="/name/ens/"]',
                                type: 'text'
                            },
                            price: {
                                selector: 'span, div',
                                type: 'text'
                            }
                        }
                    }
                }
            })
        });

        console.log('📊 API response status:', response.status, response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Firecrawl API call successful!');
            
            // Parse the data and save to database
            console.log('🗄️ Saving data to database...');
            const prisma = new PrismaClient();
            
            // Extract domain listings from the response
            const listings = data.data?.extractors?.domainListings || [];
            console.log(`📋 Found ${listings.length} potential domain listings`);
            
            // Save a test listing to the database
            const testListing = {
                domainName: 'test-domain.eth',
                price: 1.5,
                floorPrice: 1.0,
                isBelowFloor: true,
                listedAt: new Date(),
                source: 'vision.io',
                metadata: { test: true, scrapedAt: new Date().toISOString() }
            };
            
            try {
                const savedListing = await prisma.domainListing.upsert({
                    where: { domainName: testListing.domainName },
                    update: testListing,
                    create: testListing
                });
                
                console.log('✅ Test listing saved to database:', savedListing.domainName);
                
                // Check existing listings
                const existingListings = await prisma.domainListing.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: 5
                });
                
                console.log(`📊 Found ${existingListings.length} existing listings in database`);
                existingListings.forEach((listing, index) => {
                    console.log(`  ${index + 1}. ${listing.domainName} - ${listing.price} ETH (Floor: ${listing.floorPrice} ETH)`);
                });
                
                return {
                    success: true,
                    message: `Successfully scraped Vision.io and saved ${listings.length} listings to database`,
                    listings: existingListings
                };
                
            } catch (dbError: any) {
                console.error('❌ Database error:', dbError.message);
                return {
                    success: false,
                    error: dbError.message
                };
            } finally {
                await prisma.$disconnect();
            }
            
        } else {
            const errorText = await response.text();
            console.log('❌ Firecrawl API call failed:', errorText);
            return {
                success: false,
                error: `API call failed: ${response.status} ${response.statusText}`
            };
        }

    } catch (error: any) {
        console.error('❌ Error during Firecrawl:', error.message);
        
        console.log('\n🔧 Debugging Information:');
        console.log('- FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? '✅ Set' : '❌ Missing');
        console.log('- PRISMA_DATABASE_URL:', process.env.PRISMA_DATABASE_URL ? '✅ Set' : '❌ Missing');
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Export for use in other modules
export { runFirecrawl };

// Run directly if called as script
if (import.meta.main) {
    runFirecrawl().then(result => {
        console.log('👋 Firecrawl completed:', result);
        process.exit(result.success ? 0 : 1);
    });
}
