import { Box, BoxProps, rgba, useMantineTheme } from "@mantine/core";
import { ReactNode } from "react";
import classes from "./MetricCard.module.css";

interface MetricCardIconProps extends BoxProps {
  children: ReactNode;
  c?: string;
}

export function MetricCardIcon({
  className,
  c,
  style,
  children,
  ...props
}: MetricCardIconProps) {
  const theme = useMantineTheme();

  const getColorValue = (colorProp: string | undefined) => {
    if (!colorProp) {
      return theme.colors[theme.primaryColor][6];
    }

    if (typeof colorProp === "string" && colorProp.includes("var")) {
      return colorProp;
    }

    if (colorProp.includes(".")) {
      const [colorName, shade] = colorProp.split(".");
      return (
        theme.colors[colorName]?.[parseInt(shade, 10)] ||
        theme.colors[theme.primaryColor][6]
      );
    }

    if (theme.colors[colorProp]) {
      return theme.colors[colorProp][6];
    }

    return theme.colors[theme.primaryColor][6];
  };

  const colorValue = getColorValue(c as string);
  return (
    <Box
      className={`${classes.icon} ${className || ""}`}
      style={{
        background: `linear-gradient(135deg, ${rgba(colorValue, 0.1)} 0%, ${rgba(colorValue, 0.05)} 100%)`,
        border: `1px solid ${rgba(colorValue, 0.2)}`,
        boxShadow: `0 4px 16px ${rgba(colorValue, 0.1)}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
