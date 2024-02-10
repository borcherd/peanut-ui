'use client'
import * as global_components from '@/components/global'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAccount, useNetwork } from 'wagmi'
import { providers, ethers } from 'ethers'
import { switchNetwork, getWalletClient } from '@wagmi/core'
import peanut, {
    getDefaultProvider,
    getRaffleLinkFromTx,
    getRandomString,
    getTokenContractDetails,
    interfaces,
    prepareRaffleDepositTxs,
    setFeeOptions,
    trim_decimal_overflow,
    getLatestContractVersion,
} from '@squirrel-labs/peanut-sdk'

import * as utils from '@/utils'
import * as consts from '@/consts'
import * as hooks from '@/hooks'
import * as _utils from './gigaPacket.utils'
import * as _consts from './gigaPacket.consts'
import { Switch } from '@headlessui/react'

// {
//     tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
//     tokenAmount: 0.1,
//     numberOfSlots: 9,
// },
// {
//     tokenAddress: '0x0000000000000000000000000000000000000000',
//     tokenAmount: 0.1,
//     numberOfSlots: 11,
// },

type tokenType = {
    tokenAddress: string
    tokenAmount: number
    numberOfSlots: number
}

export function GigaPacket() {
    const { isConnected, address } = useAccount()
    const { chain: currentChain } = useNetwork()

    const [peanutPassword, setPeanutPassword] = useState<string>('')
    const [finalLink, setFinalLink] = useState<string | undefined>(undefined)
    const [isMainnet, setIsMainnet] = useState<boolean>(true)

    hooks.useConfirmRefresh(true)

    const [loadingStates, setLoadingStates] = useState<consts.LoadingStates>('idle')
    const isLoading = useMemo(() => loadingStates !== 'idle', [loadingStates])

    const [formState, setFormState] = useState<tokenType[]>([
        {
            tokenAddress: '',
            tokenAmount: 0,
            numberOfSlots: 0,
        },
        {
            tokenAddress: '',
            tokenAmount: 0,
            numberOfSlots: 0,
        },
        {
            tokenAddress: '',
            tokenAmount: 0,
            numberOfSlots: 0,
        },
        {
            tokenAddress: '',
            tokenAmount: 0,
            numberOfSlots: 0,
        },
    ]) //Should be a form, but for now we'll just use a state
    const [errorState, setErrorState] = useState<{
        showError: boolean
        errorMessage: string
    }>({ showError: false, errorMessage: '' })

    const getWalletClientAndUpdateSigner = async ({
        chainId,
    }: {
        chainId: string
    }): Promise<providers.JsonRpcSigner> => {
        const walletClient = await getWalletClient({ chainId: Number(chainId) })
        if (!walletClient) {
            throw new Error('Failed to get wallet client')
        }
        const signer = utils.walletClientToSigner(walletClient)
        return signer
    }

    const checkNetwork = async (chainId: string) => {
        //check if the user is on the correct chain
        if (currentChain?.id.toString() !== chainId.toString()) {
            setLoadingStates('allow network switch')

            await utils.waitForPromise(switchNetwork({ chainId: Number(chainId) })).catch((error) => {
                setErrorState({
                    showError: true,
                    errorMessage: 'Something went wrong while switching networks',
                })
                setLoadingStates('idle')
                throw error
            })
            setLoadingStates('switching network')
            setLoadingStates('loading')
        }
    }

    async function setPassword() {
        if (peanutPassword == '') {
            const passw = await getRandomString(16)
            setPeanutPassword(passw)
        }
    }

    function combineRaffleLink(links: string[]): string {
        let firstCValue = null
        let firstPValue = null
        let firstVValue = null

        for (let url of links) {
            const urlObj = new URL(url)
            const cValue = urlObj.searchParams.get('c')
            const vValue = urlObj.searchParams.get('v')
            const fragment = urlObj.hash.substring(1)
            const pValue = new URLSearchParams(fragment).get('p')

            if (firstCValue === null) {
                firstCValue = cValue
            } else if (firstCValue !== cValue) {
                throw new Error("Inconsistent 'c' parameter values found.")
            }

            if (firstPValue === null) {
                firstPValue = pValue
            } else if (firstPValue !== pValue) {
                throw new Error("Inconsistent 'p' parameter values found.")
            }

            if (firstVValue === null) {
                firstVValue = vValue
            } else if (firstVValue !== vValue) {
                throw new Error("Inconsistent 'v' parameter values found.")
            }
        }

        console.log(links)
        const expandedLinks = links.map((link) => expandMultilink(link))
        console.log(expandedLinks)
        const combinedLink = peanut.createMultiLinkFromLinks(expandedLinks)
        console.log(combinedLink)

        return combinedLink
    } //TODO: move to sdk

    function expandMultilink(link: string): string {
        const url = new URL(link)
        const params = new URLSearchParams(url.search)

        console.log(url)

        const i = params.get('i')
        if (!i) {
            throw new Error('Error expanding the multilink')
        }

        const expandedIValues = []
        const groupRegex = /\((\d+),(\d+)\)/g
        let match

        if (groupRegex.test(i) === false) {
            return link
        }

        console.log(i)

        console.log(groupRegex.test(i) === false)

        while ((match = groupRegex.exec(i)) !== null) {
            console.log(match)
            const start = parseInt(match[1], 10)
            console.log(start)
            const count = parseInt(match[2], 10)
            console.log(count)
            for (let j = 0; j < count; j++) {
                expandedIValues.push(start + j)
            }
        }

        console.log(expandedIValues)

        params.set('i', expandedIValues.join(','))
        console.log(params.set('i', expandedIValues.join(',')))
        console.log(decodeURIComponent(params.toString()))
        url.search = decodeURIComponent(params.toString())

        console.log(url)
        return url.href
    } //TODO: move to sdk

    function checkForm(formState: tokenType[]) {
        for (const token of formState) {
            console.log(token)
            if (token.tokenAddress !== '') {
                if (token.tokenAmount <= 0) {
                    setErrorState({
                        showError: true,
                        errorMessage:
                            'Token amount must be greater than 0 for token with address: ' + token.tokenAddress,
                    })
                    return false
                }
                if (token.numberOfSlots <= 0) {
                    setErrorState({
                        showError: true,
                        errorMessage:
                            'Number of slots must be greater than 0 for token with address: ' + token.tokenAddress,
                    })
                    return false
                }
            }
        }
        return true
    }

    async function createRaffle() {
        setLoadingStates('executing transaction')
        // check if token addresses are correct
        // check if amounts and number of slots per link are correct

        try {
            const _formState = formState.filter((state) => state.tokenAddress !== '')

            if (_formState.length === 0) {
                setErrorState({
                    showError: true,
                    errorMessage: 'Please provide the details for at least one token.',
                })
                setLoadingStates('idle')
                return
            }

            if (!checkForm(_formState)) {
                setLoadingStates('idle')
                return
            }

            const _chainID = isMainnet ? _consts.MANTLE_CHAIN_ID : _consts.MANTLE_TESTNET_CHAIN_ID

            //Check network
            await checkNetwork(_chainID)

            //get signer
            const signer = await getWalletClientAndUpdateSigner({ chainId: _chainID })

            //filter out empty token fields

            let raffleLinks: string[] = []

            const baseUrl = `${window.location.origin}/packet`
            const trackId = 'mantle'

            const batcherContractVersion = getLatestContractVersion({
                chainId: _chainID,
                type: 'batch',
                experimental: true,
            })

            const currentDateTime = new Date()
            const localstorageKey = `saving giga-link for address: ${address} at ${currentDateTime}`
            const premadeLink = `${baseUrl}?c=${_chainID}&v=v4.3&i=&t=${trackId}#p=${peanutPassword}`
            utils.saveToLocalStorage(localstorageKey, premadeLink)

            console.log('saved to localstorage with key and value:', localstorageKey, premadeLink)
            const defaultProvider = await getDefaultProvider(_chainID) // get from wallet? But rpc.mantle.xyz should work

            // We'll handle each token separately
            for (const token of _formState) {
                let preparedTransactions: interfaces.IPrepareDepositTxsResponse[] = []
                const [quotient, remainder] = _utils.divideAndRemainder(token.numberOfSlots)
                console.log(token.tokenAmount)
                console.log(token.numberOfSlots)
                const tokenAmountPerSlot = token.tokenAmount / token.numberOfSlots
                let tokenType, tokenDecimals

                // We do this cause mantle native token isnt an actual native token, but we need to treat it that way
                if (token.tokenAddress == _consts.MANTLE_NATIVE_TOKEN_ADDRESS) {
                    tokenType = 0
                    tokenDecimals = 18
                } else {
                    try {
                        const contractDetails = await getTokenContractDetails({
                            address: token.tokenAddress,
                            provider: defaultProvider,
                        })

                        tokenType = contractDetails.type
                        contractDetails.decimals ? (tokenDecimals = contractDetails.decimals) : (tokenDecimals = 16)
                    } catch (error) {
                        throw new Error('Contract type not supported')
                    }

                    if (tokenType === undefined || tokenDecimals === undefined) {
                        throw new Error('Token type or decimals not found, please contact support')
                    }
                }

                console.log('tokenType:', tokenType)
                console.log('tokenDecimals:', tokenDecimals)

                console.log(token)
                //if tokentype is 1 (erc20), prepare and send an approval transaction once for the entire amount
                if (tokenType == 1) {
                    const tokenAmountString = trim_decimal_overflow(token.tokenAmount, tokenDecimals)
                    const tokenAmountBigNum = ethers.utils.parseUnits(tokenAmountString, tokenDecimals)

                    const approveTx = await peanut.prepareApproveERC20Tx(
                        address ?? '',
                        _chainID,
                        token.tokenAddress,
                        tokenAmountBigNum,
                        -1, // decimals doesn't matter
                        true, // already a prepared bignumber
                        batcherContractVersion,
                        signer.provider
                    )

                    console.log('approveTx:', approveTx)

                    if (approveTx !== null) {
                        let txOptions
                        try {
                            txOptions = await setFeeOptions({ provider: signer.provider })
                        } catch (error) {
                            throw new interfaces.SDKStatus(
                                interfaces.ESignAndSubmitTx.ERROR_SETTING_FEE_OPTIONS,
                                'Error setting the fee options',
                                error
                            )
                        }

                        const convertedTransaction: ethers.providers.TransactionRequest = {
                            from: approveTx.from,
                            to: approveTx.to,
                            data: approveTx.data,
                            value: approveTx.value ? ethers.BigNumber.from(approveTx.value) : undefined,
                        }
                        const combined = {
                            ...txOptions,
                            ...convertedTransaction,
                        } as ethers.providers.TransactionRequest
                        const tx = await signer.sendTransaction(combined)

                        await tx.wait()
                    }
                }

                // prepare the transactions. It is calculated based on the number of slots and the max transactions per block
                for (let index = 0; index <= quotient; index++) {
                    const numberofLinks = index != quotient ? _consts.MAX_TRANSACTIONS_PER_BLOCK : remainder

                    console.log(numberofLinks)

                    console.log(tokenAmountPerSlot)

                    console.log(Number(tokenAmountPerSlot * numberofLinks))

                    console.log(index != quotient ? _consts.MAX_TRANSACTIONS_PER_BLOCK : remainder)

                    if (numberofLinks > 0) {
                        const linkDetails = {
                            chainId: _chainID,
                            tokenAmount: Number(tokenAmountPerSlot * numberofLinks),
                            tokenAddress: token.tokenAddress,
                            baseUrl,
                            trackId,
                            tokenDecimals: tokenDecimals,
                            tokenType: tokenType,
                        }

                        const prepTx = await prepareRaffleDepositTxs({
                            userAddress: address ?? '',
                            linkDetails: linkDetails,
                            password: peanutPassword,
                            withMFA: true,
                            numberOfLinks: index != quotient ? _consts.MAX_TRANSACTIONS_PER_BLOCK : remainder,
                        })

                        preparedTransactions.push(prepTx)
                    }
                }

                console.log('preparedTx: ', preparedTransactions)

                if (token.tokenAddress === _consts.MANTLE_NATIVE_TOKEN_ADDRESS) {
                    console.log('hier')
                    preparedTransactions = preparedTransactions.map((item) => {
                        console.log(item.unsignedTxs.length)
                        if (item.unsignedTxs.length === 2) {
                            // Filter out the first transaction and return only the second one
                            return { unsignedTxs: [item.unsignedTxs[1]] }
                        }
                        // If the length is not 2, return the item as it is
                        return item
                    })
                }

                console.log('filtered preparedTx: ', preparedTransactions)

                let hashes: string[] = []

                for (const preparedTransactionsArray of preparedTransactions) {
                    let index = 0
                    for (const prearedTransaction of preparedTransactionsArray.unsignedTxs) {
                        let txOptions
                        try {
                            txOptions = await setFeeOptions({ provider: signer.provider })
                        } catch (error) {
                            throw new interfaces.SDKStatus(
                                interfaces.ESignAndSubmitTx.ERROR_SETTING_FEE_OPTIONS,
                                'Error setting the fee options',
                                error
                            )
                        }
                        console.log(txOptions)

                        const convertedTransaction: ethers.providers.TransactionRequest = {
                            from: prearedTransaction.from,
                            to: prearedTransaction.to,
                            data: prearedTransaction.data,
                            value: prearedTransaction.value
                                ? ethers.BigNumber.from(prearedTransaction.value)
                                : undefined,
                        }
                        const combined = {
                            ...txOptions,
                            ...convertedTransaction,
                        } as ethers.providers.TransactionRequest

                        console.log('combined:', combined)
                        const tx = await signer.sendTransaction(combined)
                        await tx.wait()
                        hashes.push(tx.hash)

                        index++
                    }
                }

                console.log('hashes:', hashes)

                const links: string[] = []
                let index = 0

                for (const hash of hashes) {
                    const numberofLinks = index != quotient ? _consts.MAX_TRANSACTIONS_PER_BLOCK : remainder

                    const linkDetails = {
                        chainId: _chainID,
                        tokenAmount: 0,
                        tokenAddress: token.tokenAddress,
                        baseUrl: 'https://red.peanut.to/packet',
                        trackId: 'mantle',
                        tokenDecimals: tokenDecimals,
                        tokenType: tokenType,
                    }

                    const getLinkFromTxResponse = await getRaffleLinkFromTx({
                        password: peanutPassword,
                        txHash: hash,
                        name: '',
                        linkDetails: linkDetails,
                        withMFA: true,
                        withCaptcha: true,
                        APIKey: process.env.PEANUT_API_KEY ?? '',
                        numberOfLinks: numberofLinks,
                        provider: signer.provider,
                    })

                    links.push(getLinkFromTxResponse.link)

                    index++
                }

                console.log('links:', links)

                const combinedLink = combineRaffleLink(links)

                console.log(combinedLink)

                //save to localstorage status with smt like not finalized

                const localstorageItem = utils.getFromLocalStorage(localstorageKey)

                console.log(localstorageItem)

                const localstorageItemUrl = new URL(localstorageItem)

                console.log(localstorageItemUrl.searchParams.get('i'))

                if (localstorageItemUrl.searchParams.get('i') == '') {
                    console.log('hier')
                    utils.saveToLocalStorage(localstorageKey, combinedLink)
                } else {
                    console.log('da')
                    console.log(localstorageItem)
                    console.log(combinedLink)
                    const _combinedLink = combineRaffleLink([localstorageItem, combinedLink])
                    utils.saveToLocalStorage(localstorageKey, _combinedLink)
                }

                raffleLinks.push(combinedLink)
            }
            const finalfinalv4rafflelink_final = combineRaffleLink(raffleLinks)
            console.log(finalfinalv4rafflelink_final)
            setFinalLink(finalfinalv4rafflelink_final)
        } catch (error) {
            setLoadingStates('idle')

            console.error(error)
        } finally {
            setLoadingStates('idle')
        }
    }

    useEffect(() => {
        if (peanutPassword == '') {
            setPassword()
        }
    }, [])

    function classNames(...classes: any) {
        return classes.filter(Boolean).join(' ')
    }

    return (
        <global_components.CardWrapper redPacket>
            <div className=" mt-10 flex w-full flex-col items-center gap-2 text-center">
                <h2 className="title-font bold my-0 text-2xl lg:text-4xl">Red Packet</h2>
                <div className="my-0 w-4/5 font-normal">
                    Form for specifically creating red packets with more than 250 slots. Only possible on mantle. Fill
                    out the rows with the token address, the amount of tokens and the number of slots you want to
                    create. You can add up to 4 different tokens, just leave the remaining ones empty.
                </div>

                <Switch.Group as="div" className="flex items-center gap-4">
                    <Switch.Label as="span">
                        <span className="text-sm">Testnet</span>
                    </Switch.Label>
                    <Switch
                        checked={isMainnet}
                        onChange={setIsMainnet}
                        className={classNames(
                            isMainnet ? 'bg-teal' : 'bg-gray-200',
                            'relative m-0 inline-flex h-4 w-9 flex-shrink-0 cursor-pointer rounded-none border-2 border-black p-0 transition-colors duration-200 ease-in-out '
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={classNames(
                                isMainnet ? 'translate-x-5' : 'translate-x-0',
                                'pointer-events-none m-0 inline-block h-3 w-3 transform rounded-none border-2 border-black bg-white shadow ring-0 transition duration-200 ease-in-out'
                            )}
                        />
                    </Switch>
                    <Switch.Label as="span">
                        <span className="text-sm">Mainnet</span>
                    </Switch.Label>
                </Switch.Group>

                <div className="mt-4 flex w-full flex-col items-center justify-center">
                    <div className="grid w-full gap-4">
                        {formState.map((item, idx) => {
                            return (
                                <Fragment key={idx}>
                                    <div className="flex gap-2">
                                        <div>
                                            <label className="flex h-full items-center justify-center text-xl font-bold">
                                                #{idx + 1}
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-3 items-center gap-4">
                                            <div className="col-span-1 flex h-[58px] flex-col items-start gap-2 border-4 border-solid !px-4 !py-1">
                                                <div className="font-normal">Token address</div>
                                                <input
                                                    className="w-full items-center overflow-hidden overflow-ellipsis whitespace-nowrap break-all border-none bg-transparent p-0 text-xl font-bold outline-none"
                                                    placeholder="0x123"
                                                    type="text"
                                                    autoComplete="off"
                                                    autoFocus
                                                    onChange={(e) => {
                                                        const newFormState = formState
                                                        newFormState[idx].tokenAddress = e.target.value
                                                        setFormState(newFormState)
                                                    }}
                                                />
                                            </div>
                                            <div className="col-span-1 flex h-[58px] flex-col items-start gap-2 border-4 border-solid !px-4 !py-1">
                                                <div className="font-normal">Token amount</div>
                                                <input
                                                    className="w-full items-center overflow-hidden overflow-ellipsis whitespace-nowrap break-all border-none bg-transparent p-0 text-xl font-bold outline-none"
                                                    placeholder="500"
                                                    type="number"
                                                    inputMode="decimal"
                                                    autoComplete="off"
                                                    onChange={(e) => {
                                                        const newFormState = formState
                                                        console.log(Number(e.target.value))
                                                        newFormState[idx].tokenAmount = Number(e.target.value)
                                                        setFormState(newFormState)
                                                    }}
                                                />
                                            </div>
                                            <div className="col-span-1 flex h-[58px] flex-col items-start gap-2 border-4 border-solid !px-4 !py-1">
                                                <div className="font-normal">Number of slots</div>
                                                <input
                                                    className="w-full items-center overflow-hidden overflow-ellipsis whitespace-nowrap break-all border-none bg-transparent p-0 text-xl font-bold outline-none"
                                                    placeholder="1000"
                                                    type="number"
                                                    inputMode="decimal"
                                                    autoComplete="off"
                                                    onChange={(e) => {
                                                        const newFormState = formState
                                                        newFormState[idx].numberOfSlots = Number(e.target.value)
                                                        setFormState(newFormState)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {idx < formState.length - 1 && <div className="brutalborder w-full"></div>}
                                </Fragment>
                            )
                        })}
                    </div>
                </div>

                <div className="my-4 w-4/5 font-normal">
                    Please confirm all token addresses are correct and the connected wallet has sufficient funds.
                </div>

                <div
                    className={
                        errorState.showError
                            ? 'mx-auto mb-0 mt-4 flex w-full flex-col items-center gap-10 sm:mt-0'
                            : 'mx-auto mb-8 mt-4 flex w-full flex-col items-center sm:mt-0'
                    }
                >
                    <button
                        type={isConnected ? 'submit' : 'button'}
                        className="mt-2 block w-[90%] cursor-pointer bg-white p-5 px-2  text-2xl font-black sm:w-2/5 lg:w-1/2"
                        id="cta-btn"
                        onClick={() => {
                            isConnected ? createRaffle() : open()
                        }}
                        disabled={isLoading ? true : false}
                    >
                        {isLoading ? (
                            <div className="flex justify-center gap-1">
                                <label>{loadingStates} </label>
                                <span className="bouncing-dots flex">
                                    <span className="dot">.</span>
                                    <span className="dot">.</span>
                                    <span className="dot">.</span>
                                </span>
                            </div>
                        ) : !isConnected ? (
                            'Connect Wallet'
                        ) : (
                            'Create'
                        )}
                    </button>

                    {finalLink ? (
                        <div className="mt-6 w-4/5 text-xl font-black">{finalLink}</div>
                    ) : (
                        isLoading && (
                            <div className="mt-6 w-4/5 text-xl font-black">
                                Please do not click away during the creation proccess. This might take a while
                            </div>
                        )
                    )}

                    {errorState.showError && (
                        <div className="text-center">
                            <label className="font-bold text-red ">{errorState.errorMessage}</label>
                        </div>
                    )}
                </div>
            </div>
        </global_components.CardWrapper>
    )
}
