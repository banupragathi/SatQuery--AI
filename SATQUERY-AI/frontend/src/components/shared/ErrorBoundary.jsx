import { Component } from "react";

/*
  ErrorBoundary.jsx
  =================
  A small class component (React error boundaries must be classes). If anything
  inside it throws while rendering -- e.g. WebGL is unavailable and the 3D Earth
  fails -- it renders the provided `fallback` instead of crashing the page.
*/
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Log for debugging; the user still sees the graceful fallback.
    // eslint-disable-next-line no-console
    console.warn("3D scene failed, showing fallback:", error?.message);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
