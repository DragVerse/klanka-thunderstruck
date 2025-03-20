import axios from 'axios';
import { elizaLogger, IAgentRuntime } from '@moxie-protocol/core';
const CACHE_EXPIRATION = 60000; // 1 minute in milliseconds

interface PortfolioResponse {
    data: {
        data: {
            portfolio: Portfolio;
        }
    }
}

export interface Portfolio {
    tokenBalances: TokenBalance[];
}

interface BaseToken {
    name: string;
    symbol: string;
    address: string;
}

interface Token {
    balance: number;
    balanceUSD: number;
    baseToken: BaseToken;
    holdingPercentage?: number;
}

interface TokenBalance {
    address: string;
    network: string;
    token: Token;
}

interface DisplayProps {
    label: string;
}

interface AppTokenPosition {
    type: 'app-token';
    address: string;
    network: string;
    appId: string;
    groupId: string;
    balance: string;
    balanceUSD: number;
    price: number;
    symbol: string;
    decimals: number;
    displayProps?: DisplayProps;
}

interface ContractPosition {
    type: 'contract-position';
    address: string;
    network: string;
    appId: string;
    groupId: string;
    balance?: string;
    balanceUSD?: number;
    displayProps?: DisplayProps;
}

interface Product {
    label: string;
    assets: (AppTokenPosition | ContractPosition)[];
    meta: any[];
}

interface AppBalance {
    address: string;
    appId: string;
    network: string;
    balanceUSD: number;
    products: Product[];
}

interface TokenNode {
    id: string;
    tokenAddress: string;
    name: string;
    symbol: string;
    price: number;
    balance: number;
    balanceUSD: number;
    holdingPercentage: number;
}
export interface PortfolioV2Data {
    tokenBalances: {
        totalBalanceUSD: number;
        byToken: {
            edges: Array<{
                cursor: string;
                node: TokenNode;
            }>;
        };
    };
    metadata: {
        addresses: string[];
        networks: string[];
    };
}
export interface PortfolioV2Response {
    portfolioV2: PortfolioV2Data;
}

const API_KEY = process.env.ZAPPER_API_KEY;
if (!API_KEY) {
    throw new Error("ZAPPER_API_KEY environment variable is required");
}
const encodedKey = btoa(API_KEY);

const client = axios.create({
  baseURL: process.env.ZAPPER_API_URL,
  headers: {
    'authorization': `Basic ${encodedKey}`,
    'Content-Type': 'application/json'
  }
});

export async function getPortfolioData(addresses: string[], networks: string[], userId: string, runtime: IAgentRuntime): Promise<Portfolio> {
  try {

    // Check cache first
    elizaLogger.log("Getting portfolio data for user: ", userId, "with addresses: ", addresses);
    const cacheKey = `PORTFOLIO-${userId}`;
    const cachedPortfolio = await runtime.cacheManager.get(cacheKey);

    if (cachedPortfolio) {
      return JSON.parse(cachedPortfolio as string);
    }

    const PortfolioQuery = `
    query providerPorfolioQuery($addresses: [Address!]!, $networks: [Network!]!) {
        portfolio(addresses: $addresses, networks: $networks) {
        tokenBalances {
            address
            network
            token {
            balance
            balanceUSD
            baseToken {
                name
                symbol
                address
            }
            }
        }
        }
    }
    `;

    // If not in cache, fetch from API
    let attempts = 0;
    const maxAttempts = 3;
    const backoffMs = 1000;

    while (attempts < maxAttempts) {
      try {
        const portfolioData: PortfolioResponse = await client.post('', {
          query: PortfolioQuery,
          variables: {
            addresses,
            networks
          }
        });
        const portfolio = portfolioData.data.data.portfolio;
        elizaLogger.log('Portfolio data loaded successfully for wallets: ', addresses);

        // Cache the result
        await runtime.cacheManager.set(cacheKey, JSON.stringify(portfolio), {
            expires: Date.now() + CACHE_EXPIRATION
        });

        return portfolio;

    } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw error;
        }
        elizaLogger.warn(`Zapper API call failed, attempt ${attempts}/${maxAttempts}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs * attempts));
      }
    }

  } catch (error) {
    elizaLogger.error('Error fetching portfolio data:', error);
    throw error;
  }
}

export async function getPortfolioV2Data(addresses: string[], networks: string[], userId: string, runtime: IAgentRuntime): Promise<PortfolioV2Data> {
    try {
        const cacheKey = `PORTFOLIO-V2-${userId}`;
        const cachedPortfolio = await runtime.cacheManager.get(cacheKey);

        if (cachedPortfolio) {
            return JSON.parse(cachedPortfolio as string);
        }

        const query = `
            query PortfolioV2 ($addresses: [Address!]!, $networks: [Network!]!) {
                portfolioV2 (addresses: $addresses, networks: $networks) {
                    tokenBalances {
                        totalBalanceUSD
                        byToken(filters: { minBalanceUSD: 0.01 }, first: 30) {
                            edges {
                                node {
                                    tokenAddress
                                    symbol
                                    price
                                    balance
                                    balanceUSD
                                }
                            }
                        }
                    }
                    metadata {
                        addresses
                        networks
                    }
                }
            }
        `;

        let attempts = 0;
        const maxAttempts = 3;
        const backoffMs = 1000;

        while (attempts < maxAttempts) {
            try {
                const response = await client.post('', {
                    query: query,
                    variables: {
                        addresses,
                        networks
                    }
                });

                if (response.status !== 200) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const portfolioData = response.data.data.portfolioV2;
                await runtime.cacheManager.set(cacheKey, JSON.stringify(portfolioData), {
                    expires: Date.now() + CACHE_EXPIRATION
                });

                return portfolioData;

            } catch (error) {
                attempts++;
                if (attempts === maxAttempts) {
                    throw error;
                }
                elizaLogger.warn(`Airstack API call failed, attempt ${attempts}/${maxAttempts}. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs * attempts));
            }
        }
    } catch (error) {
        elizaLogger.error('Error fetching portfolioV2 data:', error);
        throw error;
    }
}
