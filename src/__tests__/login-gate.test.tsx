import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginGate } from "@/components/login-gate";

describe("LoginGate", () => {
  const onAuthenticated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the login form", () => {
    render(<LoginGate onAuthenticated={onAuthenticated} />);
    expect(screen.getByText("Project Gantt")).toBeInTheDocument();
    expect(screen.getByText("Enter the password to continue")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.getByText("Unlock")).toBeInTheDocument();
  });

  it("disables button when password is empty", () => {
    render(<LoginGate onAuthenticated={onAuthenticated} />);
    const button = screen.getByText("Unlock");
    expect(button).toBeDisabled();
  });

  it("enables button when password is entered", () => {
    render(<LoginGate onAuthenticated={onAuthenticated} />);
    const input = screen.getByPlaceholderText("Enter password");
    fireEvent.change(input, { target: { value: "test123" } });
    const button = screen.getByText("Unlock");
    expect(button).not.toBeDisabled();
  });

  it("calls onAuthenticated on successful login", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true });

    render(<LoginGate onAuthenticated={onAuthenticated} />);
    const input = screen.getByPlaceholderText("Enter password");
    fireEvent.change(input, { target: { value: "correct-password" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalled();
    });
  });

  it("shows error on failed login", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });

    render(<LoginGate onAuthenticated={onAuthenticated} />);
    const input = screen.getByPlaceholderText("Enter password");
    fireEvent.change(input, { target: { value: "wrong-password" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Incorrect password")).toBeInTheDocument();
    });
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it("shows loading state during submission", async () => {
    let resolveRequest: (value: { ok: boolean }) => void;
    global.fetch = vi.fn().mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    render(<LoginGate onAuthenticated={onAuthenticated} />);
    const input = screen.getByPlaceholderText("Enter password");
    fireEvent.change(input, { target: { value: "password" } });
    fireEvent.submit(input.closest("form")!);

    expect(screen.getByText("Checking...")).toBeInTheDocument();

    resolveRequest!({ ok: true });
    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalled();
    });
  });
});
