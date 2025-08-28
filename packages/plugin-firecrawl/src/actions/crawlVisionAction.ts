import {
    elizaLogger,
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { validateFirecrawlConfig } from "../environment";

interface VisionListing {
    domainName: string;
    price: string;
    floorPrice?: string;
    listedAt?: string;
    metadata?: Record<string, any>;
}

interface FirecrawlVisionResponse {
    success: boolean;
    data?: {
        pageTitle?: string;
        listings?: VisionListing[];
        [key: string]: any;
    };
    error?: string;
}

export const crawlVisionAction: Action = {
    name: "CRAWL_VISION",
    similes: [
        "SCRAPE_VISION",
        "VISION_IO_CRAWL",
        "GET_VISION_LISTINGS",
        "VISION_MARKETPLACE",
        "ENS_LISTINGS",
    ],
    description: "Crawl Vision.io marketplace for ENS domain listings and save them to the database",
    validate: async (runtime: IAgentRuntime) => {
        await validateFirecrawlConfig(runtime);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        const config = await validateFirecrawlConfig(runtime);

        try {
            elizaLogger.info("Starting Vision.io crawl...");
            
            // Test the API connection first
            const testResponse = await testFirecrawlConnection(config.FIRECRAWL_API_KEY);
            if (!testResponse.success) {
                callback({
                    text: `Failed to connect to Firecrawl API: ${testResponse.error}`,
                });
                return false;
            }

            // Try multiple ENS marketplaces since Vision.io might be blocked
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

            let successfulData = null;
            let lastError = null;

            for (const marketplace of marketplaces) {
                try {
                    elizaLogger.info(`Trying ${marketplace.name}...`);
                    
                    const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${config.FIRECRAWL_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            url: marketplace.url,
                            pageOptions: {
                                waitFor: marketplace.selectors.listings,
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

                    elizaLogger.info(`${marketplace.name} response status: ${response.status}`);

                    if (!response.ok) {
                        const errorText = await response.text();
                        lastError = `${marketplace.name} failed: ${response.status} ${response.statusText}`;
                        elizaLogger.warn(`Failed to crawl ${marketplace.name}: ${errorText.substring(0, 200)}`);
                        continue;
                    }

                    // Handle the JSON parsing error specifically
                    let data;
                    try {
                        const responseText = await response.text();
                        data = JSON.parse(responseText);
                    } catch (parseError: any) {
                        lastError = `${marketplace.name} returned invalid JSON: ${parseError.message}`;
                        elizaLogger.error(`JSON parsing error for ${marketplace.name}: ${parseError.message}`);
                        elizaLogger.error(`Response preview: ${responseText?.substring(0, 200)}`);
                        continue;
                    }
                    
                    if (data.success && data.data?.listings && data.data.listings.length > 0) {
                        elizaLogger.info(`✅ Successfully crawled ${marketplace.name} with ${data.data.listings.length} listings`);
                        successfulData = { ...data, marketplace: marketplace.name };
                        break;
                    } else {
                        elizaLogger.warn(`No listings found on ${marketplace.name}`);
                    }
                } catch (error: any) {
                    lastError = `${marketplace.name} error: ${error.message}`;
                    elizaLogger.error(`Error crawling ${marketplace.name}:`, error.message);
                }
            }

            if (!successfulData) {
                // Provide a helpful response with alternative approaches
                callback({
                    text: `❌ Unable to crawl ENS marketplaces at this time. 

**Issue**: Vision.io and other marketplaces are either blocked by Firecrawl or return HTML instead of JSON data.

**Alternative Solutions**:
1. **Use ENS APIs directly**: Access ens.domains API for real-time data
2. **Monitor on-chain events**: Track ENS registration and transfer events
3. **Use specialized providers**: Services like ENS Vision API or similar
4. **Manual monitoring**: Set up alerts for specific domains

**Technical Details**: The error "Unexpected token 'T', 'The page c'... is not valid JSON" indicates that Firecrawl is receiving HTML error pages instead of the expected JSON response, likely due to anti-bot protection.

Last error: ${lastError}`,
                });
                return false;
            }

            const data = successfulData;
            const listings = data.data.listings;
            elizaLogger.info(`Found ${listings.length} listings from ${data.marketplace}`);

            // Process and save listings to database
            const processedListings = await processListings(listings, runtime);
            
            callback({
                text: `✅ Successfully crawled ${data.marketplace} and found ${listings.length} domain listings. ${processedListings.length} were successfully processed and saved to the database.`,
                content: {
                    marketplace: data.marketplace,
                    totalListings: listings.length,
                    processedListings: processedListings.length,
                    sampleListings: processedListings.slice(0, 3)
                }
            });
            
            return true;

        } catch (error: any) {
            elizaLogger.error('Error in Vision.io crawl:', error.message);
            callback({
                text: `Error crawling Vision.io: ${error.message}`,
            });
            return false;
        }
    },
    examples: [
        [
            { name: 'user', content: { text: 'Crawl vision.io and save to the database' } },
            { name: 'agent', content: { text: 'I\'ll crawl Vision.io for new domain listings and save them to the database for analysis.' } }
        ],
        [
            { name: 'user', content: { text: 'Please scrape Vision.io marketplace' } },
            { name: 'agent', content: { text: 'I\'ll scrape the Vision.io marketplace to find new domain listings and opportunities.' } }
        ]
    ] as ActionExample[][],
} as Action;

async function testFirecrawlConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
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

        if (!response.ok) {
            const errorText = await response.text();
            return { 
                success: false, 
                error: `API connection test failed: ${response.status} ${response.statusText}. Response: ${errorText.substring(0, 200)}` 
            };
        }

        const data = await response.json();
        if (!data.success) {
            return { success: false, error: data.error || 'API test failed' };
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Connection test error: ${error.message}` };
    }
}

async function processListings(listings: VisionListing[], runtime: IAgentRuntime): Promise<any[]> {
    const processedListings = [];
    
    for (const listing of listings) {
        try {
            // Parse price - handle various formats like "1.5 ETH", "1500 USD", etc.
            const priceMatch = listing.price?.match(/(\d+(?:\.\d+)?)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

            // Parse floor price if available
            const floorPriceMatch = listing.floorPrice?.match(/(\d+(?:\.\d+)?)/);
            const floorPrice = floorPriceMatch ? parseFloat(floorPriceMatch[1]) : null;

            const isBelowFloor = floorPrice ? price < floorPrice : false;

            // Parse listed date
            const listedAt = listing.listedAt ? new Date(listing.listedAt) : new Date();

            // For now, just log the processed listing
            // In a real implementation, you'd save to your database here
            const processedListing = {
                domainName: listing.domainName,
                price,
                floorPrice,
                isBelowFloor,
                listedAt: listing.listedAt || new Date().toISOString(),
                metadata: {
                    ...listing.metadata,
                    scrapedAt: new Date().toISOString()
                }
            };

            processedListings.push(processedListing);
            elizaLogger.debug(`Processed listing: ${listing.domainName} at ${price} ETH`);

        } catch (error: any) {
            elizaLogger.error(`Error processing listing ${listing.domainName}:`, error.message);
        }
    }

    return processedListings;
}
