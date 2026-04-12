import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("h1")).toContainText("Login");
  });

  test("should login successfully", async ({ page }) => {
    await page.goto("/auth/login");
    
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL("/dashboard");
  });

  test("should show error on invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");
    
    await page.fill('input[name="username"]', "invalid");
    await page.fill('input[name="password"]', "wrong");
    await page.click('button[type="submit"]');
    
    await expect(page.locator(".error-message")).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/auth/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should display dashboard metrics", async ({ page }) => {
    await expect(page.locator('[data-testid="metric-card"]')).toHaveCount(4);
  });

  test("should navigate to projects", async ({ page }) => {
    await page.click('a[href="/projects"]');
    await expect(page).toHaveURL("/projects");
  });
});

test.describe("Projects CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.goto("/projects");
  });

  test("should create new project", async ({ page }) => {
    await page.click('button:has-text("Novo Projeto")');
    
    await page.fill('input[name="name"]', "Projeto Teste E2E");
    await page.fill('input[name="description"]', "Descrição do projeto");
    await page.click('button[type="submit"]');
    
    await expect(page.locator("text=Projeto criado com sucesso")).toBeVisible();
  });

  test("should edit project", async ({ page }) => {
    await page.click('[data-testid="project-item"]:first-child');
    await page.click('button:has-text("Editar")');
    
    await page.fill('input[name="name"]', "Projeto Editado");
    await page.click('button[type="submit"]');
    
    await expect(page.locator("text=Projeto atualizado")).toBeVisible();
  });

  test("should delete project", async ({ page }) => {
    await page.click('[data-testid="project-item"]:first-child');
    await page.click('button:has-text("Excluir")');
    await page.click('button:has-text("Confirmar")');
    
    await expect(page.locator("text=Projeto excluído")).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("should have no accessibility violations on login page", async ({ page }) => {
    await page.goto("/auth/login");
    // Add axe-core accessibility testing here
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/auth/login");
    
    await page.keyboard.press("Tab");
    await expect(page.locator('input[name="username"]')).toBeFocused();
    
    await page.keyboard.press("Tab");
    await expect(page.locator('input[name="password"]')).toBeFocused();
  });
});

test.describe("Performance", () => {
  test("should load dashboard in under 2 seconds", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/dashboard");
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });
});
