import type {
    MoxieUser,
    MoxieClientWallet,
} from "@moxie-protocol/moxie-agent-lib";

export const CREATOR_AGENT_TOKEN_ADDRESS: string =
    process.env["CREATOR_AGENT_TOKEN_ADDRESS"] ||
    "0x838cc7f24a2696c796f90516c89369fbdcf7c575";
export const MINIMUM_CREATOR_AGENT_COINS: number =
    Number(process.env["MINIMUM_CREATOR_AGENT_COINS"]) || 0;
export const COMMON_AGENT_ID: string = process.env["COMMON_AGENT_ID"] || "";
export const BASE_RPC_URL: string =
    process.env["BASE_RPC_URL"] || "https://mainnet.base.org";
/**
 * REUSABLE MOCK DATA STARTS BELOW
 */

// Mock Moxie User Data
export const mockMoxieUser: MoxieUser = {
    id: "M1",
    userName: "vitalik.eth",
    name: "vitalik.eth",
    bio: null,
    profileImageUrl: "https://i.imgur.com/Y1au7ZB.jpg",
    referralCode: "TTg=",
    referrerId: "M12",
    communicationPreference: "WARPCAST",
    primaryWalletId: "03463334-3c5c-4d08-9551-188f62b2586a",
    moxieScore: 1000,
    moxieRank: 0,
    createdAt: "2024-12-20T14:37:34.348Z",
    identities: [
        {
            id: "fd14e2a4-11a2-4115-81b4-4b1d266ade64",
            userId: "M8",
            type: "FARCASTER",
            connectedIdentitiesFetchStatus: "SUCCESS",
            metadata: {
                bio: "hullo",
                profileTokenId: "5650",
                username: "vitalik.eth",
                displayName: "Vitalik Buterin",
            },
            profileId: "5650",
            isActive: true,
            createdAt: "2025-01-07T12:12:05.833Z",
            updatedAt: "2025-01-07T12:12:05.833Z",
            dataSource: "PRIVY",
        },
        {
            id: "060e2d06-6fc4-45f8-8d51-3014a8406684",
            userId: "M1",
            type: "TWITTER",
            connectedIdentitiesFetchStatus: "SUCCESS",
            metadata: {
                name: "vitalik.eth",
                type: "twitter_oauth",
                subject: "2893777598",
                username: "VitalikButerin",
                verifiedAt: "2025-01-06T19:28:06.000Z",
                firstVerifiedAt: "2025-01-06T19:28:06.000Z",
                latestVerifiedAt: "2025-01-06T19:28:06.000Z",
                profilePictureUrl:
                    "https://pbs.twimg.com/profile_images/1880759276169224192/rXpjZO0A_400x400.jpg",
            },
            profileId: "VitalikButerin",
            isActive: true,
            createdAt: "2025-01-07T12:12:05.833Z",
            updatedAt: "2025-01-07T12:12:05.833Z",
            dataSource: "PRIVY",
        },
    ],
    wallets: [
        {
            id: "03463334-3c5c-4d08-9551-188f62b2586a",
            userId: "M1",
            walletAddress: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            walletType: "injected",
            createdAt: "2025-01-07T12:12:05.852Z",
            deletedAt: null,
            dataSource: "PRIVY",
        },
        {
            id: "ef43dedc-9b17-49e0-93bf-94359d47f061",
            userId: "M1",
            walletAddress: "0xa5cc845ef113c4c0908d4c1f4616a000b9a67b80",
            walletType: "embedded",
            createdAt: "2025-01-07T12:12:05.852Z",
            deletedAt: null,
            dataSource: "PRIVY",
        },
    ],
    vestingContracts: [],
};

// Mock Moxie Wallet Data
export const mockWallet: MoxieClientWallet = {
    address: "0xa5cc845ef113c4c0908d4c1f4616a000b9a67b80",
    chainType: "ethereum",
    chainId: "8453",
    walletType: "embedded",
    walletClientType: "privy",
    connectorType: "embedded",
    hdWalletIndex: 0,
    delegated: false,
};

export const MOXIE_USER_PORTFOLIOS_QUERY = (filterConditions: string[]) => `
      query GetPortfolioInfo {
        MoxieUserPortfolios(
          input: {filter: {${filterConditions.join(", ")}}}
        ) {
          MoxieUserPortfolio {
            fanTokenSymbol
            fanTokenName
            fanTokenAddress
            totalLockedAmount
            totalUnlockedAmount
            totalTvl
            walletAddresses
            currentPrice
            lockedTvl
            unlockedTvl
          }
        }
      }
    `;
