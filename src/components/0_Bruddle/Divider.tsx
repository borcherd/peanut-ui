import classNames from 'classnames'

type DividerProps = {
    text?: string
} & React.HTMLAttributes<HTMLDivElement>

const Divider = ({ text, className, ...props }: DividerProps) => {
    return (
        <div className={classNames('flex w-full items-center justify-center', className)} {...props}>
            <span className="h-0.25 w-full max-w-[8.25rem] bg-n-1 dark:bg-white"></span>
            {text && <span className="mx-4 text-sm font-medium">{text}</span>}
            <span className="h-0.25 w-full max-w-[8.25rem] bg-n-1 dark:bg-white"></span>
        </div>
    )
}

export default Divider
