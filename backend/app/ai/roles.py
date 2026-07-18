from app.models.ai import AgentRole


ROLES: tuple[AgentRole, ...] = (
    "job_analyst",
    "candidate_evidence",
    "tailoring",
    "critic",
)
