import { Table } from '@mantine/core'

export default {
    Table: Table.extend({
        defaultProps: {
            highlightOnHover: true,
            striped: true
        },
        styles: {
            thead: {
                background: 'linear-gradient(135deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-6) 100%)',
                borderBottom: '1px solid var(--mantine-color-dark-4)'
            },
            tbody: {
                '& tr': {
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
                        transform: 'translateX(2px)'
                    }
                },
                '& tr[data-striped]': {
                    background: 'linear-gradient(135deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-8) 100%)'
                }
            },
            th: {
                fontWeight: 600,
                textTransform: 'uppercase',
                fontSize: 'var(--mantine-font-size-xs)',
                letterSpacing: '0.05em',
                color: 'var(--mantine-color-cyan-3)',
                borderBottom: '1px solid var(--mantine-color-dark-4)'
            },
            td: {
                borderBottom: '1px solid var(--mantine-color-dark-4)'
            }
        }
    })
}

