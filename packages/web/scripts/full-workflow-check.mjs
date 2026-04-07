import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173'
const API_BASE_URL = process.env.E2E_API_URL || 'http://127.0.0.1:8000'
const DEFAULT_WORKSPACE_ID = process.env.E2E_WORKSPACE_ID || '00000000-0000-0000-0000-000000000002'
const RUN_ID = Date.now().toString()
const failures = []
const runtimeErrors = []

function log(message) {
  process.stdout.write(`${message}\n`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function step(name, fn, { retries = 1, onRetry } = {}) {
  log(`\n[STEP] ${name}`)
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      await fn()
      log(`[PASS] ${name}${attempt > 1 ? ` (attempt ${attempt})` : ''}`)
      return
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (attempt <= retries) {
        log(`[RETRY] ${name} failed on attempt ${attempt}: ${message}`)
        if (onRetry) {
          await onRetry(attempt)
        } else {
          await sleep(3000)
        }
        continue
      }
      failures.push(`${name}: ${message}`)
      log(`[FAIL] ${name}: ${message}`)
    }
  }
}

async function isVisible(locator, timeout = 3000) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout })
    return true
  } catch {
    return false
  }
}

async function clickIfVisible(locator, timeout = 3000) {
  if (await isVisible(locator, timeout)) {
    await locator.first().click()
    return true
  }
  return false
}

async function fillIfVisible(locator, value, timeout = 3000) {
  if (await isVisible(locator, timeout)) {
    await locator.first().fill(value)
    return true
  }
  return false
}

async function gotoPath(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
}

async function closeDiscoverModalIfOpen(page) {
  const discoverHeading = page.getByRole('heading', { name: /ai topic discovery/i })
  if (await isVisible(discoverHeading, 1500)) {
    // Click outside the modal card on the backdrop.
    await page.mouse.click(18, 300)
    await discoverHeading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
  }
}

async function waitUntil(predicate, { timeout = 120000, interval = 2000, description = 'condition' } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const result = await predicate()
    if (result) return result
    await sleep(interval)
  }
  throw new Error(`Timed out waiting for ${description}`)
}

async function fetchWorkspaceList() {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspaces`)
  if (!response.ok) {
    throw new Error(`Failed to list workspaces: ${response.status}`)
  }
  return response.json()
}

async function resolveWorkspaceId() {
  try {
    const setupResponse = await fetch(`${API_BASE_URL}/api/v1/dev/setup`, { method: 'POST' })
    if (setupResponse.ok) {
      const setupData = await setupResponse.json()
      const id = typeof setupData?.workspace_id === 'string' ? setupData.workspace_id.trim() : ''
      if (id) return id
    }
  } catch {
    // fall through to env/default/list fallback
  }

  if (DEFAULT_WORKSPACE_ID) return DEFAULT_WORKSPACE_ID

  const workspaces = await fetchWorkspaceList()
  if (!Array.isArray(workspaces) || !workspaces.length) return ''
  const first = workspaces[0]
  return first?.workspace_id || first?.id || first?.workspaces?.id || ''
}

async function getTopicSnapshot(workspaceId) {
  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}/topics?limit=200`)
      if (!response.ok) {
        throw new Error(`Failed to fetch topics: ${response.status}`)
      }
      const data = await response.json()
      const topics = Array.isArray(data) ? data : []
      const newest = topics[0] || null
      return {
        count: topics.length,
        newestId: newest?.id || '',
        newestAt: newest?.created_at || newest?.discovered_at || '',
      }
    } catch (error) {
      lastError = error
      await sleep(1200)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to fetch topics snapshot')
}

async function ensureAuthenticated(page) {
  await gotoPath(page, '/')

  if (page.url().includes('/login')) {
    const opened = await clickIfVisible(page.getByRole('button', { name: /open app/i }))
    if (!opened) {
      await clickIfVisible(page.getByRole('button', { name: /continue with google/i }))
    }
    await page.waitForLoadState('networkidle').catch(() => {})
  }

  for (let i = 0; i < 10; i += 1) {
    if (!page.url().includes('/onboarding')) break

    await fillIfVisible(page.getByPlaceholder('name@company.com'), `qa+${RUN_ID}@example.com`)
    await fillIfVisible(page.getByPlaceholder('Password (minimum 6 characters)'), `Passw0rd!${RUN_ID.slice(-4)}`)

    await fillIfVisible(page.getByPlaceholder('Your workspace name'), `Influencer Pirates QA ${RUN_ID.slice(-6)}`)
    await fillIfVisible(page.getByPlaceholder('e.g. AI marketing for SaaS founders'), 'Creator growth playbooks')

    if (await clickIfVisible(page.getByRole('button', { name: /^youtube$/i }))) {
      await clickIfVisible(page.getByRole('button', { name: /^instagram$/i }))
    }

    if (await clickIfVisible(page.getByRole('button', { name: /finish setup/i }))) {
      await page.waitForLoadState('networkidle').catch(() => {})
      break
    }

    if (await clickIfVisible(page.getByRole('button', { name: /^continue$/i }))) {
      await page.waitForLoadState('networkidle').catch(() => {})
      continue
    }

    break
  }

  if (page.url().includes('/login')) {
    throw new Error('Still on login page after auth flow')
  }
}

async function openAssistant(page) {
  if (!await isVisible(page.getByRole('button', { name: /open assistant/i }), 2500)) return false
  await page.getByRole('button', { name: /open assistant/i }).click()
  await page.getByRole('heading', { name: /influencer assistant/i }).waitFor({ timeout: 15000 })
  return true
}

async function closeAssistant(page) {
  if (await isVisible(page.getByRole('button', { name: /close assistant/i }), 2500)) {
    try {
      await page.getByRole('button', { name: /close assistant/i }).click({ force: true })
    } catch {
      await page.evaluate(() => {
        const button = document.querySelector('button[aria-label="Close Assistant"]')
        if (button instanceof HTMLButtonElement) button.click()
      })
    }
  }
}

async function run() {
  let workspaceId = await resolveWorkspaceId()
  if (!workspaceId) {
    throw new Error('Workspace ID could not be resolved')
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1600, height: 1000 },
  })
  const page = await context.newPage()
  await page.addInitScript((id) => {
    localStorage.setItem('mcl_workspace_id', id)
  }, workspaceId)
  page.setDefaultTimeout(25000)

  page.on('pageerror', (error) => {
    runtimeErrors.push(`pageerror: ${error.message}`)
  })

  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (text.includes('favicon.ico')) return
    if (text.includes('ERR_ABORTED')) return
    if (text.includes('Failed to load resource: net::ERR_FAILED')) return
    runtimeErrors.push(`console: ${text}`)
  })

  let topicSnapshotBeforeDiscover = { count: 0, newestId: '', newestAt: '' }
  let topicSnapshotAfterDiscover = { count: 0, newestId: '', newestAt: '' }
  let canVerifyTopicDelta = true

  await step('Authenticate and reach app shell', async () => {
    await ensureAuthenticated(page)
    await page.getByText('Influencer Pirates').first().waitFor({ timeout: 20000 })

    const localStorageWorkspace = await page.evaluate(() => localStorage.getItem('mcl_workspace_id') || '')
    if (localStorageWorkspace) workspaceId = localStorageWorkspace
    if (!workspaceId) throw new Error('Workspace ID could not be resolved')
  })

  await step('Dashboard actions and discover topic propagation', async () => {
    await gotoPath(page, '/')
    await page.getByRole('button', { name: /start discovering/i }).waitFor()
    await page.getByRole('button', { name: /start discovering/i }).click()
    await page.waitForURL(/\/topics/, { timeout: 20000 })

    await gotoPath(page, '/')
    await page.getByRole('button', { name: /open script studio/i }).click()
    await page.waitForURL(/\/scripts/, { timeout: 20000 })

    await gotoPath(page, '/')

    try {
      topicSnapshotBeforeDiscover = await getTopicSnapshot(workspaceId)
    } catch {
      canVerifyTopicDelta = false
    }

    const discoverActionByRole = page.getByRole('button', { name: /^discover topics$/i }).first()
    const discoverActionByText = page.locator('button').filter({ hasText: 'Discover Topics' }).first()
    if (await isVisible(discoverActionByRole, 5000)) {
      await discoverActionByRole.click()
    } else if (await isVisible(discoverActionByText, 5000)) {
      await discoverActionByText.click()
    } else {
      throw new Error('Discover Topics action not visible on dashboard')
    }

    if (canVerifyTopicDelta) {
      topicSnapshotAfterDiscover = await waitUntil(
        async () => {
          const snapshot = await getTopicSnapshot(workspaceId)
          const countIncreased = snapshot.count > topicSnapshotBeforeDiscover.count
          const newestChanged = snapshot.newestId && snapshot.newestId !== topicSnapshotBeforeDiscover.newestId
          const newestTimestampChanged = snapshot.newestAt && snapshot.newestAt !== topicSnapshotBeforeDiscover.newestAt
          return countIncreased || newestChanged || newestTimestampChanged ? snapshot : null
        },
        { timeout: 180000, interval: 5000, description: 'dashboard discover to persist new topics' },
      )
    }

    const rescoreAction = page.getByRole('button', { name: /re-score topics/i }).first()
    const analyzeAction = page.getByRole('button', { name: /run analytics/i }).first()
    await rescoreAction.click()
    await analyzeAction.click()
  }, { retries: 1, onRetry: async () => gotoPath(page, '/') })

  await step('Topics workflows', async () => {
    await gotoPath(page, '/topics')
    await page.getByRole('heading', { name: /topic laboratory/i }).waitFor()
    await page.getByRole('button', { name: /ai discover/i }).click()
    await fillIfVisible(page.getByPlaceholder(/personal finance/i), 'creator monetization')
    await fillIfVisible(page.getByPlaceholder(/investing, passive income/i), 'content strategy, creator growth')
    await clickIfVisible(page.getByRole('button', { name: /^instagram$/i }))
    await page.getByRole('button', { name: /^discover topics$/i }).click()
    await waitUntil(
      async () => isVisible(page.getByText(/discovering topics/i).first(), 1200),
      { timeout: 10000, interval: 500, description: 'discovering topics indicator' },
    )
    await closeDiscoverModalIfOpen(page)

    await waitUntil(
      async () => {
        const response = await page.locator('span').filter({ hasText: /topics$/i }).first().textContent()
        return response && /\d+\s+topics/i.test(response) ? response : null
      },
      { timeout: 90000, interval: 3000, description: 'topics count label' },
    )

    const kanbanButton = page.getByRole('button', { name: /^kanban$/i })
    await kanbanButton.click({ force: true })

    const discoverColumn = page.locator('div').filter({ has: page.getByRole('heading', { name: /^discovered$/i }) }).first()
    const addButtons = discoverColumn.locator('button')
    if (await addButtons.count() > 0) {
      await addButtons.last().click()
      await page.waitForTimeout(1200)
    }

    const newTopicTitle = page.getByText('New Topic').first()
    if (await isVisible(newTopicTitle, 5000)) {
      await newTopicTitle.click()
      await page.getByRole('button', { name: /delete topic/i }).click()
      await page.waitForTimeout(1000)
    }

    const firstTopicHeading = page.locator('h4').first()
    await firstTopicHeading.waitFor({ timeout: 30000 })
    await firstTopicHeading.click()

    const stageButton = page.getByRole('button', { name: /discovered|developing|scripted/i }).first()
    await stageButton.click()
    await page.getByRole('button', { name: /^developing$/i }).click()
    await page.getByRole('button', { name: /generate angles/i }).click()
    try {
      await page.waitForURL(/\/angles/, { timeout: 20000 })
    } catch {
      await gotoPath(page, '/angles')
    }
  }, { retries: 1, onRetry: async () => gotoPath(page, '/topics') })

  await step('Angles workflows', async () => {
    await page.getByRole('heading', { name: /niche authority in ai/i }).waitFor()
    await page.getByRole('button', { name: /save topic/i }).click()

    await page.getByPlaceholder(/threat to junior developers/i).fill('Niche creators need daily posting to grow quickly.')
    await page.getByPlaceholder(/actually creates more opportunities/i).fill('Consistency matters less than authority and distinct positioning.')
    await page.getByTitle(/swap beliefs/i).click()
    await page.getByTitle(/swap beliefs/i).click()

    await page.getByRole('button', { name: /^shortform$/i }).click()
    await page.getByRole('button', { name: /^longform$/i }).click()
    await page.getByRole('button', { name: /^generate angles$/i }).click()

    await waitUntil(
      async () => {
        const cards = await page.locator('h3').count()
        const emptyState = await isVisible(page.getByText(/no angles generated yet/i), 1000)
        return cards > 0 || emptyState
      },
      { timeout: 90000, interval: 3000, description: 'angles generation response' },
    )

    const saveButtons = page.getByRole('button', { name: /^save$/i })
    if (await saveButtons.count() > 0) {
      await saveButtons.first().click()
    }

    const scriptButtons = page.getByRole('button', { name: /generate script|done! view script|failed/i })
    if (await scriptButtons.count() > 0) {
      await scriptButtons.first().click()
    }

    await page.getByRole('button', { name: /^drafts$/i }).click()
    await page.getByRole('button', { name: /^published$/i }).click()
    await page.getByRole('button', { name: /angles lab/i }).click()
  }, { retries: 1, onRetry: async () => gotoPath(page, '/angles') })

  await step('Hooks workflows', async () => {
    await gotoPath(page, '/hooks')
    await page.getByRole('heading', { name: /psychological hooks/i }).waitFor()
    await page.getByRole('button', { name: /^the question$/i }).click()
    await page.getByRole('button', { name: /^the stat$/i }).click()
    await page.getByRole('button', { name: /^the stat$/i }).click()

    const hookCards = page.locator('p.text-xl')
    if (await hookCards.count() > 0) {
      const refineButtons = page.getByRole('button', { name: /refine ai/i })
      if (await refineButtons.count() > 0) {
        await refineButtons.first().click()
      }
      const addButtons = page.getByRole('button', { name: /add to script/i })
      if (await addButtons.count() > 0) {
        await addButtons.first().click()
        await page.waitForURL(/\/scripts/, { timeout: 30000 })
        await gotoPath(page, '/hooks')
      }
    }

    const swipeExplore = page.getByRole('button', { name: /explore all swipes/i })
    if (await isVisible(swipeExplore, 2000)) {
      await swipeExplore.click()
    }
    const upgradeNow = page.getByRole('button', { name: /upgrade now/i })
    if (await isVisible(upgradeNow, 2000)) {
      await upgradeNow.click()
      await page.waitForURL(/\/settings/, { timeout: 30000 })
    }
  }, { retries: 1, onRetry: async () => gotoPath(page, '/hooks') })

  await step('Scripts workflows', async () => {
    await gotoPath(page, '/scripts')

    if (await isVisible(page.getByText(/no scripts yet/i), 5000)) {
      await clickIfVisible(page.getByRole('link', { name: /go to angles/i }), 3000)
      await gotoPath(page, '/scripts')
      return
    }

    await page.getByText('Beat Sheet').first().waitFor({ timeout: 20000 })
    const beatButtons = page.locator('button').filter({ has: page.locator('span', { hasText: /\/\d+$/ }) })
    if (await beatButtons.count() > 0) {
      await beatButtons.first().click()
    }

    await page.getByRole('button', { name: /^edit$/i }).click()
    const editor = page.locator('textarea').first()
    await editor.fill(`E2E edit check ${RUN_ID}.\n\nThis content verifies save and cancel behavior.`)
    await page.getByRole('button', { name: /^save$/i }).click()

    await page.getByRole('button', { name: /^edit$/i }).click()
    await editor.fill('Temporary edit for cancel behavior.')
    await page.getByRole('button', { name: /^cancel$/i }).click()

    await page.getByRole('button', { name: /^ai rewrite$/i }).last().click()
    await page.getByRole('button', { name: /tone check/i }).last().click()
    await page.getByRole('button', { name: /pdf export/i }).click()
    await page.getByRole('button', { name: /version history/i }).click()
    await page.getByRole('button', { name: /^share$/i }).click()
  }, { retries: 1, onRetry: async () => gotoPath(page, '/scripts') })

  await step('Analytics workflows', async () => {
    await gotoPath(page, '/analytics')
    await page.getByRole('heading', { name: /performance intelligence/i }).waitFor()
    await page.getByRole('button', { name: /^7 days$/i }).click()
    await page.getByRole('button', { name: /^30 days$/i }).click()
    await page.getByRole('button', { name: /^all time$/i }).click()

    if (await isVisible(page.getByRole('button', { name: /run analysis|run first analysis/i }), 2000)) {
      await page.getByRole('button', { name: /run analysis|run first analysis/i }).first().click()
    }
    await page.getByRole('button', { name: /^export$/i }).click()
  })

  await step('Brain workflows', async () => {
    await gotoPath(page, '/brain')
    await page.getByRole('heading', { name: /agent brain/i }).waitFor()
    await page.getByRole('button', { name: /initiate deep sync|initialize brain|syncing/i }).first().click()
    await page.getByRole('button', { name: /export schema/i }).click()

    if (await clickIfVisible(page.getByRole('button', { name: /add new guardrail/i }), 3000)) {
      await page.getByPlaceholder(/guardrail title/i).fill(`No copied scripts ${RUN_ID.slice(-4)}`)
      await page.getByPlaceholder(/description/i).fill('Avoid near-clone content and enforce original examples.')
      await page.getByRole('button', { name: /^save$/i }).click()
    }

    await page.getByPlaceholder(/@handle1, @handle2, @handle3/i).fill('@creator_one, @creator_two')
    await page.getByRole('button', { name: /run scrape|scraping/i }).click()

    await page.getByPlaceholder(/paste youtube urls/i).fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.getByRole('button', { name: /rip skeleton|ripping/i }).click()

    const recentReports = page.getByText(/recent reports/i)
    if (await isVisible(recentReports, 4000)) {
      const reportButtons = page.locator('button').filter({ hasText: /competitor scrape|skeleton rip/i })
      if (await reportButtons.count() > 0) {
        await reportButtons.first().click()
      }
    }
  })

  await step('Settings workflows', async () => {
    await gotoPath(page, '/settings')
    await page.getByRole('heading', { name: /^settings$/i }).waitFor()

    await page.getByRole('button', { name: /invite team/i }).first().click()
    await fillIfVisible(page.getByPlaceholder(/team@example.com/i), `qa-team-${RUN_ID}@example.com`)
    await clickIfVisible(page.getByRole('button', { name: /send invite/i }), 3000)

    const workspaceInputs = page.locator('input').filter({ hasNot: page.getByPlaceholder(/team@example.com/i) })
    if (await workspaceInputs.count() > 0) {
      await workspaceInputs.first().fill(`Influencer Pirates QA Workspace ${RUN_ID.slice(-5)}`)
    }

    const nicheSelect = page.locator('select').first()
    if (await nicheSelect.count() > 0) {
      await nicheSelect.selectOption({ label: 'Creator Economy' })
    }

    await page.getByRole('button', { name: /discard changes/i }).click()
    if (await workspaceInputs.count() > 0) {
      await workspaceInputs.first().fill(`Influencer Pirates QA Workspace ${RUN_ID.slice(-4)}`)
    }
    await page.getByRole('button', { name: /save workspace settings/i }).click()

    if (await clickIfVisible(page.getByRole('button', { name: /^configure$/i }).first(), 3000)) {
      const apiInput = page.getByPlaceholder(/paste .* key/i).first()
      if (await isVisible(apiInput, 3000)) {
        await apiInput.fill(`sk-test-${RUN_ID}-abcd1234`)
        await page.getByRole('button', { name: /^save$/i }).first().click()
      }
    }

    if (await isVisible(page.getByRole('button', { name: /^revoke$/i }).first(), 3000)) {
      await page.getByRole('button', { name: /^revoke$/i }).first().click()
    }

    const tempDocPath = path.join(os.tmpdir(), `ip-e2e-${RUN_ID}.md`)
    await fs.writeFile(tempDocPath, '# Influencer Pirates E2E\n\nBrand voice sample.')
    await page.locator('input[type="file"]').setInputFiles(tempDocPath)
    await waitUntil(
      async () => isVisible(page.getByText(path.basename(tempDocPath)).first(), 1500),
      { timeout: 30000, interval: 1500, description: 'document upload row' },
    )
    const fileRow = page.getByText(path.basename(tempDocPath)).first()
    const fileContainer = fileRow.locator('xpath=ancestor::div[1]')
    const deleteButton = fileContainer.locator('button').last()
    if (await deleteButton.count() > 0) {
      await deleteButton.click()
    }
    await fs.unlink(tempDocPath).catch(() => {})

    await page.getByRole('button', { name: /^team$/i }).click()
    await page.getByRole('button', { name: /^connections$/i }).click()
    await page.getByRole('button', { name: /^api keys$/i }).click()
    await page.getByRole('button', { name: /^billing$/i }).click()
    await page.getByRole('button', { name: /^workspace$/i }).click()
  }, { retries: 1, onRetry: async () => gotoPath(page, '/settings') })

  await step('Support and legal pages', async () => {
    await gotoPath(page, '/support')
    await page.getByRole('heading', { name: /support & help/i }).waitFor()
    await clickIfVisible(page.getByRole('button', { name: /open chat/i }), 2000)

    const docsLink = page.getByRole('link', { name: /read docs/i }).first()
    const href = await docsLink.getAttribute('href')
    if (!href || !href.includes('docs.microcelebritylabs.com')) {
      throw new Error('Read Docs link target is incorrect')
    }

    const reportLink = page.getByRole('link', { name: /^report$/i }).first()
    const reportHref = await reportLink.getAttribute('href')
    if (!reportHref?.startsWith('mailto:')) {
      throw new Error('Report link should be a mailto')
    }

    const emailLink = page.getByRole('link', { name: /email us|contact support/i }).first()
    const emailHref = await emailLink.getAttribute('href')
    if (!emailHref?.startsWith('mailto:')) {
      throw new Error('Support email link should be a mailto')
    }

    await gotoPath(page, '/legal')
    await page.getByRole('button', { name: /privacy policy/i }).click()
    await page.getByRole('button', { name: /terms of service/i }).click()
    await page.getByRole('link', { name: /sign in/i }).click()
    await page.waitForURL(/\/login/, { timeout: 20000 })
  }, { retries: 1, onRetry: async () => gotoPath(page, '/support') })

  await step('Tactical Assistant widget', async () => {
    await gotoPath(page, '/')
    const opened = await openAssistant(page)
    if (!opened) throw new Error('Assistant open button not available')

    const quickPrompt = page.getByRole('button', { name: /generate 5 high-retention hook variants/i })
    if (await isVisible(quickPrompt, 2000)) {
      await quickPrompt.click()
    }

    const input = page.getByPlaceholder(/ask for strategy guidance/i)
    await input.fill('What should we optimize next week for higher script output?')
    await input.press('Enter')
    await page.getByRole('button', { name: /ask strategy/i }).click()
    await page.getByRole('button', { name: /^insights$/i }).click()
    await page.getByRole('button', { name: /^activity$/i }).click()
    await page.getByRole('button', { name: /^ask$/i }).click()
    await closeAssistant(page)
  }, { retries: 1, onRetry: async () => gotoPath(page, '/') })

  await step('Feedback widget', async () => {
    await closeAssistant(page)
    await gotoPath(page, '/')

    const feedbackButton = page.locator('button[title="Send Feedback"]').first()
    await feedbackButton.waitFor({ timeout: 15000 })
    await feedbackButton.click()

    await page.getByRole('button', { name: /bug report/i }).click()
    await page.getByPlaceholder(/tell us what's on your mind/i).fill(`Full workflow run ${RUN_ID}: validating all UI paths.`)

    const stars = page.locator('label:has-text("RATING (OPTIONAL)")').locator('xpath=following-sibling::div/button')
    if (await stars.count() >= 4) {
      await stars.nth(3).click()
    }

    await page.getByRole('button', { name: /submit feedback/i }).click()
    await waitUntil(
      async () => isVisible(page.getByText(/feedback submitted|failed to submit/i).first(), 1000),
      { timeout: 15000, interval: 1000, description: 'feedback submission response' },
    )
  }, { retries: 1, onRetry: async () => gotoPath(page, '/') })

  await browser.close()

  const uniqueRuntimeErrors = [...new Set(runtimeErrors)]
  if (canVerifyTopicDelta) {
    const countIncreased = topicSnapshotAfterDiscover.count > topicSnapshotBeforeDiscover.count
    const newestChanged = topicSnapshotAfterDiscover.newestId && topicSnapshotAfterDiscover.newestId !== topicSnapshotBeforeDiscover.newestId
    const newestTimestampChanged = topicSnapshotAfterDiscover.newestAt && topicSnapshotAfterDiscover.newestAt !== topicSnapshotBeforeDiscover.newestAt
    if (!countIncreased && !newestChanged && !newestTimestampChanged) {
      failures.push(
      `Dashboard discover did not produce new visible topics (before count=${topicSnapshotBeforeDiscover.count}, after count=${topicSnapshotAfterDiscover.count}, before newest=${topicSnapshotBeforeDiscover.newestId}, after newest=${topicSnapshotAfterDiscover.newestId})`,
      )
    }
  }

  if (uniqueRuntimeErrors.length) {
    failures.push(`Runtime errors captured:\n- ${uniqueRuntimeErrors.join('\n- ')}`)
  }

  if (failures.length) {
    log('\n[RESULT] FAIL')
    for (const failure of failures) {
      log(`- ${failure}`)
    }
    process.exit(1)
  }

  log('\n[RESULT] PASS')
  log(`Workspace: ${workspaceId}`)
  log(`Topics before dashboard discover: ${topicSnapshotBeforeDiscover.count}`)
  log(`Topics after dashboard discover: ${topicSnapshotAfterDiscover.count}`)
  log(`Newest topic before: ${topicSnapshotBeforeDiscover.newestId}`)
  log(`Newest topic after: ${topicSnapshotAfterDiscover.newestId}`)
}

run().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  log(`\n[RESULT] FAIL (unhandled)\n${message}`)
  process.exit(1)
})
