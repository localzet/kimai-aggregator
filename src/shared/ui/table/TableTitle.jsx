import {
    ActionIcon,
    Box,
    CardSection,
    Group,
    Stack,
    Text,
    Title
} from '@mantine/core'
import classes from './table.module.css'

export function TableTitle({ title, description, style, actions, icon, withBorder = true, ...props }) {
    return (
        <CardSection
            className={classes.card}
            inheritPadding
            py="md"
            style={{
                ...style
            }}
            withBorder={withBorder}
            {...props}
        >
            <Box className={classes.headerWrapper}>
                <Box className={classes.contentSection}>
                    <Group align="center" gap="md" wrap="nowrap">
                        {icon && (
                            <ActionIcon
                                className={classes.actionIcon}
                                color="cyan"
                                size="input-md"
                                variant="light"
                            >
                                {icon}
                            </ActionIcon>
                        )}

                        <Stack gap={0}>
                            <Title order={4} pt={0}>
                                {title}
                            </Title>
                            {description && (
                                <Text c="dimmed" fz="sm">
                                    {description}
                                </Text>
                            )}
                        </Stack>
                    </Group>
                </Box>
                {actions && (
                    <Group align="flex-end" gap="sm" wrap="nowrap">
                        {actions}
                    </Group>
                )}
            </Box>
        </CardSection>
    )
}

