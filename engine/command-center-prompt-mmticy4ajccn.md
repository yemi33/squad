## Conversation History

**User:** analyze the weave architecture, and how it might fit into our existing architecture of porting the cowork ux into rocksteady - 
1. What Is Cowork Weave?
Cowork is a DA++ (Declarative Agent Plus Plus) that acts as an autonomous digital coworker in Microsoft 365 Copilot. The "Weave" variant is the production version that:

Interprets natural language instructions
Breaks them into actionable steps (visible in a side paneal)
Executes across files, calendar, email, Teams, and online services
Supports human-in-the-loop via interactive question cards
Key identifiers:

Property	Value
Agent Name	Cowork
Custom Experience	Weave
GPT ID	T_7e151bfa-7eaa-0802-049f-5d3b98c95e04.weave
Source	MOS3
Manifest Version	1.1.6
Teams App ID	253b14fd-bf42-45e3-91f3-16389f5ce8f2
Type	DeclarativeCopilot
Required Client Features	CustomExperience, FluxV3
Fallback	None (DA++ rendering is required)
Developer	Microsoft Corporation



2. Architecture Overview
+---------------------------+
                          |   m365.cloud.microsoft    |
                          |    (Copilot Chat Host)    |
                          +---------------------------+
                                      |
              +------------+----------+-----------+-------------+
              |            |                      |             |
              v            v                      v             v
    +------------------+  +-----------+  +------------------+  +----------+
    | Coworker CDN     |  | MCS Aether|  | Substrate Search |  | MS Graph |
    | (Azure FrontDoor)|  | Runtime   |  | API              |  | API      |
    | Module Federation|  | (Backend) |  | (People/Files)   |  | (Users)  |
    +------------------+  +-----------+  +------------------+  +----------+
    | home-view.js     |  | /v1/skills|
    | workflow-*.js     |  | /v1/messages
    | ask-user-*.js     |  | /v1/subscribe (SSE)
    | RecentTaskList.js |  | /v1/mru/subscribe (SSE)
    +------------------+  +-----------+


NOT Sydney/TuringBot
Cowork Weave does not use Sydney/TuringBot as its backend. It runs on MCS Aether Runtime — a Power Platform-based agent execution service. The toolu_01... tool invocation IDs in the message payloads indicate Anthropic Claude is the underlying LLM (with GPT 5.x options available via model selector).


3. Client-Side Architecture (1JS/Midgard)
The UX is built as a federated module loaded at runtime from a CDN. Three packages in the 1JS monorepo form the integration layer:
3.1 Package: mcs-coworker
Path: midgard/packages/mcs-coworker/
The federation shell that loads the Coworker experience from CDN:
// CoworkerExperience.tsx
export const CoworkerExperience: React.FC<CoworkerExperienceProps> = ({
  coworkerCdnUrl, coworkerVersion, ...props
}) => {
  useEffect(() => {
    initializeFederation({
      cdnUrl: coworkerCdnUrl || DEFAULT_COWORKER_CDN_URL,
      version: coworkerVersion || undefined,
    });
  }, [coworkerCdnUrl, coworkerVersion]);

  return <FederatedCoworker {...props} />;
};


Default CDN URL: https://coworker-h2exa6fggpeqapef.b01.azurefd.net/coworker
The CDN URL and version can be overridden via ECS feature flags (featureFlags.coworkerCdnUrl, featureFlags.coworkerVersion), enabling independent deployment of the Cowork UI from the midgard release train.
Exports: CoworkerExperience, CoworkerExperienceProps, and types from @ms/coworker-federation.
3.2 Package: m365-chat-coworker-agent
Path: midgard/packages/m365-chat-coworker-agent/
Wires the Coworker into the M365 Chat host with authentication, theming, and feature flags:
// CoworkerAgent.tsx
const CoworkerAgentInternal: React.FC = () => {
  const accountInfo = useAccountInfo();
  const { isDarkMode } = useChatContext();
  const featureFlags = useFeatureFlags();
  const runtime = useRuntime();
  const slots = useHostSlots();  // Speech-to-text integration
  const ring = getCoworkerRing(accountInfo);

  return (
    <CoworkerExperience
      coworkerCdnUrl={featureFlags.coworkerCdnUrl}
      coworkerVersion={featureFlags.coworkerVersion}
      userId={accountInfo.objectId}
      tenantId={accountInfo.tenantId}
      theme={isDarkMode ? "dark" : "light"}
      tokenProviders={tokenProviders}
      slots={slots}
      ring={ring}
    />
  );
};


Token providers passed to the federated module:

graph — Microsoft Graph API
copilotStudio — Copilot Studio
coworker — Coworker-specific auth
powerPlatform — Power Platform
apiHub — API Hub connectors
substrate — Substrate services
spo — SharePoint Online
Additional components:

PersonCard/ — Person card UI (PersonCardInner, PersonCardWrapper, PersonCardHandlers)
SpeechToText/ — Speech input (SpeechToTextButton, SpeechToTextEngine, useGhostTextBridge)
CoworkerAgentError — Error boundary fallback
3.3 Package: scc-cowork-agent
Path: midgard/packages/scc-cowork-agent/
Standalone entry point with homepage and card components:

CoworkAgent.tsx — Root component
CoworkCard.tsx — Task/workflow card rendering
CoworkHomePage.tsx — Homepage layout
CoworkChatHistory/ — Chat history panel
CoworkScopePicker/ — Scope selection UI
CoworkSuggestions/ — Workflow suggestion cards
utils/title2Icon.tsx — Icon resolver


4. Federated UI Bundles (CDN)
The actual rich UX components are loaded at runtime from the CDN via @ms/coworker-federation. These are the JS bundles observed in production:

Bundle	Size	Purpose
home-view.{hash}.js	7 KB	Homepage rendering (task list, greeting)
workflow-suggestions.{hash}.js	38 KB	Workflow/task suggestion cards and templates
RecentTaskList.{hash}.js	3 KB	Recently run tasks list
ask-user-question.{hash}.js	24 KB	Interactive question cards (goal picker, multi-select, free text)
workflow-images-dark-webp.{hash}.js	34 KB	Dark theme workflow illustration assets
81333.{hash}.js	19 KB	Shared chunk (common utilities)
39932.{hash}.js	41 KB	Shared chunk (UI framework components)
80372.{hash}.js	20 KB	Shared chunk (state management)

All served from: https://coworker-h2exa6fggpeqapef.b01.azurefd.net/coworker/latest/static/js/async/


5. Backend: MCS Aether Runtime
The backend is MCS Aether Runtime hosted on Power Platform infrastructure.
Base URL: https://mcsaetherruntime.cus-ia302.gateway.prod.island.powerapps.com
5.1 Skills Catalog — GET /v1/skills
Returns the available skills (tools) the agent can invoke:

Skill	Slash Command	Category	Description
pdf	/pdf	document	Read, create, and manipulate PDF documents
docx	/docx	document	Read, create, and edit Word documents
xlsx	/xlsx	document	Read, create, and manipulate Excel spreadsheets
pptx	/pptx	document	Read, create, and edit PowerPoint presentations
calendar-management	/calendar-management	productivity	Full-spectrum calendar management with purpose-aware classification, block defense, and tiered automation
daily-briefing	/daily-briefing	productivity	Aggregated morning brief from calendar, email, Teams
email	/email	productivity	Email sending, triage, tone adjustment
enterprise-search	/enterprise-search	productivity	Multi-source M365 search with parallel fan-out
meeting-intel	/meeting-intel	productivity	Meeting intelligence, summaries, and prep

Each skill has properties: name, description, source (builtin), category, status (available/degraded), isAdminDeployed, isImmutable, slashCommand.
5.2 Sending Messages — POST /v1/messages
Used to send user input and interactive card responses back to the agent:
Request format (ask_user_answer):
{
  "content": [
    {
      "type": "ask_user_answer",
      "rawEvent": {
        "invocationId": "toolu_01N6u54UMTcxoCunQ3qc5gVq",
        "answers": {
          "0": "OCE Handoff — 9:10 AM"
        }
      }
    }
  ],
  "conversationId": "{tenantId}:{userId}:{sessionId}",
  "role": "user"
}


Response:
{
  "id": "1773504502517-598",
  "messageId": "43f17cd8-f203-4e8d-af3e-667a48fa9bd8",
  "conversationId": "72f988bf-...:c5626104-...:18e1a0ad-...",
  "status": "accepted"
}


Notes:

invocationId uses toolu_01... format, indicating Anthropic Claude tool-use protocol
answers is a map of indexed selections (supports multi-select)
Empty answers ("0": "", "1": "", "2": "") indicate the user skipped/dismissed
Conversation ID format: {tenantId}:{userId}:{sessionId}
Response status 202 Accepted — processing is async, results stream via SSE
5.3 Real-Time Streaming — SSE Endpoints
Two Server-Sent Event streams provide real-time updates:

Endpoint	Purpose
GET /v1/subscribe	Main conversation stream — agent responses, thinking indicators, progress steps, tool results
GET /v1/mru/subscribe	Most Recently Used tasks — updates the task list when tasks complete or new ones start

These are long-lived SSE connections (not WebSocket). The client maintains them for the duration of the session.
CORS headers observed:

access-control-allow-headers: authorization, cache-control, content-type, x-connection-creation-token, x-container-config, x-ms-weave-a...
access-control-allow-origin: https://m365.cloud.microsoft


6. Supporting APIs
6.1 Substrate Search — POST substrate.office.com/search/api/v1/suggestions
Provides context suggestions for the CIQ (Context Input Query) pills. Used to populate the "@" mention picker with relevant entities.
Entities queried: People, File, Event, Message, Chat, Channel, Site, Team
Scenario: MCS.Embedded.CIQ
Example response includes people with confidence scores, job titles, office locations, and proxy email addresses for resolution.
6.2 Microsoft Graph — GET graph.microsoft.com/v1.0/users
Resolves user profiles for display in the UI (person cards, mentions).
Fields requested: id, displayName, mail, userPrincipalName, jobTitle
6.3 Telemetry

Endpoint	Purpose
browser.events.data.microsoft.com/OneCollector/1.0/	OneCollector telemetry (high volume)
noam.events.data.microsoft.com/OneCollector/1.0/	Regional telemetry pipeline
browser.pipe.aria.microsoft.com/Collector/3.0/	ARIA telemetry (bond-compact-binary)
substrate-sdf.office.com/pacman/api/versioned/clientevents	Substrate client events
admin.microsoft.com/api/instrument/logclient	Admin portal instrumentation

6.4 Content Recommendations — arc.msn.com
MSN content selection API for contextual recommendations/cards.


7. Agent Metadata (from .weave endpoint)
The GET /chat/agent/T_7e151bfa-7eaa-0802-049f-5d3b98c95e04.weave response contains the full agent configuration:
Model Selector Options
{
  "defaultModelSelectionId": "Magic",
  "availableModelSelectionOptions": [
    {"id": "Magic", "menuItemTitle": "Auto", "menuItemDescription": "Decides how long to think"},
    {"id": "Chat", "menuItemTitle": "Quick Response", "menuItemDescription": "Answers right away"},
    {"id": "Reasoning", "menuItemTitle": "Think Deeper", "menuItemDescription": "Think longer for better answers"},
    {"id": "Gpt_5_3_Chat", "menuItemTitle": "GPT 5.3 Quick Response"},
    {"id": "Gpt_5_4_Reasoning", "menuItemTitle": "GPT 5.4 Think Deeper"},
    {"id": "Gpt_5_2_Chat", "menuItemTitle": "GPT 5.2 Quick Response"},
    {"id": "Gpt_5_2_Reasoning", "menuItemTitle": "GPT 5.2 Think Deeper"}
  ]
}


Input Control Configuration
{
  "allowedCIQPills": ["People", "Files", "Meetings", "Emails", "Chats", "Channels", "Other"]
}


Agent Description

"A versatile digital coworker that interprets natural language instructions, breaks them into actionable steps, and carries them out across files, applications, and online services to streamline research, organization, and routine knowledge work in a consistent, automated way."




8. UX Components Breakdown — Ownership Map
The Cowork Weave UX is split between three 1JS/midgard packages (shipped with M365 Chat) and CDN-loaded federated bundles (deployed independently). Understanding which layer owns which pixels is critical for debugging and feature work.
┌─────────────────────────────────────────────────┐
│ m365-chat-coworker-agent                        │ ← auth, theme, tokens (invisible)
│  ┌──────────────────────────────────────────┐   │
│  │ scc-cowork-agent                         │   │ ← breadcrumb, homepage, nav
│  │  ┌───────────────────────────────────┐   │   │
│  │  │ mcs-coworker (federation shell)   │   │   │ ← loads CDN ↓
│  │  │  ┌────────────────────────────┐   │   │   │
│  │  │  │ CDN Bundles                │   │   │   │
│  │  │  │  • Chat responses          │   │   │   │
│  │  │  │  • Thinking indicators     │   │   │   │
│  │  │  │  • Ask-user cards          │   │   │   │
│  │  │  │  • Side panel progress     │   │   │   │
│  │  │  │  • Workflow suggestions    │   │   │   │
│  │  │  └────────────────────────────┘   │   │   │
│  │  └───────────────────────────────────┘   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘


8.1 m365-chat-coworker-agent — Host Wiring (Invisible)
This package owns zero visual chrome. It injects context into the CDN-loaded experience:

Responsibility	What it does
Dark/light theme	Reads useChatContext().isDarkMode, passes theme="dark" to CDN
Authentication	Provides 7 token providers (Graph, Substrate, SPO, Copilot Studio, Power Platform, API Hub, Coworker) so CDN bundles can call APIs
Person cards	PersonCard/ components render people mentions (e.g., manager name in urgent callouts)
Speech-to-text	SpeechToText/ components injected via useHostSlots()
Ring/flighting	getCoworkerRing(accountInfo) determines which CDN version loads
Error boundary	CoworkerAgentError fallback if CDN fails to load

8.2 scc-cowork-agent — Navigation Frame & Homepage
This package owns the outer shell and homepage state. Once inside an active conversation, most rendering hands off to CDN.

Visible Element	Component
Breadcrumb: "Cowork > Tasks > [Task Name]"	CoworkAgent.tsx (root orchestrator)
Chat history list (homepage view)	CoworkChatHistory/
Suggestion cards (homepage view)	CoworkSuggestions/
Task/workflow cards	CoworkCard.tsx
Scope picker	CoworkScopePicker/
Icons next to task names	utils/title2Icon.tsx
Homepage layout	CoworkHomePage.tsx

8.3 mcs-coworker — Federation Shell (Invisible)
The bootstrap layer that calls initializeFederation() with the CDN URL and loads FederatedCoworker. It is the reason CDN bundles appear on screen at all. No visible UI of its own — it's the bridge between the 1JS host and the independently-deployed CDN experience.
8.4 CDN Federated Bundles — The Rich Interactive Experience
These are loaded at runtime from coworker-*.b01.azurefd.net and own everything inside the active conversation view. They react to the SSE stream from Aether Runtime.

Visible Element	CDN Bundle	Size
Chat response area (streaming markdown, highlighted callouts)	home-view.{hash}.js + shared chunks	7 KB + ~80 KB shared
"Thought for Xm" reasoning indicators	home-view.{hash}.js	—
Sub-task expansions (e.g., "Calendar management weekly review | 14 | 5.0m")	workflow-suggestions.{hash}.js	38 KB
Recent tasks list (homepage)	RecentTaskList.{hash}.js	3 KB
Interactive question cards (weekly goal picker, multi-select, free text, Skip button, "1 of 4" pagination)	ask-user-question.{hash}.js	24 KB
Dark theme workflow illustrations	workflow-images-dark-webp.{hash}.js	34 KB

Side Panel (Details) — entirely CDN-rendered:

Element	Data Source
Progress bar (e.g., "75%")	SSE /v1/subscribe progress events
Step tracker with status dots (complete/in-progress/pending)	SSE progress events
Output folder expandable	SSE task metadata
Input folder expandable	SSE task metadata
Skills expandable	SSE task metadata

Navigation (top bar):

Element	Owner
Task breadcrumb ("Cowork > Tasks > ...")	scc-cowork-agent
Toolbar icons (share, settings, layout)	CDN / M365 Chat host

8.5 Why This Split Matters
The 3 1JS packages are the frame (auth + navigation + homepage). The CDN bundles are the brain's UI (everything that reacts to the SSE stream from Aether Runtime). This split lets the Cowork team deploy UX updates to CDN independently of the M365 Chat release train — no midgard build or deployment required for conversation-level UI changes.


9. Request Flow (End-to-End)
1. User opens Cowork agent
   GET /chat/agent/T_...weave  →  Agent metadata + DA++ config
   Client detects customExperience.name = "Weave"
   Loads FederatedCoworker from CDN

2. Homepage renders
   GET /v1/skills  →  Skills catalog
   GET /v1/mru/subscribe  →  SSE stream for recent tasks
   POST substrate.office.com/.../suggestions  →  People/file pills

3. User submits a prompt (e.g., "Help me organize my week")
   POST /v1/messages  →  {content: [{type: "user_message", ...}], role: "user"}
   GET /v1/subscribe  →  SSE stream opens for this conversation

4. Agent processes (streamed via SSE)
   ← SSE: thinking indicator ("Thought for 5.2m")
   ← SSE: progress update (step 1: "Gather context")
   ← SSE: tool invocation (calendar-management skill)
   ← SSE: ask_user_question (interactive card)

5. User answers interactive card
   POST /v1/messages  →  {content: [{type: "ask_user_answer", answers: {...}}]}

6. Agent continues execution
   ← SSE: progress update (step 2: "Scan calendar")
   ← SSE: streaming text response with findings
   ← SSE: another ask_user_question if needed

7. Task completes
   ← SSE: final response with summary
   ← SSE: progress = 100%
   MRU SSE stream updates with completed task




10. Task Resumption and Session Persistence
Cowork Weave supports resuming tasks across sessions. The architecture is designed for persistent, server-side state with a stateless client.
10.1 Conversation ID — The Persistence Key
Every interaction is tied to a stable, server-generated conversation ID with three parts:
{tenantId}:{userId}:{sessionId}
72f988bf-86f1-41af-91ab-2d7cd011db47:c5626104-61a6-43b2-846d-9b1e70c6ec68:18e1a0ad-f65e-4b5f-9e19-abf7fc09cd3f



Segment	Value	Purpose
Part 1	72f988bf-...	Tenant ID (Azure AD)
Part 2	c5626104-...	User ID (object ID)
Part 3	18e1a0ad-...	Session/Task ID (unique per task run)

All POST /v1/messages calls reference the same conversation ID — the server owns the full execution state, not the client.
10.2 Server-Side State Model
The Aether Runtime uses a server-holds-state pattern:

202 Accepted responses — message sends are async; the server queues them and streams results via SSE
SSE reconnection — if the client disconnects and reconnects to /v1/subscribe, the server can replay the current state
Pending interactions — if the agent is waiting on an ask_user_question, the SSE re-emits the pending question card on reconnect
scheduledPromptsEnabled=true — the x-container-config header confirms the backend can hold and schedule prompts, supporting persistent server-side state
10.3 MRU (Most Recently Used) Task History
The /v1/mru/subscribe SSE endpoint streams the user's task history. The RecentTaskList.js federated bundle renders this as the "Cowork > Tasks" navigation in the breadcrumb. Users can:

See previously completed tasks
Navigate to prior task results
Resume paused/interrupted tasks
10.4 Resumption Scenarios

Scenario	What Happens
Browser refresh mid-task	Client reconnects SSE /v1/subscribe with the same conversationId → server replays current progress and any pending ask_user_question cards
Close and reopen Cowork	MRU subscribe streams task history → user clicks a task to view results or resume
Return to a completed task	MRU list shows the task → click navigates to the final response and output
Agent waiting for user input	The pending ask_user_question is re-emitted via SSE → user can answer and execution continues
Network interruption	SSE auto-reconnects → server streams from current state, not from scratch

10.5 Session Authentication Headers
Three auth-related headers maintain session continuity across reconnections:
x-ms-weave-auth: Bearer {JWT}              → User identity (Weave-specific auth)
x-connection-creation-token: Bearer {JWT}   → Connection-level auth (per SSE connection)
x-container-config: renderUi=true;          → Container configuration
    searchBackend=bing;
    scheduledPromptsEnabled=true;
    acceptLanguage=en-US


The x-ms-weave-auth JWT authenticates the user. The x-connection-creation-token is a separate JWT used to establish SSE connections — it may be short-lived and refreshable without disrupting the conversation.
10.6 Long-Running Tasks
The HAR timeline reveals that Cowork Weave tasks run for minutes at a time with the agent working autonomously between user interactions:
16:05:02  Page load + agent init
16:05:03  CDN bundles loaded, skills fetched, search suggestions fetched
16:05:05  Graph user resolution
          ── 90 seconds of autonomous agent work (SSE streaming) ──
16:06:35  ask-user-question.js lazy-loaded (first interactive card appears)
          ── 107 seconds waiting for user + more agent work ──
16:08:22  User answers first card ("OCE Handoff — 9:10 AM")
          ── 261 seconds of autonomous agent work ──
16:12:43  User answers second card (skipped — empty answers)


Total session: ~7.5 minutes. The agent ran autonomously for most of that time.
How Long-Running Execution Works

Fire-and-forget messages — POST /v1/messages returns 202 Accepted immediately. The server processes asynchronously and streams results via SSE. The client never blocks waiting for a response.
SSE as the heartbeat — the /v1/subscribe connection stays open for the full task duration. The server pushes:Thinking indicators ("Thought for 5.2m")
Progress step updates (step 1 → step 2 → step 3)
Streaming text chunks
Interactive cards when user input is needed
Completion signals
Lazy-loaded UI components — the ask-user-question.js bundle wasn't loaded at page init. It was fetched 90 seconds in, only when the agent first needed user input. This confirms the agent was working autonomously before that point.
Multi-minute autonomous execution — the 261-second gap between the two user answers (16:08:22 → 16:12:43) shows the agent continued processing for over 4 minutes after receiving the first answer before asking the next question.
Implications for Long-Running Tasks

Aspect	Behavior
Agent autonomy	Runs for minutes without user intervention; only pauses for explicit ask_user_question
No polling	Client doesn't poll — SSE push model means zero wasted requests
Lazy bundle loading	UI components for interactive cards loaded on-demand, not at init
Background execution	If the user switches tabs, the SSE connection stays alive and the server keeps working
Task timeout	Not observed in this HAR; likely configurable server-side
Progress visibility	Side panel shows real-time step progress so the user knows the agent is working

What Happens If the User Leaves During a Long Task?
Based on the architecture:

Tab stays open — SSE stays connected, progress updates accumulate, user sees results when they return
Tab closed — SSE disconnects, but server-side execution likely continues (fire-and-forget model). On reopen, MRU shows the task. If the agent hit an ask_user_question, it would be pending for the user.
Laptop sleep / network drop — SSE reconnects on wake. If the task completed while disconnected, the MRU shows it as complete with results.
10.7 Client is Stateless
The client (midgard packages) carries no conversation state. It is purely a renderer:

Receives the conversationId from the server on task creation
Passes it back on every POST /v1/messages
Renders whatever the SSE stream sends (text, cards, progress updates)
If the client crashes, the server still holds the full task state
This means the "resume" capability is inherent to the architecture — any client instance that knows the conversationId and has valid auth tokens can pick up where the previous session left off.


11. Cowork Weave vs. Cowork (Sydney Variant)
There are two variants of "Cowork" in the codebase:

Aspect	Cowork Weave (This Document)	Cowork / NotebookCoworkAgent (Sydney)
Backend	MCS Aether Runtime (Power Platform)	Sydney/TuringBot (Helix + Extension)
Custom Experience	Weave	Cowork (presumed)
LLM	Claude (toolu_01...) + GPT 5.x options	Claude Sonnet 4.6 / GPT-5 Codex
Skills	Aether skill system (/v1/skills)	DeepWork tools + NotebookBerry plugin
Streaming	SSE via /v1/subscribe	Sydney chat streaming protocol
Agent Config	MOS3 manifest (T_7e151bfa...)	BuiltInAgents/Cowork/latest.json + AgentRuntime
Code Location (Backend)	Not in Sydney repo	Microsoft.TuringBot.Extensions/by-product/M365/Cowork/
Code Location (Client)	midgard/packages/{mcs-coworker, m365-chat-coworker-agent, scc-cowork-agent}	Same client packages



12. How Weave Was Added to the Agent Store (MOS Catalog)
Cowork Weave is published to the MOS3 (MetaOS) Catalog — the same catalog that powers Teams app discovery. The registration lives entirely outside the Sydney repo.
12.1 Publishing Flow
1. Build Unified Application Package (UAP)
   ├── Unified Application Manifest
   │   ├── Short name: "Cowork"
   │   ├── Developer: "Microsoft Corporation"
   │   └── Teams App ID: 253b14fd-bf42-45e3-91f3-16389f5ce8f2
   └── Declarative Agent Manifest (v1.4 schema)
       ├── type: DeclarativeCopilot
       ├── behavior_overrides.x-custom_experience.name: "Weave"
       └── Required client features: CustomExperience, FluxV3

2. Upload UAP via Nexus Portal
   └── File: Cowork/appPackage/build/appPackage.dev.zip
   └── Button: "Upload MOS Config" in Nexus Portal

3. MOS assigns TitleId
   └── T_7e151bfa-7eaa-0802-049f-5d3b98c95e04

4. Immediate indexing via shoulder tap
   ├── MOS sends signal to Substrate Search Assistants (SSA)
   ├── SSA rebuilds user app index (immediate, not 24-hour cycle)
   └── Agent becomes discoverable in Entity Serve


12.2 Agent Discovery at Runtime
When a user opens M365 Copilot, the client calls the /getGptList API. Sydney's MetaOsGptProvider queries Entity Serve, which returns agents from the user's pre-built index. For Weave, the response looks like:
{
    "gptId": "T_7e151bfa-7eaa-0802-049f-5d3b98c95e04.weave",
    "gptIdentifier": {
        "source": "MOS3",
        "version": "1.1.6",
        "metaOSGlobalIdentifier": {
            "metaOSSharedServicesTitleId": "T_7e151bfa-7eaa-0802-049f-5d3b98c95e04",
            "teamsAppId": "253b14fd-bf42-45e3-91f3-16389f5ce8f2"
        }
    },
    "type": "DeclarativeCopilot",
    "customExperience": {
        "name": "Weave"
    },
    "requiredClientFeatures": [
        "CustomExperience",
        "FluxV3"
    ]
}


12.3 Client-Side Custom Experience Routing
The requiredClientFeatures array acts as a gating mechanism:

Client receives agent list from /getGptList
Client checks requiredClientFeatures — does it support CustomExperience?No → Agent is hidden entirely (prevents broken UX on older clients)
Yes → Client reads customExperience.name
Client matches "Weave" to the mcs-coworker federation shell
Federation shell loads CDN bundles from Azure Front Door
CDN bundles connect to MCS Aether Runtime (not Sydney/TuringBot)
/getGptList response
    │
    ▼
Client: requiredClientFeatures includes "CustomExperience"?
    ├── No  → Agent hidden
    └── Yes → Read customExperience.name
                │
                ▼
            name = "Weave"
                │
                ▼
            Load mcs-coworker federation shell
                │
                ▼
            initializeFederation({ cdnUrl, version })
                │
                ▼
            CDN bundles render Weave UX
            Connect to MCS Aether Runtime via SSE


12.4 Ring Progression
Weave's rollout is controlled in two places:

Layer	Mechanism	Controls
MOS Catalog	Security groups	Which users/tenants see the agent in /getGptList
CDN	ECS feature flags (coworkerCdnUrl, coworkerVersion)	Which version of the Weave UI loads
Aether Runtime	Server-side config	Which skills and model options are available

Ring progression follows: SDF → MSIT → Production → Government clouds
12.5 Indexing and Propagation Timing

Event	Latency
Upload via Nexus Portal / Teams App Management	Immediate — MOS sends shoulder tap to SSA
Sideloaded via Teams App CLI	Up to 24 hours — no shoulder tap, waits for scheduled index rebuild
Manifest change (version bump)	Immediate if re-uploaded via portal; otherwise next 24-hour sync
x- experimental properties	Stripped during 24-hour MOS ↔ Teams catalog sync (only preserved if uploaded via Teams App Management directly)

12.6 Why There's No Trace in the Sydney Repo
Unlike Sydney-backed agents that require a 6-file registration (Bond enums, INI configs, BuiltInAgent manifests), Cowork Weave's registration lives entirely in MOS3. The Sydney repo has no AgentTitleIdConfig.ini entry for T_7e151bfa-... because:

The backend is MCS Aether Runtime, not Sydney/TuringBot
The manifest is managed by the MCS team in the Nexus Portal
Sydney only sees Weave when MetaOsGptProvider queries Entity Serve and gets back a MOS3-sourced agent with customExperience.name = "Weave"
At that point, Sydney returns the agent metadata to the client via /getGptList — the client handles the rest


13. Key File Locations
Client (1JS/Midgard Repo)

Path	Purpose
midgard/packages/mcs-coworker/src/components/CoworkerExperience.tsx	Federation shell
midgard/packages/mcs-coworker/src/constants.ts	CDN URL constant
midgard/packages/mcs-coworker/src/hooks/useHostContext.ts	Host context hook
midgard/packages/m365-chat-coworker-agent/src/CoworkerAgent.tsx	M365 Chat integration
midgard/packages/m365-chat-coworker-agent/src/SpeechToText/	Voice input
midgard/packages/m365-chat-coworker-agent/src/PersonCard/	People cards
midgard/packages/scc-cowork-agent/src/CoworkAgent.tsx	Standalone entry
midgard/packages/scc-cowork-agent/src/pages/CoworkHomePage.tsx	Homepage
midgard/packages/scc-cowork-agent/src/components/CoworkCard.tsx	Task cards



14. Resources

Resource	Link/Info
DA++ Wiki	https://aka.ms/da/wiki
DA++ Teams Channel	"Copilot 1st party agents UX (DAPlusPlus)"
CDN (Production)	https://coworker-h2exa6fggpeqapef.b01.azurefd.net/coworker
Aether Runtime	https://mcsaetherruntime.cus-ia302.gateway.prod.island.powerapps.com
1JS Repo	https://dev.azure.com/office/Office/_git/1JS?path=/midgard



Document Created: 2026-03-14 Based on: HAR file analysis (cowork_weave.har) + codebase analysis of Sydney and 1JS/midgard repos

---

**User:** analyze the weave architecture, and how it might fit into our existing architecture of porting the cowork ux into rocksteady - 
1. What Is Cowork Weave?
Cowork is a DA++ (Declarative Agent Plus Plus) that acts as an autonomous digital coworker in Microsoft 365 Copilot. The "Weave" variant is the production version that:

Interprets natural language instructions
Breaks them into actionable steps (visible in a side paneal)
Executes across files, calendar, email, Teams, and online services
Supports human-in-the-loop via interactive question cards
Key identifiers:

Property	Value
Agent Name	Cowork
Custom Experience	Weave
GPT ID	T_7e151bfa-7eaa-0802-049f-5d3b98c95e04.weave
Source	MOS3
Manifest Version	1.1.6
Teams App ID	253b14fd-bf42-45e3-91f3-16389f5ce8f2
Type	DeclarativeCopilot
Required Client Features	CustomExperience, FluxV3
Fallback	None (DA++ rendering is required)
Developer	Microsoft Corporation



2. Architecture Overview
+---------------------------+
                          |   m365.cloud.microsoft    |
                          |    (Copilot Chat Host)    |
                          +---------------------------+
                                      |
              +------------+----------+-----------+-------------+
              |            |                      |             |
              v            v                      v             v
    +------------------+  +-----------+  +------------------+  +----------+
    | Coworker CDN     |  | MCS Aether|  | Substrate Search |  | MS Graph |
    | (Azure FrontDoor)|  | Runtime   |  | API              |  | API      |
    | Module Federation|  | (Backend) |  | (People/Files)   |  | (Users)  |
    +------------------+  +-----------+  +------------------+  +----------+
    | home-view.js     |  | /v1/skills|
    | workflow-*.js     |  | /v1/messages
    | ask-user-*.js     |  | /v1/subscribe (SSE)
    | RecentTaskList.js |  | /v1/mru/subscribe (SSE)
    +------------------+  +-----------+


NOT Sydney/TuringBot
Cowork Weave does not use Sydney/TuringBot as its backend. It runs on MCS Aether Runtime — a Power Platform-based agent execution service. The toolu_01... tool invocation IDs in the message payloads indicate Anthropic Claude is the underlying LLM (with GPT 5.x options available via model selector).


3. Client-Side Architecture (1JS/Midgard)
The UX is built as a federated module loaded at runtime from a CDN. Three packages in the 1JS monorepo form the integration layer:
3.1 Package: mcs-coworker
Path: midgard/packages/mcs-coworker/
The federation shell that loads the Coworker experience from CDN:
// CoworkerExperience.tsx
export const CoworkerExperience: React.FC<CoworkerExperienceProps> = ({
  coworkerCdnUrl, coworkerVersion, ...props
}) => {
  useEffect(() => {
    initializeFederation({
      cdnUrl: coworkerCdnUrl || DEFAULT_COWORKER_CDN_URL,
      version: coworkerVersion || undefined,
    });
  }, [coworkerCdnUrl, coworkerVersion]);

  return <FederatedCoworker {...props} />;
};


Default CDN URL: https://coworker-h2exa6fggpeqapef.b01.azurefd.net/coworker
The CDN URL and version can be overridden via ECS feature flags (featureFlags.coworkerCdnUrl, featureFlags.coworkerVersion), enabling independent deployment of the Cowork UI from the midgard release train.
Exports: CoworkerExperience, CoworkerExperienceProps, and types from @ms/coworker-federation.
3.2 Package: m365-chat-coworker-agent
Path: midgard/packages/m365-chat-coworker-agent/
Wires the Coworker into the M365 Chat host with authentication, theming, and feature flags:
// CoworkerAgent.tsx
const CoworkerAgentInternal: React.FC = () => {
  const accountInfo = useAccountInfo();
  const { isDarkMode } = useChatContext();
  const featureFlags = useFeatureFlags();
  const runtime = useRuntime();
  const slots = useHostSlots();  // Speech-to-text integration
  const ring = getCoworkerRing(accountInfo);

  return (
    <CoworkerExperience
      coworkerCdnUrl={featureFlags.coworkerCdnUrl}
      coworkerVersion={featureFlags.coworkerVersion}
      userId={accountInfo.objectId}
      tenantId={accountInfo.tenantId}
      theme={isDarkMode ? "dark" : "light"}
      tokenProviders={tokenProviders}
      slots={slots}
      ring={ring}
    />
  );
};


Token providers passed to the federated module:

graph — Microsoft Graph API
copilotStudio — Copilot Studio
coworker — Coworker-specific auth
powerPlatform — Power Platform
apiHub — API Hub connectors
substrate — Substrate services
spo — SharePoint Online
Additional components:

PersonCard/ — Person card UI (PersonCardInner, PersonCardWrapper, PersonCardHandlers)
SpeechToText/ — Speech input (SpeechToTextButton, SpeechToTextEngine, useGhostTextBridge)
CoworkerAgentError — Error boundary fallback
3.3 Package: scc-cowork-agent
Path: midgard/packages/scc-cowork-agent/
Standalone entry point with homepage and card components:

CoworkAgent.tsx — Root component
CoworkCard.tsx — Task/workflow card rendering
CoworkHomePage.tsx — Homepage layout
CoworkChatHistory/ — Chat history panel
CoworkScopePicker/ — Scope selection UI
CoworkSuggestions/ — Workflow suggestion cards
utils/title2Icon.tsx — Icon resolver


4. Federated UI Bundles (CDN)
The actual rich UX components are loaded at runtime from the CDN via @ms/coworker-federation. These are the JS bundles observed in production:

Bundle	Size	Purpose
home-view.{hash}.js	7 KB	Homepage rendering (task list, greeting)
workflow-suggestions.{hash}.js	38 KB	Workflow/task suggestion cards and templates
RecentTaskList.{hash}.js	3 KB	Recently run tasks list
ask-user-question.{hash}.js	24 KB	Interactive question cards (goal picker, multi-select, free text)
workflow-images-dark-webp.{hash}.js	34 KB	Dark theme workflow illustration assets
81333.{hash}.js	19 KB	Shared chunk (common utilities)
39932.{hash}.js	41 KB	Shared chunk (UI framework components)
80372.{hash}.js	20 KB	Shared chunk (state management)

All served from: https://coworker-h2exa6fggpeqapef.b01.azurefd.net/coworker/latest/static/js/async/


5. Backend: MCS Aether Runtime
The backend is MCS Aether Runtime hosted on Power Platform infrastructure.
Base URL: https://mcsaetherruntime.cus-ia302.gateway.prod.island.powerapps.com
5.1 Skills Catalog — GET /v1/skills
Returns the available skills (tools) the agent can invoke:

Skill	Slash Command	Category	Description
pdf	/pdf	document	Read, create, and manipulate PDF documents
docx	/docx	document	Read, create, and edit Word documents
xlsx	/xlsx	document	Read, create, and manipulate Excel spreadsheets
pptx	/pptx	document	Read, create, and edit PowerPoint presentations
calendar-management	/calendar-management	productivity	Full-spectrum calendar management with purpose-aware classification, block defense, and tiered automation
daily-briefing	/daily-briefing	productivity	Aggregated morning brief from calendar, email, Teams
email	/email	productivity	Email sending, triage, tone adjustment
enterprise-search	/enterprise-search	productivity	Multi-source M365 search with parallel fan-out
meeting-intel	/meeting-intel	productivity	Meeting intelligence, summaries, and prep

Each skill has properties: name, description, source (builtin), category, status (available/degraded), isAdminDeployed, isImmutable, slashCommand.
5.2 Sending Messages — POST /v1/messages
Used to send user input and interactive card responses back to the agent:
Request format (ask_user_answer):
{
  "content": [
    {
      "type": "ask_user_answer",
      "rawEvent": {
        "invocationId": "toolu_01N6u54UMTcxoCunQ3qc5gVq",
        "answers": {
          "0": "OCE Handoff — 9:10 AM"
        }
      }
    }
  ],
  "conversationId": "{tenantId}:{userId}:{sessionId}",
  "role": "user"
}


Response:
{
  "id": "1773504502517-598",
  "messageId": "43f17cd8-f203-4e8d-af3e-667a48fa9bd8",
  "conversationId": "72f988bf-...:c5626104-...:18e1a0ad-...",
  "status": "accepted"
}


Notes:

invocationId uses toolu_01... format, indicating Anthropic Claude tool-use protocol
answers is a map of indexed selections (supports multi-select)
Empty answers ("0": "", "1": "", "2": "") indicate the user skipped/dismissed
Conversation ID format: {tenantId}:{userId}:{sessionId}
Response status 202 Accepted — processing is async, results stream via SSE
5.3 Real-Time Streaming — SSE Endpoints
Two Server-Sent Event streams provide real-time updates:

Endpoint	Purpose
GET /v1/subscribe	Main conversation stream — agent responses, thinking indicators, progress steps, tool results
GET /v1/mru/subscribe	Most Recently Used tasks — updates the task list when tasks complete or new ones start

These are long-lived SSE connections (not WebSocket). The client maintains them for the duration of the session.
CORS headers observed:

access-control-allow-headers: authorization, cache-control, content-type, x-connection-creation-token, x-container-config, x-ms-weave-a...
access-control-allow-origin: https://m365.cloud.microsoft


6. Supporting APIs
6.1 Substrate Search — POST substrate.office.com/search/api/v1/suggestions
Provides context suggestions for the CIQ (Context Input Query) pills. Used to populate the "@" mention picker with relevant entities.
Entities queried: People, File, Event, Message, Chat, Channel, Site, Team
Scenario: MCS.Embedded.CIQ
Example response includes people with confidence scores, job titles, office locations, and proxy email addresses for resolution.
6.2 Microsoft Graph — GET graph.microsoft.com/v1.0/users
Resolves user profiles for display in the UI (person cards, mentions).
Fields requested: id, displayName, mail, userPrincipalName, jobTitle
6.3 Telemetry

Endpoint	Purpose
browser.events.data.microsoft.com/OneCollector/1.0/	OneCollector telemetry (high volume)
noam.events.data.microsoft.com/OneCollector/1.0/	Regional telemetry pipeline
browser.pipe.aria.microsoft.com/Collector/3.0/	ARIA telemetry (bond-compact-binary)
substrate-sdf.office.com/pacman/api/versioned/clientevents	Substrate client events
admin.microsoft.com/api/instrument/logclient	Admin portal instrumentation

6.4 Content Recommendations — arc.msn.com
MSN content selection API for contextual recommendations/cards.


7. Agent Metadata (from .weave endpoint)
The GET /chat/agent/T_7e151bfa-7eaa-0802-049f-5d3b98c95e04.weave response contains the full agent configuration:
Model Selector Options
{
  "defaultModelSelectionId": "Magic",
  "availableModelSelectionOptions": [
    {"id": "Magic", "menuItemTitle": "Auto", "menuItemDescription": "Decides how long to think"},
    {"id": "Chat", "menuItemTitle": "Quick Response", "menuItemDescription": "Answers right away"},
    {"id": "Reasoning", "menuItemTitle": "Think Deeper", "menuItemDescription": "Think longer for better answers"},
    {"id": "Gpt_5_3_Chat", "menuItemTitle": "GPT 5.3 Quick Response"},
    {"id": "Gpt_5_4_Reasoning", "menuItemTitle": "GPT 5.4 Think Deeper"},
    {"id": "Gpt_5_2_Chat", "menuItemTitle": "GPT 5.2 Quick Response"},
    {"id": "Gpt_5_2_Reasoning", "menuItemTitle": "GPT 5.2 Think Deeper"}
  ]
}


Input Control Configuration
{
  "allowedCIQPills": ["People", "Files", "Meetings", "Emails", "Chats", "Channels", "Other"]
}


Agent Description

"A versatile digital coworker that interprets natural language instructions, breaks them into actionable steps, and carries them out across files, applications, and online services to streamline research, organization, and routine knowledge work in a consistent, automated way."




8. UX Components Breakdown — Ownership Map
The Cowork Weave UX is split between three 1JS/midgard packages (shipped with M365 Chat) and CDN-loaded federated bundles (deployed independently). Understanding which layer owns which pixels is critical for debugging and feature work.
┌─────────────────────────────────────────────────┐
│ m365-chat-coworker-agent                        │ ← auth, theme, tokens (invisible)
│  ┌──────────────────────────────────────────┐   │
│  │ scc-cowork-agent                         │   │ ← breadcrumb, homepage, nav
│  │  ┌───────────────────────────────────┐   │   │
│  │  │ mcs-coworker (federation shell)   │   │   │ ← loads CDN ↓
│  │  │  ┌────────────────────────────┐   │   │   │
│  │  │  │ CDN Bundles                │   │   │   │
│  │  │  │  • Chat responses          │   │   │   │
│  │  │  │  • Thinking indicators     │   │   │   │
│  │  │  │  • Ask-user cards          │   │   │   │
│  │  │  │  • Side panel progress     │   │   │   │
│  │  │  │  • Workflow suggestions    │   │   │   │
│  │  │  └────────────────────────────┘   │   │   │
│  │  └───────────────────────────────────┘   │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘


8.1 m365-chat-coworker-agent — Host Wiring (Invisible)
This package owns zero visual chrome. It injects context into the CDN-loaded experience:

Responsibility	What it does
Dark/light theme	Reads useChatContext().isDarkMode, passes theme="dark" to CDN
Authentication	Provides 7 token providers (Graph, Substrate, SPO, Copilot Studio, Power Platform, API Hub, Coworker) so CDN bundles can call APIs
Person cards	PersonCard/ components render people mentions (e.g., manager name in urgent callouts)
Speech-to-text	SpeechToText/ components injected via useHostSlots()
Ring/flighting	getCoworkerRing(accountInfo) determines which CDN version loads
Error boundary	CoworkerAgentError fallback if CDN fails to load

8.2 scc-cowork-agent — Navigation Frame & Homepage
This package owns the outer shell and homepage state. Once inside an active conversation, most rendering hands off to CDN.

Visible Element	Component
Breadcrumb: "Cowork > Tasks > [Task Name]"	CoworkAgent.tsx (root orchestrator)
Chat history list (homepage view)	CoworkChatHistory/
Suggestion cards (homepage view)	CoworkSuggestions/
Task/workflow cards	CoworkCard.tsx
Scope picker	CoworkScopePicker/
Icons next to task names	utils/title2Icon.tsx
Homepage layout	CoworkHomePage.tsx

8.3 mcs-coworker — Federation Shell (Invisible)
The bootstrap layer that calls initializeFederation() with the CDN URL and loads FederatedCoworker. It is the reason CDN bundles appear on screen at all. No visible UI of its own — it's the bridge between the 1JS host and the independently-deployed CDN experience.
8.4 CDN Federated Bundles — The Rich Interactive Experience
These are loaded at runtime from coworker-*.b01.azurefd.net and own everything inside the active conversation view. They react to the SSE stream from Aether Runtime.

Visible Element	CDN Bundle	Size
Chat response area (streaming markdown, highlighted callouts)	home-view.{hash}.js + shared chunks	7 KB + ~80 KB shared
"Thought for Xm" reasoning indicators	home-view.{hash}.js	—
Sub-task expansions (e.g., "Calendar management weekly review | 14 | 5.0m")	workflow-suggestions.{hash}.js	38 KB
Recent tasks list (homepage)	RecentTaskList.{hash}.js	3 KB
Interactive question cards (weekly goal picker, multi-select, free text, Skip button, "1 of 4" pagination)	ask-user-question.{hash}.js	24 KB
Dark theme workflow illustrations	workflow-images-dark-webp.{hash}.js	34 KB

Side Panel (Details) — entirely CDN-rendered:

Element	Data Source
Progress bar (e.g., "75%")	SSE /v1/subscribe progress events
Step tracker with status dots (complete/in-progress/pending)	SSE progress events
Output folder expandable	SSE task metadata
Input folder expandable	SSE task metadata
Skills expandable	SSE task metadata

Navigation (top bar):

Element	Owner
Task breadcrumb ("Cowork > Tasks > ...")	scc-cowork-agent
Toolbar icons (share, settings, layout)	CDN / M365 Chat host

8.5 Why This Split Matters
The 3 1JS packages are the frame (auth + navigation + homepage). The CDN bundles are the brain's UI (everything that reacts to the SSE stream from Aether Runtime). This split lets the Cowork team deploy UX updates to CDN independently of the M365 Chat release train — no midgard build or deployment required for conversation-level UI changes.


9. Request Flow (End-to-End)
1. User opens Cowork agent
   GET /chat/agent/T_...weave  →  Agent metadata + DA++ config
   Client detects customExperience.name = "Weave"
   Loads FederatedCoworker from CDN

2. Homepage renders
   GET /v1/skills  →  Skills catalog
   GET /v1/mru/subscribe  →  SSE stream for recent tasks
   POST substrate.office.com/.../suggestions  →  People/file pills

3. User submits a prompt (e.g., "Help me organize my week")
   POST /v1/messages  →  {content: [{type: "user_message", ...}], role: "user"}
   GET /v1/subscribe  →  SSE stream opens for this conversation

4. Agent processes (streamed via SSE)
   ← SSE: thinking indicator ("Thought for 5.2m")
   ← SSE: progress update (step 1: "Gather context")
   ← SSE: tool invocation (calendar-management skill)
   ← SSE: ask_user_question (interactive card)

5. User answers interactive card
   POST /v1/messages  →  {content: [{type: "ask_user_answer", answers: {...}}]}

6. Agent continues execution
   ← SSE: progress update (step 2: "Scan calendar")
   ← SSE: streaming text response with findings
   ← SSE: another ask_user_question if needed

7. Task completes
   ← SSE: final response with summary
   ← SSE: progress = 100%
   MRU SSE stream updates with completed task




10. Task Resumption and Session Persistence
Cowork Weave supports resuming tasks across sessions. The architecture is designed for persistent, server-side state with a stateless client.
10.1 Conversation ID — The Persistence Key
Every interaction is tied to a stable, server-generated conversation ID with three parts:
{tenantId}:{userId}:{sessionId}
72f988bf-86f1-41af-91ab-2d7cd011db47:c5626104-61a6-43b2-846d-9b1e70c6ec68:18e1a0ad-f65e-4b5f-9e19-abf7fc09cd3f



Segment	Value	Purpose
Part 1	72f988bf-...	Tenant ID (Azure AD)
Part 2	c5626104-...	User ID (object ID)
Part 3	18e1a0ad-...	Session/Task ID (unique per task run)

All POST /v1/messages calls reference the same conversation ID — the server owns the full execution state, not the client.
10.2 Server-Side State Model
The Aether Runtime uses a server-holds-state pattern:

202 Accepted responses — message sends are async; the server queues them and streams results via SSE
SSE reconnection — if the client disconnects and reconnects to /v1/subscribe, the server can replay the current state
Pending interactions — if the agent is waiting on an ask_user_question, the SSE re-emits the pending question card on reconnect
scheduledPromptsEnabled=true — the x-container-config header confirms the backend can hold and schedule prompts, supporting persistent server-side state
10.3 MRU (Most Recently Used) Task History
The /v1/mru/subscribe SSE endpoint streams the user's task history. The RecentTaskList.js federated bundle renders this as the "Cowork > Tasks" navigation in the breadcrumb. Users can:

See previously completed tasks
Navigate to prior task results
Resume paused/interrupted tasks
10.4 Resumption Scenarios

Scenario	What Happens
Browser refresh mid-task	Client reconnects SSE /v1/subscribe with the same conversationId → server replays current progress and any pending ask_user_question cards
Close and reopen Cowork	MRU subscribe streams task history → user clicks a task to view results or resume
Return to a completed task	MRU list shows the task → click navigates to the final response and output
Agent waiting for user input	The pending ask_user_question is re-emitted via SSE → user can answer and execution continues
Network interruption	SSE auto-reconnects → server streams from current state, not from scratch

10.5 Session Authentication Headers
Three auth-related headers maintain session continuity across reconnections:
x-ms-weave-auth: Bearer {JWT}              → User identity (Weave-specific auth)
x-connection-creation-token: Bearer {JWT}   → Connection-level auth (per SSE connection)
x-container-config: renderUi=true;          → Container configuration
    searchBackend=bing;
    scheduledPromptsEnabled=true;
    acceptLanguage=en-US


The x-ms-weave-auth JWT authenticates the user. The x-connection-creation-token is a separate JWT used to establish SSE connections — it may be short-lived and refreshable without disrupting the conversation.
10.6 Long-Running Tasks
The HAR timeline reveals that Cowork Weave tasks run for minutes at a time with the agent working autonomously between user interactions:
16:05:02  Page load + agent init
16:05:03  CDN bundles loaded, skills fetched, search suggestions fetched
16:05:05  Graph user resolution
          ── 90 seconds of autonomous agent work (SSE streaming) ──
16:06:35  ask-user-question.js lazy-loaded (first interactive card appears)
          ── 107 seconds waiting for user + more agent work ──
16:08:22  User answers first card ("OCE Handoff — 9:10 AM")
          ── 261 seconds of autonomous agent work ──
16:12:43  User answers second card (skipped — empty answers)


Total session: ~7.5 minutes. The agent ran autonomously for most of that time.
How Long-Running Execution Works

Fire-and-forget messages — POST /v1/messages returns 202 Accepted immediately. The server processes asynchronously and streams results via SSE. The client never blocks waiting for a response.
SSE as the heartbeat — the /v1/subscribe connection stays open for the full task duration. The server pushes:Thinking indicators ("Thought for 5.2m")
Progress step updates (step 1 → step 2 → step 3)
Streaming text chunks
Interactive cards when user input is needed
Completion signals
Lazy-loaded UI components — the ask-user-question.js bundle wasn't loaded at page init. It was fetched 90 seconds in, only when the agent first needed user input. This confirms the agent was working autonomously before that point.
Multi-minute autonomous execution — the 261-second gap between the two user answers (16:08:22 → 16:12:43) shows the agent continued processing for over 4 minutes after receiving the first answer before asking the next question.
Implications for Long-Running Tasks

Aspect	Behavior
Agent autonomy	Runs for minutes without user intervention; only pauses for explicit ask_user_question
No polling	Client doesn't poll — SSE push model means zero wasted requests
Lazy bundle loading	UI components for interactive cards loaded on-demand, not at init
Background execution	If the user switches tabs, the SSE connection stays alive and the server keeps working
Task timeout	Not observed in this HAR; likely configurable server-side
Progress visibility	Side panel shows real-time step progress so the user knows the agent is working

What Happens If the User Leaves During a Long Task?
Based on the architecture:

Tab stays open — SSE stays connected, progress updates accumulate, user sees results when they return
Tab closed — SSE disconnects, but server-side execution likely continues (fire-and-forget model). On reopen, MRU shows the task. If the agent hit an ask_user_question, it would be pending for the user.
Laptop sleep / network drop — SSE reconnects on wake. If the task completed while disconnected, the MRU shows it as complete with results.
10.7 Client is Stateless
The client (midgard packages) carries no conversation state. It is purely a renderer:

Receives the conversationId from the server on task creation
Passes it back on every POST /v1/messages
Renders whatever the SSE stream sends (text, cards, progress updates)
If the client crashes, the server still holds the full task state
This means the "resume" capability is inherent to the architecture — any client instance that knows the conversationId and has valid auth tokens can pick up where the previous session left off.


11. Cowork Weave vs. Cowork (Sydney Variant)
There are two variants of "Cowork" in the codebase:

Aspect	Cowork Weave (This Document)	Cowork / NotebookCoworkAgent (Sydney)
Backend	MCS Aether Runtime (Power Platform)	Sydney/TuringBot (Helix + Extension)
Custom Experience	Weave	Cowork (presumed)
LLM	Claude (toolu_01...) + GPT 5.x options	Claude Sonnet 4.6 / GPT-5 Codex
Skills	Aether skill system (/v1/skills)	DeepWork tools + NotebookBerry plugin
Streaming	SSE via /v1/subscribe	Sydney chat streaming protocol
Agent Config	MOS3 manifest (T_7e151bfa...)	BuiltInAgents/Cowork/latest.json + AgentRuntime
Code Location (Backend)	Not in Sydney repo	Microsoft.TuringBot.Extensions/by-product/M365/Cowork/
Code Location (Client)	midgard/packages/{mcs-coworker, m365-chat-coworker-agent, scc-cowork-agent}	Same client packages



12. How Weave Was Added to the Agent Store (MOS Catalog)
Cowork Weave is published to the MOS3 (MetaOS) Catalog — the same catalog that powers Teams app discovery. The registration lives entirely outside the Sydney repo.
12.1 Publishing Flow
1. Build Unified Application Package (UAP)
   ├── Unified Application Manifest
   │   ├── Short name: "Cowork"
   │   ├── Developer: "Microsoft Corporation"
   │   └── Teams App ID: 253b14fd-bf42-45e3-91f3-16389f5ce8f2
   └── Declarative Agent Manifest (v1.4 schema)
       ├── type: DeclarativeCopilot
       ├── behavior_overrides.x-custom_experience.name: "Weave"
       └── Required client features: CustomExperience, FluxV3

2. Upload UAP via Nexus Portal
   └── File: Cowork/appPackage/build/appPackage.dev.zip
   └── Button: "Upload MOS Config" in Nexus Portal

3. MOS assigns TitleId
   └── T_7e151bfa-7eaa-0802-049f-5d3b98c95e04

4. Immediate indexing via shoulder tap
   ├── MOS sends signal to Substrate Search Assistants (SSA)
   ├── SSA rebuilds user app index (immediate, not 24-hour cycle)
   └── Agent becomes discoverable in Entity Serve


12.2 Agent Discovery at Runtime
When a user opens M365 Copilot, the client calls the /getGptList API. Sydney's MetaOsGptProvider queries Entity Serve, which returns agents from the user's pre-built index. For Weave, the response looks like:
{
    "gptId": "T_7e151bfa-7eaa-0802-049f-5d3b98c95e04.weave",
    "gptIdentifier": {
        "source": "MOS3",
        "version": "1.1.6",
        "metaOSGlobalIdentifier": {
            "metaOSSharedServicesTitleId": "T_7e151bfa-7eaa-0802-049f-5d3b98c95e04",
            "teamsAppId": "253b14fd-bf42-45e3-91f3-16389f5ce8f2"
        }
    },
    "type": "DeclarativeCopilot",
    "customExperience": {
        "name": "Weave"
    },
    "requiredClientFeatures": [
        "CustomExperience",
        "FluxV3"
    ]
}


12.3 Client-Side Custom Experience Routing
The requiredClientFeatures array acts as a gating mechanism:

Client receives agent list from /getGptList
Client checks requiredClientFeatures — does it support CustomExperience?No → Agent is hidden entirely (prevents broken UX on older clients)
Yes → Client reads customExperience.name
Client matches "Weave" to the mcs-coworker federation shell
Federation shell loads CDN bundles from Azure Front Door
CDN bundles connect to MCS Aether Runtime (not Sydney/TuringBot)
/getGptList response
    │
    ▼
Client: requiredClientFeatures includes "CustomExperience"?
    ├── No  → Agent hidden
    └── Yes → Read customExperience.name
                │
                ▼
            name = "Weave"
                │
                ▼
            Load mcs-coworker federation shell
                │
                ▼
            initializeFederation({ cdnUrl, version })
                │
                ▼
            CDN bundles render Weave UX
            Connect to MCS Aether Runtime via SSE


12.4 Ring Progression
Weave's rollout is controlled in two places:

Layer	Mechanism	Controls
MOS Catalog	Security groups	Which users/tenants see the agent in /getGptList
CDN	ECS feature flags (coworkerCdnUrl, coworkerVersion)	Which version of the Weave UI loads
Aether Runtime	Server-side config	Which skills and model options are available

Ring progression follows: SDF → MSIT → Production → Government clouds
12.5 Indexing and Propagation Timing

Event	Latency
Upload via Nexus Portal / Teams App Management	Immediate — MOS sends shoulder tap to SSA
Sideloaded via Teams App CLI	Up to 24 hours — no shoulder tap, waits for scheduled index rebuild
Manifest change (version bump)	Immediate if re-uploaded via portal; otherwise next 24-hour sync
x- experimental properties	Stripped during 24-hour MOS ↔ Teams catalog sync (only preserved if uploaded via Teams App Management directly)

12.6 Why There's No Trace in the Sydney Repo
Unlike Sydney-backed agents that require a 6-file registration (Bond enums, INI configs, BuiltInAgent manifests), Cowork Weave's registration lives entirely in MOS3. The Sydney repo has no AgentTitleIdConfig.ini entry for T_7e151bfa-... because:

The backend is MCS Aether Runtime, not Sydney/TuringBot
The manifest is managed by the MCS team in the Nexus Portal
Sydney only sees Weave when MetaOsGptProvider queries Entity Serve and gets back a MOS3-sourced agent with customExperience.name = "Weave"
At that point, Sydney returns the agent metadata to the client via /getGptList — the client handles the rest


13. Key File Locations
Client (1JS/Midgard Repo)

Path	Purpose
midgard/packages/mcs-coworker/src/components/CoworkerExperience.tsx	Federation shell
midgard/packages/mcs-coworker/src/constants.ts	CDN URL constant
midgard/packages/mcs-coworker/src/hooks/useHostContext.ts	Host context hook
midgard/packages/m365-chat-coworker-agent/src/CoworkerAgent.tsx	M365 Chat integration
midgard/packages/m365-chat-coworker-agent/src/SpeechToText/	Voice input
midgard/packages/m365-chat-coworker-agent/src/PersonCard/	People cards
midgard/packages/scc-cowork-agent/src/CoworkAgent.tsx	Standalone entry
midgard/packages/scc-cowork-agent/src/pages/CoworkHomePage.tsx	Homepage
midgard/packages/scc-cowork-agent/src/components/CoworkCard.tsx	Task cards



14. Resources

Resource	Link/Info
DA++ Wiki	https://aka.ms/da/wiki
DA++ Teams Channel	"Copilot 1st party agents UX (DAPlusPlus)"
CDN (Production)	https://coworker-h2exa6fggpeqapef.b01.azurefd.net/coworker
Aether Runtime	https://mcsaetherruntime.cus-ia302.gateway.prod.island.powerapps.com
1JS Repo	https://dev.azure.com/office/Office/_git/1JS?path=/midgard



Document Created: 2026-03-14 Based on: HAR file analysis (cowork_weave.har) + codebase analysis of Sydney and 1JS/midgard repos