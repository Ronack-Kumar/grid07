import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs("diagrams", exist_ok=True)

def setup_fig(w=11, h=7):
    fig, ax = plt.subplots(figsize=(w, h), dpi=200)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    return fig, ax

def draw_card(ax, x, y, w, h, title, items, header_bg='#1E293B', card_bg='#F8FAFC', border_c='#CBD5E1'):
    # Card outer
    rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5,rounding_size=1.5",
                                  facecolor=card_bg, edgecolor=border_c, linewidth=1.5)
    ax.add_patch(rect)
    # Header
    hh = min(12, h * 0.3)
    header = patches.FancyBboxPatch((x, y + h - hh), w, hh, boxstyle="round,pad=0.2,rounding_size=1.0",
                                    facecolor=header_bg, edgecolor=header_bg)
    ax.add_patch(header)
    ax.text(x + w/2, y + h - hh/2, title, ha='center', va='center', color='white',
            fontsize=9.5, fontweight='bold', family='sans-serif')
    
    # Items
    start_y = y + h - hh - 3
    spacing = (h - hh - 4) / max(len(items), 1)
    for i, itm in enumerate(items):
        cur_y = start_y - i * spacing
        ax.text(x + 2, cur_y, itm, ha='left', va='center', color='#334155',
                fontsize=8, family='monospace' if ':' in itm or '(' in itm else 'sans-serif')

def draw_arrow(ax, x1, y1, x2, y2, text="", style="->", color='#0284C7', lw=1.5):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color, lw=lw, shrinkA=5, shrinkB=5,
                                connectionstyle="arc3,rad=0"))
    if text:
        mx, my = (x1 + x2)/2, (y1 + y2)/2
        ax.text(mx, my + 1.8, text, ha='center', va='center', fontsize=7.5,
                fontweight='bold', color='#0F172A', family='sans-serif',
                bbox=dict(boxstyle="round,pad=0.2", facecolor='#F1F5F9', edgecolor='#CBD5E1', lw=0.8))

# ----------------- 1. ER DIAGRAM -----------------
fig, ax = setup_fig(12, 8)
ax.text(50, 96, "FIGURE 3.2.1: ENTITY RELATIONSHIP (ER) DIAGRAM", ha='center', va='center',
        fontsize=13, fontweight='bold', color='#0F172A')

draw_card(ax, 3, 62, 26, 28, "USER", [
    "+ id: UUID [PK]",
    "+ email: String [UQ]",
    "+ hashed_password: String",
    "+ is_active: Boolean",
    "+ created_at: DateTime"
], header_bg='#0F766E')

draw_card(ax, 37, 62, 26, 28, "WORKSPACE", [
    "+ id: UUID [PK]",
    "+ name: String",
    "+ owner_id: UUID [FK]",
    "+ created_at: DateTime"
], header_bg='#0369A1')

draw_card(ax, 71, 62, 26, 28, "WORKSPACE_MEMBER", [
    "+ workspace_id: UUID [PK,FK]",
    "+ user_id: UUID [PK,FK]",
    "+ role: String",
    "+ created_at: DateTime"
], header_bg='#4338CA')

draw_card(ax, 37, 18, 26, 34, "AGENT", [
    "+ id: UUID [PK]",
    "+ workspace_id: UUID [FK]",
    "+ name: String",
    "+ description: Text",
    "+ personality: Text",
    "+ model_name: String",
    "+ expertise: JSON",
    "+ created_at: DateTime"
], header_bg='#B45309')

draw_card(ax, 3, 18, 26, 34, "EXECUTION", [
    "+ id: UUID [PK]",
    "+ workspace_id: UUID [FK]",
    "+ agent_id: UUID [FK, NULL]",
    "+ input_text: Text",
    "+ status: String",
    "+ routing_decisions: JSON",
    "+ output_text: Text",
    "+ latency_ms: Integer"
], header_bg='#BE185D')

draw_card(ax, 71, 18, 26, 34, "CONVERSATION & MSG", [
    "+ id: UUID [PK]",
    "+ workspace_id: UUID [FK]",
    "+ agent_id: UUID [FK]",
    "+ title: String",
    "--- MESSAGE ENTITY ---",
    "+ id: UUID [PK]",
    "+ conversation_id: UUID [FK]",
    "+ role: String (user/bot)",
    "+ content: Text"
], header_bg='#374151')

draw_arrow(ax, 29, 76, 37, 76, "1 : N (Owns)", "<->", color='#0369A1')
draw_arrow(ax, 63, 76, 71, 76, "1 : N", "<->", color='#4338CA')
draw_arrow(ax, 50, 62, 50, 52, "1 : N (Contains)", color='#0284C7')
draw_arrow(ax, 37, 35, 29, 35, "1 : N (Logs)", color='#BE185D')
draw_arrow(ax, 63, 35, 71, 35, "1 : N (Chats)", color='#374151')
plt.savefig("diagrams/fig_3_2_1_er_diagram.png", bbox_inches='tight')
plt.close()

# ----------------- 2. USE CASE DIAGRAM -----------------
fig, ax = setup_fig(12, 7.5)
ax.text(50, 96, "FIGURE 3.3.1: USE CASE DIAGRAM", ha='center', va='center',
        fontsize=13, fontweight='bold', color='#0F172A')

# System Boundary
sys_box = patches.FancyBboxPatch((24, 6), 56, 85, boxstyle="round,pad=1,rounding_size=2",
                                facecolor='#F8FAFC', edgecolor='#0284C7', linewidth=2, linestyle='--')
ax.add_patch(sys_box)
ax.text(52, 88, "GRID07 Autonomous Routing & Content System", ha='center', va='center',
        fontsize=11, fontweight='bold', color='#0369A1')

# Actors
def draw_actor(ax, x, y, name):
    circle = patches.Circle((x, y+3), 2.2, facecolor='#E2E8F0', edgecolor='#0F172A', lw=1.5)
    ax.add_patch(circle)
    ax.plot([x, x], [y+0.8, y-3], color='#0F172A', lw=1.5) # Body
    ax.plot([x-2.5, x+2.5], [y-0.5, y-0.5], color='#0F172A', lw=1.5) # Arms
    ax.plot([x, x-2], [y-3, y-6], color='#0F172A', lw=1.5) # Left Leg
    ax.plot([x, x+2], [y-3, y-6], color='#0F172A', lw=1.5) # Right Leg
    ax.text(x, y-8.5, name, ha='center', va='center', fontsize=9, fontweight='bold', color='#0F172A')

draw_actor(ax, 12, 50, "User / Creator")
draw_actor(ax, 90, 65, "Groq LLaMA LPU")
draw_actor(ax, 90, 25, "SearXNG Engine")

use_cases = [
    (52, 80, "UC1: Configure Persona & Vectors"),
    (52, 69, "UC2: Submit Prompt / Post Content"),
    (52, 58, "UC3: Semantic Cosine Routing"),
    (52, 47, "UC4: Autonomous Knowledge Search"),
    (52, 36, "UC5: Draft Persona-Specific Content"),
    (52, 25, "UC6: Multi-turn Combat Reply"),
    (52, 14, "UC7: 2-Layer Prompt Injection Guard"),
]

for cx, cy, label in use_cases:
    ellipse = patches.FancyBboxPatch((cx-21, cy-3.2), 42, 6.4, boxstyle="round,pad=0.5,rounding_size=3",
                                    facecolor='#EFF6FF', edgecolor='#3B82F6', lw=1.2)
    ax.add_patch(ellipse)
    ax.text(cx, cy, label, ha='center', va='center', fontsize=8.5, fontweight='bold', color='#1E3A8A')
    # Connect actor to use cases
    ax.plot([14.5, cx-21], [50, cy], color='#94A3B8', linestyle='-', lw=1.1)

# Connect system actors
ax.plot([73, 87.5], [58, 65], color='#F59E0B', linestyle='--', lw=1.3)
ax.plot([73, 87.5], [47, 25], color='#10B981', linestyle='--', lw=1.3)
ax.plot([73, 87.5], [36, 65], color='#F59E0B', linestyle='--', lw=1.3)
ax.plot([73, 87.5], [14, 65], color='#EF4444', linestyle='--', lw=1.3)

plt.savefig("diagrams/fig_3_3_1_use_case.png", bbox_inches='tight')
plt.close()

# ----------------- 3. CLASS DIAGRAM -----------------
fig, ax = setup_fig(12, 8)
ax.text(50, 96, "FIGURE 3.3.2: CLASS DIAGRAM", ha='center', va='center',
        fontsize=13, fontweight='bold', color='#0F172A')

draw_card(ax, 3, 56, 28, 36, "PersonaRouter", [
    "- embedding_service: EmbeddingService",
    "- similarity_threshold: float = 0.80",
    "+ route_input(text, agents): List[Dict]",
    "+ calculate_similarity(v1, v2): float",
    "+ rank_candidates(scores): List[Agent]"
], header_bg='#1E293B')

draw_card(ax, 36, 56, 28, 36, "EmbeddingService", [
    "- api_key: str",
    "- vector_dim: int = 32",
    "- cache: Dict[str, np.ndarray]",
    "+ get_embedding(text): np.ndarray",
    "+ batch_embed(texts): List[np.ndarray]"
], header_bg='#0F766E')

draw_card(ax, 69, 56, 28, 36, "AgentExecutionGraph", [
    "- state_graph: StateGraph",
    "- retrieval_service: RetrievalService",
    "+ node_decide_search(state): AgentState",
    "+ node_web_search(state): AgentState",
    "+ node_draft_post(state): AgentState",
    "+ execute(state): ExecutionResult"
], header_bg='#4338CA')

draw_card(ax, 3, 10, 28, 36, "SecurityDefenseEngine", [
    "- regex_patterns: List[Pattern]",
    "- persona_lock_template: str",
    "+ detect_injection(text): bool",
    "+ build_system_lock(agent, alert): str",
    "+ sanitize_output(output): str"
], header_bg='#BE185D')

draw_card(ax, 36, 10, 28, 36, "ExecutionRepository", [
    "- session: AsyncSession",
    "+ record_execution(data): Execution",
    "+ get_history(workspace_id): List[Exec]",
    "+ update_metrics(latency, cost): void"
], header_bg='#B45309')

draw_card(ax, 69, 10, 28, 36, "RetrievalService", [
    "- mock_database: Dict[str, List]",
    "+ search_topics(query): List[str]",
    "+ format_context(results): str"
], header_bg='#0369A1')

draw_arrow(ax, 31, 74, 36, 74, "uses", color='#0284C7')
draw_arrow(ax, 69, 74, 64, 74, "delegates", color='#0284C7')
draw_arrow(ax, 83, 56, 83, 46, "queries", color='#0284C7')
draw_arrow(ax, 17, 56, 17, 46, "validates", color='#BE185D')
draw_arrow(ax, 50, 46, 50, 56, "records", color='#B45309')

plt.savefig("diagrams/fig_3_3_2_class_diagram.png", bbox_inches='tight')
plt.close()

# ----------------- 4. SEQUENCE DIAGRAM -----------------
fig, ax = setup_fig(12, 8)
ax.text(50, 96, "FIGURE 3.3.3: SEQUENCE DIAGRAM (REQUEST LIFECYCLE)", ha='center', va='center',
        fontsize=13, fontweight='bold', color='#0F172A')

lifelines = [
    (8, "Client UI"),
    (24, "FastAPI Router"),
    (42, "Embedding Engine"),
    (60, "Persona Router"),
    (78, "LangGraph Engine"),
    (93, "Groq LLM")
]

for lx, name in lifelines:
    box = patches.FancyBboxPatch((lx-6, 88), 12, 5, boxstyle="round,pad=0.2",
                                facecolor='#1E293B', edgecolor='#0F172A')
    ax.add_patch(box)
    ax.text(lx, 90.5, name, ha='center', va='center', color='white', fontsize=7.5, fontweight='bold')
    ax.plot([lx, lx], [88, 8], color='#94A3B8', linestyle=':', lw=1.2)

messages = [
    (8, 24, 82, "1: POST /api/executions (input_text)", '->'),
    (24, 42, 74, "2: get_embedding(input_text)", '->'),
    (42, 24, 68, "3: return vector[32]", '-->'),
    (24, 60, 60, "4: route_input(vector, agents)", '->'),
    (60, 24, 52, "5: return top agent (cosine >= 0.80)", '-->'),
    (24, 78, 44, "6: run_agent_pipeline(state)", '->'),
    (78, 93, 37, "7: decide_search & draft_post prompt", '->'),
    (93, 78, 30, "8: LLM response payload (JSON)", '-->'),
    (78, 24, 23, "9: execution result + trace metrics", '-->'),
    (24, 8, 15, "10: 200 OK (Agent output & telemetry)", '-->')
]

for x1, x2, y, txt, sty in messages:
    col = '#0284C7' if sty == '->' else '#10B981'
    ax.annotate("", xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle="->" if sty == '->' else "->",
                                linestyle='solid' if sty == '->' else 'dashed',
                                color=col, lw=1.3, shrinkA=2, shrinkB=2))
    mx = (x1 + x2)/2
    ax.text(mx, y + 1.6, txt, ha='center', va='center', fontsize=7, fontweight='bold', color='#1E293B')

plt.savefig("diagrams/fig_3_3_3_sequence_diagram.png", bbox_inches='tight')
plt.close()

# ----------------- 5. ACTIVITY DIAGRAM -----------------
fig, ax = setup_fig(11, 8.5)
ax.text(50, 96, "FIGURE 3.3.4: ACTIVITY DIAGRAM (SYSTEM WORKFLOW)", ha='center', va='center',
        fontsize=13, fontweight='bold', color='#0F172A')

def draw_act_node(ax, x, y, w, h, text, bg='#EFF6FF', border='#2563EB'):
    rect = patches.FancyBboxPatch((x-w/2, y-h/2), w, h, boxstyle="round,pad=0.3,rounding_size=1.5",
                                  facecolor=bg, edgecolor=border, lw=1.4)
    ax.add_patch(rect)
    ax.text(x, y, text, ha='center', va='center', fontsize=8, fontweight='bold', color='#0F172A')

# Start Node
start = patches.Circle((50, 90), 2.2, facecolor='#0F172A', edgecolor='#0F172A')
ax.add_patch(start)

draw_act_node(ax, 50, 80, 42, 6, "Receive User Input / Argument")
draw_act_node(ax, 50, 70, 42, 6, "Layer-1 Security Regex Pre-filter")
draw_act_node(ax, 50, 60, 42, 6, "Generate 32-dim Semantic Embedding")
draw_act_node(ax, 50, 50, 42, 6, "Compute Cosine Similarity Across Personas")

# Decision Diamond
diamond = patches.RegularPolygon((50, 39), numVertices=4, radius=6.5, orientation=0,
                                 facecolor='#FEF3C7', edgecolor='#D97706', lw=1.5)
ax.add_patch(diamond)
ax.text(50, 39, "Score >=\nThreshold?", ha='center', va='center', fontsize=7.5, fontweight='bold')

draw_act_node(ax, 85, 39, 24, 6, "Fallback / Reject", bg='#FEE2E2', border='#DC2626')
draw_act_node(ax, 50, 26, 42, 6, "LangGraph: decide_search & web_search")
draw_act_node(ax, 50, 15, 42, 6, "LangGraph: draft_post with Persona Lock")
draw_act_node(ax, 50, 5, 42, 6, "Persist Execution & Render Output")

draw_arrow(ax, 50, 87.8, 50, 83)
draw_arrow(ax, 50, 77, 50, 73)
draw_arrow(ax, 50, 67, 50, 63)
draw_arrow(ax, 50, 57, 50, 45.5)
draw_arrow(ax, 56.5, 39, 73, 39, "No (<0.80)")
draw_arrow(ax, 50, 32.5, 50, 29, "Yes (>=0.80)")
draw_arrow(ax, 50, 23, 50, 18)
draw_arrow(ax, 50, 12, 50, 8)
draw_arrow(ax, 85, 36, 85, 5)
draw_arrow(ax, 73, 5, 71, 5)

plt.savefig("diagrams/fig_3_3_4_activity_diagram.png", bbox_inches='tight')
plt.close()

# ----------------- 6. COMPONENT DIAGRAM -----------------
fig, ax = setup_fig(12, 7.5)
ax.text(50, 96, "FIGURE 3.3.5: COMPONENT DIAGRAM", ha='center', va='center',
        fontsize=13, fontweight='bold', color='#0F172A')

def draw_comp(ax, x, y, w, h, name, sub="", bg='#F8FAFC', border='#0284C7'):
    rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0.2",
                                  facecolor=bg, edgecolor=border, lw=1.5)
    ax.add_patch(rect)
    # Tabs
    t1 = patches.Rectangle((x-1.5, y+h-5), 3, 3, facecolor=bg, edgecolor=border, lw=1.2)
    t2 = patches.Rectangle((x-1.5, y+3), 3, 3, facecolor=bg, edgecolor=border, lw=1.2)
    ax.add_patch(t1); ax.add_patch(t2)
    ax.text(x + w/2, y + h/2 + (1.5 if sub else 0), f"«component»\n{name}", ha='center', va='center',
            fontsize=8.5, fontweight='bold', color='#0F172A')
    if sub:
        ax.text(x + w/2, y + h/2 - 4.5, sub, ha='center', va='center', fontsize=7, color='#64748B')

draw_comp(ax, 3, 55, 26, 32, "Presentation Tier", "Next.js 14 / Tailwind UI")
draw_comp(ax, 37, 55, 26, 32, "API Gateway", "FastAPI / Uvicorn ASGI")
draw_comp(ax, 71, 55, 26, 32, "Security Guard", "Regex Filter & Persona Lock")
draw_comp(ax, 3, 10, 26, 32, "Routing Engine", "Vector Store & Cosine Match")
draw_comp(ax, 37, 10, 26, 32, "LangGraph Engine", "StateGraph Workflow Nodes")
draw_comp(ax, 71, 10, 26, 32, "Persistence Tier", "SQLAlchemy + SQLite / PG")

draw_arrow(ax, 29, 71, 37, 71, "REST / JSON", color='#0284C7')
draw_arrow(ax, 63, 71, 71, 71, "Sanitization", color='#BE185D')
draw_arrow(ax, 50, 55, 50, 42, "Dispatches", color='#0284C7')
draw_arrow(ax, 37, 26, 29, 26, "Embedding Match", color='#0284C7')
draw_arrow(ax, 63, 26, 71, 26, "State Logging", color='#0284C7')

plt.savefig("diagrams/fig_3_3_5_component_diagram.png", bbox_inches='tight')
plt.close()

# ----------------- 7. COLLABORATION DIAGRAM -----------------
fig, ax = setup_fig(12, 7.5)
ax.text(50, 96, "FIGURE 3.3.6: COLLABORATION (COMMUNICATION) DIAGRAM", ha='center', va='center',
        fontsize=13, fontweight='bold', color='#0F172A')

nodes = [
    (15, 70, ":ClientUI"),
    (50, 70, ":APIRouter"),
    (85, 70, ":EmbeddingService"),
    (15, 25, ":PersonaRouter"),
    (50, 25, ":LangGraphEngine"),
    (85, 25, ":DatabaseStore")
]

for nx, ny, label in nodes:
    box = patches.FancyBboxPatch((nx-12, ny-6), 24, 12, boxstyle="round,pad=0.3,rounding_size=1.2",
                                facecolor='#F1F5F9', edgecolor='#334155', lw=1.6)
    ax.add_patch(box)
    ax.text(nx, ny, label, ha='center', va='center', fontsize=9, fontweight='bold', color='#0F172A')

def draw_collab_link(ax, x1, y1, x2, y2, msgs):
    ax.plot([x1, x2], [y1, y2], color='#94A3B8', lw=1.5)
    mx, my = (x1+x2)/2, (y1+y2)/2
    spacing = 3.5
    for i, m in enumerate(msgs):
        ax.text(mx, my + (i - len(msgs)/2)*spacing + 1, m, ha='center', va='center',
                fontsize=7.2, fontweight='bold', color='#0369A1',
                bbox=dict(boxstyle="round,pad=0.2", facecolor='#FFFFFF', edgecolor='#E2E8F0', lw=0.6))

draw_collab_link(ax, 27, 70, 38, 70, ["1: postRequest()", "8: returnResponse()"])
draw_collab_link(ax, 62, 70, 73, 70, ["2: computeEmbedding()", "3: returnVector()"])
draw_collab_link(ax, 50, 64, 23, 31, ["4: routeInput(vec)"])
draw_collab_link(ax, 27, 25, 38, 25, ["5: triggerSelectedBot()"])
draw_collab_link(ax, 50, 31, 50, 64, ["6: invokeGraphWorkflow()"])
draw_collab_link(ax, 62, 25, 73, 25, ["7: persistExecutionTrace()"])

plt.savefig("diagrams/fig_3_3_6_collaboration_diagram.png", bbox_inches='tight')
plt.close()

# ----------------- 8. DEPLOYMENT DIAGRAM -----------------
fig, ax = setup_fig(12, 7.5)
ax.text(50, 96, "FIGURE 3.3.7: DEPLOYMENT DIAGRAM", ha='center', va='center',
        fontsize=13, fontweight='bold', color='#0F172A')

def draw_node_3d(ax, x, y, w, h, title, items, bg='#F8FAFC', border='#1E293B'):
    d = 2.5
    # Side & top 3D facets
    ax.fill([x+w, x+w+d, x+w+d, x+w], [y, y+d, y+h+d, y+h], facecolor='#CBD5E1', edgecolor=border, lw=1.2)
    ax.fill([x, x+d, x+w+d, x+w], [y+h, y+h+d, y+h+d, y+h], facecolor='#E2E8F0', edgecolor=border, lw=1.2)
    # Front face
    front = patches.Rectangle((x, y), w, h, facecolor=bg, edgecolor=border, lw=1.4)
    ax.add_patch(front)
    ax.text(x + w/2, y + h - 4, f"«device»\n{title}", ha='center', va='center',
            fontsize=8.5, fontweight='bold', color='#0F172A')
    
    start_y = y + h - 10
    spacing = (h - 12) / max(len(items), 1)
    for i, itm in enumerate(items):
        ax.text(x + 2, start_y - i * spacing, itm, ha='left', va='center',
                fontsize=7.5, color='#334155', family='sans-serif')

draw_node_3d(ax, 4, 30, 24, 46, "Client Workstation", [
    "- Chrome / Edge Browser",
    "- Next.js SPA Client",
    "- HTTP / WebSocket Client",
    "- OS: Windows / macOS / Linux"
], bg='#F0FDF4', border='#16A34A')

draw_node_3d(ax, 38, 20, 26, 62, "Application Server", [
    "- ASGI Server: Uvicorn",
    "- Framework: FastAPI (Python)",
    "- LangGraph Runtime",
    "- Routing & Security Services",
    "- Port: 8000 (REST / CORS)"
], bg='#EFF6FF', border='#2563EB')

draw_node_3d(ax, 72, 54, 24, 32, "Groq Cloud LPU", [
    "- LLaMA-3.1-8B-Instant",
    "- High-throughput LPU Inference",
    "- Latency: ~100-250ms",
    "- API Key TLS 1.3"
], bg='#FFFBEB', border='#D97706')

draw_node_3d(ax, 72, 10, 24, 34, "Database Server", [
    "- Engine: SQLite3 / PostgreSQL",
    "- SQLAlchemy 2.0 ORM Engine",
    "- Relational Tables (ACID)",
    "- In-Memory Vector Store"
], bg='#FAF5FF', border='#9333EA')

draw_arrow(ax, 28, 55, 38, 55, "HTTPS / REST (Port 8000)", color='#2563EB')
draw_arrow(ax, 64, 68, 72, 68, "HTTPS API Calls", color='#D97706')
draw_arrow(ax, 64, 35, 72, 35, "TCP / SQL Queries", color='#9333EA')

plt.savefig("diagrams/fig_3_3_7_deployment_diagram.png", bbox_inches='tight')
plt.close()

print("All 8 diagram figures generated successfully!")
