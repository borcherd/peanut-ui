'use client'

import Icon from '@/components/Global/Icon'
import * as consts from '@/constants'
import * as _consts from '../../Pay.consts'
import * as interfaces from '@/interfaces'
import * as utils from '@/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supportedBridgeChainsDictionary } from '@/constants'

export const AlreadyPaidLinkView = ({ requestLinkData }: { requestLinkData: _consts.IRequestLinkData | undefined }) => {
    const [fulfillmentData, setFulfillmentData] = useState<any>(null)
    const [loading, setLoading] = useState<boolean>(false) // Dodano stan ładowania

    useEffect(() => {
        if (requestLinkData?.destinationChainFulfillmentHash) {
            setLoading(true)
            const url = `https://api.axelarscan.io/gmp/searchGMP?txHash=${requestLinkData.destinationChainFulfillmentHash}`
            fetch(url)
                .then((response) => response.json())
                .then(({ data }) => {
                    const txData = data[0]
                    const tokenDetails = consts.peanutTokenDetails.find((chain) =>
                        chain.name.toLowerCase().includes(txData.call.chain.toLowerCase())
                    )
                    const token = tokenDetails?.tokens.find((token) => {
                        return utils.compareTokenAddresses(token.address, txData.call.receipt.logs[0].address)
                    })
                    const explorerUrl = utils.getExplorerUrl(tokenDetails?.chainId ?? '')
                    const chainData = supportedBridgeChainsDictionary.find(
                        (data) => data.chain === txData.executed.chain
                    )
                    const destinationChainExplorerUrl = utils.getExplorerUrl(chainData.chainId)

                    setFulfillmentData({
                        fromAsset: token?.symbol,
                        fromChain: txData.call.chain,
                        fromAmount: txData.amount,
                        fromTransactionExplorer: explorerUrl + '/tx/' + txData.executed.sourceTransactionHash,
                        fromTransactionHash: txData.executed.sourceTransactionHash,
                        toTransactionExplorer: destinationChainExplorerUrl + '/tx/' + txData.executed.transactionHash,
                        toTransactionHash: txData.executed.transactionHash,
                    })
                    setLoading(false)
                })
                .catch((error) => {
                    console.error('Error fetching data:', error)
                    setLoading(false)
                })
        }
    }, [requestLinkData])

    return (
        <div className="flex w-full flex-col items-center justify-center gap-6 py-2 pb-20 text-center">
            <label className="text-h2">Sorry, this link has already been paid.</label>
            {!loading ? (
                <label className="text-left text-h9 font-normal">
                    Details:
                    <ul className="text-left">
                        <li>
                            Requested Amount: {requestLinkData?.tokenAmount}{' '}
                            {requestLinkData?.tokenSymbol ??
                                consts.peanutTokenDetails
                                    .find((chain) => chain.chainId === requestLinkData?.chainId)
                                    ?.tokens.find((token) =>
                                        utils.compareTokenAddresses(token.address, requestLinkData?.tokenAddress ?? '')
                                    )?.symbol}
                        </li>
                        <li>
                            Requested on:{' '}
                            {consts.supportedPeanutChains &&
                                consts.supportedPeanutChains.find((chain) => chain.chainId == requestLinkData?.chainId)
                                    ?.name}
                        </li>
                        {fulfillmentData && (
                            <>
                                <li>
                                    Fulfilled Amount: {fulfillmentData?.fromAmount} {fulfillmentData?.fromAsset}
                                </li>
                                <li>
                                    Fulfilled on:{' '}
                                    {fulfillmentData?.fromChain.charAt(0).toUpperCase() +
                                        fulfillmentData?.fromChain.slice(1).toLowerCase()}
                                </li>
                                <li>Payer Address: {requestLinkData?.payerAddress}</li>
                            </>
                        )}
                    </ul>
                    {fulfillmentData && (
                        <div className="flex w-full flex-col items-start justify-start py-2 text-h9 font-normal">
                            <div className="flex w-full flex-row items-center justify-start gap-1">
                                <label className="">Source chain:</label>
                                <Link
                                    className="cursor-pointer underline"
                                    href={fulfillmentData?.fromTransactionExplorer}
                                >
                                    {utils.shortenAddressLong(fulfillmentData?.fromTransactionHash ?? '')}
                                </Link>
                            </div>
                            <div className="flex w-full flex-row items-center justify-start gap-1">
                                <label className="">Axelar:</label>
                                <Link
                                    className="cursor-pointer underline"
                                    href={
                                        'https://axelarscan.io/gmp/' + requestLinkData?.destinationChainFulfillmentHash
                                    }
                                    target="_blank"
                                >
                                    {utils.shortenAddressLong(requestLinkData?.destinationChainFulfillmentHash ?? '')}
                                </Link>
                            </div>
                            <div className="flex w-full flex-row items-center justify-start gap-1">
                                <label className="">Destination Chain:</label>
                                <Link
                                    className="cursor-pointer underline"
                                    href={fulfillmentData?.toTransactionExplorer}
                                    target="_blank"
                                >
                                    {utils.shortenAddressLong(fulfillmentData?.toTransactionHash ?? '')}
                                </Link>
                            </div>
                        </div>
                    )}
                </label>
            ) : (
                <div>Loading...</div>
            )}
            <label className="text-h9 font-normal">
                We would like to hear from your experience. Hit us up on{' '}
                <a
                    className="cursor-pointer text-black underline dark:text-white"
                    target="_blank"
                    href="https://discord.gg/BX9Ak7AW28"
                >
                    Discord!
                </a>
            </label>
            <Link
                className="absolute bottom-0 flex h-20 w-[27rem] w-full flex-row items-center justify-start gap-2 border-t-[1px] border-black bg-purple-3  px-4.5 dark:text-black"
                href={'/send'}
            >
                <div className=" border border-n-1 p-0 px-1">
                    <Icon name="send" className="-mt-0.5" />
                </div>
                Make a payment yourself!
            </Link>
        </div>
    )
}

export default AlreadyPaidLinkView
