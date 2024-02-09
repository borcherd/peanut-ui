import * as global_components from '@/components/global'
import * as components from '@/components'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Mantle Red packet',
    description: 'Create a Giga Mantle Red Packet',

    icons: {
        icon: '/logo-favicon.png',
    },
    openGraph: {
        images: [
            {
                url: '/metadata-img.png',
            },
        ],
    },
}

export default function CreateGigaPacket() {
    return (
        <global_components.PageWrapper bgColor="bg-red">
            <components.GigaPacket />
        </global_components.PageWrapper>
    )
}
