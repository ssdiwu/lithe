# AI sub-agents

This directory defines the built-in read-only worker roles used by Lithe's
native AI runtime. The registry owns role prompts and tool allowlists; the
runner executes a role with the currently selected configured model.

These workers are not user-facing personas or reusable Skills. They receive a
fresh message history, cannot recurse, and return one summary to the parent
agent.
