import type { NextRequest } from 'next/server'
import { submitLink } from '@squirrel-labs/peanut-sdk'
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const APIKey = process.env.PEANUT_API_KEY ?? ''

        const submitLinkResponse = await submitLink({
            creatorAddress: body.address,
            name: body.name,
            link: body.link,
            APIKey: APIKey,
            baseUrl: body.baseUrl,
        }) //TODO: do something with the response

        return new Response(JSON.stringify(submitLinkResponse), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    } catch (error) {
        console.error('Error in submitLinkResponse Route Handler:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
