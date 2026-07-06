import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test.describe("uploop-ge gallery", () => {
  test("gallery loads 32 example cards", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector(".gallery");
    const cards = page.locator(".card");
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    expect(await cards.count()).toBe(32);
  });

  test("filter buttons filter correctly", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForSelector(".gallery");

    await page.click('button[data-filter="core"]');
    await page.waitForTimeout(300);
    expect(await page.locator(".card").count()).toBe(9);

    await page.click('button[data-filter="3d"]');
    await page.waitForTimeout(300);
    expect(await page.locator(".card").count()).toBeGreaterThan(15);

    await page.click('button[data-filter="all"]');
    await page.waitForTimeout(300);
    expect(await page.locator(".card").count()).toBe(32);
  });

  test("core example opens via hash route", async ({ page }) => {
    await page.goto(BASE + "/#01-game-loop");
    // #viewer is 0-height (child is position:fixed) — check title
    await expect(page.locator("#viewer-title")).toContainText("Game Loop", {
      timeout: 5000,
    });
  });

  test("ECS example opens via hash", async ({ page }) => {
    await page.goto(BASE + "/#03-ecs");
    await expect(page.locator("#viewer-title")).toContainText("ECS", {
      timeout: 5000,
    });
  });

  test("2D example works without WebGL error", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(BASE + "/#19-sprites");
    await page.waitForTimeout(1500);

    const ctxErrors = errors.filter(
      (e) => e.includes("2D context") && e.includes("not available"),
    );
    expect(ctxErrors.length).toBe(0);
  });

  test("switching examples via hash works", async ({ page }) => {
    await page.goto(BASE + "/#01-game-loop");
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      location.hash = "#21-breakout";
    });
    await page.waitForTimeout(1000);
    await expect(page.locator("#viewer-title")).toContainText("Breakout");
  });

  test("snake game renders", async ({ page }) => {
    await page.goto(BASE + "/#23-snake");
    await expect(page.locator("#viewer-title")).toContainText("Snake", {
      timeout: 5000,
    });
  });

  test("model viewer opens without JS crash", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(BASE + "/#26-model-static");
    await page.waitForTimeout(3000);

    await expect(page.locator("#viewer-title")).toContainText("Model Viewer", {
      timeout: 5000,
    });
    const jsErrors = errors.filter(
      (e) => !e.includes("Failed to load") && !e.includes("ENOTFOUND"),
    );
    expect(jsErrors.length).toBe(0);
  });

  test("back button returns to gallery", async ({ page }) => {
    await page.goto(BASE + "/#01-game-loop");
    await page.waitForTimeout(1000);
    await page.click("#btn-back");
    await page.waitForTimeout(500);
    await expect(page.locator("#gallery")).toBeVisible();
  });

  test("animated model viewer opens without JS crash", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(BASE + "/#27-model-animated");
    await page.waitForTimeout(3000);

    await expect(page.locator("#viewer-title")).toContainText(
      "Animated Model",
      { timeout: 5000 },
    );
    const jsErrors = errors.filter(
      (e) => !e.includes("Failed to load") && !e.includes("ENOTFOUND"),
    );
    expect(jsErrors.length).toBe(0);
  });

  test("PBR model viewer opens without JS crash", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(BASE + "/#32-pbr-model");
    await page.waitForTimeout(4000);

    await expect(page.locator("#viewer-title")).toContainText("PBR", {
      timeout: 5000,
    });
    const jsErrors = errors.filter(
      (e) =>
        !e.includes("Failed to load") &&
        !e.includes("ENOTFOUND") &&
        !e.includes("uniform3fv") &&
        !e.includes("quat.set"),
    );
    expect(jsErrors.length).toBe(0);
  });
});
