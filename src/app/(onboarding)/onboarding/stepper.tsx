"use client"

import { useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  completeOnboarding,
  saveDecisionWorkflow,
  saveIntegrations,
  saveInvestorProfile,
  savePreferences,
  startOnboarding,
} from "@/lib/actions/onboarding"

type OnboardingData = {
  status?: string | null
  selected_plan?: "hobby" | "angel" | "fund" | null
  workspace_id?: string | null
  workspace_name?: string | null
  workspace_type?: string | null
  fund_contact_email?: string | null
  fund_contact_notes?: string | null
  investor_type?: string | null
  years_investing?: string | null
  check_size?: string | null
  deals_per_year?: string | null
  stage_focus?: string[] | null
  strategy?: string[] | null
  core_sectors?: string[] | null
  frontier_interests?: string[] | null
  geography?: string[] | null
  decision_factors?: string[] | null
  decision_speed?: string | null
  deal_sourcing?: string[] | null
  biggest_pain?: string | null
  integrations?: string[] | null
  discover_topics?: string[] | null
  daily_digest?: boolean | null
  ai_help?: string[] | null
  ai_tone?: string | null
}

const plans = [
  { value: "hobby", label: "Hobby" },
  { value: "angel", label: "Angel" },
  { value: "fund", label: "Fund" },
]

const workspaceTypes = [
  "angel",
  "syndicate",
  "fund",
  "scout",
  "personal",
]

const investorTypes = [
  "Solo angel",
  "Syndicate member",
  "Syndicate lead",
  "Fund partner",
  "Fund associate",
  "Scout",
  "Operator investing personally",
  "Emerging / student",
]

const yearsInvestingOptions = ["0–1", "2–5", "5–10", "10+"]
const checkSizeOptions = ["<10k", "10–25k", "25–50k", "50–100k", "100k+"]
const dealsPerYearOptions = ["1–3", "4–10", "10–25", "25+"]

const stageFocusOptions = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B+",
  "Secondary",
]

const strategyOptions = [
  "Thesis-driven",
  "Founder-led",
  "Data-driven",
  "Opportunistic",
  "Network-driven",
  "Follow-on focused",
]

const coreSectorsOptions = [
  "AI",
  "Dev tools",
  "Fintech",
  "Crypto/Web3",
  "Marketplaces",
  "Healthcare",
  "Climate/Energy",
  "Consumer",
  "SaaS",
]

const frontierOptions = [
  "Foundation models",
  "AI infra",
  "Robotics",
  "Bio+AI",
  "Defense/Govtech",
  "DePIN",
]

const geographyOptions = [
  "US only",
  "North America",
  "Global",
  "Region-specific",
]

const decisionFactors = [
  "Founder quality",
  "Market size",
  "Product velocity",
  "Technical moat",
  "Early traction",
  "Valuation",
  "Co-investors",
]

const decisionSpeedOptions = ["Days", "1–2 weeks", "1 month+", "Opportunistic"]

const dealSourcingOptions = [
  "Warm intros",
  "Twitter / X",
  "AngelList / platforms",
  "Operator network",
  "Cold inbound",
  "Accelerators / demo days",
]

const biggestPainOptions = [
  "Too many deals",
  "Losing context",
  "Noisy inbound",
  "Tracking follow-ups",
  "Research takes too long",
  "Missed opportunities",
]

const integrationsOptions = ["Gmail", "Calendar", "Drive"]

const discoverTopicsOptions = [
  "AI",
  "B2B SaaS",
  "Developer tools",
  "Climate",
  "Fintech",
  "Healthcare",
  "Consumer",
]

const aiHelpOptions = [
  "Deal summaries",
  "Founder research",
  "Market mapping",
  "Memo drafting",
  "Signal detection",
  "Pipeline prioritization",
]

const aiToneOptions = [
  "Concise & factual",
  "Analytical & opinionated",
  "Deep-dive",
]

function MultiSelect({
  options,
  values,
  onChange,
}: {
  options: string[]
  values: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const checked = values.includes(option)
        return (
          <label key={option} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => {
                if (next) {
                  onChange([...values, option])
                } else {
                  onChange(values.filter((value) => value !== option))
                }
              }}
            />
            <span>{option}</span>
          </label>
        )
      })}
    </div>
  )
}

export default function OnboardingStepper({
  initialData,
}: {
  initialData: OnboardingData | null
}) {
  const [step, setStep] = useState(() => {
    if (!initialData?.status) return 1
    const statusMap: Record<string, number> = {
      step1: 2,
      step2: 3,
      step3: 4,
      step4: 5,
      step5: 6,
    }
    return statusMap[initialData.status] ?? 1
  })
  const [isPending, startTransition] = useTransition()

  const [workspaceName, setWorkspaceName] = useState(
    initialData?.workspace_name ?? "",
  )
  const [workspaceType, setWorkspaceType] = useState(
    initialData?.workspace_type ?? "",
  )
  const [plan, setPlan] = useState<"hobby" | "angel" | "fund">(
    initialData?.selected_plan ?? "hobby",
  )
  const [fundEmail, setFundEmail] = useState(
    initialData?.fund_contact_email ?? "",
  )
  const [fundNotes, setFundNotes] = useState(
    initialData?.fund_contact_notes ?? "",
  )

  const [investorType, setInvestorType] = useState(
    initialData?.investor_type ?? "",
  )
  const [yearsInvesting, setYearsInvesting] = useState(
    initialData?.years_investing ?? "",
  )
  const [checkSize, setCheckSize] = useState(
    initialData?.check_size ?? "",
  )
  const [dealsPerYear, setDealsPerYear] = useState(
    initialData?.deals_per_year ?? "",
  )
  const [stageFocus, setStageFocus] = useState(
    initialData?.stage_focus ?? [],
  )
  const [strategy, setStrategy] = useState(initialData?.strategy ?? [])
  const [coreSectors, setCoreSectors] = useState(
    initialData?.core_sectors ?? [],
  )
  const [frontierInterests, setFrontierInterests] = useState(
    initialData?.frontier_interests ?? [],
  )
  const [geography, setGeography] = useState(initialData?.geography ?? [])

  const [decisionFactorsState, setDecisionFactorsState] = useState(
    initialData?.decision_factors ?? [],
  )
  const [decisionSpeed, setDecisionSpeed] = useState(
    initialData?.decision_speed ?? "",
  )
  const [dealSourcing, setDealSourcing] = useState(
    initialData?.deal_sourcing ?? [],
  )
  const [biggestPain, setBiggestPain] = useState(
    initialData?.biggest_pain ?? "",
  )

  const [integrations, setIntegrations] = useState(
    initialData?.integrations ?? [],
  )

  const [discoverTopics, setDiscoverTopics] = useState(
    initialData?.discover_topics ?? [],
  )
  const [dailyDigest, setDailyDigest] = useState(
    initialData?.daily_digest ?? false,
  )
  const [aiHelp, setAiHelp] = useState(initialData?.ai_help ?? [])
  const [aiTone, setAiTone] = useState(initialData?.ai_tone ?? "")

  const stepTitles = useMemo(
    () => [
      "Workspace & Plan",
      "Investor Profile",
      "Decision Style",
      "Integrations",
      "Preferences",
      "Complete",
    ],
    [],
  )

  const handleNext = async () => {
    if (step === 1) {
      startTransition(async () => {
        await startOnboarding({
          workspaceName,
          workspaceType,
          plan,
          fundContactEmail: fundEmail,
          fundContactNotes: fundNotes,
        })
        setStep(2)
      })
    }
    if (step === 2) {
      startTransition(async () => {
        await saveInvestorProfile({
          investor_type: investorType,
          years_investing: yearsInvesting,
          check_size: checkSize,
          deals_per_year: dealsPerYear,
          stage_focus: stageFocus,
          strategy,
          core_sectors: coreSectors,
          frontier_interests: frontierInterests,
          geography,
        })
        setStep(3)
      })
    }
    if (step === 3) {
      startTransition(async () => {
        await saveDecisionWorkflow({
          decision_factors: decisionFactorsState,
          decision_speed: decisionSpeed,
          deal_sourcing: dealSourcing,
          biggest_pain: biggestPain,
        })
        setStep(4)
      })
    }
    if (step === 4) {
      startTransition(async () => {
        await saveIntegrations({ integrations })
        setStep(5)
      })
    }
    if (step === 5) {
      startTransition(async () => {
        await savePreferences({
          discover_topics: discoverTopics,
          daily_digest: dailyDigest,
          ai_help: aiHelp,
          ai_tone: aiTone,
        })
        setStep(6)
      })
    }
  }

  const handleComplete = async () => {
    startTransition(async () => {
      await completeOnboarding()
      window.location.href = "/pipeline"
    })
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {stepTitles.map((title, index) => (
          <div key={title} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                step === index + 1
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
            >
              {index + 1}
            </span>
            <span className={step === index + 1 ? "text-foreground" : ""}>
              {title}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace name</label>
              <Input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Angel Lead Ventures"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace type</label>
              <Select value={workspaceType} onValueChange={setWorkspaceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {workspaceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Plan</label>
            <Select value={plan} onValueChange={(value) => setPlan(value as "hobby" | "angel" | "fund")}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((planOption) => (
                  <SelectItem key={planOption.value} value={planOption.value}>
                    {planOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Fund plan requires enablement before app access.
            </p>
          </div>

          {plan === "fund" && (
            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <p className="text-sm font-medium">Fund plan contact</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={fundEmail}
                  onChange={(event) => setFundEmail(event.target.value)}
                  placeholder="contact@fund.com"
                />
                <Input
                  value={fundNotes}
                  onChange={(event) => setFundNotes(event.target.value)}
                  placeholder="Notes or requirements"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Investor type</label>
              <Select value={investorType} onValueChange={setInvestorType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investor type" />
                </SelectTrigger>
                <SelectContent>
                  {investorTypes.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Years investing</label>
              <Select value={yearsInvesting} onValueChange={setYearsInvesting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a range" />
                </SelectTrigger>
                <SelectContent>
                  {yearsInvestingOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Typical check size</label>
              <Select value={checkSize} onValueChange={setCheckSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select check size" />
                </SelectTrigger>
                <SelectContent>
                  {checkSizeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deals per year</label>
              <Select value={dealsPerYear} onValueChange={setDealsPerYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select volume" />
                </SelectTrigger>
                <SelectContent>
                  {dealsPerYearOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stage focus</label>
            <MultiSelect
              options={stageFocusOptions}
              values={stageFocus}
              onChange={setStageFocus}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Investment strategy</label>
            <MultiSelect
              options={strategyOptions}
              values={strategy}
              onChange={setStrategy}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Core sectors</label>
            <MultiSelect
              options={coreSectorsOptions}
              values={coreSectors}
              onChange={setCoreSectors}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Frontier interests (optional)</label>
            <MultiSelect
              options={frontierOptions}
              values={frontierInterests}
              onChange={setFrontierInterests}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Geography</label>
            <MultiSelect
              options={geographyOptions}
              values={geography}
              onChange={setGeography}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Top decision factors (up to 3)</label>
            <MultiSelect
              options={decisionFactors}
              values={decisionFactorsState}
              onChange={(next) => setDecisionFactorsState(next.slice(0, 3))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Decision speed</label>
              <Select value={decisionSpeed} onValueChange={setDecisionSpeed}>
                <SelectTrigger>
                  <SelectValue placeholder="Select speed" />
                </SelectTrigger>
                <SelectContent>
                  {decisionSpeedOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Biggest pain today</label>
              <Select value={biggestPain} onValueChange={setBiggestPain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a pain point" />
                </SelectTrigger>
                <SelectContent>
                  {biggestPainOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Deal sourcing</label>
            <MultiSelect
              options={dealSourcingOptions}
              values={dealSourcing}
              onChange={setDealSourcing}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Connect integrations</label>
            <MultiSelect
              options={integrationsOptions}
              values={integrations}
              onChange={setIntegrations}
            />
            <p className="text-xs text-muted-foreground">
              You can skip this step and connect later.
            </p>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Discover topics</label>
            <MultiSelect
              options={discoverTopicsOptions}
              values={discoverTopics}
              onChange={setDiscoverTopics}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={dailyDigest}
              onCheckedChange={(next) => setDailyDigest(Boolean(next))}
            />
            <span className="text-sm">Send me a daily digest</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">How should AI help most (up to 3)</label>
            <MultiSelect
              options={aiHelpOptions}
              values={aiHelp}
              onChange={(next) => setAiHelp(next.slice(0, 3))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">AI tone preference</label>
            <Select value={aiTone} onValueChange={setAiTone}>
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {aiToneOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold">You&apos;re all set</h2>
          <p className="text-muted-foreground">
            We&apos;ve saved your onboarding details. You can update these later
            in settings.
          </p>
          <Button onClick={handleComplete} disabled={isPending}>
            Go to pipeline
          </Button>
        </div>
      )}

      {step < 6 && (
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            type="button"
            disabled={step === 1 || isPending}
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={isPending}>
            {step === 5 ? "Review" : "Continue"}
          </Button>
        </div>
      )}
    </div>
  )
}
