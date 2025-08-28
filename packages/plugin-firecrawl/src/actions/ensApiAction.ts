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

interface ENSDomain {
    name: string;
    labelName: string;
    labelhash: string;
    parent: {
        name: string;
        labelName: string;
        labelhash: string;
    };
    createdAt: string;
    registrationDate: string;
    expiryDate: string;
    fuses: number;
    registrant: string;
    owner: string;
    resolver: string;
    isMigrated: boolean;
    events: Array<{
        blockNumber: number;
        transactionHash: string;
        type: string;
        date: string;
    }>;
}

interface ENSApiResponse {
    domains: ENSDomain[];
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
    };
}

export const ensApiAction: Action = {
    name: "ENS_API_LOOKUP",
    similes: [
        "GET_ENS_DATA",
        "ENS_LOOKUP",
        "ENS_DOMAIN_INFO",
        "ENS_REGISTRATION_DATA"
    ],
    description: "Get ENS domain data using the official ENS API instead of web scraping",
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
            elizaLogger.info('Starting ENS API lookup...');
            
            // Extract domain name from message if provided
            const messageText = message.content?.text || '';
            const domainMatch = messageText.match(/([a-zA-Z0-9-]+\.eth)/);
            const domainName = domainMatch ? domainMatch[1] : null;

            if (!domainName) {
                callback({
                    text: `Please provide an ENS domain name to look up (e.g., "Look up crypto.eth" or "Get info for web3.eth")`,
                });
                return false;
            }

            // Use the ENS GraphQL API
            const response = await fetch('https://api.thegraph.com/subgraphs/name/ensdomains/ens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: `
                        query GetDomain($name: String!) {
                            domain(id: $name) {
                                name
                                labelName
                                labelhash
                                parent {
                                    name
                                    labelName
                                    labelhash
                                }
                                createdAt
                                registrationDate
                                expiryDate
                                fuses
                                registrant
                                owner
                                resolver
                                isMigrated
                                events {
                                    blockNumber
                                    transactionHash
                                    type
                                    date
                                }
                            }
                        }
                    `,
                    variables: {
                        name: domainName.toLowerCase()
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`ENS API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.errors) {
                throw new Error(`ENS API error: ${data.errors[0].message}`);
            }

            const domain = data.data?.domain;
            
            if (!domain) {
                callback({
                    text: `❌ Domain ${domainName} not found in the ENS registry.`,
                });
                return false;
            }

            // Format the response
            const registrationDate = new Date(parseInt(domain.registrationDate) * 1000);
            const expiryDate = new Date(parseInt(domain.expiryDate) * 1000);
            const isExpired = expiryDate < new Date();
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            const responseText = `✅ **ENS Domain Information for ${domainName}**

**Registration Details**:
• **Owner**: ${domain.owner}
• **Registrant**: ${domain.registrant}
• **Registration Date**: ${registrationDate.toLocaleDateString()}
• **Expiry Date**: ${expiryDate.toLocaleDateString()}
• **Status**: ${isExpired ? '❌ EXPIRED' : `✅ Active (${daysUntilExpiry} days remaining)`}

**Technical Details**:
• **Resolver**: ${domain.resolver}
• **Migrated**: ${domain.isMigrated ? 'Yes' : 'No'}
• **Fuses**: ${domain.fuses}

**Recent Events**: ${domain.events.length > 0 ? domain.events.slice(0, 3).map(event => 
    `• ${event.type} on ${new Date(parseInt(event.date) * 1000).toLocaleDateString()}`
).join('\n') : 'No recent events'}

This data comes directly from the ENS blockchain registry via the official API.`;

            callback({
                text: responseText,
                content: {
                    domain: domain,
                    domainName: domainName,
                    isExpired: isExpired,
                    daysUntilExpiry: daysUntilExpiry
                }
            });
            
            return true;

        } catch (error: any) {
            elizaLogger.error('Error in ENS API lookup:', error.message);
            callback({
                text: `❌ Error looking up ENS domain: ${error.message}`,
            });
            return false;
        }
    },
    examples: [
        [
            { name: 'user', content: { text: 'Look up crypto.eth' } },
            { name: 'agent', content: { text: 'I\'ll look up the ENS domain crypto.eth using the official ENS API.' } }
        ],
        [
            { name: 'user', content: { text: 'Get info for web3.eth' } },
            { name: 'agent', content: { text: 'I\'ll retrieve the registration information for web3.eth from the ENS registry.' } }
        ]
    ] as ActionExample[][],
} as Action;
