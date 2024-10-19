import React from 'react'
import classNames from 'classnames'
import Loading from '../Global/Loading'

type ButtonVariant = 'purple' | 'purple-2' | 'dark' | 'stroke' | 'transparent-light' | 'transparent-dark'
type ButtonSize = 'small' | 'medium' | 'large' | 'xl' | 'xl-fixed'
type ButtonShape = 'default' | 'square'
type ShadowSize = '4' | '6' | '8'
type ShadowType = 'primary' | 'secondary'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    shape?: ButtonShape
    shadowSize?: ShadowSize
    shadowType?: ShadowType
    loading?: boolean
}

const buttonVariants: Record<ButtonVariant, string> = {
    purple: 'btn-purple',
    'purple-2': 'btn-purple-2',
    dark: 'btn-dark',
    stroke: 'btn-stroke',
    'transparent-light': 'btn-transparent-light',
    'transparent-dark': 'btn-transparent-dark',
}

const buttonSizes: Record<ButtonSize, string> = {
    small: 'btn-small',
    medium: 'btn-medium',
    large: 'btn-large',
    xl: 'btn-xl',
    'xl-fixed': 'btn-xl-fixed',
}

const buttonShadows: Record<ShadowType, Record<ShadowSize, string>> = {
    primary: {
        '4': 'btn-shadow-primary-4',
        '6': 'btn-shadow-primary-6',
        '8': 'btn-shadow-primary-8',
    },
    secondary: {
        '4': 'btn-shadow-secondary-4',
        '6': 'btn-shadow-secondary-6',
        '8': 'btn-shadow-secondary-8',
    },
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className,
    variant = 'purple',
    size,
    shape = 'default',
    shadowSize,
    shadowType = 'primary',
    loading,
    ...props
}) => {
    const buttonClasses = classNames(
        'btn w-full',
        buttonVariants[variant],
        size && buttonSizes[size],
        shape === 'square' && 'btn-square',
        shadowSize && buttonShadows[shadowType][shadowSize],
        className
    )

    return (
        <button className={buttonClasses} {...props}>
            {loading && <Loading />}
            {children}
        </button>
    )
}