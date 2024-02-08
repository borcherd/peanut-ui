import type { NextRequest } from 'next/server'
import { getRaffleAuthorisation } from '@squirrel-labs/peanut-sdk'
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const APIKey = process.env.PEANUT_API_KEY ?? ''

        const requiresRaffleCaptchaResponse = await getRaffleAuthorisation({
            APIKey,
            link: body.link,
            recipientAddress: body.recipientAddress,
            captchaResponse: body.captchaResponse,
            recipientName: body.recipientName,
        })

        return new Response(JSON.stringify(requiresRaffleCaptchaResponse), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    } catch (error) {
        console.error('Error in requiresRaffleCaptcha Route Handler:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}
