import { Card, CardProps } from '@mantine/core'
import { ReactNode } from 'react'

interface TableContainerProps extends CardProps {
  children: ReactNode
}

export function TableContainer({ children, ...props }: TableContainerProps) {
    return (
        <Card {...props} bg="var(--mantine-color-body)" p={0}>
            {children}
        </Card>
    )
}

