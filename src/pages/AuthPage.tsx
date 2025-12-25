import {
  Center,
  Card,
  Stack,
  Title,
  Text,
  Container,
  Group,
  Box,
} from "@mantine/core";
import { Page } from "@/shared/ui";
import AuthForm from "@/components/AuthForm";

function AuthPage() {
  return (
    // <Page>
    //   <Container
    //     h="100vh"
    //     maw={1200}
    //     px={{ base: "md", sm: "lg", md: "xl" }}
    //     py="xl"
    //     style={{ position: "relative", zIndex: 1 }}
    //   >
    //     <Center h="100%">
    //       <Card shadow="md" padding="xl" radius="md" maw={480} w="100%">
    //         <Stack gap="md">
    //           <LocalAuthForm />
    //         </Stack>
    //       </Card>
    //     </Center>
    // </Page>

    <Page>
      <Container
        h="100vh"
        maw={1200}
        px={{ base: "md", sm: "lg", md: "xl" }}
        py="xl"
        style={{ position: "relative", zIndex: 1 }}
      >
        <Center h="100%">
          <Card
            shadow="md"
            padding="xl"
            radius="md"
            maw={480}
            w="100%"
            bg={"transparent"}
            style={{ backdropFilter: "blur(8px)" }}
          >
            <Stack align="center" gap="xs">
              <Group align="center" gap={4} justify="center">
                <Title ff="Unbounded" order={1} pos="relative">
                  <Text
                    c="cyan"
                    component="span"
                    fw="inherit"
                    fz="inherit"
                    inherit
                    pos="relative"
                  >
                    Kimai Aggregator
                  </Text>
                </Title>
              </Group>
              <Box maw={480} p={30} w={{ base: 440, sm: 440, md: 440 }}>
                <Stack gap="md">
                  <AuthForm />
                </Stack>
              </Box>
            </Stack>
          </Card>
        </Center>
      </Container>
    </Page>
  );
}

export default AuthPage;
