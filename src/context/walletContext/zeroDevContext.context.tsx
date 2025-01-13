'use client'
import { ReactNode, createContext, useContext, useState, useCallback, useEffect } from 'react'

// ZeroDev imports
import * as consts from '@/constants/zerodev.consts'
import { http, encodeFunctionData, Abi, Transport, Hex, Address } from 'viem'
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
    KernelAccountClient,
} from '@zerodev/sdk'
import {
    toPasskeyValidator,
    toWebAuthnKey,
    WebAuthnMode,
    PasskeyValidatorContractVersion,
} from '@zerodev/passkey-validator'
import { KERNEL_V3_1 } from '@zerodev/sdk/constants'

import { peanutPublicClient } from '@/constants/viem.consts'
import { infuraRpcUrls } from '@/constants'
import { useAuth } from '../authContext'
import { saveToLocalStorage, getFromLocalStorage } from '@/utils'

// Note: Use this type as SmartAccountClient if needed. Typescript will be angry if Client isn't typed very specifically
type AppSmartAccountClient = KernelAccountClient<Transport, typeof consts.PEANUT_WALLET_CHAIN>
type UserOpNotEncodedParams = {
    to: Address // contractAddress to send userop to
    value: number
    abi: Abi // abi already parsed via the parseAbi() viem func
    functionName: string
    args: any[]
}
type UserOpEncodedParams = {
    to: Hex
    value?: bigint | undefined
    data?: Hex | undefined
}
interface ZeroDevContextType {
    isKernelClientReady: boolean
    setIsKernelClientReady: (clientReady: boolean) => void
    isRegistering: boolean
    setIsRegistering: (registering: boolean) => void
    isLoggingIn: boolean
    setIsLoggingIn: (loggingIn: boolean) => void
    isSendingUserOp: boolean
    setIsSendingUserOp: (sendingUserOp: boolean) => void
    handleRegister: (handle: string) => Promise<void>
    handleLogin: () => Promise<void>
    handleSendUserOpEncoded: (args: UserOpEncodedParams[]) => Promise<string> // TODO: return type may be undefined here (if userop fails for whatever reason)
    handleSendUserOpNotEncoded: (args: UserOpNotEncodedParams) => Promise<string> // TODO: return type may be undefined here (if userop fails for whatever reason)
    address: string | undefined
}
type WebAuthnKey = Awaited<ReturnType<typeof toWebAuthnKey>>

// TODO: remove any unused imports
// TODO: order imports

const ZeroDevContext = createContext<ZeroDevContextType | undefined>(undefined)

const LOCAL_STORAGE_WEB_AUTHN_KEY = 'web-authn-key'

// TODO: change description
/**
 * Context provider to manage user authentication and profile interactions.
 * It handles fetching the user profile, updating user details (e.g., username, profile photo),
 * adding accounts and logging out. It also provides hooks for child components to access user data and auth-related functions.
 */
export const ZeroDevProvider = ({ children }: { children: ReactNode }) => {
    const { fetchUser, user } = useAuth()
    const _getPasskeyName = (handle: string) => `${handle}.peanut.wallet`
    ////// context props
    //

    ////// ZeroDev props
    //

    const [isRegistering, setIsRegistering] = useState<boolean>(false)
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false)
    const [isSendingUserOp, setIsSendingUserOp] = useState<boolean>(false)

    const [kernelClient, setKernelClient] = useState<AppSmartAccountClient | undefined>(undefined)
    const [isKernelClientReady, setIsKernelClientReady] = useState<boolean>(false)
    const [address, setAddress] = useState<string | undefined>(undefined)
    const [webAuthnKey, setWebAuthnKey] = useState<WebAuthnKey | undefined>(undefined)

    ////// Lifecycle hooks
    //
    useEffect(() => {
        const storedWebAuthnKey = getFromLocalStorage(LOCAL_STORAGE_WEB_AUTHN_KEY)
        if (storedWebAuthnKey) {
            setWebAuthnKey(storedWebAuthnKey)
        }
    }, [])

    useEffect(() => {
        let isMounted = true

        if (!webAuthnKey) {
            return () => {
                isMounted = false
            }
        }

        toPasskeyValidator(peanutPublicClient, {
            webAuthnKey,
            entryPoint: consts.USER_OP_ENTRY_POINT,
            kernelVersion: KERNEL_V3_1,
            validatorContractVersion: PasskeyValidatorContractVersion.V0_0_2,
        })
            .then(createKernelClient)
            .then((client) => {
                if (isMounted) {
                    fetchUser()
                    setKernelClient(client)
                    setAddress(client.account!.address)
                    setIsKernelClientReady(true)
                    setIsRegistering(false)
                    setIsLoggingIn(false)
                }
            })

        return () => {
            isMounted = false
        }
    }, [webAuthnKey])

    ////// Setup functions
    //
    const createKernelClient = async (passkeyValidator: any) => {
        console.log({ passkeyValidator })
        const kernelAccount = await createKernelAccount(peanutPublicClient, {
            plugins: {
                sudo: passkeyValidator,
            },
            entryPoint: consts.USER_OP_ENTRY_POINT,
            kernelVersion: KERNEL_V3_1,
        })

        console.log({ kernelAccount })

        console.log('Creating kernel account client with consts')
        console.dir(consts)
        const kernelClient = createKernelAccountClient({
            account: kernelAccount,
            chain: consts.PEANUT_WALLET_CHAIN,
            bundlerTransport: http(consts.BUNDLER_URL),
            paymaster: {
                getPaymasterData: async (userOperation) => {
                    const zerodevPaymaster = createZeroDevPaymasterClient({
                        chain: consts.PEANUT_WALLET_CHAIN,
                        transport: http(consts.PAYMASTER_URL),
                    })

                    // Add logging to debug paymaster response
                    try {
                        const paymasterResult = await zerodevPaymaster.sponsorUserOperation({
                            userOperation,
                            shouldOverrideFee: true,
                        })

                        return paymasterResult
                    } catch (error) {
                        console.error('Paymaster error:', error)
                        throw error
                    }
                },
            },
        })

        console.log({ kernelClient })

        return kernelClient
    }

    ////// Register functions
    //
    const handleRegister = async (handle: string): Promise<void> => {
        setIsRegistering(true)
        try {
            const webAuthnKey = await toWebAuthnKey({
                passkeyName: _getPasskeyName(handle),
                passkeyServerUrl: consts.PASSKEY_SERVER_URL as string,
                mode: WebAuthnMode.Register,
                passkeyServerHeaders: {},
                rpID: window.location.hostname.replace(/^www\./, ''),
            })

            setWebAuthnKey(webAuthnKey)
            saveToLocalStorage(LOCAL_STORAGE_WEB_AUTHN_KEY, webAuthnKey)
        } catch (e) {
            if ((e as Error).message.includes('pending')) {
                return
            }
            console.error('Error registering passkey', e)
            setIsRegistering(false)
            throw e
        }
    }

    ////// Login functions
    //
    const handleLogin = async () => {
        setIsLoggingIn(true)
        try {
            const passkeyServerHeaders: Record<string, string> = {}
            if (user?.user?.username) {
                passkeyServerHeaders['x-username'] = user.user.username
            }

            const webAuthnKey = await toWebAuthnKey({
                passkeyName: '[]',
                passkeyServerUrl: consts.PASSKEY_SERVER_URL as string,
                mode: WebAuthnMode.Login,
                passkeyServerHeaders,
                rpID: window.location.hostname.replace(/^www\./, ''),
            })

            setWebAuthnKey(webAuthnKey)
            saveToLocalStorage(LOCAL_STORAGE_WEB_AUTHN_KEY, webAuthnKey)
        } catch (e) {
            console.error('Error logging in', e)
            setIsLoggingIn(false)
            throw e
        }
    }

    ////// UserOp functions
    //
    //

    // TODO: better docstrings
    // used when data is already encoded from Peanut
    // but remains unsigned
    const handleSendUserOpEncoded = useCallback(
        async (calls: UserOpEncodedParams[]) => {
            if (!kernelClient) {
                throw new Error('Trying to send user operation before client initialization')
            }
            setIsSendingUserOp(true)
            console.dir(calls)
            const userOpHash = await kernelClient.sendUserOperation({
                account: kernelClient.account,
                callData: await kernelClient.account!.encodeCalls(calls),
            })

            const receipt = await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash,
            })

            console.log({ receipt })

            // Update the message based on the count of UserOps
            const userOpMessage = `UserOp completed. <a href="https://jiffyscan.xyz/userOpHash/${userOpHash}?network=sepolia" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700">Click here to view.</a>`
            console.log({ userOpMessage })
            setIsSendingUserOp(false)

            return receipt.receipt.transactionHash
        },
        [kernelClient]
    )

    // used when data is NOT already encoded from Peanut
    // but remains unsigned
    const handleSendUserOpNotEncoded = async ({ to, value, abi, functionName, args }: UserOpNotEncodedParams) => {
        setIsSendingUserOp(true)

        console.log('userop')
        console.log({ kernelClient })
        console.log({ account: kernelClient!.account })
        console.log({
            to,
            value,
            abi,
            functionName,
            args,
        })

        const userOpHash = await kernelClient!.sendUserOperation({
            account: kernelClient!.account,
            callData: await kernelClient!.account!.encodeCalls([
                {
                    to,
                    value: BigInt(value),
                    data: encodeFunctionData({
                        abi,
                        functionName,
                        args,
                    }),
                },
            ]),
        })

        await kernelClient!.waitForUserOperationReceipt({
            hash: userOpHash,
        })

        // Update the message based on the count of UserOps
        const userOpMessage = `UserOp completed. <a href="https://jiffyscan.xyz/userOpHash/${userOpHash}?network=sepolia" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700">Click here to view.</a>`
        console.log({ userOpMessage })
        setIsSendingUserOp(false)

        return userOpHash
    }

    return (
        <ZeroDevContext.Provider
            value={{
                isKernelClientReady,
                setIsKernelClientReady,
                isRegistering,
                setIsRegistering,
                isLoggingIn,
                setIsLoggingIn,
                isSendingUserOp,
                setIsSendingUserOp,
                handleRegister,
                handleLogin,
                handleSendUserOpEncoded,
                handleSendUserOpNotEncoded,
                address,
            }}
        >
            {children}
        </ZeroDevContext.Provider>
    )
}

export const useZeroDev = (): ZeroDevContextType => {
    const context = useContext(ZeroDevContext)
    if (context === undefined) {
        throw new Error('useWallet must be used within an AuthProvider')
    }
    return context
}
