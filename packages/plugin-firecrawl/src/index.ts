import { Plugin } from "@elizaos/core";
import { getSearchDataAction } from "./actions/getSearchData";
import { getScrapeDataAction } from "./actions/getScrapeData";
import { crawlVisionAction } from "./actions/crawlVisionAction";
import { testCrawlAction } from "./actions/testCrawlAction";
import { ensApiAction } from "./actions/ensApiAction";

export const firecrawlPlugin: Plugin = {
    name: "firecrawl",
    description: "Firecrawl plugin for Eliza with Vision.io crawling and ENS API capabilities",
    actions: [getSearchDataAction, getScrapeDataAction, crawlVisionAction, testCrawlAction, ensApiAction],
    // evaluators analyze the situations and actions taken by the agent. they run after each agent action
    // allowing the agent to reflect on what happened and potentially trigger additional actions or modifications
    evaluators: [],
    // providers supply information and state to the agent's context, help agent access necessary data
    providers: [],
};
export default firecrawlPlugin;
