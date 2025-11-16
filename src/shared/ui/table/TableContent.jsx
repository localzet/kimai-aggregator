import { CardSection } from '@mantine/core'
import { forwardRef } from 'react'

export const TableContent = forwardRef(({ children }, ref) => (
    <CardSection bg="var(--mantine-color-body)" ref={ref}>
        {children}
    </CardSection>
))

TableContent.displayName = 'TableContent'

