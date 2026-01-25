import { useState } from "react";
import { Stack, TextInput, PasswordInput, Button, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import useAuth from "@/shared/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { setToken } from "@entities/session-store";

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const submit = async () => {
    setLoading(true);
    try {
      let resp: any;
      if (mode === "register") {
        resp = await register(email, password);
      } else {
        resp = await login(email, password);
      }

      notifications.show({
        title: "Успешно",
        message:
          mode === "register" ? "Регистрация завершена" : "Вход выполнен",
        color: "green",
      });

      navigate("/setup", { replace: true });
    } catch (e) {
      notifications.show({
        title: "Ошибка",
        message: e instanceof Error ? e.message : "Неизвестная ошибка",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <Title mx={"auto"} order={2}>
        {mode === "register" ? "Регистрация" : "Вход"}{" "}
      </Title>
      <TextInput
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
      />
      <PasswordInput
        label="Пароль"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "10px",
        }}
      >
        <Button
          variant="subtle"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Регистрация" : "Вход"}
        </Button>
        <Button onClick={submit} loading={loading}>
          {mode === "login" ? "Войти" : "Зарегистрироваться"}
        </Button>
      </div>
    </Stack>
  );
}
