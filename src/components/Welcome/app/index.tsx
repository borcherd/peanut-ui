'use client'
import { useEffect, useState } from 'react'
import { getCalApi } from '@calcom/embed-react'
import * as assets from '@/assets'

const texts = [
    { name: 'NFTs', iconURI: assets.PEANUT_NFT.src },
    {
        name: 'USDC',
        iconURI:
            'https://market-data-images.s3.us-east-1.amazonaws.com/tokenImages/0x10ca7e698fab4eb287d4d33b3886ae17a6d078fbda455cdd673cfec0ca8ef413.png',
    },
    {
        name: 'DAI',
        iconURI:
            'https://market-data-images.s3.us-east-1.amazonaws.com/tokenImages/0xf5ee3b6eb7079510c13204332c16b4475f68463e78e4a0c2546370efd6403a57.png',
    },
    {
        name: 'PEPE',
        iconURI:
            'https://market-data-images.s3.us-east-1.amazonaws.com/tokenImages/0x2c48f80cd5c716ff04af08a5b7f805ca9774dccd74fb42d52249b721fc739a8e.png',
    },
]

const generateConfetti = (iconURI: string) => {
    const confettiCount = 30
    const confettiElements = []
    for (let i = 0; i < confettiCount; i++) {
        const style = {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * -100}%`,
            animationDelay: `${Math.random() * 2}s`,
            backgroundImage: `url(${iconURI})`,
        }
        confettiElements.push(<div className="confetti-piece" style={style} key={i}></div>)
    }
    return confettiElements
}

export function Welcome() {
    useEffect(() => {
        ;(async function () {
            const cal = await getCalApi()
            cal('ui', {
                theme: 'dark',
                styles: { branding: { brandColor: '#ffffff' } },
                hideEventTypeDetails: false,
                layout: 'month_view',
            })
        })()
    }, [])

    const [currentText, setCurrentText] = useState(0)
    const [displayedText, setDisplayedText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [charIndex, setCharIndex] = useState(0)
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        const fullText = texts[currentText].name
        let timer: NodeJS.Timeout

        if (isDeleting) {
            if (charIndex > 0) {
                timer = setTimeout(() => {
                    setDisplayedText(fullText.substring(0, charIndex - 1))
                    setCharIndex(charIndex - 1)
                }, 150)
            } else {
                setIsDeleting(false)
                setCurrentText((prev) => (prev + 1) % texts.length)
                setShowConfetti(false)
            }
        } else {
            if (charIndex < fullText.length) {
                timer = setTimeout(() => {
                    setDisplayedText(fullText.substring(0, charIndex + 1))
                    setCharIndex(charIndex + 1)
                }, 150)
            } else {
                timer = setTimeout(() => setIsDeleting(true), 2000)
                setShowConfetti(true) // Show the confetti effect
            }
        }

        return () => clearTimeout(timer)
    }, [charIndex, isDeleting, currentText])

    return (
        <div className="bgMove from-main via-secondary to-tertiary flex min-h-[90vh] flex-col justify-between bg-gradient-to-r">
            <main className="mt-4 flex flex-grow flex-col items-center justify-center gap-4">
                <div className="relative flex flex-row items-center justify-center gap-2 text-2xl">
                    <span>Send</span>
                    <span className="relative flex items-center">{displayedText}</span>
                    <span> via Link</span>
                    {showConfetti && (
                        <div className="confetti-container">{generateConfetti(texts[currentText].iconURI)}</div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default Welcome
