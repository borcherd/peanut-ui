'use client'

import * as _consts from '../../Claim.consts'
import * as context from '@/context'
import { useContext, useEffect, useState } from 'react'
import Loading from '@/components/Global/Loading'
import * as _interfaces from '../../Claim.interfaces'
import * as _utils from '../../Claim.utils'
import * as interfaces from '@/interfaces'

import { useForm } from 'react-hook-form'
import Icon from '@/components/Global/Icon'
import MoreInfo from '@/components/Global/MoreInfo'
import CountryDropdown from '@/components/Global/CountrySelect'
import useClaimLink from '../../useClaimLink'
import * as utils from '@/utils'
import { Step, Steps, useSteps } from 'chakra-ui-steps'
import * as consts from '@/constants'
import { useAuth } from '@/context/authContext'
import IframeWrapper from '@/components/Global/IframeWrapper'

const steps = [
    { label: 'Step 1: Provide personal details' },
    { label: 'Step 2: Agree to TOS' },
    { label: 'Step 3: Complete KYC' },
    { label: 'Step 4: Link bank account' },
]

export const ConfirmClaimLinkIbanView = ({
    onPrev,
    onNext,
    offrampForm,
    setOfframpForm,
    claimLinkData,
    recipientType,
    setTransactionHash,
    tokenPrice,
    liquidationAddress,
    setLiquidationAddress,
    attachment,
    estimatedPoints,
    peanutAccount,
    setPeanutAccount,
    peanutUser,
    setPeanutUser,
    userType,
    userId,
    offrampChainAndToken,
    offrampXchainNeeded,
    initialKYCStep,
}: _consts.IClaimScreenProps) => {
    const [addressRequired, setAddressRequired] = useState<boolean>(false)
    const [customerObject, setCustomerObject] = useState<interfaces.KYCData | null>(null)
    const [tosLinkOpened, setTosLinkOpened] = useState<boolean>(false)
    const [kycLinkOpened, setKycLinkOpened] = useState<boolean>(false)
    const [errorState, setErrorState] = useState<{
        showError: boolean
        errorMessage: string
    }>({ showError: false, errorMessage: '' })
    const { setLoadingState, loadingState, isLoading } = useContext(context.loadingStateContext)
    const [initiatedProcess, setInitiatedProcess] = useState<boolean>(false)
    const { claimLink, claimLinkXchain } = useClaimLink()
    const { user, fetchUser, isFetchingUser, updateUserName, updateBridgeCustomerId, addAccount } = useAuth()

    //utils.convertPersonaUrl(
    //    'https://bridge.withpersona.com/verify?inquiry-template-id=itmpl_NtHYpb9AbEYCPxGo5iRbc9d2&fields[developer_id]=fe9265ca-76b1-4911-bdb1-bb5c64f10921&fields[iqt_token]=46f7565fe2ba42843b957cec6d783e48f85dff6d6ea56cf5753634b09a3214e8&reference-id=c03f85dd-97cb-4438-b595-2545eb4a34c3&redirect-uri=http%3A%2F%2Flocalhost%3A3000'
    //)

    const [iframeOptions, setIframeOptions] = useState<{
        src: string
        visible: boolean
        onClose: () => void
    }>({
        src: '',
        visible: false,
        onClose: () => {
            setIframeOptions({ ...iframeOptions, visible: false })
        },
    })

    const {
        register: registerOfframp,
        watch: watchOfframp,
        formState: { errors },
    } = useForm<_consts.IOfframpForm>({
        mode: 'onChange',
        defaultValues: offrampForm,
    })

    const {
        register: registerAccount,
        formState: { errors: accountErrors },
        watch: accountFormWatch,
        setValue: setAccountFormValue,
        setError: setAccountFormError,
    } = useForm({
        mode: 'onChange',
        defaultValues: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
            accountNumber: offrampForm.recipient,
            routingNumber: '',
            BIC: '',
            type: recipientType,
        },
    })

    const handleEmail = async (inputFormData: _consts.IOfframpForm) => {
        setOfframpForm(inputFormData)
        setActiveStep(0)
        // setInitiatedProcess(true)
        setLoadingState('Getting profile')

        // TODO: add validation

        try {
            console.log('inputFormData:', inputFormData)

            if (userType === 'NEW') {
                const userRegisterResponse = await fetch('/api/peanut/user/register-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: inputFormData.email,
                        password: inputFormData.password,
                        userId: userId,
                    }),
                })

                const userRegister = await userRegisterResponse.json()

                // If user already exists, login
                // TODO: remove duplicate code
                if (userRegisterResponse.status === 409) {
                    console.log(userRegister.userId)
                    const userLoginResponse = await fetch('/api/peanut/user/login-user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: inputFormData.email,
                            password: inputFormData.password,
                            userId: userRegister.userId,
                        }),
                    })
                    const userLogin = await userLoginResponse.json()
                    if (userLoginResponse.status !== 200) {
                        console.log(userLogin)
                        if (userLogin === 'Invalid email format') {
                            errors.email = {
                                message: 'Invalid email format',
                                type: 'validate',
                            }
                        }
                        if (userLogin === 'Invalid email, userId') {
                            errors.email = {
                                message: 'Incorrect email',
                                type: 'validate',
                            }
                        } else if (userLogin === 'Invalid password') {
                            errors.password = {
                                message: 'Invalid password',
                                type: 'validate',
                            }
                        }

                        return
                    }
                }
            } else if (userType === 'EXISTING') {
                const userLoginResponse = await fetch('/api/peanut/user/login-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: inputFormData.email,
                        password: inputFormData.password,
                        userId: userId,
                    }),
                })
                const userLogin = await userLoginResponse.json()

                if (userLoginResponse.status !== 200) {
                    if (userLogin === 'Invalid email format') {
                        errors.email = {
                            message: 'Invalid email format',
                            type: 'validate',
                        }
                    }
                    if (userLogin === 'Invalid email, userId') {
                        errors.email = {
                            message: 'Incorrect email',
                            type: 'validate',
                        }
                    } else if (userLogin === 'Invalid password') {
                        errors.password = {
                            message: 'Invalid password',
                            type: 'validate',
                        }
                    }

                    return
                }

                setLoadingState('Getting KYC status')
            }

            await fetchUser()

            if (user?.user?.bridge_customer_id) {
                if (
                    user?.accounts.find(
                        (account) =>
                            account.account_identifier.toLowerCase().replaceAll(' ', '') ===
                            inputFormData.recipient.toLowerCase().replaceAll(' ', '')
                    )
                ) {
                    setActiveStep(4)
                } else {
                    setActiveStep(3)
                }
            } else {
                let data = await _utils.getUserLinks(inputFormData)
                setCustomerObject(data)

                console.log(data)

                let { tos_status: tosStatus, kyc_status: kycStatus } = data

                if (tosStatus !== 'approved') {
                    goToNext()
                    return
                }

                if (kycStatus !== 'approved') {
                    setActiveStep(2)
                    return
                }
                recipientType === 'us' && setAddressRequired(true)
            }
        } catch (error: any) {
            console.error('Error during the submission process:', error)
            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })
        } finally {
            setLoadingState('Idle')
        }
    }

    const handleTOSStatus = async () => {
        try {
            // Handle TOS status

            let _customerObject
            console.log(offrampForm)

            if (!customerObject) {
                _customerObject = await _utils.getUserLinks(offrampForm)
                setCustomerObject(_customerObject)
            } else {
                _customerObject = customerObject
            }

            const { tos_status: tosStatus, id, tos_link } = _customerObject

            console.log('tosStatus:', tosStatus)

            if (tosStatus !== 'approved') {
                setLoadingState('Awaiting TOS confirmation')

                console.log('Awaiting TOS confirmation...')
                setIframeOptions({ ...iframeOptions, src: tos_link, visible: true })
                await _utils.awaitStatusCompletion(
                    id,
                    'tos',
                    tosStatus,
                    tos_link,
                    setTosLinkOpened,
                    setKycLinkOpened,
                    tosLinkOpened,
                    kycLinkOpened
                )
            } else {
                console.log('TOS already approved.')
            }
            setLoadingState('Idle')
            goToNext()
        } catch (error) {
            console.error('Error during the submission process:', error)

            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })

            setLoadingState('Idle')
        } finally {
            setLoadingState('Idle')
        }
    }

    const handleKYCStatus = async () => {
        try {
            let _customerObject
            if (!customerObject) {
                _customerObject = await _utils.getUserLinks(offrampForm)
                setCustomerObject(_customerObject)
            } else {
                _customerObject = customerObject
            }
            const { kyc_status: kycStatus, id, kyc_link } = _customerObject
            if (kycStatus === 'under_review') {
                setErrorState({
                    showError: true,
                    errorMessage: 'KYC under review',
                })
            } else if (kycStatus === 'rejected') {
                setErrorState({
                    showError: true,
                    errorMessage: 'KYC rejected',
                })
            } else if (kycStatus !== 'approved') {
                setLoadingState('Awaiting KYC confirmation')
                console.log('Awaiting KYC confirmation...')
                setIframeOptions({ ...iframeOptions, src: utils.convertPersonaUrl(kyc_link), visible: true })
                await _utils.awaitStatusCompletion(
                    id,
                    'kyc',
                    kycStatus,
                    kyc_link,
                    setTosLinkOpened,
                    setKycLinkOpened,
                    tosLinkOpened,
                    kycLinkOpened
                )
            } else {
                console.log('KYC already approved.')
            }

            // Get customer ID
            const customer = await _utils.getStatus(_customerObject.id, 'customer_id')
            setCustomerObject({ ..._customerObject, customer_id: customer.customer_id })

            const { email, name } = watchOfframp()

            // Update peanut user with bridge customer id
            const updatedUser = await updateBridgeCustomerId(customer.customer_id)
            console.log('updatedUser:', updatedUser)

            recipientType === 'us' && setAddressRequired(true)
            setLoadingState('Idle')

            goToNext()
        } catch (error) {
            console.error('Error during the submission process:', error)

            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })

            setLoadingState('Idle')
        } finally {
            setLoadingState('Idle')
        }
    }

    const handleSubmitLinkIban = async () => {
        const formData = accountFormWatch()
        const isFormValid = _utils.validateAccountFormData(formData, setAccountFormError)

        if (!isFormValid) {
            console.log('Form is invalid')
            return
        }

        try {
            if (recipientType === 'iban') setLoadingState('Linking IBAN')
            else if (recipientType === 'us') setLoadingState('Linking account')

            const customerId = customerObject?.customer_id ?? user?.user?.bridge_customer_id
            const accountType = formData.type
            const accountDetails =
                accountType === 'iban'
                    ? {
                          accountNumber: formData.accountNumber,
                          bic: formData.BIC,
                          country: _utils.getThreeCharCountryCodeFromIban(formData.accountNumber),
                      }
                    : { accountNumber: formData.accountNumber, routingNumber: formData.routingNumber }
            const address = {
                street: formData.street,
                city: formData.city,
                country: formData.country ?? 'BEL',
                state: formData.state,
                postalCode: formData.postalCode,
            }
            const accountOwnerName = offrampForm.name

            if (!customerId) {
                throw new Error('Customer ID is missing')
            }

            const data = await _utils.createExternalAccount(
                customerId,
                accountType as 'iban' | 'us',
                accountDetails,
                address,
                accountOwnerName
            )

            const pAccount = await _utils.createAccount(
                user?.user?.userId ?? '',
                customerId,
                data.id,
                accountType,
                formData.accountNumber.replaceAll(' ', ''),
                address
            )

            setPeanutAccount(pAccount)

            const liquidationAddressDetails = await _utils.createLiquidationAddress(
                customerId,
                offrampChainAndToken.chain,
                offrampChainAndToken.token,
                '42f8dce2-83b3-454e-b7c9-25384bedcfe8',
                recipientType === 'iban' ? 'sepa' : 'ach',
                recipientType === 'iban' ? 'eur' : 'usd'
            )

            setLiquidationAddress(liquidationAddressDetails)
            setActiveStep(3)
            setAddressRequired(false)
            setLoadingState('Idle')
        } catch (error) {
            console.error('Error during the submission process:', error)
            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })

            setLoadingState('Idle')
        }
    }

    const handleSubmitTransfer = async () => {
        try {
            const formData = accountFormWatch()
            setLoadingState('Submitting Offramp')
            console.log('liquidationAddressInfo:', liquidationAddress)
            if (!liquidationAddress) return
            const chainId = _utils.getChainIdFromBridgeChainName(offrampChainAndToken.chain) ?? ''
            const tokenAddress =
                _utils.getTokenAddressFromBridgeTokenName(chainId ?? '10', offrampChainAndToken.token) ?? ''
            console.log({
                offrampXchainNeeded,
                offrampChainAndToken,
                liquidationAddress,
                claimLinkData,
                chainId,
                tokenAddress,
            })

            let hash
            if (offrampXchainNeeded) {
                const chainId = _utils.getChainIdFromBridgeChainName(offrampChainAndToken.chain) ?? ''
                const tokenAddress =
                    _utils.getTokenAddressFromBridgeTokenName(chainId ?? '10', offrampChainAndToken.token) ?? ''
                hash = await claimLinkXchain({
                    address: liquidationAddress.address,
                    link: claimLinkData.link,
                    destinationChainId: chainId,
                    destinationToken: tokenAddress,
                })
            } else {
                hash = await claimLink({
                    address: liquidationAddress.address,
                    link: claimLinkData.link,
                })
            }

            console.log(hash)

            if (hash) {
                utils.saveOfframpLinkToLocalstorage({
                    data: {
                        ...claimLinkData,
                        depositDate: new Date(),
                        USDTokenPrice: tokenPrice,
                        points: estimatedPoints,
                        txHash: hash,
                        message: attachment.message ? attachment.message : undefined,
                        attachmentUrl: attachment.attachmentUrl ? attachment.attachmentUrl : undefined,
                        liquidationAddress: liquidationAddress.address,
                        recipientType: recipientType,
                        accountNumber: formData.accountNumber,
                        bridgeCustomerId: peanutUser.bridge_customer_id,
                        bridgeExternalAccountId: peanutAccount.bridge_account_id,
                        peanutCustomerId: peanutUser.user_id,
                        peanutExternalAccountId: peanutAccount.account_id,
                    },
                })
                setTransactionHash(hash)
                console.log('Transaction hash:', hash)
                setLoadingState('Idle')
                onNext()
            }
        } catch (error) {
            console.error('Error during the submission process:', error)

            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })
            setLoadingState('Idle')
        }
    }

    useEffect(() => {
        if (liquidationAddress) {
            setActiveStep(4)
        }
    }, [liquidationAddress])

    const {
        setStep: setActiveStep,
        activeStep,
        nextStep: goToNext,
    } = useSteps({
        initialStep: initialKYCStep,
    })

    const renderComponent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <div className="flex w-full flex-col items-start justify-center gap-2">
                        <>
                            <input
                                {...registerOfframp('name', { required: 'This field is required' })}
                                className={`custom-input custom-input-xs ${errors.name ? 'border border-red' : ''}`}
                                placeholder="Full name"
                                disabled={initiatedProcess || activeStep > 0}
                            />
                            {errors.name && <span className="text-h9 font-normal text-red">{errors.name.message}</span>}
                        </>
                        {/* TODO: make this not required if is already defined in user object */}

                        <input
                            {...registerOfframp('email', { required: 'This field is required' })}
                            className={`custom-input custom-input-xs ${errors.email ? 'border border-red' : ''}`}
                            placeholder="Email"
                            type="email"
                            disabled={initiatedProcess || activeStep > 0}
                        />
                        {errors.email && <span className="text-h9 font-normal text-red">{errors.email.message}</span>}

                        <input
                            {...registerOfframp('password', { required: 'This field is required' })}
                            className={`custom-input custom-input-xs ${errors.password ? 'border border-red' : ''}`}
                            placeholder="Password"
                            type="password"
                            disabled={initiatedProcess || activeStep > 0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleEmail(watchOfframp())
                                }
                            }}
                        />
                        {errors.password && (
                            <span className="text-h9 font-normal text-red">{errors.password.message}</span>
                        )}

                        <button
                            onClick={() => {
                                handleEmail(watchOfframp())
                            }}
                            className="btn btn-purple h-8 w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex w-full flex-row items-center justify-center gap-2">
                                    <Loading /> {loadingState}
                                </div>
                            ) : (
                                'Next'
                            )}
                        </button>
                    </div>
                )

            case 1:
                return (
                    <div className="mb-2 flex flex-col items-center justify-center gap-2">
                        <button
                            onClick={() => {
                                handleTOSStatus()
                            }}
                            className="btn btn-purple h-8 w-full"
                        >
                            {isLoading ? 'Reopen TOS' : 'Open TOS'}
                        </button>
                        {isLoading && (
                            <span className="flex flex-row items-center justify-center gap-1">
                                <Loading />
                                Awaiting TOS confirmation
                            </span>
                        )}
                    </div>
                )

            case 2:
                return (
                    <div className="mb-2 flex flex-col items-center justify-center gap-2">
                        <button
                            onClick={() => {
                                handleKYCStatus()
                            }}
                            className="btn btn-purple h-8 w-full"
                        >
                            {isLoading ? 'Reopen KYC' : 'Open KYC'}
                        </button>
                        {isLoading && (
                            <span className="flex flex-row items-center justify-center gap-1">
                                <Loading />
                                Awaiting KYC confirmation
                            </span>
                        )}
                    </div>
                )

            case 3:
                return (
                    <div className="flex w-full flex-col items-start justify-center gap-2">
                        <input
                            {...registerAccount('accountNumber', {
                                required: 'This field is required',
                            })}
                            className={`custom-input ${accountErrors.accountNumber ? 'border border-red' : ''}`}
                            placeholder={recipientType === 'iban' ? 'IBAN' : 'Account number'}
                        />
                        {accountErrors.accountNumber && (
                            <span className="text-h9 font-normal text-red">{accountErrors.accountNumber.message}</span>
                        )}
                        {recipientType === 'iban' ? (
                            <>
                                <input
                                    {...registerAccount('BIC', {
                                        required: addressRequired ? 'This field is required' : false,
                                    })}
                                    className={`custom-input ${accountErrors.BIC ? 'border border-red' : ''}`}
                                    placeholder="BIC"
                                />
                                {accountErrors.BIC && (
                                    <span className="text-h9 font-normal text-red">{accountErrors.BIC.message}</span>
                                )}
                            </>
                        ) : (
                            <>
                                <input
                                    {...registerAccount('routingNumber', {
                                        required: addressRequired ? 'This field is required' : false,
                                    })}
                                    className={`custom-input ${accountErrors.routingNumber ? 'border border-red' : ''}`}
                                    placeholder="Routing number"
                                />
                                {accountErrors.routingNumber && (
                                    <span className="text-h9 font-normal text-red">
                                        {accountErrors.routingNumber.message}
                                    </span>
                                )}
                            </>
                        )}
                        {addressRequired && (
                            <div className="flex w-full flex-col items-start justify-center gap-2">
                                <input
                                    {...registerAccount('street', {
                                        required: addressRequired ? 'This field is required' : false,
                                    })}
                                    className={`custom-input ${accountErrors.street ? 'border border-red' : ''}`}
                                    placeholder="Your street and number"
                                />
                                {accountErrors.street && (
                                    <span className="text-h9 font-normal text-red">{accountErrors.street.message}</span>
                                )}

                                <div className="mx-0 flex w-full flex-row items-start justify-between gap-2">
                                    <div className="flex w-full flex-col items-start justify-center gap-2">
                                        <input
                                            {...registerAccount('city', {
                                                required: addressRequired ? 'This field is required' : false,
                                            })}
                                            className={`custom-input ${accountErrors.city ? 'border border-red' : ''}`}
                                            placeholder="Your city"
                                        />
                                        {accountErrors.city && (
                                            <span className="text-h9 font-normal text-red">
                                                {accountErrors.city.message}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex w-full flex-col items-center justify-center gap-2">
                                        <input
                                            {...registerAccount('postalCode', {
                                                required: addressRequired ? 'This field is required' : false,
                                            })}
                                            className={`custom-input ${accountErrors.postalCode ? 'border border-red' : ''}`}
                                            placeholder="Your postal code"
                                        />
                                        {accountErrors.postalCode && (
                                            <span className="text-h9 font-normal text-red">
                                                {accountErrors.postalCode.message}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="mx-0 flex w-full flex-row items-start justify-between gap-2">
                                    <div className="flex w-full flex-col items-start justify-center gap-2">
                                        <input
                                            {...registerAccount('state', {
                                                required: addressRequired ? 'This field is required' : false,
                                            })}
                                            className={`custom-input ${accountErrors.state ? 'border border-red' : ''}`}
                                            placeholder="Your state "
                                        />
                                        {accountErrors.state && (
                                            <span className="text-h9 font-normal text-red">
                                                {accountErrors.state.message}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex w-full flex-col items-center justify-center gap-2">
                                        <CountryDropdown
                                            value={accountFormWatch('country')}
                                            onChange={(value: any) => {
                                                setAccountFormValue('country', value, { shouldValidate: true })
                                                setAccountFormError('country', { message: undefined })
                                            }}
                                            error={accountErrors.country?.message}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                handleSubmitLinkIban()
                            }}
                            className="btn btn-purple h-8 w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex w-full flex-row items-center justify-center gap-2">
                                    <Loading /> {loadingState}
                                </div>
                            ) : (
                                'Confirm'
                            )}
                        </button>{' '}
                    </div>
                )
        }
    }

    return (
        <div className="flex w-full flex-col items-center justify-center gap-6 px-2  text-center">
            <p className="text-h8 font-normal">
                This is your first time using a bank account on peanut. You'll have to pass a brief KYC check to
                proceed.
            </p>
            <Steps
                variant={'circles'}
                orientation="vertical"
                colorScheme="purple"
                activeStep={activeStep}
                sx={{
                    '& .cui-steps__vertical-step': {
                        '&:last-of-type': {
                            paddingBottom: '0px',
                            gap: '0px',
                        },
                    },
                    '& .cui-steps__vertical-step-content': {
                        '&:last-of-type': {
                            minHeight: '8px',
                        },
                    },
                }}
            >
                {steps.map(({ label }, index) => (
                    <Step label={label} key={label}>
                        <div className="relative z-10 flex w-full items-center justify-center pr-[40px]">
                            {renderComponent()}
                        </div>
                    </Step>
                ))}
            </Steps>
            {activeStep === 4 && (
                <div className="flex w-full flex-col items-center justify-center gap-2">
                    <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                        <div className="flex w-max  flex-row items-center justify-center gap-1">
                            <Icon name={'profile'} className="h-4 fill-gray-1" />
                            <label className="font-bold">Name</label>
                        </div>
                        <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                            {offrampForm.name}
                        </span>
                    </div>
                    <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                        <div className="flex w-max  flex-row items-center justify-center gap-1">
                            <Icon name={'email'} className="h-4 fill-gray-1" />
                            <label className="font-bold">Email</label>
                        </div>
                        <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                            {offrampForm.email}
                        </span>
                    </div>

                    <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                        <div className="flex w-max  flex-row items-center justify-center gap-1">
                            <Icon name={'bank'} className="h-4 fill-gray-1" />
                            <label className="font-bold">Bank account</label>
                        </div>
                        <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                            {accountFormWatch('accountNumber')}
                        </span>
                    </div>

                    <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                        <div className="flex w-max  flex-row items-center justify-center gap-1">
                            <Icon name={'forward'} className="h-4 fill-gray-1" />
                            <label className="font-bold">Route</label>
                        </div>
                        {offrampXchainNeeded ? (
                            <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                                {
                                    consts.supportedPeanutChains.find(
                                        (chain) => chain.chainId === claimLinkData.chainId
                                    )?.name
                                }{' '}
                                <Icon name={'arrow-next'} className="h-4 fill-gray-1" /> Optimism{' '}
                                <Icon name={'arrow-next'} className="h-4 fill-gray-1" /> {recipientType.toUpperCase()}{' '}
                                <MoreInfo text={`Wait, crypto can be converted to real money??? How cool!`} />
                            </span>
                        ) : (
                            <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                                Offramp <Icon name={'arrow-next'} className="h-4 fill-gray-1" />{' '}
                                {recipientType.toUpperCase()}{' '}
                                <MoreInfo text={`Wait, crypto can be converted to real money??? How cool!`} />
                            </span>
                        )}
                    </div>
                    <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                        <div className="flex w-max  flex-row items-center justify-center gap-1">
                            <Icon name={'gas'} className="h-4 fill-gray-1" />
                            <label className="font-bold">Fee</label>
                        </div>
                        <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                            $0
                            <MoreInfo text={'Fees are on us, enjoy!'} />
                        </span>
                    </div>
                    <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                        <div className="flex w-max  flex-row items-center justify-center gap-1">
                            <Icon name={'transfer'} className="h-4 fill-gray-1" />
                            <label className="font-bold">Total</label>
                        </div>
                        <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                            ${utils.formatTokenAmount(tokenPrice * parseFloat(claimLinkData.tokenAmount))}{' '}
                            <MoreInfo text={'Woop Woop free offramp!'} />
                        </span>
                    </div>
                </div>
            )}
            <div className="flex w-full flex-col items-center justify-center gap-2">
                {activeStep === 4 && (
                    <button
                        onClick={() => {
                            handleSubmitTransfer()
                        }}
                        className="btn-purple btn-xl"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex w-full flex-row items-center justify-center gap-2">
                                <Loading /> {loadingState}
                            </div>
                        ) : (
                            'Claim now'
                        )}
                    </button>
                )}
                <button
                    className="btn btn-xl dark:border-white dark:text-white"
                    onClick={() => {
                        onPrev()
                        setActiveStep(0)
                        setErrorState({ showError: false, errorMessage: '' })
                        setOfframpForm({ email: '', name: '', recipient: '', password: '' })
                        setAccountFormValue('accountNumber', '')
                        setAccountFormValue('BIC', '')
                        setAccountFormValue('routingNumber', '')
                        setAccountFormValue('street', '')
                        setAccountFormValue('city', '')
                        setAccountFormValue('state', '')
                        setAccountFormValue('postalCode', '')
                        setAccountFormValue('country', '')
                        setPeanutAccount({ account_id: '', bridge_account_id: '', user_id: '' })
                        setPeanutUser({ user_id: '', bridge_customer_id: '' })
                        setLiquidationAddress(undefined)
                    }} // TODO: add reset of everything
                    disabled={isLoading}
                    type="button"
                >
                    Return
                </button>
                {errorState.showError && errorState.errorMessage === 'KYC under review' ? (
                    <div className="text-center">
                        <label className=" text-h8 font-normal text-red ">
                            KYC is under review, we might need additional documents. Please reach out via{' '}
                            <a href="https://discord.gg/uWFQdJHZ6j" target="_blank" className="underline">
                                discord
                            </a>{' '}
                            to finish the process.
                        </label>
                    </div>
                ) : errorState.errorMessage === 'KYC rejected' ? (
                    <div className="text-center">
                        <label className=" text-h8 font-normal text-red ">
                            KYC has been rejected. Please reach out via{' '}
                            <a href="https://discord.gg/uWFQdJHZ6j" target="_blank" className="underline">
                                {' '}
                                discord{' '}
                            </a>{' '}
                            .
                        </label>
                    </div>
                ) : (
                    <div className="text-center">
                        <label className=" text-h8 font-normal text-red ">{errorState.errorMessage}</label>
                    </div>
                )}
            </div>
            <IframeWrapper
                src={iframeOptions.src}
                visible={iframeOptions.visible}
                onClose={iframeOptions.onClose}
                style={{ width: '100%', height: '500px', border: 'none' }}
            />
        </div>
    )
}
