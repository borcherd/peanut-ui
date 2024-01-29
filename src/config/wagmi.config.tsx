import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'

import * as consts from '@/consts'
import { createConfig, fallback, http } from 'wagmi'
import { mainnet, sepolia } from '@wagmi/core/chains'

const metadata = {
    name: 'Peanut Protocol',
    description: 'Peanut Protocol webapp',
    url: 'https://peanut.to',
}

export const wagmiConfig = defaultWagmiConfig({
    chains: consts.chains,
    projectId: process.env.WC_PROJECT_ID ?? '',
    enableEmail: true,
    metadata,
})

const transports = [mainnet, sepolia].reduce(
    (acc, chain) => {
        acc[chain.id] = http()
        return acc
    },
    {} as Record<string, ReturnType<typeof http>>
)

export const wagmiCoreconfig = createConfig({
    chains: [mainnet, sepolia],
    transports: transports,
})

createWeb3Modal({
    wagmiConfig,
    chains: consts.chains,
    projectId: process.env.WC_PROJECT_ID ?? '',
    themeVariables: {
        '--w3m-border-radius-master': '0px',
        '--w3m-accent': 'white',
        '--w3m-color-mix': 'white',
    },
})
