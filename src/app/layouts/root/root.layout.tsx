import { Outlet } from "react-router-dom";
import classes from "./root.module.css";

export function RootLayout() {

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

export function RootWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className={classes.root}>
      <div className="animated-background"></div>
      <div className={classes.content}>
        <main className={classes.main}>{children}</main>
      </div>
    </div>
  );
}
