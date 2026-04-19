import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "../../components/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card><p>Inhalt</p></Card>);
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
  });

  it("applies Catppuccin surface0 background", () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("bg-surface0");
  });

  it("applies rounded-card border radius", () => {
    const { container } = render(<Card>Test</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("rounded-card");
  });

  it("accepts additional className", () => {
    const { container } = render(<Card className="mt-4">Test</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("mt-4");
  });
});
