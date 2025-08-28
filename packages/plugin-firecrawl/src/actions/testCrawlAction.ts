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

export const testCrawlAction: Action = {
    name: "TEST_CRAWL_VISION",
    similes: [
        "DEMO_CRAWL",
        "SAMPLE_CRAWL",
        "TEST_ENS_CRAWL"
    ],
    description: "Test action that demonstrates crawling functionality with sample ENS data",
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
        try {
            elizaLogger.info('Starting test crawl with sample data...');

            // Simulate successful crawling with sample data
            const sampleListings = [
                {
                    domainName: 'crypto.eth',
                    price: '2.5 ETH',
                    floorPrice: '2.0 ETH',
                    isBelowFloor: false,
                    listedAt: new Date().toISOString()
                },
                {
                    domainName: 'defi.eth',
                    price: '1.8 ETH',
                    floorPrice: '2.0 ETH',
                    isBelowFloor: true,
                    listedAt: new Date().toISOString()
                },
                {
                    domainName: 'nft.eth',
                    price: '3.2 ETH',
                    floorPrice: '3.0 ETH',
                    isBelowFloor: false,
                    listedAt: new Date().toISOString()
                },
                {
                    domainName: 'web3.eth',
                    price: '1.5 ETH',
                    floorPrice: '2.0 ETH',
                    isBelowFloor: true,
                    listedAt: new Date().toISOString()
                },
                {
                    domainName: 'dao.eth',
                    price: '4.1 ETH',
                    floorPrice: '4.0 ETH',
                    isBelowFloor: false,
                    listedAt: new Date().toISOString()
                }
            ];

            // Process the sample listings
            const processedListings = sampleListings.map(listing => ({
                ...listing,
                price: parseFloat(listing.price.replace(' ETH', '')),
                floorPrice: parseFloat(listing.floorPrice.replace(' ETH', '')),
                metadata: {
                    source: 'test-crawl',
                    scrapedAt: new Date().toISOString()
                }
            }));

            const dealsBelowFloor = processedListings.filter(listing => listing.isBelowFloor);

            elizaLogger.info(`Generated ${processedListings.length} sample listings with ${dealsBelowFloor.length} below floor price`);

            callback({
                text: `✅ Test crawl completed successfully! Generated ${processedListings.length} sample ENS domain listings. ${dealsBelowFloor.length} are below floor price and represent good deals:

${dealsBelowFloor.map(deal => `• ${deal.domainName}: ${deal.price} ETH (Floor: ${deal.floorPrice} ETH)`).join('\n')}

This demonstrates the plugin framework is working correctly. For real data, you would need to:
1. Update selectors for current marketplace layouts
2. Use ENS APIs for more reliable data
3. Consider on-chain event monitoring`,
                content: {
                    totalListings: processedListings.length,
                    dealsBelowFloor: dealsBelowFloor.length,
                    sampleListings: processedListings,
                    deals: dealsBelowFloor
                }
            });

            return true;

        } catch (error: any) {
            elizaLogger.error('Error in test crawl:', error.message);
            callback({
                text: `❌ Error in test crawl: ${error.message}`,
            });
            return false;
        }
    },
    examples: [
        [
            { name: 'user', content: { text: 'Test the crawl functionality' } },
            { name: 'agent', content: { text: 'I\'ll run a test crawl to demonstrate the functionality with sample ENS data.' } }
        ],
        [
            { name: 'user', content: { text: 'Show me how the crawl works' } },
            { name: 'agent', content: { text: 'I\'ll demonstrate the crawl functionality with sample domain listings.' } }
        ]
    ] as ActionExample[][],
} as Action;
