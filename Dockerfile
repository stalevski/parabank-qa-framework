# Multi-region Playwright test framework - Docker image.
#
# The base image already ships Node.js and the Playwright browsers for the
# pinned version, so `npx playwright install` is unnecessary here.
# Bump the tag when bumping @playwright/test in package.json.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

# Install dependencies first so this layer is cached unless the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the project.
COPY . .

# Default region can be overridden at run time: docker run -e REGION=eu ...
ENV REGION=us

# Run the whole suite (API + Web across Chromium/Firefox/WebKit + region parity).
CMD ["npx", "playwright", "test"]
