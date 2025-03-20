import { elizaLogger } from "@moxie-protocol/core";
import { mockMoxieUser } from "./constants";
import {
    MoxieUser,
    GetUserResponse,
    MeQueryResponse,
    MoxieIdentity,
    SignMessageResponse,
    SignMessageInput,
    SignTransactionInput,
    SignTransactionResponse,
    GetWalletDetailsOutput,
    SignTypedDataInput,
    SignTypedDataResponse,
    SendTransactionResponse,
    SendTransactionInput,
    GetUserInfoBatchResponse,
    ErrorDetails,
    GetUserInfoBatchOutput,
} from "./types";

export async function getUserMoxieWalletAddress(
    walletAddress: string
): Promise<MoxieUser | undefined> {
    return (
        mockMoxieUser.wallets.find(
            (wallet) => wallet.walletAddress === walletAddress
        ) && Promise.resolve(mockMoxieUser)
    );
}

export async function getUserByMoxieId(
    userId: string
): Promise<MoxieUser | undefined> {
    return userId === mockMoxieUser.id && Promise.resolve(mockMoxieUser);
}

export async function getUserByMoxieIdMultiple(
    userIds: string[]
): Promise<Map<string, MoxieUser>> {
    try {
        const results = await Promise.all(
            userIds.map((userId) => getUserByMoxieId(userId))
        );

        const userIdToTUser = new Map<string, MoxieUser>();

        userIds.forEach((userId, index) => {
            const user = results[index];

            if (user) {
                userIdToTUser.set(userId, user);
            }
        });

        elizaLogger.info(`results: ${userIdToTUser.size}`);

        return userIdToTUser;
    } catch (error) {
        elizaLogger.error("Error in getUserByMoxieIdMultiple:", error);
        return new Map();
    }
}

export async function getUserByMoxieIdMultipleTokenGate(
    userIds: string[],
    authorizationHeader: string,
    pluginId: string
): Promise<GetUserInfoBatchOutput> {
    try {
        const query = `
            query GetUserInfoBatch($userIds: [String!]!, $pluginId: String!) {
                GetUserInfoBatch(input: { userIds: $userIds, pluginDetails: { pluginId: $pluginId } }) {
                remainingFreeTrialCount
                freeTrialLimit
                users {
                    errorDetails {
                        errorMessage
                        expectedCreatorCoinBalance
                        actualCreatorCoinBalance
                        requestedUserName
                        requestedId
                        requesterId
                        requiredMoxieAmountInUSD
                    }
                    user {
                        id
                        userName
                        identities {
                            id
                            userId
                            type
                            dataSource
                            connectedIdentitiesFetchStatus
                            metadata
                            profileId
                            isActive
                            createdAt
                            updatedAt
                        }
                        wallets {
                            id
                            userId
                            walletAddress
                            walletType
                            dataSource
                            createdAt
                            deletedAt
                        }
                        vestingContracts {
                            beneficiaryAddress
                            vestingContractAddress
                        }
                    }
                }
            }
        } `;

        const response = await fetch(process.env.MOXIE_API_URL_INTERNAL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authorizationHeader,
            },
            body: JSON.stringify({
                query,
                variables: { userIds, pluginId },
            }),
        });

        let res = await response.json();
        console.log("res", res);
        const { data } = res as GetUserInfoBatchResponse;
        return data.GetUserInfoBatch;
    } catch (error) {
        elizaLogger.error("Error in getUserByMoxieIdMultipleTokenGate:", error);
        return { users: [], freeTrialLimit: 0, remainingFreeTrialCount: 0 };
    }
}

export async function getUserByWalletAddressMultiple(
    walletAddresses: string[]
): Promise<Map<string, MoxieUser>> {
    try {
        const results = await Promise.all(
            walletAddresses.map((walletAddress) =>
                getUserMoxieWalletAddress(walletAddress)
            )
        );

        const walletAddressToUser = new Map<string, MoxieUser>();

        walletAddresses.forEach((walletAddress, index) => {
            const user = results[index];

            if (user) {
                walletAddressToUser.set(walletAddress, user);
            }
        });

        elizaLogger.info(`results: ${walletAddressToUser.size}`);

        return walletAddressToUser;
    } catch (error) {
        elizaLogger.error("Error in getUserByWalletAddressMultiple:", error);
        return new Map();
    }
}

export async function getTwitteruserNameByMoxieIdMultiple(
    userIds: string[]
): Promise<Map<string, string>> {
    const userIdToTwitterUsername = new Map<string, string>();

    try {
        const results = await getUserByMoxieIdMultiple(userIds);

        userIds.forEach((userId, index) => {
            const user = results.get(userId);

            const twitterIdentity = user?.identities?.find(
                (identity: MoxieIdentity) => identity.type === "TWITTER"
            );

            const userName = twitterIdentity?.metadata?.username;

            if (userName) {
                userIdToTwitterUsername.set(userId, userName);
            }
        });

        return userIdToTwitterUsername;
    } catch (error) {
        elizaLogger.error(
            "Error in getTwitteruserNameByMoxieIdMultiple:",
            error
        );
    }

    return userIdToTwitterUsername;
}

export interface SocialProfile {
    twitterUsername?: string;
    farcasterUsername?: string;
    farcasterUserId?: string;
}

export async function getSocialProfilesByMoxieIdMultiple(
    userIds: string[],
    bearerToken: string,
    pluginId: string
) {
    const userIdToSocialProfile = new Map<string, SocialProfile>();
    const errorDetails = new Map<string, ErrorDetails>();

    try {
        const results = await getUserByMoxieIdMultipleTokenGate(
            userIds,
            bearerToken,
            pluginId
        );

        results.users.forEach((userInfo, _index) => {
            const user = userInfo.user;
            if (!user && userInfo.errorDetails) {
                errorDetails.set(
                    userInfo.errorDetails.requestedId,
                    userInfo.errorDetails
                );
                return;
            }

            let twitterUsername = null;
            let farcasterUsername = null;
            let farcasterUserId = null;

            const identities = user?.identities || [];

            for (const identity of identities) {
                if (identity.type === "TWITTER") {
                    twitterUsername = identity?.metadata?.username;
                } else if (identity.type === "FARCASTER") {
                    console.log({ Metadata: JSON.stringify(identity) });
                    farcasterUsername = identity?.metadata?.username;
                    farcasterUserId = identity?.profileId;
                }
            }
            const socialProfile: SocialProfile = {
                twitterUsername: twitterUsername,
                farcasterUsername: farcasterUsername,
                farcasterUserId,
            };

            userIdToSocialProfile.set(user.id, socialProfile);
        });

        return {
            userIdToSocialProfile,
            errorDetails,
            freeTrialLimit: results.freeTrialLimit,
            remainingFreeTrialCount: results.remainingFreeTrialCount,
        };
    } catch (error) {
        elizaLogger.error(
            "Error in getTwitteruserNameByMoxieIdMultiple:",
            error
        );
    }
}

// getTwitteruserNameByMoxieIdMultiple(["M4"]).then(console.log)

// getSocialProfilesByMoxieIdMultiple(["M4"]).then(console.log)

export async function getUserByPrivyBearerToken(
    bearerToken: string
): Promise<MoxieUser> {
    const query = `
        query Me {
            Me {
                id
                userName
                name
                bio
                profileImageUrl
                referralCode
                referrerId
                moxieScore
                moxieRank
                totalUsers
                primaryWalletId
                communicationPreference
                createdAt
                identities {
                    id
                    userId
                    type
                    dataSource
                    connectedIdentitiesFetchStatus
                    metadata
                    profileId
                    isActive
                    createdAt
                    updatedAt
                }
                wallets {
                    id
                    userId
                    walletAddress
                    walletType
                    dataSource
                    createdAt
                    deletedAt
                }
            }
        }
    `;

    try {
        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: bearerToken,
            },
            body: JSON.stringify({
                query,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = (await response.json()) as MeQueryResponse;

        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        return result.data.Me;
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw error;
    }
}

export async function GetWalletDetails(
    bearerToken: string
): Promise<GetWalletDetailsOutput> {
    const query = `
query GetWalletDetails {
  GetWalletDetails {
    privyId
    success
    wallet {
      address
      chainId
      chainType
      connectorType
      hdWalletIndex
      delegated
      imported
      walletClientType
      walletType
    }
  }
  }
  `;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(process.env.MOXIE_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: bearerToken,
                },
                body: JSON.stringify({ query }),
            });

            // Retry on 429 (Too Many Requests) or 5xx server errors
            if (
                response.status === 429 ||
                (response.status >= 500 && response.status < 600)
            ) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Exponential backoff: 1s, 2s, 4s
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
                );
                continue;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = (await response.json()) as {
                data?: {
                    GetWalletDetails: GetWalletDetailsOutput;
                };
                errors?: Array<{
                    message: string;
                    path?: string[];
                    extensions?: Record<string, any>;
                }>;
            };

            if (data.errors?.length) {
                const error = data.errors[0];
                const errorMessage = error.message;
                const errorPath = error.path?.join(".") || "unknown path";
                throw new Error(
                    `GraphQL error at ${errorPath}: ${errorMessage}`
                );
            }

            if (!data.data) {
                throw new Error("No data returned from API");
            }

            return data.data.GetWalletDetails;
        } catch (error) {
            if (retryCount === maxRetries - 1) {
                if (error instanceof Error) {
                    throw new Error(
                        `Failed to get wallet details: ${error.message}`
                    );
                }
                throw new Error(
                    "Failed to get wallet details: An unknown error occurred"
                );
            }
            retryCount++;
            await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
            );
        }
    }

    throw new Error("Maximum retries exceeded");
}

export async function SignMessage(
    input: SignMessageInput,
    bearerToken: string
): Promise<SignMessageResponse> {
    const query = `
    query SignMessage($input: EthereumSignMessageInput!) {
      SignMessage(input: $input) {
        signature
        encoding
      }
    }
  `;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(process.env.MOXIE_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: bearerToken,
                },
                body: JSON.stringify({
                    query,
                    variables: { input },
                }),
            });

            // Retry on 429 (Too Many Requests) or 5xx server errors
            if (
                response.status === 429 ||
                (response.status >= 500 && response.status < 600)
            ) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Exponential backoff: 1s, 2s, 4s
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
                );
                continue;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = (await response.json()) as {
                data: SignMessageResponse;
                errors?: Array<{
                    message: string;
                    path?: string[];
                    extensions?: Record<string, any>;
                }>;
            };

            if (data.errors?.length) {
                const error = data.errors[0];
                const errorMessage = error.message;
                const errorPath = error.path?.join(".") || "unknown path";
                throw new Error(
                    `GraphQL error at ${errorPath}: ${errorMessage}`
                );
            }

            if (!data.data) {
                throw new Error("No data returned from API");
            }

            return data.data;
        } catch (error) {
            if (retryCount === maxRetries - 1) {
                if (error instanceof Error) {
                    throw new Error(`Failed to sign message: ${error.message}`);
                }
                throw new Error(
                    "Failed to sign message: An unknown error occurred"
                );
            }
            retryCount++;
            // Exponential backoff for other errors too
            await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
            );
        }
    }

    throw new Error("Failed to sign message after maximum retries");
}

export async function SignTransaction(
    input: SignTransactionInput,
    bearerToken: string
): Promise<SignTransactionResponse> {
    const query = `
    query SignTransaction($input: EthereumSignTransactionInput!) {
      SignTransaction(input: $input) {
        signature
        encoding
      }
    }
  `;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(process.env.MOXIE_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: bearerToken,
                },
                body: JSON.stringify({
                    query,
                    variables: { input },
                }),
            });

            if (!response.ok) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Exponential backoff: 1s, 2s, 4s
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
                );
                continue;
            }

            const data = (await response.json()) as {
                data: {
                    SignTransaction: SignTransactionResponse;
                };
                errors?: Array<{
                    message: string;
                    path?: string[];
                    extensions?: Record<string, any>;
                }>;
            };

            if (data.errors?.length) {
                const error = data.errors[0];
                const errorMessage = error.message;
                const errorPath = error.path?.join(".") || "unknown path";
                throw new Error(
                    `GraphQL error at ${errorPath}: ${errorMessage}`
                );
            }

            if (!data.data) {
                throw new Error("No data returned from API");
            }

            return data.data.SignTransaction;
        } catch (error) {
            if (retryCount === maxRetries - 1) {
                if (error instanceof Error) {
                    throw new Error(
                        `Failed to sign transaction: ${error.message}`
                    );
                }
                throw new Error(
                    "Failed to sign transaction: An unknown error occurred"
                );
            }
            retryCount++;
            // Exponential backoff for other errors too
            await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
            );
        }
    }

    throw new Error("Failed to sign transaction after maximum retries");
}

export async function SignTypedData(
    input: SignTypedDataInput,
    bearerToken: string
): Promise<SignTypedDataResponse> {
    const query = `
    query SignTypedData($input: EthereumSignTypedDataInput!) {
      SignTypedData(input: $input) {
        signature
        encoding
      }
    }
  `;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(process.env.MOXIE_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: bearerToken,
                },
                body: JSON.stringify({
                    query,
                    variables: { input },
                }),
            });

            if (!response.ok) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Exponential backoff: 1s, 2s, 4s
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
                );
                continue;
            }

            const data = (await response.json()) as {
                data: {
                    SignTypedData: SignTypedDataResponse;
                };
                errors?: Array<{
                    message: string;
                    path?: string[];
                    extensions?: Record<string, any>;
                }>;
            };

            if (data.errors?.length) {
                const error = data.errors[0];
                const errorMessage = error.message;
                const errorPath = error.path?.join(".") || "unknown path";
                throw new Error(
                    `GraphQL error at ${errorPath}: ${errorMessage}`
                );
            }

            if (!data.data) {
                throw new Error("No data returned from API");
            }

            return data.data.SignTypedData;
        } catch (error) {
            if (retryCount === maxRetries - 1) {
                if (error instanceof Error) {
                    throw new Error(
                        `Failed to sign typed data: ${error.message}`
                    );
                }
                throw new Error(
                    "Failed to sign typed data: An unknown error occurred"
                );
            }
            retryCount++;
            // Exponential backoff for other errors too
            await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
            );
        }
    }

    throw new Error("Failed to sign typed data after maximum retries");
}

export async function sendTransaction(
    input: SendTransactionInput,
    bearerToken: string
): Promise<SendTransactionResponse> {
    const query = `
    query SendTransaction($input: EthereumSendTransactionInput!) {
      SendTransaction(input: $input) {
        hash
        caip2
        code
        message
      }
    }
  `;
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(process.env.MOXIE_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: bearerToken,
                },
                body: JSON.stringify({
                    query,
                    variables: { input },
                }),
            });

            if (!response.ok) {
                retryCount++;
                if (retryCount === maxRetries) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                // Exponential backoff: 1s, 2s, 4s
                await new Promise((resolve) =>
                    setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
                );
                continue;
            }

            const data = (await response.json()) as {
                data: {
                    SendTransaction: SendTransactionResponse;
                };
                errors?: Array<{
                    message: string;
                    path?: string[];
                    extensions?: Record<string, any>;
                }>;
            };

            if (data.errors?.length) {
                const error = data.errors[0];
                const errorMessage = error.message;
                const errorPath = error.path?.join(".") || "unknown path";
                throw new Error(
                    `GraphQL error at ${errorPath}: ${errorMessage}`
                );
            }

            if (!data.data) {
                throw new Error("No data returned from API");
            }

            return data.data.SendTransaction;
        } catch (error) {
            if (retryCount === maxRetries - 1) {
                if (error instanceof Error) {
                    throw new Error(
                        `Failed to send transaction: ${error.message}`
                    );
                }
                throw new Error(
                    "Failed to send transaction: An unknown error occurred"
                );
            }
            retryCount++;
            // Exponential backoff for other errors too
            await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, retryCount - 1) * 1000)
            );
        }
    }

    throw new Error("Failed to send transaction after maximum retries");
}
