'use client'
import { useCallback, useRef } from 'react'
import { isIBAN } from 'validator'
import ValidatedInput, { InputUpdate } from '@/components/Global/ValidatedInput'
import * as utils from '@/utils'
import { isAddress } from 'viem'
import * as interfaces from '@/interfaces'
import { useRecentRecipients } from '@/hooks/useRecentRecipients'
import { sanitizeBankAccount, formatIBANDisplay, formatUSAccountDisplay } from '@/utils/format.utils'

type GeneralRecipientInputProps = {
    className?: string
    placeholder: string
    recipient: { name: string | undefined; address: string }
    onUpdate: (update: GeneralRecipientUpdate) => void
    infoText?: string
}

export type GeneralRecipientUpdate = {
    recipient: { name: string | undefined; address: string }
    type: interfaces.RecipientType
    isValid: boolean
    isChanging: boolean
    errorMessage: string
}

const GeneralRecipientInput = ({
    placeholder,
    recipient,
    onUpdate,
    className,
    infoText,
}: GeneralRecipientInputProps) => {
    const recipientType = useRef<interfaces.RecipientType>('address')
    const errorMessage = useRef('')
    const resolvedAddress = useRef('')
    const { getSuggestions, addRecipient } = useRecentRecipients()

    const checkAddress = useCallback(async (recipient: string): Promise<boolean> => {
        try {
            let isValid = false
            let type: interfaces.RecipientType = 'address'

            const sanitizedInput = sanitizeBankAccount(recipient)

            if (isIBAN(sanitizedInput)) {
                type = 'iban'
                isValid = await utils.validateBankAccount(sanitizedInput)
                if (!isValid) errorMessage.current = 'Invalid IBAN, country not supported'
            } else if (/^[0-9]{1,17}$/.test(sanitizedInput)) {
                type = 'us'
                isValid = true
            } else if (recipient.toLowerCase().endsWith('.eth')) {
                type = 'ens'
                const address = await utils.resolveFromEnsName(recipient.toLowerCase())
                if (address) {
                    resolvedAddress.current = address
                    isValid = true
                } else {
                    errorMessage.current = 'ENS name not found'
                    isValid = false
                }
            } else {
                type = 'address'
                isValid = isAddress(recipient, { strict: false })
                if (!isValid) errorMessage.current = 'Invalid Ethereum address'
            }
            recipientType.current = type
            return isValid
        } catch (error) {
            console.error('Error while validating recipient input field:', error)
            return false
        }
    }, [])

    const onInputUpdate = useCallback(
        (update: InputUpdate) => {
            let _update: GeneralRecipientUpdate
            if (update.isValid) {
                errorMessage.current = ''
                _update = {
                    recipient:
                        'ens' === recipientType.current
                            ? { address: resolvedAddress.current, name: update.value }
                            : { address: update.value, name: undefined },
                    type: recipientType.current,
                    isValid: true,
                    isChanging: update.isChanging,
                    errorMessage: '',
                }
                addRecipient(update.value, recipientType.current)
            } else {
                resolvedAddress.current = ''
                _update = {
                    recipient: { address: update.value, name: undefined },
                    type: recipientType.current,
                    isValid: false,
                    isChanging: update.isChanging,
                    errorMessage: errorMessage.current,
                }
            }
            onUpdate(_update)
        },
        [addRecipient]
    )

    const formatDisplayValue = (value: string) => {
        if (recipientType.current === 'iban') {
            return formatIBANDisplay(value)
        } else if (recipientType.current === 'us') {
            return formatUSAccountDisplay(value)
        }
        return value
    }

    return (
        <ValidatedInput
            label="To"
            value={recipient.name ?? recipient.address}
            placeholder={placeholder}
            validate={checkAddress}
            onUpdate={onInputUpdate}
            className={className}
            autoComplete="on"
            name="bank-account"
            suggestions={getSuggestions(recipientType.current)}
            infoText={infoText}
            formatDisplayValue={formatDisplayValue}
        />
    )
}

export default GeneralRecipientInput
