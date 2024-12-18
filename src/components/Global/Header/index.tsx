'use client'
import React, {useEffect, useState, useCallback, useMemo} from 'react'
import { Box, Flex, Text, Stack, Collapse, useDisclosure } from '@chakra-ui/react'
import { useLottie, LottieOptions } from 'lottie-react'
import Link from 'next/link'

import { PEANUTMAN_LOGO, HAMBURGER_LOTTIE } from '@/assets'
import { shortenAddress } from '@/utils'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { breakpoints, emToPx } from '@/styles/theme'
import { NavItemBox, NavLink } from './components'
import { useAccountSubnames } from "@justaname.id/react";
import {peanutEnsDomain} from "@/config/justweb3.config";
import {useJustWeb3} from "@justweb3/widget";

const defaultLottieOptions: LottieOptions = {
    animationData: HAMBURGER_LOTTIE,
    loop: true,
    autoplay: false,
    rendererSettings: {
        preserveAspectRatio: 'xMidYMid slice',
    },
}

const defaultLottieStyle = {
    height: 24,
    width: 24,
}

const Header = () => {
    const { isOpen, onToggle, onClose } = useDisclosure()
    const [isOpenState, setIsOpenState] = useState<boolean>(false)

    useEffect(() => {
        const handleMediaQueryChange = () => {
            if (window.innerWidth >= emToPx(breakpoints.lg) && isOpen) {
                onClose()
                setIsOpenState(false)
            }
        }

        window.addEventListener('resize', handleMediaQueryChange)

        // Clean up the listener when the component unmounts
        return () => {
            window.removeEventListener('resize', handleMediaQueryChange)
        }
    }, [isOpen, onClose])

    return (
        <NavBarContainer>
            <Flex width={'100%'} alignItems={'center'} justifyContent={'space-between'} height={'16'}>
                <Box display={{ base: 'none', lg: 'flex' }} flexDirection={'row'} height="100%">
                    <div
                        className="flex h-full w-full cursor-pointer items-center px-2 font-bold uppercase hover:bg-white hover:text-black"
                        onClick={() => {
                            if (window?.location.pathname == '/') window?.location.reload()
                            else window.location.href = '/'
                        }}
                    >
                        <img src={PEANUTMAN_LOGO.src} alt="logo" className="ml-2 h-6 sm:h-9" />
                        <span className="inline px-3 sm:px-4">peanut protocol</span>
                    </div>
                </Box>
                <Box display={{ base: 'none', md: 'block' }} flexDirection={'row'} alignContent={'center'}>
                    <MenuLinks />
                </Box>
                <Box
                    display={{ base: 'flex', lg: 'none' }}
                    flexDirection={'row'}
                    justifyContent={'space-between'}
                    alignContent={'center'}
                    width={'100%'}
                    height={'100%'}
                >
                    <div
                        className="flex h-full w-full cursor-pointer items-center px-2 font-bold uppercase hover:bg-white hover:text-black"
                        onClick={() => {
                            if (window?.location.pathname == '/') window?.location.reload()
                            else window.location.href = '/'
                        }}
                    >
                        <img src={PEANUTMAN_LOGO.src} alt="logo" className="ml-2 h-6 " />
                        <span className="text-h5- inline px-2 ">peanut protocol</span>
                    </div>

                    <MenuToggle isOpen={isOpenState} toggle={onToggle} />
                </Box>
                <Box display={{ base: 'none', lg: 'block' }}>
                    <SocialLinks />
                </Box>
            </Flex>
            <Collapse unmountOnExit in={isOpen} animateOpacity className="w-full">
                <MenuLinks />
            </Collapse>
        </NavBarContainer>
    )
}

const MenuToggle = ({ toggle, isOpen }: { toggle: () => void; isOpen: boolean }) => {
    const { View: lottieView, goToAndStop } = useLottie(defaultLottieOptions, defaultLottieStyle)

    return (
        <Flex
            height={'100%'}
            justifyContent={'center'}
            alignContent={'center'}
            alignItems={'center'}
            display={{ base: 'flex', lg: 'none' }}
            onClick={() => {
                toggle()
                goToAndStop(isOpen ? 37 : 0, true)
            }}
            px={2}
        >
            {lottieView}
        </Flex>
    )
}

const MenuLink = ({
    route,
    title,
    isBeta = false,
    className = '',
}: {
    route: string
    title: string
    isBeta?: boolean
    className?: string
}) => {
    const router = useRouter()

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
            e.preventDefault()
            if (window?.location.pathname === route) {
                // Force a hard reload of the current page
                window.location.reload()
            } else {
                // For different routes, use router.push()
                router.push(route)
            }
        },
        [router, route]
    )

    return (
        <NavLink href={route} onClick={handleClick} className={className}>
            <Text display="block" className="flex items-center">
                {title}
            </Text>
            {isBeta && (
                <span className="relative top-[-1.5em] ml-1 text-[0.5rem] font-semibold uppercase text-purple-1">
                    BETA
                </span>
            )}
        </NavLink>
    )
}

const ToolsDropdown = () => {
    const [showMenu, setShowMenu] = useState<boolean>(false)

    return (
        <>
            <div className="relative hidden h-full sm:block">
                <NavItemBox>
                    <button
                        onMouseEnter={() => {
                            setShowMenu(true)
                        }}
                        onMouseLeave={() => {
                            setShowMenu(false)
                        }}
                        className="flex h-full w-full items-center justify-start py-2 uppercase sm:w-max sm:justify-center"
                    >
                        <div className="flex h-full w-full items-center justify-center px-8 lg:px-4 xl:px-8">tools</div>
                    </button>
                </NavItemBox>
                {showMenu && (
                    <div
                        onMouseEnter={() => {
                            setShowMenu(true)
                        }}
                        onMouseLeave={() => {
                            setShowMenu(false)
                        }}
                        className="absolute left-0 z-10 w-48 origin-top-right bg-black p-0 font-medium uppercase text-white no-underline shadow-lg transition-colors"
                    >
                        <MenuLink route={'/raffle/create'} title={'raffle'} />
                        <MenuLink route={'/batch/create'} title={'batch'} />
                        <MenuLink route={'/refund'} title={'refund'} />
                    </div>
                )}
            </div>
            <div className="relative block h-full w-full sm:hidden">
                <NavItemBox>
                    <button
                        onClick={() => {
                            setShowMenu(!showMenu)
                        }}
                        className="text-bold flex h-full w-full items-center justify-start rounded-md py-2 uppercase transition-colors hover:bg-n-4/50 hover:text-n-1"
                    >
                        <div className="flex h-full w-full items-center justify-start px-8 lg:px-4 xl:px-8">
                            <Text display="block">tools</Text>
                        </div>
                    </button>
                </NavItemBox>
                {showMenu && (
                    <div className="bg-black p-0 font-medium uppercase text-white no-underline shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="pl-4">
                            <MenuLink route={'/raffle/create'} title={'raffle'} />
                            <MenuLink route={'/batch/create'} title={'batch'} />
                            <MenuLink route={'/refund'} title={'refund'} />
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

const MenuLinks = () => {
    const { open: web3modalOpen } = useWeb3Modal()
    const { address, isConnected } = useAccount()

    return (
        <Stack
            align={{ base: 'start', md: 'center' }}
            justify={{ base: 'center', md: 'center' }}
            direction={{ base: 'column', md: 'row' }}
            pb={{ base: 4, md: 0 }}
            height="100%"
            gap={0}
        >
            <MenuLink route={'/send'} title={'send'} />
            <MenuLink route={'/request/create'} title={'request'} isBeta />
            <MenuLink route={'/cashout'} title={'cashout'} isBeta />
            <ToolsDropdown />
            <MenuLink route={'https://docs.peanut.to'} title={'docs'} />

            <Box
                display={{
                    base: 'flex',
                    lg: 'none',
                }}
                flexDirection="column"
                width={'100%'}
            >
                <NavItemBox>
                    <Link
                        href={'/profile'}
                        className=" flex h-full w-full items-center justify-start px-8 py-2 uppercase sm:hidden sm:w-max sm:justify-center lg:px-4 xl:px-8"
                    >
                        <Text display="block"> Profile</Text>
                    </Link>
                </NavItemBox>
                <NavItemBox>
                    <button
                        onClick={() => {
                            web3modalOpen()
                        }}
                        className="flex h-full w-full items-center justify-start px-8 py-2 uppercase sm:hidden sm:w-max sm:justify-center lg:px-4 xl:px-8"
                    >
                        <Text display="block text-nowrap">
                            {' '}
                            {isConnected ? shortenAddress(address ?? '') : 'Connect'}
                        </Text>
                    </button>
                </NavItemBox>
            </Box>
        </Stack>
    )
}

const SocialLinks = () => {
    const { open: web3modalOpen } = useWeb3Modal()
    const { address, isConnected } = useAccount()
    const { accountSubnames, isAccountSubnamesPending } = useAccountSubnames()
    const router = useRouter()
    const peanutSubname = useMemo(() => {
        return accountSubnames.find((subname) => subname.ens.endsWith(peanutEnsDomain))
    }, [accountSubnames])
    const { openEnsProfile } = useJustWeb3()

    return (
        <Stack direction={'row'} spacing={2} mr={2}>
            <Link href={'/profile'} className="no-underline">
                <button className="btn btn-large bg-white px-2 ">Profile</button>
            </Link>
            {
                !isConnected && (
                    <button
                        className="btn btn-large bg-white px-2"
                        onClick={() => {
                            web3modalOpen()
                        }}
                    >
                        Connect
                    </button>
                )
            }
            {
                isConnected && (
                        <button
                            className="btn btn-large bg-white px-2 py-2 gap-2"
                            onClick={() => {
                                if (peanutSubname) {
                                    openEnsProfile(peanutSubname.ens)
                                    return
                                }
                                router.push('/claim-subname')
                            }}
                        >
                            {
                                isAccountSubnamesPending ? 'Loading...' : peanutSubname?.ens ?? 'Claim ENS'
                            }

                            <div className={"bg-black h-full flex flex-col justify-center p-2 rounded-full"}
                                onClick={(event) => {
                                    web3modalOpen()
                                    event.stopPropagation()
                                }}
                            >
                                <span className={"text-primary text-xs"}>{shortenAddress(address ?? '')}</span>
                            </div>
                        </button>
                )
            }
        </Stack>
    )
}

const NavBarContainer = ({ children, ...props }: { children: React.ReactNode }) => {
    const themeBG = 'black'
    const themeColor = 'white'
    return (
        <Flex
            as="nav"
            align="center"
            justify="space-between"
            wrap="wrap"
            w="100%"
            bg={{ base: themeBG, md: themeBG }}
            color={{ base: themeColor, md: themeColor }}
            {...props}
            zIndex={9999} // always on top
            className="z-[9999] !m-0 border-b-2 border-n-1 !p-0 font-black"
        >
            {children}
        </Flex>
    )
}

export default Header
