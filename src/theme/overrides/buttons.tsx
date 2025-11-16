import { ActionIcon, Button, CloseButton, Switch } from '@mantine/core'

export default {
    ActionIcon: ActionIcon.extend({
        defaultProps: {
            radius: 'md',
            variant: 'outline'
        },
        styles: {
            root: {
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, transparent 0%, rgba(6, 182, 212, 0.1) 50%, transparent 100%)',
                    opacity: 0,
                    transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 0
                },
                '&:hover::before': {
                    opacity: 1
                },
                '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(6, 182, 212, 0.2)',
                    borderColor: 'var(--mantine-color-cyan-4)',
                    color: 'var(--mantine-color-cyan-3)'
                },
                '& > *': {
                    position: 'relative',
                    zIndex: 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                },
                '&:hover > *': {
                    transform: 'scale(1.1)',
                    filter: 'drop-shadow(0 2px 4px rgba(6, 182, 212, 0.3))'
                }
            }
        }
    }),
    Button: Button.extend({
        defaultProps: {
            radius: 'md',
            variant: 'light'
        },
        styles: {
            root: {
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, transparent 0%, rgba(6, 182, 212, 0.1) 50%, transparent 100%)',
                    opacity: 0,
                    transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 0
                },
                '&:hover::before': {
                    opacity: 1
                },
                '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.15)',
                    borderColor: 'var(--mantine-color-cyan-4)'
                },
                '& > *': {
                    position: 'relative',
                    zIndex: 1
                }
            }
        }
    }),
    CloseButton: CloseButton.extend({
        defaultProps: {
            size: 'lg'
        }
    }),
    Switch: Switch.extend({
        defaultProps: {
            radius: 'md'
        }
    })
}

