import { Card, CardProps } from '@mantine/core'
import { ReactNode } from 'react'
import classes from './MetricCard.module.css'

interface MetricCardRootProps extends CardProps {
  children: ReactNode
}

export function MetricCardRoot({ className, ...props }: MetricCardRootProps) {
    return <Card className={`${classes.root} ${className || ''}`} withBorder {...props} />
}

