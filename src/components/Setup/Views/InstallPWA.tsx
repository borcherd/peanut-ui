import { Button, Card } from '@/components/0_Bruddle'
import { useEffect, useState } from 'react'
import { useSetupFlow } from '../context/SetupFlowContext'

const StepTitle = ({ text }: { text: string }) => <h3 className="font-bold">{text}</h3>

const InstallPWADesktopIcon = () => {
    return (
        <svg
            version="1.0"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 160.000000 160.000000"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}
        >
            <g transform="translate(0.000000,160.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                <path d="M271 1382 c-71 -38 -71 -40 -71 -482 0 -364 1 -398 18 -429 30 -55 71 -71 186 -71 l100 0 -32 -33 c-30 -30 -32 -38 -32 -100 l0 -67 360 0 360 0 0 67 c0 62 -2 70 -32 100 l-32 33 100 0 c168 0 204 36 204 202 l0 98 -50 0 -50 0 0 -100 0 -100 -500 0 -500 0 0 400 0 400 200 0 200 0 0 50 0 50 -198 0 c-172 0 -202 -2 -231 -18z" />
                <path d="M880 1148 l0 -253 -88 88 -88 87 -52 -53 -53 -54 175 -179 176 -179 176 179 175 179 -53 54 -52 53 -88 -87 -88 -88 0 253 0 252 -70 0 -70 0 0 -252z" />
            </g>
        </svg>
    )
}

let deferredPrompt: any = null

const ShareIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24px"
        height="24px"
        viewBox="0 0 24 24"
        className="relative -top-0.5 inline !h-5"
    >
        <g>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M11.4697 1.71967C11.7626 1.42678 12.2374 1.42678 12.5303 1.71967L16.2803 5.46967C16.5732 5.76256 16.5732 6.23744 16.2803 6.53033C15.9874 6.82322 15.5126 6.82322 15.2197 6.53033L12.75 4.06066V15.0469C12.75 15.4611 12.4142 15.7969 12 15.7969C11.5858 15.7969 11.25 15.4611 11.25 15.0469V4.06066L8.78033 6.53033C8.48744 6.82322 8.01256 6.82322 7.71967 6.53033C7.42678 6.23744 7.42678 5.76256 7.71967 5.46967L11.4697 1.71967ZM6.375 9.75C6.07663 9.75 5.79048 9.86853 5.5795 10.0795C5.36853 10.2905 5.25 10.5766 5.25 10.875V19.875C5.25 20.1734 5.36853 20.4595 5.5795 20.6705C5.79048 20.8815 6.07663 21 6.375 21H17.625C17.9234 21 18.2095 20.8815 18.4205 20.6705C18.6315 20.4595 18.75 20.1734 18.75 19.875V10.875C18.75 10.5766 18.6315 10.2905 18.4205 10.0795C18.2095 9.86853 17.9234 9.75 17.625 9.75H15.75C15.3358 9.75 15 9.41421 15 9C15 8.58579 15.3358 8.25 15.75 8.25H17.625C18.3212 8.25 18.9889 8.52656 19.4812 9.01884C19.9734 9.51113 20.25 10.1788 20.25 10.875V19.875C20.25 20.5712 19.9734 21.2389 19.4812 21.7312C18.9889 22.2234 18.3212 22.5 17.625 22.5H6.375C5.67881 22.5 5.01113 22.2234 4.51884 21.7312C4.02656 21.2389 3.75 20.5712 3.75 19.875V10.875C3.75 10.1788 4.02656 9.51113 4.51884 9.01884C5.01113 8.52656 5.67881 8.25 6.375 8.25H8.25C8.66421 8.25 9 8.58579 9 9C9 9.41421 8.66421 9.75 8.25 9.75H6.375Z"
                    fill="currentColor"
                />
            </svg>
        </g>
    </svg>
)

const InstallPWA = () => {
    const { handleNext } = useSetupFlow()
    const [canInstall, setCanInstall] = useState(false)
    const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop')
    const [canSkip, setCanSkip] = useState(false)
    const [skipTimer, setSkipTimer] = useState(20)

    useEffect(() => {
        // Store the install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault()
            deferredPrompt = e
            setCanInstall(true)
        })

        // Detect when PWA is installed
        window.addEventListener('appinstalled', () => {
            // Wait a moment to let the install complete
            setTimeout(() => {
                handleNext()
                // Try to open the PWA
                window.location.href = window.location.origin + '/home'
            }, 1000)
        })

        // Start the skip timer
        const timer = setInterval(() => {
            setSkipTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    setCanSkip(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        // Detect device type
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
        const isMobileDevice = /Android|webOS|iPad|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        )

        if (isIOSDevice) {
            setDeviceType('ios')
        } else if (isMobileDevice) {
            setDeviceType('android')
        } else {
            setDeviceType('desktop')
        }

        return () => clearInterval(timer)
    }, [handleNext])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        // Show the install prompt
        deferredPrompt.prompt()

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
            deferredPrompt = null
        }
    }

    const IOSInstructions = () => (
        <div className="flex flex-col gap-4">
            <div>
                <StepTitle text="Step 1: Open the Sharing Options" />
                <p>
                    Tap the share icon (<ShareIcon />) at the bottom of your screen and then "Add to Home Screen"
                </p>
            </div>
        </div>
    )

    const AndroidInstructions = () => (
        <div className="flex flex-col gap-4">
            {canInstall ? (
                <Button onClick={handleInstall} className="w-full">
                    Install Peanut Wallet
                </Button>
            ) : (
                <>
                    <div>
                        <StepTitle text="Step 1: Open the Menu" />
                        <p>Tap the three dots menu at the top of your screen.</p>
                    </div>

                    <div>
                        <StepTitle text="Step 2: Select 'Install App'" />
                        <p>Tap 'Add to Home Screen' or 'Install app' from the menu options.</p>
                    </div>
                </>
            )}
        </div>
    )

    const DesktopInstructions = () => (
        <div className="flex flex-col gap-4">
            {canInstall ? (
                <Button onClick={handleInstall} className="w-full">
                    <InstallPWADesktopIcon />
                    Install Peanut Wallet
                </Button>
            ) : (
                <>
                    <div>
                        <StepTitle text="Install on Desktop" />
                        <p>
                            Look for the install icon (<InstallPWADesktopIcon />) in your browser's address bar and
                            click it.
                        </p>
                    </div>
                </>
            )}
        </div>
    )

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <Card.Content>
                    {deviceType === 'ios' && <IOSInstructions />}
                    {deviceType === 'android' && <AndroidInstructions />}
                    {deviceType === 'desktop' && <DesktopInstructions />}
                </Card.Content>
            </Card>
            <Button
                onClick={(e) => {
                    e.preventDefault()
                    handleNext()
                }}
                variant="stroke"
                disabled={!canSkip}
                loading={!canSkip}
            >
                {canSkip ? 'Done' : ``}
            </Button>
        </div>
    )
}

export default InstallPWA
