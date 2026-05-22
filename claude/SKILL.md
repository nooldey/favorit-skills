---
name: claude
description: Use when the user asks to run Claude CLI (claude) or references Claude for code analysis, development, or automated tasks. Uses Claude Sonnet 4 by default for state-of-the-art reasoning and coding.
---

# Claude Skill Guide

## When to Use Claude
- **Code Analysis**: Comprehensive code reviews, understanding codebases, exploring patterns
- **Development**: Feature implementation, bug fixes, refactoring with full context
- **Interactive Sessions**: When you need back-and-forth collaboration with Claude
- **Automation**: Non-interactive tasks with --print flag for scripting
- **Multi-model Tasks**: Switch between Sonnet (balanced) and Opus (powerful)

## Running a Task

1. Ask the user (via `AskUserQuestion`) which model to use in a **single prompt**. Available models:
    - `claude-sonnet-4` ⭐ (default, balanced performance, cost-effective)
    - `claude-opus-4` (most powerful for complex reasoning)

2. Select the execution mode based on the task:
   - **Interactive mode** (default): For collaborative sessions with back-and-forth discussion
   - **Non-interactive** (`-p, --print`): For one-shot tasks and automation scripts

3. Select the effort level if needed:
   - `low`: Quick tasks, simple changes
   - `medium`: Standard development tasks (default)
   - `high`: Complex reasoning, deep analysis

4. Assemble the command with appropriate options:
   - `-m, --model <MODEL>` - Model selection
   - `-p, --print` - Non-interactive mode (print and exit)
   - `-c, --continue` - Continue most recent conversation
   - `-r, --resume [id]` - Resume specific session
   - `--effort <low|medium|high>` - Effort level
   - `--permission-mode <mode>` - Permission mode (default, acceptEdits, bypassPermissions)
   - `--allowed-tools <tools>` - Restrict available tools
   - `--add-dir <dirs>` - Additional directories for tool access
   - `--system-prompt <prompt>` - Custom system prompt
   - `--worktree [name]` - Create git worktree

5. Run the command and capture the output.

### Quick Reference

| Use case | Mode | Key flags |
| --- | --- | --- |
| Interactive development | Interactive | `claude` or `claude "prompt"` |
| One-shot analysis | Non-interactive | `claude -p "prompt"` |
| Continue recent session | Interactive | `claude -c` |
| Resume specific session | Interactive | `claude -r <session-id>` |
| Complex reasoning | Interactive | `claude --model claude-opus-4 --effort high "prompt"` |
| Quick automation | Non-interactive | `claude -p "prompt"` |
| Code editing with permissions | Interactive | `claude --permission-mode acceptEdits` |
| Review from PR | Interactive | `claude --from-pr <pr-number>` |

### Model Selection Guide

| Model | Best for | Speed | Cost |
| --- | --- | --- | --- |
| `claude-sonnet-4` ⭐ | **Default choice**: Balanced performance, coding, analysis | Fast | Cost-effective |
| `claude-opus-4` | Complex reasoning, deep analysis, critical tasks | Slower | Higher cost |

**Claude 4 Advantages**: State-of-the-art reasoning, improved tool use, better code understanding, enhanced context management. Knowledge cutoff: Updated regularly.

### Common Use Cases

#### Interactive Development (Default)
```bash
# Start interactive session
claude

# Start with prompt
claude "Help me refactor this authentication module"

# With specific model
claude --model claude-opus-4 "Analyze this architecture for scalability issues"

# With effort level
claude --effort high "Perform a comprehensive security audit"
```

#### Non-Interactive Automation
```bash
# One-shot analysis
claude -p "Review the changes in the current git diff"

# Scripting
OUTPUT=$(claude -p "Generate a summary of this codebase")
echo "$OUTPUT"
```

#### Session Management
```bash
# Continue last conversation
claude -c

# Resume specific session
claude -r

# Resume from PR
claude --from-pr 123

# Create worktree for isolated work
claude --worktree feature-branch "Implement new feature"
```

#### Advanced Options
```bash
# Custom system prompt
claude --system-prompt "You are a security expert. Focus on vulnerabilities." "Audit this code"

# Restrict tools
claude --allowed-tools "Bash(git:*) Read" "Check git status"

# Add directories
claude --add-dir ../shared-utils "Integrate with shared utilities"

# Bypass permissions (trusted directories only)
claude --permission-mode bypassPermissions -p "Make these changes"
```

## Following Up

- After every `claude` command, immediately use `AskUserQuestion` to confirm next steps, collect clarifications, or decide whether to continue with additional prompts.
- When continuing interactive sessions, you can simply provide new prompts.
- For resuming sessions, use `claude -c` to continue the most recent or `claude -r <id>` for specific sessions.
- Restate the chosen model and mode when proposing follow-up actions.

## Error Handling

- Stop and report failures whenever `claude --version` or a Claude command exits non-zero; request direction before retrying.
- Before using high-impact flags (`--permission-mode bypassPermissions`, `--dangerously-skip-permissions`), ask the user for permission using `AskUserQuestion` unless already granted.
- When output includes warnings or partial results, summarize them and ask how to adjust using `AskUserQuestion`.
- If Claude encounters permission issues, suggest using appropriate `--permission-mode` or `--allowed-tools`.

## Permission Modes

Claude CLI supports several permission modes for tool usage:

- **default** (interactive): Ask for permission for tool usage
- **acceptEdits**: Auto-approve file edits, ask for other tools
- **bypassPermissions**: Bypass all permission checks (⚠️ trusted directories only)
- **plan**: Plan mode without execution

Choose based on task and trust level:
- Use `default` for uncertain tasks
- Use `acceptEdits` for code review and refactoring
- Use `bypassPermissions` only in fully trusted, isolated environments

## Session Persistence

Claude CLI automatically saves sessions and allows resuming:

- **Automatic saving**: All interactive sessions are saved by default
- **Continue recent**: `claude -c` resumes the most recent session
- **Resume specific**: `claude -r` shows picker, or `claude -r <id>` for specific session
- **Disable persistence**: Use `--no-session-persistence` with `-p` for temporary sessions

Session IDs are UUIDs and can be found in `.claude/sessions/` or via `claude -r` picker.

## Integration with Workflows

### Git Integration
```bash
# Review changes
claude -p "Review these changes: $(git diff)"

# Create worktree for feature
claude --worktree new-feature "Implement feature"

# Resume from PR
claude --from-pr 123 "Review and address feedback"
```

### IDE Integration
```bash
# Auto-connect to IDE
claude --ide

# With specific agent
claude --agent reviewer --ide "Review current file"
```

### MCP Integration
```bash
# Load MCP servers
claude --mcp-config ./mcp-servers.json "Use database tools to analyze schema"

# Strict MCP mode (ignore other configs)
claude --strict-mcp-config --mcp-config ./custom-mcp.json "Query database"
```

## Tips for Effective Usage

1. **Be specific**: Provide clear, detailed prompts for better results
2. **Use appropriate models**: Sonnet for balance, Opus for complexity
3. **Leverage context**: Claude sees your codebase, reference files appropriately
4. **Interactive vs non-interactive**: Use interactive for exploration, `-p` for automation
5. **Session management**: Resume sessions to maintain context across interactions
6. **Permission modes**: Choose the right mode for your trust level and task
7. **Effort levels**: Adjust effort based on task complexity (low/medium/high)
8. **Tool restrictions**: Use `--allowed-tools` to constrain Claude's capabilities when needed

## CLI Version

Requires Claude CLI v2.1.0 or later. Check version: `claude --version`

Update to latest version: `claude update`

Use `claude agents` to see configured agents, or create custom agents with `--agents` flag.
