import { Card, Center, Progress, Stack, Text } from "@mantine/core";

export function LoadingScreen({
  height = "100dvh",
  text = undefined,
  value = 100,
}: {
  height?: string;
  text?: string;
  value?: number;
}) {
  return (
    <Center
      h="100vh"
    >
      <Card shadow="md" padding="md" radius="md" maw="32rem" w="100%" bg={'transparent'} style={{ backdropFilter: 'blur(8px)' }}>
        <Stack align="center" gap="xs" w="100%">
          <Text size="lg">{text || "Kimai Aggregator"}</Text>
          <Progress
            animated
            color="cyan"
            maw="32rem"
            radius="md"
            striped
            value={value}
            w="92%"
          />
        </Stack>
      </Card>
    </Center>
  );
}
