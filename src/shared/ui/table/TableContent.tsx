import { CardSection, CardSectionProps } from "@mantine/core";
import { forwardRef, ReactNode } from "react";

interface TableContentProps extends CardSectionProps {
  children: ReactNode;
}

export const TableContent = forwardRef<HTMLDivElement, TableContentProps>(
  ({ children, ...props }, ref) => (
    <CardSection bg="var(--mantine-color-body)" ref={ref} {...props}>
      {children}
    </CardSection>
  ),
);

TableContent.displayName = "TableContent";
