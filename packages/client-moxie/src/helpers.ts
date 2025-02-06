import { ethers } from 'ethers';

/**
 * Fetches user details from the Moxie API
 * @param bearerToken - Authentication token for the Moxie API
 * @returns Promise containing the MoxieUser details
 * @throws Error if the API request fails
 */

import { PortfolioInput, ValidationError} from "./types/types";
import { CREATOR_AGENT_TOKEN_ADDRESS, ME_QUERY, MINIMUM_CREATOR_AGENT_COINS, MOXIE_BACKEND_GRAPHQL_ENDPOINT, BASE_RPC_URL } from "./constants/constants"
import { elizaLogger, validateUuid } from "@elizaos/core";
import { MoxieWallet } from '@elizaos/moxie-lib';


/**
 * Fetches the balance of fan tokens for a given wallet address
 * @param tokenAddress - The token address
 * @param walletAddress - The wallet address to check the balance for
 * @returns Promise containing the token balance as a string
 * @throws Error if the contract call fails or returns invalid response
 */
export async function getERC20TokenBalance(tokenAddress: string, walletAddress: string) {
    const abi = [
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        }
    ];

    try {
        // Using Base mainnet RPC URL
        const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const balanceWEI = await contract.balanceOf(walletAddress);
        return ethers.formatEther(balanceWEI.toString());
    } catch (error) {
        elizaLogger.error('Error fetching token balance:', error);
        throw error;
    }
}

export async function validateCreatorAgentCoinBalance(wallets:MoxieWallet[]): Promise<{creatorAgentBalance: number, hasSufficientBalance: boolean}> {
     // validate if the user holds xx amount of creator agent coins
     let creatorAgentCoinsBalance: number = 0
     for (const wallet of wallets) {
         try {
             const balance = await getERC20TokenBalance(CREATOR_AGENT_TOKEN_ADDRESS, wallet.walletAddress);
             creatorAgentCoinsBalance += Number(balance)
         } catch (error) {
             elizaLogger.error(`Error checking token balance for wallet ${wallet.walletAddress}:`, error);
         }
     }
     if (creatorAgentCoinsBalance < MINIMUM_CREATOR_AGENT_COINS ) {
        return {creatorAgentBalance: creatorAgentCoinsBalance,  hasSufficientBalance: false}
     }
     return {creatorAgentBalance: creatorAgentCoinsBalance,  hasSufficientBalance: true}
}


export function validateInputAgentInteractions(query: { currentRoomId?: string; limit?: string , offset?: string}): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!query.currentRoomId || !validateUuid(query.currentRoomId)) {
        errors.push({ field: 'currentRoomId', message: 'Invalid or missing roomId' });
    }

    if (!query.limit) {
        errors.push({ field: 'limit', message: 'Missing limit parameter' });
    } else if (isNaN(Number(query.limit))) {
        errors.push({ field: 'limit', message: 'Limit must be a valid number' });
    }

    return errors;
}