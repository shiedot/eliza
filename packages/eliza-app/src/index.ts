import express from 'express';
import cors from 'cors';
import { AgentRuntime, type Character } from '@elizaos/core';
import firecrawlPlugin from '@elizaos/plugin-firecrawl';
import marketAnalysisPlugin from '@elizaos/plugin-market-analysis';
import twitterIntegrationPlugin from '@elizaos/plugin-twitter-integration';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Eliza Runtime
let elizaRuntime: AgentRuntime;

async function initializeEliza() {
    try {
        // Create Eliza character
        const elizaCharacter: Character = {
            name: 'Eliza',
            bio: 'ENS Market Analysis Agent specialized in domain market analysis and deal discovery',
            system: `You are Eliza, an AI agent specialized in ENS domain market analysis. 
            You help users identify good deals, analyze sales, and provide domain valuations. 
            You use data from Vision.io, market analysis, and AI to provide insights.`,
            messageExamples: [
                [
                    { name: 'user', content: { text: 'What makes a good ENS domain deal?' } },
                    { name: 'Eliza', content: { text: 'A good deal combines being below floor price, having liquidity, and the domain having intrinsic value. I analyze factors like length, rarity, and market demand.' } }
                ]
            ],
            plugins: [
                '@elizaos/plugin-firecrawl',
                '@elizaos/plugin-market-analysis',
                '@elizaos/plugin-twitter-integration'
            ]
        };

        // Initialize runtime with character and plugins
        elizaRuntime = new AgentRuntime({
            character: elizaCharacter,
            plugins: [firecrawlPlugin, marketAnalysisPlugin, twitterIntegrationPlugin]
        });

        // Initialize runtime
        await elizaRuntime.initialize();

        console.log('✅ Eliza initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Eliza:', error);
        process.exit(1);
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        agent: 'Eliza ENS Market Analysis Agent'
    });
});

// Crawl Vision.io for new listings
app.post('/api/crawl-vision', async (req, res) => {
    try {
        const firecrawlService = elizaRuntime.getService('firecrawl') as any;
        if (!firecrawlService) {
            return res.status(500).json({ error: 'Firecrawl service not available' });
        }

        const result = await firecrawlService.crawlVisionListings();
        res.json({ success: true, result });
    } catch (error: any) {
        console.error('Error crawling Vision.io:', error);
        res.status(500).json({ error: error.message });
    }
});

// Direct Firecrawl endpoint for testing
app.post('/api/firecrawl', async (req, res) => {
    try {
        const { runFirecrawl } = await import('../run-firecrawl.js');
        const result = await runFirecrawl();
        res.json(result);
    } catch (error: any) {
        console.error('Error in direct Firecrawl:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Analyze deals and post alerts
app.post('/api/analyze-deals', async (req, res) => {
    try {
        const firecrawlService = elizaRuntime.getService('firecrawl') as any;
        const marketService = elizaRuntime.getService('marketAnalysis') as any;
        const twitterService = elizaRuntime.getService('twitter') as any;

        if (!firecrawlService || !marketService || !twitterService) {
            return res.status(500).json({ error: 'Required services not available' });
        }

        const deals = await firecrawlService.getDealsBelowFloor();
        const results = [];

        for (const deal of deals) {
            const analysis = await marketService.analyzeSale(deal);
            if (analysis.isGoodBuy) {
                await twitterService.postDealAlert(deal, analysis);
                results.push({ deal, analysis, posted: true });
            } else {
                results.push({ deal, analysis, posted: false });
            }
        }

        res.json({ success: true, results });
    } catch (error: any) {
        console.error('Error analyzing deals:', error);
        res.status(500).json({ error: error.message });
    }
});

// Valuate a domain
app.post('/api/valuate-domain', async (req, res) => {
    try {
        const { domainName } = req.body;
        if (!domainName) {
            return res.status(400).json({ error: 'Domain name is required' });
        }

        const marketService = elizaRuntime.getService('marketAnalysis') as any;
        if (!marketService) {
            return res.status(500).json({ error: 'Market analysis service not available' });
        }

        const valuation = await marketService.valuateDomain(domainName);
        res.json({ success: true, valuation });
    } catch (error: any) {
        console.error('Error valuating domain:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process sale from ENS bot
app.post('/api/process-sale', async (req, res) => {
    try {
        const saleData = req.body;
        const marketService = elizaRuntime.getService('marketAnalysis') as any;
        const twitterService = elizaRuntime.getService('twitter') as any;

        if (!marketService || !twitterService) {
            return res.status(500).json({ error: 'Required services not available' });
        }

        const analysis = await marketService.analyzeSale(saleData);
        await twitterService.postSaleAnalysis(saleData, analysis);

        res.json({ success: true, analysis });
    } catch (error: any) {
        console.error('Error processing sale:', error);
        res.status(500).json({ error: error.message });
    }
});

// Handle user queries (mentions, DMs, etc.)
app.post('/api/query', async (req, res) => {
    try {
        const { query, queryType = 'general', context } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const marketService = elizaRuntime.getService('marketAnalysis') as any;
        const twitterService = elizaRuntime.getService('twitter') as any;

        if (!marketService || !twitterService) {
            return res.status(500).json({ error: 'Required services not available' });
        }

        let response;
        switch (queryType) {
            case 'valuation':
                response = await marketService.valuateDomain(query);
                break;
            case 'analysis':
                response = await marketService.analyzeSale({ ensName: query });
                break;
            default:
                response = { message: 'General query processed', query };
        }

        // If this is a Twitter mention, post the response
        if (context?.tweetId) {
            await twitterService.respondToMention(context.tweetId, response);
        }

        res.json({ success: true, response });
    } catch (error: any) {
        console.error('Error processing query:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
async function startServer() {
    await initializeEliza();

    app.listen(PORT, () => {
        console.log(`🚀 Eliza ENS Market Analysis Agent running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
}

startServer().catch(console.error);
