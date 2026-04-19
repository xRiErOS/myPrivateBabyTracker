import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../../components/Button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Speichern</Button>);
    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
  });

  it("applies primary variant by default", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-peach");
  });

  it("applies secondary variant", () => {
    render(<Button variant="secondary">Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-surface1");
  });

  it("applies danger variant", () => {
    render(<Button variant="danger">Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-red");
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables when disabled prop is set", () => {
    render(<Button disabled>Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.className).toContain("disabled:opacity-40");
  });

  it("has minimum 44px touch target", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("min-h-[44px]");
  });
});
