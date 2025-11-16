import { Text, TextProps } from '@mantine/core'
import classes from './MetricCard.module.css'

interface MetricCardTextMutedProps extends TextProps {
  children: React.ReactNode
}

export function MetricCardTextMuted({ className, ...props }: MetricCardTextMutedProps) {
    return <Text className={`${classes.textMuted} ${className || ''}`} {...props} />
}

