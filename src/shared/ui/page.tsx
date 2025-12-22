import { forwardRef, ReactNode, useEffect } from 'react'
import { nprogress } from '@mantine/nprogress'
import { Box, BoxProps } from '@mantine/core'

import classes from './page.module.css'
import { AnimatePresence, motion } from 'motion/react'

interface PageProps extends BoxProps {
    children: ReactNode
}

export const Page = forwardRef<HTMLDivElement, PageProps>(({ children, ...other }, ref) => {
    useEffect(() => {
        nprogress.complete()
        return () => nprogress.start()
    }, [])

    return (
        <AnimatePresence mode="wait">
            <motion.div
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{
                    duration: 0.3,
                    ease: 'easeInOut'
                }}
            >
                <Box className={classes.page} ref={ref} {...other}>
                    {children}
                </Box>
            </motion.div>
        </AnimatePresence>
    )
})