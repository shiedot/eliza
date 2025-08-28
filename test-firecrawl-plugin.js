#!/usr/bin/env bun

// Test script for the updated firecrawl plugin
const FIRECRAWL_API_KEY = "fc-9f93092b569548abbc4338eeced7a024";

async function testMultipleMarketplaces() {
    console.log('🧪 Testing multiple ENS marketplaces...');

    const marketplaces = [
        {
            name: 'Vision.io',
            url: 'https://vision.io/marketplace',
            selectors: {
                listings: '.domain-card, [data-testid="domain-card"], .listing-card, .ens-listing',
                domainName: '.domain-name, [data-testid="domain-name"], .ens-name, h3, h4',
                price: '.price, [data-testid="price"], .eth-price, .listing-price',
                floorPrice: '.floor-price, [data-testid="floor-price"], .floor'
            }
        },
        {
            name: 'ENS Domains',
            url: 'https://ens.domains',
            selectors: {
                listings: '.domain-item, .ens-item, .card, .listing',
                domainName: '.domain-name, .ens-name, h3, h4, .name',
                price: '.price, .amount, .eth-price',
                floorPrice: '.floor-price, .floor'
            }
        },
        {
            name: 'OpenSea ENS',
            url: 'https://opensea.io/collection/ens',
            selectors: {
                listings: '.AssetCard, .asset-card, .item-card',
                domainName: '.AssetCard__name, .asset-name, .name',
                price: '.AssetCard__price, .price, .amount',
                floorPrice: '.floor-price, .floor'
            }
        }
    ];

    for (const marketplace of marketplaces) {
        console.log(`\n📊 Testing ${marketplace.name}...`);

        try {
            const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: marketplace.url,
                    pageOptions: {
                        timeout: 30000,
                        waitUntil: 'networkidle'
                    },
                    extractors: {
                        pageTitle: {
                            selector: 'title',
                            type: 'text'
                        },
                        listings: {
                            selector: marketplace.selectors.listings,
                            type: 'list',
                            properties: {
                                domainName: {
                                    selector: marketplace.selectors.domainName,
                                    type: 'text'
                                },
                                price: {
                                    selector: marketplace.selectors.price,
                                    type: 'text'
                                },
                                floorPrice: {
                                    selector: marketplace.selectors.floorPrice,
                                    type: 'text'
                                }
                            }
                        }
                    }
                })
            });

            console.log(`   Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`   ❌ Failed: ${errorText.substring(0, 200)}`);
                continue;
            }

            const data = await response.json();
            console.log(`   ✅ Success: ${data.success}`);
            console.log(`   📄 Title: ${data.data?.pageTitle || 'N/A'}`);

            if (data.data?.listings) {
                console.log(`   📊 Listings: ${data.data.listings.length}`);
                if (data.data.listings.length > 0) {
                    console.log(`   📋 Sample:`, data.data.listings[0]);
                }
            } else {
                console.log(`   ⚠️  No listings found`);
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
}

// Run the test
testMultipleMarketplaces().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
});
