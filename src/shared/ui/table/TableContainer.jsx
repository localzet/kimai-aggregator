import { Card } from '@mantine/core'

export function TableContainer({ children, ...props }) {
    return (
        <Card {...props} bg="var(--mantine-color-body)" p={0}>
            {children}
        </Card>
    )
}

