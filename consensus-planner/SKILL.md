---
name: "consensus-planner"
description: "Multi-agent consensus planning through 3+ different AI models. Performs independent analysis, adversarial review, and consensus fusion to produce high-confidence, executable, verifiable, and safer implementation plans. Suitable for complex refactoring, large feature changes, architecture adjustments, security-sensitive requirements, and high-stakes planning tasks."
---

# Consensus Planner

Enables 3+ different AI models to independently develop plans toward the same goal, then has the master agent extract consensus, arbitrate conflicts, and produce a final fused plan that is more complete, robust, and actionable.

## When to Use

**MANDATORY INVOKE** when the task involves:
- Large-scale refactoring or core module rewriting
- Changes affecting 3+ modules, services, or critical dependencies
- Complex feature design, requirements exploration, or high-uncertainty tasks
- Architecture adjustments, technology stack migration, protocol or storage scheme changes
- Security-sensitive features (authentication, authorization, payments, sensitive data handling)
- Complex bugs after root cause analysis, requiring a high-quality fix plan
- User explicitly requests "multi-model planning", "cross-review plan", or "improved plan reliability"

**NOT recommended for**:
- Small changes in a single file
- Clear, low-risk mechanical implementation
- User only needs a quick draft instead of a high-confidence plan

## Core Principles

1. **Independence before fusion**: Each sub-agent must analyze independently to avoid cross-contamination
2. **Heterogeneous model diversity**: Use different AI models to ensure truly diverse perspectives and reduce blind spots
3. **Separation of concerns**: Each agent focuses on one domain for deeper analysis
4. **Fusion not compromise**: Master agent identifies consensus and highlights disagreements, rather than enforcing the lowest common denominator
5. **Safety over optimism**: When high-gain approach conflicts with low-risk approach, default to the more robust path
6. **Plans must be executable**: Output must include phased steps, verification methods, risk mitigation, and rollback strategies
7. **Code and context as evidence**: Key judgments should be tied to existing code, interfaces, dependencies, and constraints, not abstract speculation

## Workflow

### 1. Master Agent Initialization

The current model acts as the **Master Agent**, responsible for:

- Coordinating the entire process
- Defining clear task objectives for sub-agents
- Collecting and fusing all sub-agent outputs
- Generating the final comprehensive plan
- Establishing context:
  - Clarify goals, scope, non-goals, and key constraints
  - Gather relevant code, dependencies, interfaces, data flow, test coverage, and historical constraints
  - Identify architectural rules, release constraints, compatibility requirements, and rollback requirements

If context is insufficient, complete it before distributing to sub-agents.

### 2. Create 3-5 Sub-Agents in Parallel

Use 3-5 sub-agents for parallel analysis, preferring different models. Each sub-agent receives the same goal and necessary context, but takes on different responsibilities.

Recommended Roles:

| Role | Focus Areas | Key Outputs |
|------|-------------|-------------|
| **Technical Architect** | Macro structure and evolution path | Architecture approach, dependency impact, technical trade-offs, phase division |
| **Code Analyst** | Existing implementation and implicit constraints | Extension points, compatibility, technical debt, sensitive change areas |
| **Implementation Lead** | Executability and delivery order | Atomic steps, interface definitions, milestones, verification sequence |
| **Security Auditor** | Security, robustness, performance | Risk list, exception paths, race conditions/bottlenecks, mitigation suggestions |
| **Arbiter** | Conflict resolution and counter-evidence | Second review on disagreement points, provide decision rationale |

Notes:
- Use at least 3 of the first 4 roles
- Add the 5th arbiter role when task risk is high, disagreement is large, or major unknowns exist
- If toolchain constraints prevent sufficient heterogeneous models, explicitly state the degradation and resulting blind spots

### 3. Detailed Role Requirements

**Technical Architect**
- Analyze relevant technical documentation
- Map project dependencies and relationships
- Design overall technical architecture
- Output architecture diagrams (mermaid format)
- Document and explain key technical selection rationale
- Identify potential technical debt

**Code Analyst**
- Analyze existing code structure and patterns
- Identify natural extension points in the current codebase
- Assess risks that changes may introduce
- Evaluate backward compatibility requirements
- Highlight sensitive code areas requiring special attention
- Record architectural assumptions

**Implementation Lead**
- Break the entire task into executable steps
- Provide clear implementation guidance for each step
- Include code snippets/examples for critical components
- Define clear interfaces and contracts
- Determine development order and milestones
- Estimate complexity for each phase

**Security & Robustness Auditor**
- Audit proposed architecture for security issues
- Evaluate system robustness and fault tolerance
- Identify potential performance bottlenecks
- Check completeness of error and exception handling
- Assess dependency risks and supply chain security
- Provide concrete improvement suggestions

**Arbiter**
- Perform adversarial review on disagreement points
- Provide clear decision rationale and ruling

### 4. Unified Requirements for Sub-Agents

Each sub-agent must output at minimum:

- Understanding and assumptions of task objectives
- Recommended approach and its rationale
- Explicitly state non-recommended approach and reasons
- Risk points, preconditions, compatibility impacts
- Tests or metrics requiring key verification
- Code-level evidence for critical changes

Code-level evidence may include:
- Relevant files, functions, call chains, dependencies
- Interface contracts, data structures, state transitions
- Small code snippets or pseudocode when necessary

### 5. Master Agent Extracts Consensus and Conflicts

- **Consensus Points**: High-confidence conclusions agreed by multiple models
- **Conflict Points**: Disagreements on approach, priorities, or risk assessment
- **Unique Insights**: High-value perspectives from only a few models worth preserving
- **High-Risk Blind Spots**: Areas potentially under-covered by all models

Do not hide conflicts. Conflicts are important inputs to plan quality.

### 6. Adversarial Review and Arbitration

For key conflict points, the master agent must perform at least one round of adversarial review:
- Challenge the most optimistic, radical, or largest-change approach
- Probe hidden assumptions, failure modes, migration cost, and rollback cost
- For high-risk disagreements, prefer more conservative, verifiable implementation paths

If still not converged, you can:
1. Add an arbiter perspective
2. Switch to phased implementation, do low-risk pre-transformation first
3. Keep multiple decision branches with clear trigger conditions for each

### 7. Result Fusion and Output

The master agent reviews all sub-agent outputs from different models and identifies:
- Consensus points across multiple models
- Conflicts or disagreements that need resolution
- Unique insights from each perspective
- Risk factors requiring mitigation

Save the final plan as a local Markdown document:
- Default: current working directory
- Preference: if project has `agent/` directory, save there
- Recommended filename: `consensus-plan-{task-name}-{date}.md`

## Final Output Structure

```markdown
# Consensus Plan: {Task Name}

## 1. Task Summary
- Goals
- Scope
- Non-Goals
- Key Constraints

## 2. Context and Assumptions
- Current implementation overview
- Dependency and interface boundaries
- Assumptions

## 3. Multi-Model Consensus
- High-confidence consensus conclusions
- Key risks identified by multiple models

## 4. Key Disagreements and Final Ruling
| Disagreement | Approach A | Approach B | Final Ruling | Rationale |
| --- | --- | --- | --- | --- |

## 5. Final Implementation Plan
### 5.1 Architecture Design
- Topology changes
- Key technical trade-offs
- Include mermaid diagram if needed

### 5.2 Code Change Analysis
- Affected modules
- Key extension points
- Compatibility and migration requirements

### 5.3 Phased Execution Steps
1. Preparations
2. Phase 1 Implementation
3. Phase 2 Implementation
4. Cleanup

### 5.4 Security and Robustness Design
- Security controls
- Exception handling
- Performance and capacity considerations

## 6. Verification Plan
- Unit tests
- Integration tests
- Regression tests
- Monitoring and observation metrics
- Acceptance criteria

## 7. Rollback and Emergency Plan
- Rollback trigger conditions
- Rollback steps
- Data repair or compatibility strategy

## 8. Open Questions
- Information yet to be confirmed
- Decision points that affect approach selection
```

## Quality Gates

Before declaring the plan complete, the master agent should check:

- [ ] Does it contain at least 3 independent analytical perspectives?
- [ ] Are consensus points and conflict points explicitly documented?
- [ ] Is a final ruling provided, not just listing opinions?
- [ ] Does it include executable phased steps?
- [ ] Does it include a verification strategy, not just implementation ideas?
- [ ] Does it cover security, compatibility, performance, and rollback issues?
- [ ] Does it identify remaining uncertainties?

If any of the above is missing, the plan should not be considered complete.

## Usage Notes

- Do not use this Skill on simple tasks, as it wastes time and context
- Do not share intermediate conclusions between sub-agents unless entering explicit arbitration phase
- When multiple models all overlook the same risk, the master agent must still actively perform skeptical review
- If a sub-agent clearly deviates from code context, produces vague conclusions, or makes basic errors, require it to redo or replace with an additional model
- If user simultaneously requests "final executable implementation plan", the final document should be further refined to file-level or module-level tasks
