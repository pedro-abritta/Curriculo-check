import os

from supabase import Client, create_client


def _client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])


# ---------------------------------------------------------------------------
# Usuários
# ---------------------------------------------------------------------------

def get_or_create_user(email: str, auth_user_id: str | None = None) -> dict:
    db = _client()
    result = db.table("users").select("*").eq("email", email).execute()
    if result.data:
        return result.data[0]
    data: dict = {"email": email, "total_tokens_used": 0}
    if auth_user_id:
        data["id"] = auth_user_id
    insert = db.table("users").insert(data).execute()
    return insert.data[0]


def update_user_area(user_id: str, area: str) -> dict:
    db = _client()
    result = db.table("users").update({"area": area}).eq("id", user_id).execute()
    return result.data[0]


def add_tokens(user_id: str, tokens: int) -> dict:
    db = _client()
    user = db.table("users").select("total_tokens_used").eq("id", user_id).execute().data[0]
    new_total = user["total_tokens_used"] + tokens
    result = db.table("users").update({"total_tokens_used": new_total}).eq("id", user_id).execute()
    return result.data[0]


# ---------------------------------------------------------------------------
# Análises
# ---------------------------------------------------------------------------

def save_analysis(user_id: str, job_area: str, tokens_used: int) -> dict:
    print(f"SAVE ANALYSIS: user_id={user_id}, job_area={job_area}, tokens_used={tokens_used}")
    db = _client()
    result = db.table("analyses").insert({
        "user_id": user_id,
        "job_area": job_area,
        "tokens_used": tokens_used,
    }).execute()
    return result.data[0]
