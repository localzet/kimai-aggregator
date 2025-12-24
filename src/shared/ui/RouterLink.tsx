import React, { forwardRef } from "react";
import {
  NavLink as RRNavLink,
  NavLinkProps as RRNavLinkProps,
} from "react-router-dom";

// Adapter to ensure the react-router NavLink can receive refs when used
// as a `component` prop for other libraries (e.g. Mantine) that pass refs.
const RouterLink = forwardRef<HTMLAnchorElement, RRNavLinkProps>(
  (props, ref) => {
    // NavLink from react-router-dom supports ref forwarding; re-expose it via adapter
    return <RRNavLink ref={ref as any} {...props} />;
  },
);

RouterLink.displayName = "RouterLink";

export default RouterLink;
