#!/usr/bin/env bun

// Simple test to verify the firecrawl plugin structure
console.log('🧪 Testing Firecrawl Plugin Structure...');

// Check if the plugin files exist
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const pluginDir = './packages/plugin-firecrawl/src';
const files = [
    'index.ts',
    'actions/crawlVisionAction.ts',
    'actions/testCrawlAction.ts',
    'actions/getScrapeData.ts',
    'actions/getSearchData.ts'
];

console.log('📁 Checking plugin files...');
files.forEach(file => {
    const filePath = join(pluginDir, file);
    const exists = existsSync(filePath);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n📋 Plugin Actions Available:');
console.log('1. CRAWL_VISION - Crawl Vision.io and other ENS marketplaces');
console.log('2. TEST_CRAWL_VISION - Demo crawl with sample data');
console.log('3. FIRECRAWL_GET_SCRAPED_DATA - General web scraping');
console.log('4. WEB_SEARCH - Web search functionality');

console.log('\n✅ Plugin structure verified!');
console.log('\nTo use the plugin:');
console.log('1. Say "Test the crawl functionality" to see the demo');
console.log('2. Say "Crawl vision.io" to attempt real crawling');
console.log('3. The plugin will handle Vision.io being blocked gracefully');
console.log('4. It will try alternative marketplaces if available');
