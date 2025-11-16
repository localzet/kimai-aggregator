import { Text, TextProps } from '@mantine/core'
import classes from './MetricCard.module.css'

interface MetricCardTextEmphasisProps extends Omit<TextProps, 'fw' | 'fz'> {
  children: React.ReactNode
}

export function MetricCardTextEmphasis({ className, ...props }: MetricCardTextEmphasisProps) {
    return <Text className={`${classes.textEmphasis} ${className || ''}`} {...props} />
}

