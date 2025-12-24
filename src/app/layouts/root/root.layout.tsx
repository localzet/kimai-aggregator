import { Outlet } from "react-router-dom";
import classes from "./root.module.css";
import { useMixIdSession, useMixIdSync } from "@localzet/data-connector/hooks";
import { notifications } from "@mantine/notifications";

export function RootLayout() {
  useMixIdSync();

  useMixIdSession({
    onSessionDeleted: () => {
      notifications.show({
        title: "Сессия удалена",
        message:
          "Ваша сессия была удалена в личном кабинете. Приложение отключено.",
        color: "red",
      });
    },
    onSessionExpired: () => {
      notifications.show({
        title: "Сессия истекла",
        message: "Ваша сессия истекла. Пожалуйста, войдите снова.",
        color: "orange",
      });
    },
  });

  // return (
  //     <div className={classes.root}>
  //         <div className="animated-background"></div>
  //         <div className={classes.content}>
  //             <main className={classes.main}>
  //                 <LoadingScreen height="100vh" />
  //             </main>
  //         </div>
  //     </div>
  // )

  return (
    <div className={classes.root}>
      <div className="animated-background"></div>
      <div className={classes.content}>
        <main className={classes.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
