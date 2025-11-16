import { AppShell, NavLink, Paper } from '@mantine/core'

export default {
    Paper: Paper.extend({
        defaultProps: {
            radius: 'md',
            withBorder: true
        },
        styles: {
            root: {
                background: 'linear-gradient(135deg, var(--mantine-color-dark-6) 0%, var(--mantine-color-dark-7) 100%)',
                border: '1px solid var(--mantine-color-dark-4)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.24s ease-in-out',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, var(--mantine-color-cyan-4), var(--mantine-color-cyan-8))',
                    opacity: 0,
                    transition: '0.24s ease-in-out'
                },
                '&:hover::before': {
                    opacity: 1
                },
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.3)',
                    borderColor: 'var(--mantine-color-cyan-5)'
                }
            }
        }
    }),
    AppShell: AppShell.extend({
        styles: {
            navbar: {
                position: 'fixed',
                top: '0.75rem',
                left: '0.75rem',
                bottom: '0.75rem',
                height: 'auto'
            },
            header: {
                backdropFilter: 'blur(7px)',
                WebkitBackdropFilter: 'blur(7px)',
                backgroundColor: 'transparent',
                borderBottom: '1px solid var(--mantine-color-dark-4)'
            },
            main: {
                display: 'flex',
                flexDirection: 'column'
            }
        }
    }),
    NavLink: NavLink.extend({
        styles: {
            root: {
                borderRadius: 'var(--mantine-radius-md)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                borderLeft: '3px solid transparent',
                borderRight: '3px solid transparent',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, transparent 0%, rgba(6, 182, 212, 0.05) 50%, transparent 100%)',
                    opacity: 0,
                    transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 0
                },
                '&:hover::before': {
                    opacity: 1
                },
                '&:hover': {
                    transform: 'translateX(2px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.05)'
                },
                '&[data-active]': {
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
                    borderLeft: '3px solid var(--mantine-color-cyan-4)',
                    borderRight: '3px solid var(--mantine-color-cyan-4)',
                    transform: 'translateX(2px)'
                },
                '& svg': {
                    height: '20px',
                    width: '20px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                },
                '&:hover svg': {
                    transform: 'scale(1.1)',
                    filter: 'drop-shadow(0 2px 4px rgba(6, 182, 212, 0.3))'
                }
            }
        }
    })
}

