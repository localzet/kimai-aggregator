import { Card, CardProps } from "@mantine/core";
import { ReactNode, forwardRef } from "react";
import classes from "./MetricCard.module.css";

interface MetricCardRootProps extends CardProps {
  children: ReactNode;
}

export const MetricCardRoot = forwardRef<HTMLDivElement, MetricCardRootProps>(
  ({ className, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={`${classes.root} ${className || ""}`}
        withBorder
        {...props}
      />
    );
  },
);

MetricCardRoot.displayName = "MetricCardRoot";
